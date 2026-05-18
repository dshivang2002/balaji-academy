# 🏫 Balaji Academy – School Management System

**Full-Stack School Management System**  
Gursahaiganj, Kannauj, Uttar Pradesh

---

## 📁 Project Structure

```
balaji-academy/
├── backend/
│   └── server.js          ← Express API server
├── public/
│   ├── admin.html         ← Admin Panel (open in browser)
│   ├── uploads/           ← Uploaded photos
│   └── balaji_academy.html← Main frontend website
├── db.json                ← JSON database (auto-created)
├── package.json
└── README.md
```

---

## 🚀 Setup & Run

### Prerequisites
- **Node.js** v16 or higher → https://nodejs.org

### Step 1 – Install Dependencies
```bash
npm install
```

### Step 2 – Start Backend Server
```bash
npm start
```
Server runs at: **http://localhost:3001**

### Step 3 – Open the Apps
- **Frontend Website:** Open `public/balaji_academy.html` in browser
- **Admin Panel:** Open `public/admin.html` OR visit `http://localhost:3001/admin.html`

---

## 🔑 Default Login Credentials

| Role        | Username      | Password    | Access              |
|-------------|--------------|-------------|---------------------|
| Superadmin  | `admin`      | `admin@123` | Full access         |
| Accountant  | `accountant` | `fees@123`  | Fees + limited view |

> ⚠️ Change passwords after first login!

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint          | Description          |
|--------|------------------|----------------------|
| POST   | /api/auth/login  | Login, returns JWT   |
| POST   | /api/auth/logout | Logout               |
| GET    | /api/auth/me     | Get current user     |

### Dashboard
| Method | Endpoint             | Description          |
|--------|---------------------|----------------------|
| GET    | /api/dashboard/stats | Summary statistics   |

### Students
| Method | Endpoint            | Description          |
|--------|---------------------|----------------------|
| GET    | /api/students       | List (filter: cls, q)|
| GET    | /api/students/:id   | Get single student   |
| POST   | /api/students       | Add student          |
| PUT    | /api/students/:id   | Update student       |
| DELETE | /api/students/:id   | Delete (superadmin)  |

### Fees
| Method | Endpoint              | Description           |
|--------|-----------------------|-----------------------|
| GET    | /api/fees             | List (filter: cls, status, q) |
| POST   | /api/fees             | Add fee record        |
| PATCH  | /api/fees/:id/pay     | Mark as paid          |
| PATCH  | /api/fees/:id/status  | Update status         |
| DELETE | /api/fees/:id         | Delete (superadmin)   |

### Results
| Method | Endpoint          | Description          |
|--------|------------------|----------------------|
| GET    | /api/results      | List (filter: cls, q)|
| POST   | /api/results      | Add result           |
| PUT    | /api/results/:id  | Update result        |
| DELETE | /api/results/:id  | Delete (superadmin)  |

### Admissions
| Method | Endpoint                     | Description           |
|--------|------------------------------|-----------------------|
| GET    | /api/admissions              | List (filter: status, q) |
| POST   | /api/admissions              | Submit application (public) |
| PATCH  | /api/admissions/:id/status   | Update status         |
| DELETE | /api/admissions/:id          | Delete (superadmin)   |

### Classes
| Method | Endpoint          | Description          |
|--------|------------------|----------------------|
| GET    | /api/classes      | List all classes     |
| POST   | /api/classes      | Add class            |
| PUT    | /api/classes/:id  | Update class         |
| DELETE | /api/classes/:id  | Delete (superadmin)  |

### Notices
| Method | Endpoint           | Description               |
|--------|-------------------|---------------------------|
| GET    | /api/notices      | Public active notices     |
| GET    | /api/notices/all  | All notices (auth req.)   |
| POST   | /api/notices      | Post notice               |
| PATCH  | /api/notices/:id  | Update/toggle notice      |
| DELETE | /api/notices/:id  | Delete notice             |

### Admin Users (Superadmin only)
| Method | Endpoint          | Description          |
|--------|------------------|----------------------|
| GET    | /api/admins       | List admins          |
| POST   | /api/admins       | Create admin         |
| DELETE | /api/admins/:id   | Delete admin         |

### Audit Log (Superadmin only)
| Method | Endpoint    | Description            |
|--------|------------|------------------------|
| GET    | /api/audit  | Last 100 log entries   |

---

## 🔐 Authentication
All protected routes require a **Bearer token** in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```
Token is returned on login and valid for **8 hours**.

---

## 🗄️ Database
Uses **LowDB** (JSON file database). Data is stored in `db.json` at the project root.

For production, replace with MySQL or PostgreSQL using the `mysql2` or `pg` npm package.

---

## 🌐 Connecting Frontend to Backend
In **admin.html** → Settings tab → update the API Base URL to your server's address.

For remote hosting: `https://your-domain.com/api`

---

## 📞 Contact
**Balaji Academy**, Gursahaiganj, Kannauj, Uttar Pradesh – 209721  
📱 +91 9876543210 | 📧 balajiacademy@gmail.com

---
*© 2024 Balaji Academy. All Rights Reserved.*
