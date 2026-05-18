/**
 * BALAJI ACADEMY – Backend Server
 * Node.js + Express + LowDB (JSON file database)
 * Port: 3001
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

// ─── Init ────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'balaji_academy_secret_key_2024';
const DB_PATH = path.join(__dirname, 'db.json');
const UPLOAD_DIR = path.join(__dirname, '../public/uploads');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ─── Database ────────────────────────────────────────────
const adapter = new FileSync(DB_PATH);
const db = low(adapter);

db.defaults({
  admins: [
    {
      id: 'admin-1',
      username: 'admin',
      password: bcrypt.hashSync('admin@123', 10),
      name: 'Principal Admin',
      role: 'superadmin',
      email: 'admin@balajiacademy.in',
      createdAt: new Date().toISOString()
    },
    {
      id: 'admin-2',
      username: 'accountant',
      password: bcrypt.hashSync('fees@123', 10),
      name: 'Fees Accountant',
      role: 'accountant',
      email: 'accounts@balajiacademy.in',
      createdAt: new Date().toISOString()
    }
  ],
  students: [
    { id: 'S001', name: 'Rahul Kumar Gupta', cls: 'Class 10', section: 'A', roll: '2024-10-01', fatherName: 'Suresh Gupta', mobile: '9876543210', address: 'Gursahaiganj, Kannauj', category: 'General', dob: '2010-05-14', gender: 'Male', createdAt: '2024-04-01' },
    { id: 'S002', name: 'Priya Dubey', cls: 'Class 8', section: 'A', roll: '2024-08-12', fatherName: 'Ravi Dubey', mobile: '9812345678', address: 'Tirwa, Kannauj', category: 'OBC', dob: '2012-08-22', gender: 'Female', createdAt: '2024-04-01' },
    { id: 'S003', name: 'Amit Singh Yadav', cls: 'Class 12', section: 'A', roll: '2024-12-03', fatherName: 'Ramesh Yadav', mobile: '9900112233', address: 'Kannauj City', category: 'OBC', dob: '2007-11-30', gender: 'Male', createdAt: '2024-04-01' },
    { id: 'S004', name: 'Sunita Kushwaha', cls: 'Class 9', section: 'A', roll: '2024-09-07', fatherName: 'Dinesh Kushwaha', mobile: '9988776655', address: 'Umarda, Kannauj', category: 'SC', dob: '2011-03-18', gender: 'Female', createdAt: '2024-04-01' },
    { id: 'S005', name: 'Deepak Vishwakarma', cls: 'Class 6', section: 'A', roll: '2024-06-04', fatherName: 'Ashok Vishwakarma', mobile: '9765432108', address: 'Gursahaiganj', category: 'OBC', dob: '2013-07-09', gender: 'Male', createdAt: '2024-04-01' },
    { id: 'S006', name: 'Kavita Prajapati', cls: 'Class 7', section: 'A', roll: '2024-07-09', fatherName: 'Sunil Prajapati', mobile: '9234567891', address: 'Kanpur Road, Kannauj', category: 'OBC', dob: '2012-12-05', gender: 'Female', createdAt: '2024-04-01' },
    { id: 'S007', name: 'Rohit Nishad', cls: 'Class 5', section: 'A', roll: '2024-05-11', fatherName: 'Harish Nishad', mobile: '9123456780', address: 'Dibiyapur, Kannauj', category: 'SC', dob: '2014-02-28', gender: 'Male', createdAt: '2024-04-01' },
    { id: 'S008', name: 'Anita Maurya', cls: 'Class 11', section: 'A', roll: '2024-11-06', fatherName: 'Ramakant Maurya', mobile: '9876501234', address: 'Sarai Akil, Kannauj', category: 'OBC', dob: '2008-09-15', gender: 'Female', createdAt: '2024-04-01' },
  ],
  feePayments: [
    { id: 'F001', studentId: 'S001', studentName: 'Rahul Kumar Gupta', cls: 'Class 10', feeType: 'Tuition Fee', amount: 1500, status: 'Paid', dueDate: '2024-10-01', paidDate: '2024-09-28', month: 'October 2024', receiptNo: 'BA-RCP-001' },
    { id: 'F002', studentId: 'S002', studentName: 'Priya Dubey', cls: 'Class 8', feeType: 'Tuition Fee', amount: 1300, status: 'Pending', dueDate: '2024-10-01', paidDate: null, month: 'October 2024', receiptNo: null },
    { id: 'F003', studentId: 'S003', studentName: 'Amit Singh Yadav', cls: 'Class 12', feeType: 'Annual Charges', amount: 4500, status: 'Partial', dueDate: '2024-09-30', paidDate: null, month: 'Annual 2024', receiptNo: null },
    { id: 'F004', studentId: 'S004', studentName: 'Sunita Kushwaha', cls: 'Class 9', feeType: 'Tuition Fee', amount: 1500, status: 'Paid', dueDate: '2024-10-01', paidDate: '2024-09-30', month: 'October 2024', receiptNo: 'BA-RCP-002' },
    { id: 'F005', studentId: 'S005', studentName: 'Deepak Vishwakarma', cls: 'Class 6', feeType: 'Exam Fee', amount: 700, status: 'Pending', dueDate: '2024-10-15', paidDate: null, month: 'Half-Yearly 2024', receiptNo: null },
    { id: 'F006', studentId: 'S006', studentName: 'Kavita Prajapati', cls: 'Class 7', feeType: 'Tuition Fee', amount: 1200, status: 'Paid', dueDate: '2024-10-01', paidDate: '2024-10-01', month: 'October 2024', receiptNo: 'BA-RCP-003' },
    { id: 'F007', studentId: 'S007', studentName: 'Rohit Nishad', cls: 'Class 5', feeType: 'Tuition Fee', amount: 1100, status: 'Partial', dueDate: '2024-10-01', paidDate: null, month: 'October 2024', receiptNo: null },
    { id: 'F008', studentId: 'S008', studentName: 'Anita Maurya', cls: 'Class 11', feeType: 'Annual Charges', amount: 4500, status: 'Paid', dueDate: '2024-09-30', paidDate: '2024-09-25', month: 'Annual 2024', receiptNo: 'BA-RCP-004' },
  ],
  results: [
    { id: 'R001', studentId: 'S001', studentName: 'Rahul Kumar Gupta', cls: 'Class 10', roll: '2024-10-01', exam: 'Half-Yearly Exam 2024', marks: { Hindi: 78, English: 82, Maths: 91, Science: 85, SocialScience: 74, Computer: 88 }, total: 498, percentage: 83.0, grade: 'A', status: 'Pass', createdAt: '2024-09-20' },
    { id: 'R002', studentId: 'S002', studentName: 'Priya Dubey', cls: 'Class 8', roll: '2024-08-12', exam: 'Half-Yearly Exam 2024', marks: { Hindi: 88, English: 90, Maths: 76, Science: 84, SocialScience: 91, Computer: 95 }, total: 524, percentage: 87.3, grade: 'A', status: 'Pass', createdAt: '2024-09-20' },
    { id: 'R003', studentId: 'S003', studentName: 'Amit Singh Yadav', cls: 'Class 12', roll: '2024-12-03', exam: 'Unit Test – II', marks: { Hindi: 55, English: 62, Maths: 48, Science: 58, SocialScience: 60, Computer: 70 }, total: 353, percentage: 58.8, grade: 'C', status: 'Pass', createdAt: '2024-09-20' },
    { id: 'R004', studentId: 'S004', studentName: 'Sunita Kushwaha', cls: 'Class 9', roll: '2024-09-07', exam: 'Half-Yearly Exam 2024', marks: { Hindi: 92, English: 88, Maths: 95, Science: 90, SocialScience: 85, Computer: 98 }, total: 548, percentage: 91.3, grade: 'A+', status: 'Pass', createdAt: '2024-09-20' },
    { id: 'R005', studentId: 'S005', studentName: 'Deepak Vishwakarma', cls: 'Class 6', roll: '2024-06-04', exam: 'Unit Test – I', marks: { Hindi: 35, English: 28, Maths: 40, Science: 32, SocialScience: 38, Computer: 45 }, total: 218, percentage: 36.3, grade: 'D', status: 'Fail', createdAt: '2024-09-20' },
  ],
  admissions: [
    { id: 'BA-1023', studentName: 'Ananya Singh', fatherName: 'Rajesh Singh', motherName: 'Meena Singh', cls: 'Class 6', mobile: '9876501234', dob: '2013-05-10', gender: 'Female', address: 'Gursahaiganj, Kannauj', category: 'General', aadhaar: '123456789012', prevSchool: 'GPS Gursahaiganj', status: 'Approved', appliedDate: '2024-09-05', photo: null },
    { id: 'BA-1024', studentName: 'Kartik Yadav', fatherName: 'Sunil Yadav', motherName: 'Savita Yadav', cls: 'Class 9', mobile: '9812345670', dob: '2010-08-22', gender: 'Male', address: 'Tirwa, Kannauj', category: 'OBC', aadhaar: '234567890123', prevSchool: 'Kendriya Vidyalaya', status: 'Pending', appliedDate: '2024-09-08', photo: null },
    { id: 'BA-1025', studentName: 'Meena Kumari', fatherName: 'Ram Prasad', motherName: 'Geeta Devi', cls: 'Class 1', mobile: '9900112233', dob: '2018-03-14', gender: 'Female', address: 'Dibiyapur, Kannauj', category: 'SC', aadhaar: '345678901234', prevSchool: '', status: 'Approved', appliedDate: '2024-09-12', photo: null },
    { id: 'BA-1026', studentName: 'Shivam Gupta', fatherName: 'Ashok Gupta', motherName: 'Rekha Gupta', cls: 'Class 11', mobile: '9988776655', dob: '2008-11-30', gender: 'Male', address: 'Kannauj City', category: 'General', aadhaar: '456789012345', prevSchool: 'St. Mary School Kannauj', status: 'Pending', appliedDate: '2024-09-14', photo: null },
    { id: 'BA-1027', studentName: 'Pooja Chauhan', fatherName: 'Virendra Chauhan', motherName: 'Nirmala Chauhan', cls: 'LKG', mobile: '9765432108', dob: '2021-07-19', gender: 'Female', address: 'Sarai Akil, Kannauj', category: 'General', aadhaar: '', prevSchool: '', status: 'Rejected', appliedDate: '2024-09-18', photo: null },
    { id: 'BA-1028', studentName: 'Rahul Tiwari', fatherName: 'Ravi Tiwari', motherName: 'Sunita Tiwari', cls: 'Class 3', mobile: '9234567891', dob: '2016-01-25', gender: 'Male', address: 'Umarda, Kannauj', category: 'General', aadhaar: '567890123456', prevSchool: 'GPS Umarda', status: 'Approved', appliedDate: '2024-09-20', photo: null },
  ],
  classes: [
    { id: 'C001', name: 'Nursery', section: 'A', teacher: 'Smt. Reena Verma', students: 28, room: '01' },
    { id: 'C002', name: 'LKG', section: 'A', teacher: 'Smt. Kavita Dubey', students: 32, room: '02' },
    { id: 'C003', name: 'UKG', section: 'A', teacher: 'Smt. Anita Mishra', students: 35, room: '03' },
    { id: 'C004', name: 'Class 1', section: 'A', teacher: 'Sh. Ram Prakash', students: 40, room: '04' },
    { id: 'C005', name: 'Class 5', section: 'A', teacher: 'Sh. Vijay Singh', students: 44, room: '08' },
    { id: 'C006', name: 'Class 8', section: 'A', teacher: 'Sh. Arvind Kumar', students: 46, room: '11' },
    { id: 'C007', name: 'Class 10', section: 'A', teacher: 'Sh. Santosh Yadav', students: 50, room: '13' },
    { id: 'C008', name: 'Class 12', section: 'A', teacher: 'Sh. Suresh Gupta', students: 34, room: '15' },
  ],
  notices: [
    { id: 'N001', title: 'Half-Yearly Exam Schedule', body: 'Half-Yearly Examinations will begin from 10 October 2024. All students must collect their admit cards from the office by 5 October.', priority: 'high', postedBy: 'Principal', date: '2024-09-25', active: true },
    { id: 'N002', title: 'Annual Prize Distribution', body: 'Annual Prize Distribution Ceremony will be held on 25 November 2024 at 4 PM in School Auditorium. All parents are cordially invited.', priority: 'medium', postedBy: 'Admin', date: '2024-09-22', active: true },
    { id: 'N003', title: 'Fee Payment Deadline', body: 'Last date for October 2024 fee submission is 15 October 2024. Late payment will attract fine of ₹50 per day.', priority: 'high', postedBy: 'Accounts', date: '2024-09-20', active: true },
    { id: 'N004', title: 'Diwali Holiday Notice', body: 'School will remain closed for Diwali holidays from 29 October to 3 November 2024. Classes will resume on 4 November 2024.', priority: 'low', postedBy: 'Principal', date: '2024-09-18', active: true },
  ],
  auditLog: []
}).write();

// ─── Middleware ──────────────────────────────────────────
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOAD_DIR));
app.use(express.static(path.join(__dirname, '../public')));

// Multer for photo uploads
const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s/g, '_'))
});
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } });

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

function auditLog(action, entity, details, user) {
  db.get('auditLog').push({
    id: uuidv4(), action, entity, details,
    performedBy: user?.name || 'System',
    timestamp: new Date().toISOString()
  }).write();
}

// ─── ROUTES ─────────────────────────────────────────────

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Balaji Academy API is running', time: new Date().toISOString() });
});

// ── AUTH ──────────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ success: false, message: 'Username and password are required.' });

  const admin = db.get('admins').find({ username }).value();
  if (!admin || !bcrypt.compareSync(password, admin.password))
    return res.status(401).json({ success: false, message: 'Invalid username or password.' });

  const token = jwt.sign(
    { id: admin.id, username: admin.username, name: admin.name, role: admin.role },
    JWT_SECRET, { expiresIn: '8h' }
  );
  auditLog('LOGIN', 'Auth', `User "${admin.username}" logged in`, admin);
  res.json({ success: true, token, user: { id: admin.id, username: admin.username, name: admin.name, role: admin.role, email: admin.email } });
});

app.post('/api/auth/logout', authMiddleware, (req, res) => {
  auditLog('LOGOUT', 'Auth', `User "${req.user.username}" logged out`, req.user);
  res.json({ success: true, message: 'Logged out successfully.' });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const admin = db.get('admins').find({ id: req.user.id }).value();
  if (!admin) return res.status(404).json({ success: false, message: 'User not found.' });
  const { password, ...safe } = admin;
  res.json({ success: true, data: safe });
});

// ── DASHBOARD STATS ───────────────────────────────────────
app.get('/api/dashboard/stats', authMiddleware, (req, res) => {
  const students = db.get('students').value().length;
  const classes = db.get('classes').value().length;
  const admissions = db.get('admissions').value().length;
  const pendingAdmissions = db.get('admissions').filter({ status: 'Pending' }).value().length;
  const feesPaid = db.get('feePayments').filter({ status: 'Paid' }).value().reduce((s, f) => s + f.amount, 0);
  const feesPending = db.get('feePayments').filter({ status: 'Pending' }).value().reduce((s, f) => s + f.amount, 0);
  const results = db.get('results').value().length;
  const passCount = db.get('results').filter({ status: 'Pass' }).value().length;
  const notices = db.get('notices').filter({ active: true }).value().length;
  res.json({
    success: true, data: {
      students, classes, admissions, pendingAdmissions,
      feesPaid, feesPending, results,
      passRate: results ? ((passCount / results) * 100).toFixed(1) : 0,
      notices
    }
  });
});

// ── STUDENTS ─────────────────────────────────────────────
app.get('/api/students', authMiddleware, (req, res) => {
  let data = db.get('students').value();
  if (req.query.cls) data = data.filter(s => s.cls === req.query.cls);
  if (req.query.q) {
    const q = req.query.q.toLowerCase();
    data = data.filter(s => s.name.toLowerCase().includes(q) || s.roll.toLowerCase().includes(q));
  }
  res.json({ success: true, data, total: data.length });
});

app.get('/api/students/:id', authMiddleware, (req, res) => {
  const student = db.get('students').find({ id: req.params.id }).value();
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
  res.json({ success: true, data: student });
});

app.post('/api/students', authMiddleware, (req, res) => {
  const { name, cls, section, roll, fatherName, mobile, address, category, dob, gender } = req.body;
  if (!name || !cls || !roll) return res.status(400).json({ success: false, message: 'Name, class and roll number are required.' });
  const newStudent = { id: 'S' + uuidv4().slice(0, 6).toUpperCase(), name, cls, section: section || 'A', roll, fatherName, mobile, address, category, dob, gender, createdAt: new Date().toISOString().split('T')[0] };
  db.get('students').push(newStudent).write();
  auditLog('CREATE', 'Student', `Added student: ${name}`, req.user);
  res.status(201).json({ success: true, message: 'Student added successfully.', data: newStudent });
});

app.put('/api/students/:id', authMiddleware, (req, res) => {
  const student = db.get('students').find({ id: req.params.id });
  if (!student.value()) return res.status(404).json({ success: false, message: 'Student not found.' });
  student.assign(req.body).write();
  auditLog('UPDATE', 'Student', `Updated student ID: ${req.params.id}`, req.user);
  res.json({ success: true, message: 'Student updated successfully.', data: student.value() });
});

app.delete('/api/students/:id', authMiddleware, roleMiddleware('superadmin'), (req, res) => {
  const student = db.get('students').find({ id: req.params.id }).value();
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
  db.get('students').remove({ id: req.params.id }).write();
  auditLog('DELETE', 'Student', `Deleted student: ${student.name}`, req.user);
  res.json({ success: true, message: 'Student deleted successfully.' });
});

// ── FEE PAYMENTS ─────────────────────────────────────────
app.get('/api/fees', authMiddleware, (req, res) => {
  let data = db.get('feePayments').value();
  if (req.query.cls) data = data.filter(f => f.cls === req.query.cls);
  if (req.query.status) data = data.filter(f => f.status === req.query.status);
  if (req.query.q) {
    const q = req.query.q.toLowerCase();
    data = data.filter(f => f.studentName.toLowerCase().includes(q));
  }
  res.json({ success: true, data, total: data.length });
});

app.post('/api/fees', authMiddleware, (req, res) => {
  const { studentId, studentName, cls, feeType, amount, dueDate, month } = req.body;
  if (!studentName || !cls || !amount) return res.status(400).json({ success: false, message: 'Missing required fields.' });
  const newFee = { id: 'F' + uuidv4().slice(0, 6).toUpperCase(), studentId, studentName, cls, feeType, amount: Number(amount), status: 'Pending', dueDate, paidDate: null, month, receiptNo: null, createdAt: new Date().toISOString() };
  db.get('feePayments').push(newFee).write();
  res.status(201).json({ success: true, message: 'Fee record added.', data: newFee });
});

app.patch('/api/fees/:id/pay', authMiddleware, (req, res) => {
  const fee = db.get('feePayments').find({ id: req.params.id });
  if (!fee.value()) return res.status(404).json({ success: false, message: 'Fee record not found.' });
  const receiptNo = 'BA-RCP-' + Math.floor(1000 + Math.random() * 9000);
  fee.assign({ status: 'Paid', paidDate: new Date().toISOString().split('T')[0], receiptNo }).write();
  auditLog('PAY', 'Fee', `Marked fee ${req.params.id} as Paid, Receipt: ${receiptNo}`, req.user);
  res.json({ success: true, message: 'Fee marked as paid.', data: fee.value() });
});

app.patch('/api/fees/:id/status', authMiddleware, (req, res) => {
  const fee = db.get('feePayments').find({ id: req.params.id });
  if (!fee.value()) return res.status(404).json({ success: false, message: 'Fee record not found.' });
  fee.assign({ status: req.body.status }).write();
  res.json({ success: true, message: 'Status updated.', data: fee.value() });
});

app.delete('/api/fees/:id', authMiddleware, roleMiddleware('superadmin'), (req, res) => {
  db.get('feePayments').remove({ id: req.params.id }).write();
  res.json({ success: true, message: 'Fee record deleted.' });
});

// ── RESULTS ──────────────────────────────────────────────
app.get('/api/results', authMiddleware, (req, res) => {
  let data = db.get('results').value();
  if (req.query.cls) data = data.filter(r => r.cls === req.query.cls);
  if (req.query.q) {
    const q = req.query.q.toLowerCase();
    data = data.filter(r => r.studentName.toLowerCase().includes(q));
  }
  res.json({ success: true, data, total: data.length });
});

app.post('/api/results', authMiddleware, (req, res) => {
  const { studentName, cls, roll, exam, marks } = req.body;
  if (!studentName || !cls || !marks) return res.status(400).json({ success: false, message: 'Missing required fields.' });
  const vals = Object.values(marks).map(Number);
  const total = vals.reduce((a, b) => a + b, 0);
  const percentage = parseFloat(((total / (vals.length * 100)) * 100).toFixed(1));
  const grade = percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B' : percentage >= 60 ? 'C' : percentage >= 33 ? 'D' : 'F';
  const status = vals.every(v => v >= 33) && percentage >= 33 ? 'Pass' : 'Fail';
  const newResult = { id: 'R' + uuidv4().slice(0, 6).toUpperCase(), studentName, cls, roll, exam, marks, total, percentage, grade, status, createdAt: new Date().toISOString().split('T')[0] };
  db.get('results').push(newResult).write();
  auditLog('CREATE', 'Result', `Added result for ${studentName}`, req.user);
  res.status(201).json({ success: true, message: 'Result saved successfully.', data: newResult });
});

app.put('/api/results/:id', authMiddleware, (req, res) => {
  const result = db.get('results').find({ id: req.params.id });
  if (!result.value()) return res.status(404).json({ success: false, message: 'Result not found.' });
  if (req.body.marks) {
    const vals = Object.values(req.body.marks).map(Number);
    req.body.total = vals.reduce((a, b) => a + b, 0);
    req.body.percentage = parseFloat(((req.body.total / (vals.length * 100)) * 100).toFixed(1));
    req.body.grade = req.body.percentage >= 90 ? 'A+' : req.body.percentage >= 80 ? 'A' : req.body.percentage >= 70 ? 'B' : req.body.percentage >= 60 ? 'C' : req.body.percentage >= 33 ? 'D' : 'F';
    req.body.status = vals.every(v => v >= 33) && req.body.percentage >= 33 ? 'Pass' : 'Fail';
  }
  result.assign(req.body).write();
  res.json({ success: true, message: 'Result updated.', data: result.value() });
});

app.delete('/api/results/:id', authMiddleware, roleMiddleware('superadmin'), (req, res) => {
  db.get('results').remove({ id: req.params.id }).write();
  res.json({ success: true, message: 'Result deleted.' });
});

// ── ADMISSIONS ────────────────────────────────────────────
app.get('/api/admissions', authMiddleware, (req, res) => {
  let data = db.get('admissions').value();
  if (req.query.status) data = data.filter(a => a.status === req.query.status);
  if (req.query.q) {
    const q = req.query.q.toLowerCase();
    data = data.filter(a => a.studentName.toLowerCase().includes(q) || a.id.toLowerCase().includes(q));
  }
  res.json({ success: true, data, total: data.length });
});

app.post('/api/admissions', upload.single('photo'), (req, res) => {
  const { studentName, fatherName, motherName, cls, mobile, dob, gender, address, category, aadhaar, prevSchool } = req.body;
  if (!studentName || !fatherName || !cls || !mobile)
    return res.status(400).json({ success: false, message: 'Please fill all required fields.' });
  if (!/^\d{10}$/.test(mobile))
    return res.status(400).json({ success: false, message: 'Invalid mobile number.' });
  const id = 'BA-' + Math.floor(1000 + Math.random() * 9000);
  const today = new Date().toISOString().split('T')[0];
  const newAdm = { id, studentName, fatherName, motherName, cls, mobile, dob, gender, address, category, aadhaar, prevSchool, status: 'Pending', appliedDate: today, photo: req.file ? req.file.filename : null };
  db.get('admissions').push(newAdm).write();
  res.status(201).json({ success: true, message: 'Application submitted successfully!', data: newAdm });
});

app.patch('/api/admissions/:id/status', authMiddleware, (req, res) => {
  const adm = db.get('admissions').find({ id: req.params.id });
  if (!adm.value()) return res.status(404).json({ success: false, message: 'Application not found.' });
  adm.assign({ status: req.body.status }).write();
  auditLog('UPDATE', 'Admission', `Changed admission ${req.params.id} status to ${req.body.status}`, req.user);
  res.json({ success: true, message: 'Status updated.', data: adm.value() });
});

app.delete('/api/admissions/:id', authMiddleware, roleMiddleware('superadmin'), (req, res) => {
  db.get('admissions').remove({ id: req.params.id }).write();
  res.json({ success: true, message: 'Application deleted.' });
});

// ── CLASSES ───────────────────────────────────────────────
app.get('/api/classes', authMiddleware, (req, res) => {
  res.json({ success: true, data: db.get('classes').value() });
});

app.post('/api/classes', authMiddleware, (req, res) => {
  const { name, section, teacher, students, room } = req.body;
  if (!name || !teacher) return res.status(400).json({ success: false, message: 'Class name and teacher are required.' });
  const cls = { id: 'C' + uuidv4().slice(0, 6).toUpperCase(), name, section: section || 'A', teacher, students: Number(students) || 0, room };
  db.get('classes').push(cls).write();
  res.status(201).json({ success: true, message: 'Class added.', data: cls });
});

app.put('/api/classes/:id', authMiddleware, (req, res) => {
  const cls = db.get('classes').find({ id: req.params.id });
  if (!cls.value()) return res.status(404).json({ success: false, message: 'Class not found.' });
  cls.assign(req.body).write();
  res.json({ success: true, message: 'Class updated.', data: cls.value() });
});

app.delete('/api/classes/:id', authMiddleware, roleMiddleware('superadmin'), (req, res) => {
  db.get('classes').remove({ id: req.params.id }).write();
  res.json({ success: true, message: 'Class deleted.' });
});

// ── NOTICES ───────────────────────────────────────────────
app.get('/api/notices', (req, res) => {
  const data = db.get('notices').filter({ active: true }).value();
  res.json({ success: true, data });
});

app.get('/api/notices/all', authMiddleware, (req, res) => {
  res.json({ success: true, data: db.get('notices').value() });
});

app.post('/api/notices', authMiddleware, (req, res) => {
  const { title, body, priority } = req.body;
  if (!title || !body) return res.status(400).json({ success: false, message: 'Title and body are required.' });
  const notice = { id: 'N' + uuidv4().slice(0, 6).toUpperCase(), title, body, priority: priority || 'medium', postedBy: req.user.name, date: new Date().toISOString().split('T')[0], active: true };
  db.get('notices').push(notice).write();
  res.status(201).json({ success: true, message: 'Notice posted.', data: notice });
});

app.patch('/api/notices/:id', authMiddleware, (req, res) => {
  const notice = db.get('notices').find({ id: req.params.id });
  if (!notice.value()) return res.status(404).json({ success: false, message: 'Notice not found.' });
  notice.assign(req.body).write();
  res.json({ success: true, message: 'Notice updated.', data: notice.value() });
});

app.delete('/api/notices/:id', authMiddleware, (req, res) => {
  db.get('notices').remove({ id: req.params.id }).write();
  res.json({ success: true, message: 'Notice deleted.' });
});

// ── ADMINS ────────────────────────────────────────────────
app.get('/api/admins', authMiddleware, roleMiddleware('superadmin'), (req, res) => {
  const data = db.get('admins').value().map(({ password, ...a }) => a);
  res.json({ success: true, data });
});

app.post('/api/admins', authMiddleware, roleMiddleware('superadmin'), (req, res) => {
  const { username, password, name, role, email } = req.body;
  if (!username || !password || !name) return res.status(400).json({ success: false, message: 'Username, password and name are required.' });
  if (db.get('admins').find({ username }).value()) return res.status(409).json({ success: false, message: 'Username already exists.' });
  const admin = { id: uuidv4(), username, password: bcrypt.hashSync(password, 10), name, role: role || 'staff', email, createdAt: new Date().toISOString() };
  db.get('admins').push(admin).write();
  res.status(201).json({ success: true, message: 'Admin user created.' });
});

app.delete('/api/admins/:id', authMiddleware, roleMiddleware('superadmin'), (req, res) => {
  if (req.params.id === 'admin-1') return res.status(403).json({ success: false, message: 'Cannot delete primary admin.' });
  db.get('admins').remove({ id: req.params.id }).write();
  res.json({ success: true, message: 'Admin deleted.' });
});

// ── AUDIT LOG ─────────────────────────────────────────────
app.get('/api/audit', authMiddleware, roleMiddleware('superadmin'), (req, res) => {
  const logs = db.get('auditLog').value().slice(-100).reverse();
  res.json({ success: true, data: logs });
});

// ─── Start Server ─────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🏫 Balaji Academy Backend Server`);
  console.log(`📡 Running at: http://localhost:${PORT}`);
  console.log(`📊 API Base:   http://localhost:${PORT}/api`);
  console.log(`\n🔑 Default Credentials:`);
  console.log(`   Admin:      username: admin      | password: admin@123`);
  console.log(`   Accountant: username: accountant | password: fees@123`);
  console.log(`\n✅ Server ready!\n`);
});

module.exports = app;
