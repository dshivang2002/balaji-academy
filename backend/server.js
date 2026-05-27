/**
 * BALAJI ACADEMY – Backend Server
 * Node.js + Express + Supabase (PostgreSQL)
 * Port: 3001
 *
 * SETUP:
 *   npm install @supabase/supabase-js
 *   Set env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY
 *
 * Run SQL in Supabase SQL Editor once (see supabase_schema.sql)
 */

console.log('🔥NEW SERVER CODE LOADED');

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');
 
// ─── Init ────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'balaji_academy_secret_key_2024';
const UPLOAD_DIR = path.join(__dirname, '../public/uploads');
 
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
 
// ─── Supabase Client ─────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
 
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment!');
  console.error('   Create a .env file or export these variables before starting.');
  process.exit(1);
}
 
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testSupabase() {
  try {
    const { error } = await supabase
      .from('students')
      .select('id')
      .limit(1);

    if (error) {
      console.error('❌ Supabase connection failed:', error.message);
    } else {
      console.log('✅ Supabase connected successfully');
    }
  } catch (err) {
    console.error('❌ Supabase connection error:', err.message);
  }
}

testSupabase();
 
// ─── Middleware ──────────────────────────────────────────
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOAD_DIR));
app.use(express.static(path.join(__dirname, '../public')));
 
// Multer – memory storage (Render has ephemeral filesystem; disk files vanish on restart)
// Photos are accepted but not persisted to disk. Store in Supabase Storage later if needed.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }
});
 
// ─── Auth Middleware ─────────────────────────────────────
function authMiddleware(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Unauthorized. Please login.' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token expired or invalid. Please login again.' });
  }
}
 
function roleMiddleware(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role))
      return res.status(403).json({ success: false, message: 'Access denied. Insufficient permissions.' });
    next();
  };
}
 
async function auditLog(action, entity, details, user) {
  await supabase.from('audit_log').insert({
    id: uuidv4(), action, entity, details,
    performed_by: user?.name || 'System',
    timestamp: new Date().toISOString()
  });
}
 
// ─── ROUTES ─────────────────────────────────────────────
 
// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Balaji Academy API is running (Supabase)', time: new Date().toISOString() });
});
 
// ── AUTH ──────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ success: false, message: 'Username and password are required.' });
 
  const { data: admins } = await supabase.from('admins').select('*').eq('username', username).limit(1);
  const admin = admins?.[0];
  if (!admin || !bcrypt.compareSync(password, admin.password))
    return res.status(401).json({ success: false, message: 'Invalid username or password.' });
 
  const token = jwt.sign(
    { id: admin.id, username: admin.username, name: admin.name, role: admin.role },
    JWT_SECRET, { expiresIn: '8h' }
  );
  await auditLog('LOGIN', 'Auth', `User "${admin.username}" logged in`, admin);
  res.json({ success: true, token, user: { id: admin.id, username: admin.username, name: admin.name, role: admin.role, email: admin.email } });
});
 
app.post('/api/auth/logout', authMiddleware, async (req, res) => {
  await auditLog('LOGOUT', 'Auth', `User "${req.user.username}" logged out`, req.user);
  res.json({ success: true, message: 'Logged out successfully.' });
});
 
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  const { data } = await supabase.from('admins').select('id,username,name,role,email,created_at').eq('id', req.user.id).limit(1);
  if (!data?.[0]) return res.status(404).json({ success: false, message: 'User not found.' });
  res.json({ success: true, data: data[0] });
});
 
// ── DASHBOARD STATS ───────────────────────────────────────
app.get('/api/dashboard/stats', authMiddleware, async (req, res) => {
  const [stu, cls, adm, pendAdm, fees, results, notices] = await Promise.all([
    supabase.from('students').select('id', { count: 'exact', head: true }),
    supabase.from('classes').select('id', { count: 'exact', head: true }),
    supabase.from('admissions').select('id', { count: 'exact', head: true }),
    supabase.from('admissions').select('id', { count: 'exact', head: true }).eq('status', 'Pending'),
    supabase.from('fee_payments').select('amount,status'),
    supabase.from('results').select('status'),
    supabase.from('notices').select('id', { count: 'exact', head: true }).eq('active', true),
  ]);
 
  const feesPaid = (fees.data || []).filter(f => f.status === 'Paid').reduce((s, f) => s + f.amount, 0);
  const feesPending = (fees.data || []).filter(f => f.status === 'Pending').reduce((s, f) => s + f.amount, 0);
  const resCount = (results.data || []).length;
  const passCount = (results.data || []).filter(r => r.status === 'Pass').length;
 
  res.json({
    success: true, data: {
      students: stu.count || 0,
      classes: cls.count || 0,
      admissions: adm.count || 0,
      pendingAdmissions: pendAdm.count || 0,
      feesPaid, feesPending,
      results: resCount,
      passRate: resCount ? ((passCount / resCount) * 100).toFixed(1) : 0,
      notices: notices.count || 0
    }
  });
});
 
// ── STUDENTS ─────────────────────────────────────────────
app.get('/api/students', authMiddleware, async (req, res) => {
  let query = supabase.from('students').select('*').order('name');
  if (req.query.cls) query = query.eq('cls', req.query.cls);
  if (req.query.q) query = query.ilike('name', `%${req.query.q}%`);
  const { data, error } = await query;
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, data, total: data.length });
});
 
app.get('/api/students/:id', authMiddleware, async (req, res) => {
  const { data } = await supabase.from('students').select('*').eq('id', req.params.id).limit(1);
  if (!data?.[0]) return res.status(404).json({ success: false, message: 'Student not found.' });
  res.json({ success: true, data: data[0] });
});
 
app.post('/api/students', authMiddleware, async (req, res) => {
  try {
    const {
      name,
      cls,
      section,
      roll,
      fatherName,
      mobile,
      address,
      category,
      dob,
      gender
    } = req.body;

    if (!name || !cls || !roll) {
      return res.status(400).json({
        success: false,
        message: 'Name, class and roll number are required.'
      });
    }

    const newStudent = {
      id: 'S' + uuidv4().slice(0, 6).toUpperCase(),
      name,
      cls,
      section: section || 'A',
      roll,
      father_name: fatherName || '',
      mobile: mobile || '',
      address: address || '',
      category: category || '',
      dob: dob || null,
      gender: gender || '',
      created_at: new Date().toISOString()
    };

    console.log('Saving student:', newStudent);

    const { data, error } = await supabase
      .from('students')
      .insert([newStudent])
      .select()
      .single();

    if (error) {
      console.error('SUPABASE INSERT ERROR:', error);

      return res.status(500).json({
        success: false,
        message: error.message,
        error
      });
    }

    console.log('Student saved successfully');

    return res.status(201).json({
      success: true,
      message: 'Student added successfully.',
      data
    });
  } catch (err) {
    console.error('SERVER ERROR:', err);

    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
});
 
app.put('/api/students/:id', authMiddleware, async (req, res) => {
  const { data: existing } = await supabase.from('students').select('id').eq('id', req.params.id).limit(1);
  if (!existing?.[0]) return res.status(404).json({ success: false, message: 'Student not found.' });
  // Normalize camelCase to snake_case for Supabase
  const body = { ...req.body };
  if (body.fatherName !== undefined) { body.father_name = body.fatherName; delete body.fatherName; }
  if (body.createdAt !== undefined) { body.created_at = body.createdAt; delete body.createdAt; }
  const { data, error } = await supabase.from('students').update(body).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ success: false, message: error.message });
  await auditLog('UPDATE', 'Student', `Updated student ID: ${req.params.id}`, req.user);
  res.json({ success: true, message: 'Student updated successfully.', data });
});
 
app.delete('/api/students/:id', authMiddleware, roleMiddleware('superadmin'), async (req, res) => {
  const { data: existing } = await supabase.from('students').select('name').eq('id', req.params.id).limit(1);
  if (!existing?.[0]) return res.status(404).json({ success: false, message: 'Student not found.' });
  await supabase.from('students').delete().eq('id', req.params.id);
  await auditLog('DELETE', 'Student', `Deleted student: ${existing[0].name}`, req.user);
  res.json({ success: true, message: 'Student deleted successfully.' });
});
 
// ── FEE PAYMENTS ─────────────────────────────────────────
app.get('/api/fees', authMiddleware, async (req, res) => {
  let query = supabase.from('fee_payments').select('*').order('created_at', { ascending: false });
  if (req.query.cls) query = query.eq('cls', req.query.cls);
  if (req.query.status) query = query.eq('status', req.query.status);
  if (req.query.q) query = query.ilike('student_name', `%${req.query.q}%`);
  const { data, error } = await query;
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, data, total: data.length });
});
 
app.post('/api/fees', authMiddleware, async (req, res) => {
  const studentName = req.body.studentName || req.body.student_name;
  const studentId   = req.body.studentId   || req.body.student_id;
  const feeType     = req.body.feeType     || req.body.fee_type;
  const dueDate     = req.body.dueDate     || req.body.due_date;
  const { cls, amount, month } = req.body;
  if (!studentName || !cls || !amount) return res.status(400).json({ success: false, message: 'Missing required fields.' });
  const newFee = {
    id: 'F' + uuidv4().slice(0, 6).toUpperCase(),
    student_id: studentId, student_name: studentName, cls,
    fee_type: feeType, amount: Number(amount), status: 'Pending',
    due_date: dueDate, paid_date: null, month, receipt_no: null,
    created_at: new Date().toISOString()
  };
  const { data, error } = await supabase.from('fee_payments').insert(newFee).select().single();
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.status(201).json({ success: true, message: 'Fee record added.', data });
});
 
app.patch('/api/fees/:id/pay', authMiddleware, async (req, res) => {
  const { data: existing } = await supabase.from('fee_payments').select('id').eq('id', req.params.id).limit(1);
  if (!existing?.[0]) return res.status(404).json({ success: false, message: 'Fee record not found.' });
  const receiptNo = 'BA-RCP-' + Math.floor(1000 + Math.random() * 9000);
  const { data, error } = await supabase.from('fee_payments').update({
    status: 'Paid', paid_date: new Date().toISOString().split('T')[0], receipt_no: receiptNo
  }).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ success: false, message: error.message });
  await auditLog('PAY', 'Fee', `Marked fee ${req.params.id} as Paid, Receipt: ${receiptNo}`, req.user);
  res.json({ success: true, message: 'Fee marked as paid.', data });
});
 
app.patch('/api/fees/:id/status', authMiddleware, async (req, res) => {
  const { data, error } = await supabase.from('fee_payments').update({ status: req.body.status }).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, message: 'Status updated.', data });
});
 
app.delete('/api/fees/:id', authMiddleware, roleMiddleware('superadmin'), async (req, res) => {
  await supabase.from('fee_payments').delete().eq('id', req.params.id);
  res.json({ success: true, message: 'Fee record deleted.' });
});
 
// ── RESULTS (Admin) ───────────────────────────────────────
app.get('/api/results', authMiddleware, async (req, res) => {
  let query = supabase.from('results').select('*').order('created_at', { ascending: false });
  if (req.query.cls) query = query.eq('cls', req.query.cls);
  if (req.query.q) query = query.ilike('student_name', `%${req.query.q}%`);
  const { data, error } = await query;
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, data, total: data.length });
});
 
/**
 * PUBLIC result lookup – requires exact match of name + class + dob
 * Does NOT return data for everyone. Only the single verified student.
 */
app.post('/api/results/lookup', async (req, res) => {
  const { name, cls, dob } = req.body;
  if (!name || !cls || !dob)
    return res.status(400).json({ success: false, message: 'Name, class and date of birth are required.' });
 
  // First verify student exists with exact name+class+dob match
  const { data: students } = await supabase
    .from('students').select('id,name,cls,dob,father_name')
    .ilike('name', name.trim())
    .eq('cls', cls)
    .eq('dob', dob)
    .limit(1);
 
  if (!students?.length)
    return res.status(404).json({ success: false, message: 'No student found matching the provided details. Please check name, class and date of birth.' });
 
  const student = students[0];
 
  // Fetch results only for this verified student
  const { data: results } = await supabase
    .from('results').select('*')
    .eq('student_id', student.id)
    .order('created_at', { ascending: false });
 
  if (!results?.length)
    return res.status(404).json({ success: false, message: `Results for ${student.name} have not been published yet.` });
 
  res.json({
    success: true,
    student: { name: student.name, cls: student.cls, fatherName: student.father_name },
    data: results
  });
});
 
app.post('/api/results', authMiddleware, async (req, res) => {
  const studentName = req.body.studentName || req.body.student_name;
  const studentId   = req.body.studentId   || req.body.student_id;
  const { cls, roll, exam, marks } = req.body;
  if (!studentName || !cls || !marks) return res.status(400).json({ success: false, message: 'Missing required fields.' });
  const vals = Object.values(marks).map(Number);
  const total = vals.reduce((a, b) => a + b, 0);
  const percentage = parseFloat(((total / (vals.length * 100)) * 100).toFixed(1));
  const grade = percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B' : percentage >= 60 ? 'C' : percentage >= 33 ? 'D' : 'F';
  const status = vals.every(v => v >= 33) && percentage >= 33 ? 'Pass' : 'Fail';
  const newResult = {
    id: 'R' + uuidv4().slice(0, 6).toUpperCase(),
    student_id: studentId || null,
    student_name: studentName, cls, roll, exam,
    marks, total, percentage, grade, status,
    created_at: new Date().toISOString().split('T')[0]
  };
  const { data, error } = await supabase.from('results').insert(newResult).select().single();
  if (error) return res.status(500).json({ success: false, message: error.message });
  await auditLog('CREATE', 'Result', `Added result for ${studentName}`, req.user);
  res.status(201).json({ success: true, message: 'Result saved successfully.', data });
});
 
app.put('/api/results/:id', authMiddleware, async (req, res) => {
  const body = { ...req.body };
  if (body.studentName !== undefined) { body.student_name = body.studentName; delete body.studentName; }
  if (body.studentId   !== undefined) { body.student_id   = body.studentId;   delete body.studentId; }
  if (body.marks) {
    const vals = Object.values(body.marks).map(Number);
    body.total = vals.reduce((a, b) => a + b, 0);
    body.percentage = parseFloat(((body.total / (vals.length * 100)) * 100).toFixed(1));
    body.grade = body.percentage >= 90 ? 'A+' : body.percentage >= 80 ? 'A' : body.percentage >= 70 ? 'B' : body.percentage >= 60 ? 'C' : body.percentage >= 33 ? 'D' : 'F';
    body.status = vals.every(v => v >= 33) && body.percentage >= 33 ? 'Pass' : 'Fail';
  }
  const { data, error } = await supabase.from('results').update(body).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, message: 'Result updated.', data });
});
 
app.delete('/api/results/:id', authMiddleware, roleMiddleware('superadmin'), async (req, res) => {
  await supabase.from('results').delete().eq('id', req.params.id);
  res.json({ success: true, message: 'Result deleted.' });
});
 
// ── ADMISSIONS ────────────────────────────────────────────
app.get('/api/admissions', authMiddleware, async (req, res) => {
  let query = supabase.from('admissions').select('*').order('applied_date', { ascending: false });
  if (req.query.status) query = query.eq('status', req.query.status);
  if (req.query.q) query = query.or(`student_name.ilike.%${req.query.q}%,id.ilike.%${req.query.q}%`);
  const { data, error } = await query;
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, data, total: data.length });
});
 
app.post('/api/admissions', upload.single('photo'), async (req, res) => {
  try {
    // Accept both camelCase (from frontend form) and snake_case (from admin / imports)
    const studentName = req.body.studentName || req.body.student_name || '';
    const fatherName  = req.body.fatherName  || req.body.father_name  || '';
    const motherName  = req.body.motherName  || req.body.mother_name  || '';
    const prevSchool  = req.body.prevSchool  || req.body.prev_school  || '';
    const { cls, mobile, dob, gender, address, category, aadhaar } = req.body;

    console.log('ADMISSION REQUEST BODY:', req.body);

    if (!studentName || !fatherName || !cls || !mobile) {
      return res.status(400).json({
        success: false,
        message: 'Please fill all required fields: Student Name, Father Name, Class, Mobile.'
      });
    }

    // Use timestamp + uuid fragment for unique ID (avoids random collision on primary key)
    const newAdm = {
      id: 'BA-' + Date.now() + '-' + uuidv4().slice(0, 4).toUpperCase(),
      student_name: studentName,
      father_name: fatherName,
      mother_name: motherName,
      cls,
      mobile,
      dob: dob || null,
      gender: gender || '',
      address: address || '',
      category: category || '',
      aadhaar: aadhaar || '',
      prev_school: prevSchool,
      status: 'Pending',
      applied_date: new Date().toISOString(),
      // Photo stored in memory only; set to null (use Supabase Storage to persist later)
      photo: null
    };

    console.log('INSERTING ADMISSION:', newAdm);

    const { data, error } = await supabase
      .from('admissions')
      .insert([newAdm])
      .select()
      .single();

    if (error) {
      console.error('ADMISSION INSERT ERROR:', error);
      return res.status(500).json({
        success: false,
        message: error.message,
        detail: error
      });
    }

    console.log('Admission saved successfully:', data.id);

    return res.status(201).json({
      success: true,
      message: 'Application submitted successfully!',
      data
    });
  } catch (err) {
    console.error('SERVER ERROR in /api/admissions:', err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
});
 
app.patch('/api/admissions/:id/status', authMiddleware, async (req, res) => {
  const { data, error } = await supabase.from('admissions').update({ status: req.body.status }).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ success: false, message: error.message });
  await auditLog('UPDATE', 'Admission', `Changed admission ${req.params.id} status to ${req.body.status}`, req.user);
  res.json({ success: true, message: 'Status updated.', data });
});
 
app.delete('/api/admissions/:id', authMiddleware, roleMiddleware('superadmin'), async (req, res) => {
  await supabase.from('admissions').delete().eq('id', req.params.id);
  res.json({ success: true, message: 'Application deleted.' });
});
 
// ── CLASSES ───────────────────────────────────────────────
app.get('/api/classes', authMiddleware, async (req, res) => {
  const { data, error } = await supabase.from('classes').select('*').order('name');
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, data });
});
 
app.post('/api/classes', authMiddleware, async (req, res) => {
  const { name, section, teacher, students, room } = req.body;
  if (!name || !teacher) return res.status(400).json({ success: false, message: 'Class name and teacher are required.' });
  const cls = { id: 'C' + uuidv4().slice(0, 6).toUpperCase(), name, section: section || 'A', teacher, students: Number(students) || 0, room };
  const { data, error } = await supabase.from('classes').insert(cls).select().single();
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.status(201).json({ success: true, message: 'Class added.', data });
});
 
app.put('/api/classes/:id', authMiddleware, async (req, res) => {
  const body = { ...req.body };
  // Remove any camelCase duplicates that might conflict
  const { data, error } = await supabase.from('classes').update(body).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, message: 'Class updated.', data });
});
 
app.delete('/api/classes/:id', authMiddleware, roleMiddleware('superadmin'), async (req, res) => {
  await supabase.from('classes').delete().eq('id', req.params.id);
  res.json({ success: true, message: 'Class deleted.' });
});
 
// ── NOTICES ───────────────────────────────────────────────
app.get('/api/notices', async (req, res) => {
  const { data } = await supabase.from('notices').select('*').eq('active', true).order('date', { ascending: false });
  res.json({ success: true, data: data || [] });
});
 
app.get('/api/notices/all', authMiddleware, async (req, res) => {
  const { data } = await supabase.from('notices').select('*').order('date', { ascending: false });
  res.json({ success: true, data: data || [] });
});
 
app.post('/api/notices', authMiddleware, async (req, res) => {
  const { title, body, priority } = req.body;
  if (!title || !body) return res.status(400).json({ success: false, message: 'Title and body are required.' });
  const notice = { id: 'N' + uuidv4().slice(0, 6).toUpperCase(), title, body, priority: priority || 'medium', posted_by: req.user.name, date: new Date().toISOString().split('T')[0], active: true };
  const { data, error } = await supabase.from('notices').insert(notice).select().single();
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.status(201).json({ success: true, message: 'Notice posted.', data });
});
 
app.patch('/api/notices/:id', authMiddleware, async (req, res) => {
  const { data, error } = await supabase.from('notices').update(req.body).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, message: 'Notice updated.', data });
});
 
app.delete('/api/notices/:id', authMiddleware, async (req, res) => {
  await supabase.from('notices').delete().eq('id', req.params.id);
  res.json({ success: true, message: 'Notice deleted.' });
});
 
// ── ADMINS ────────────────────────────────────────────────
app.get('/api/admins', authMiddleware, roleMiddleware('superadmin'), async (req, res) => {
  const { data } = await supabase.from('admins').select('id,username,name,role,email,created_at');
  res.json({ success: true, data: data || [] });
});
 
app.post('/api/admins', authMiddleware, roleMiddleware('superadmin'), async (req, res) => {
  const { username, password, name, role, email } = req.body;
  if (!username || !password || !name) return res.status(400).json({ success: false, message: 'Username, password and name are required.' });
  const { data: existing } = await supabase.from('admins').select('id').eq('username', username).limit(1);
  if (existing?.length) return res.status(409).json({ success: false, message: 'Username already exists.' });
  const admin = { id: uuidv4(), username, password: bcrypt.hashSync(password, 10), name, role: role || 'staff', email, created_at: new Date().toISOString() };
  await supabase.from('admins').insert(admin);
  res.status(201).json({ success: true, message: 'Admin user created.' });
});
 
app.delete('/api/admins/:id', authMiddleware, roleMiddleware('superadmin'), async (req, res) => {
  if (req.params.id === 'admin-1') return res.status(403).json({ success: false, message: 'Cannot delete primary admin.' });
  await supabase.from('admins').delete().eq('id', req.params.id);
  res.json({ success: true, message: 'Admin deleted.' });
});
 
// ── AUDIT LOG ─────────────────────────────────────────────
app.get('/api/audit', authMiddleware, roleMiddleware('superadmin'), async (req, res) => {
  const { data } = await supabase.from('audit_log').select('*').order('timestamp', { ascending: false }).limit(100);
  res.json({ success: true, data: data || [] });
});
 
// ═══════════════════════════════════════════════════════════
// ── IMPORT / EXPORT ─────────────────────────────────────
// ═══════════════════════════════════════════════════════════
 
/**
 * EXPORT: Download any collection as JSON
 * GET /api/export/:collection?cls=Class 10
 * Collections: students, results, fees, admissions, classes, notices
 */
app.get('/api/export/:collection', authMiddleware, async (req, res) => {
  const tableMap = {
    students: 'students',
    results: 'results',
    fees: 'fee_payments',
    admissions: 'admissions',
    classes: 'classes',
    notices: 'notices'
  };
  const table = tableMap[req.params.collection];
  if (!table) return res.status(400).json({ success: false, message: 'Unknown collection.' });
 
  let query = supabase.from(table).select('*').order('id');
  if (req.query.cls && ['students', 'results', 'fees'].includes(req.params.collection)) {
    query = query.eq('cls', req.query.cls);
  }
 
  const { data, error } = await query;
  if (error) return res.status(500).json({ success: false, message: error.message });
 
  await auditLog('EXPORT', req.params.collection, `Exported ${data.length} ${req.params.collection} records`, req.user);
 
  // Return as downloadable JSON file
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.collection}_export_${new Date().toISOString().split('T')[0]}.json"`);
  res.setHeader('Content-Type', 'application/json');
  res.json({ exportedAt: new Date().toISOString(), collection: req.params.collection, count: data.length, data });
});
 
/**
 * EXPORT CSV: Download any collection as CSV
 * GET /api/export/:collection/csv
 */
app.get('/api/export/:collection/csv', authMiddleware, async (req, res) => {
  const tableMap = {
    students: 'students',
    results: 'results',
    fees: 'fee_payments',
    admissions: 'admissions',
    classes: 'classes'
  };
  const table = tableMap[req.params.collection];
  if (!table) return res.status(400).json({ success: false, message: 'Unknown collection.' });
 
  let query = supabase.from(table).select('*').order('id');
  if (req.query.cls && ['students', 'results', 'fees'].includes(req.params.collection)) {
    query = query.eq('cls', req.query.cls);
  }
 
  const { data, error } = await query;
  if (error) return res.status(500).json({ success: false, message: error.message });
 
  if (!data.length) return res.status(404).json({ success: false, message: 'No data to export.' });
 
  // Flatten nested objects (marks)
  const flattened = data.map(row => {
    const flat = {};
    for (const [key, val] of Object.entries(row)) {
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        for (const [k2, v2] of Object.entries(val)) flat[`${key}_${k2}`] = v2;
      } else {
        flat[key] = val;
      }
    }
    return flat;
  });
 
  const headers = Object.keys(flattened[0]);
  const csv = [
    headers.join(','),
    ...flattened.map(row => headers.map(h => {
      const v = row[h] ?? '';
      return typeof v === 'string' && (v.includes(',') || v.includes('"') || v.includes('\n'))
        ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(','))
  ].join('\n');
 
  await auditLog('EXPORT', req.params.collection, `CSV exported ${data.length} records`, req.user);
 
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.collection}_${new Date().toISOString().split('T')[0]}.csv"`);
  res.setHeader('Content-Type', 'text/csv');
  res.send(csv);
});
 
/**
 * IMPORT: Bulk insert from JSON array
 * POST /api/import/:collection
 * Body: { data: [...records] }
 * Mode: upsert (update if id exists, insert if not)
 */
app.post('/api/import/:collection', authMiddleware, roleMiddleware('superadmin'), async (req, res) => {
  const tableMap = {
    students: 'students',
    results: 'results',
    fees: 'fee_payments',
    admissions: 'admissions',
    classes: 'classes'
  };
  const table = tableMap[req.params.collection];
  if (!table) return res.status(400).json({ success: false, message: 'Unknown collection.' });
 
  const records = req.body.data;
  if (!Array.isArray(records) || !records.length)
    return res.status(400).json({ success: false, message: 'Provide a non-empty "data" array.' });
 
  if (records.length > 500)
    return res.status(400).json({ success: false, message: 'Max 500 records per import.' });
 
  // Assign IDs to any records that don't have them
  const prefixMap = { students: 'S', results: 'R', fee_payments: 'F', admissions: 'BA-', classes: 'C' };
  const prefix = prefixMap[table] || 'X';
  const prepared = records.map(r => ({
    ...r,
    id: r.id || prefix + uuidv4().slice(0, 6).toUpperCase()
  }));
 
  const { data, error } = await supabase.from(table).upsert(prepared, { onConflict: 'id' }).select();
  if (error) return res.status(500).json({ success: false, message: error.message });
 
  await auditLog('IMPORT', req.params.collection, `Imported ${prepared.length} ${req.params.collection} records`, req.user);
  res.json({ success: true, message: `${data.length} records imported successfully.`, count: data.length });
});
 
app.use((err, req, res, next) => {
  console.error('UNHANDLED ERROR:', err);

  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});
// ─── Start Server ─────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🏫 Balaji Academy Backend Server (Supabase Edition)`);
  console.log(`📡 Running at: http://localhost:${PORT}`);
  console.log(`📊 API Base:   http://localhost:${PORT}/api`);
  console.log(`🗄️  Database:   Supabase (${SUPABASE_URL})`);
  console.log(`\n✅ Server ready!\n`);
});
 
module.exports = app;
