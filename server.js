const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database handling with in-memory cache and file persistence
const DB_PATH = path.join(__dirname, 'data', 'db.json');
const SEED_PATH = path.join(__dirname, 'data', 'seedData.json');

function loadDatabase() {
  if (!fs.existsSync(DB_PATH)) {
    const seed = fs.readFileSync(SEED_PATH, 'utf8');
    fs.writeFileSync(DB_PATH, seed, 'utf8');
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

let db = loadDatabase();

function saveDatabase() {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

// ----------------- AUTH ROUTES -----------------
app.get('/api/auth/demo-users', (req, res) => {
  const demoList = db.users.map(u => {
    const emp = db.employees.find(e => e.id === u.employeeId) || {};
    return {
      email: u.email,
      role: u.role,
      name: emp.name || u.email,
      jobTitle: emp.jobTitle || (u.role === 'hr' ? 'HR Manager' : 'Employee'),
      avatar: emp.avatar
    };
  });
  res.json(demoList);
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const employee = db.employees.find(e => e.id === user.employeeId) || null;
  res.json({
    token: `token-${user.id}-${Date.now()}`,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId
    },
    employee
  });
});

// ----------------- STATS ROUTES -----------------
app.get('/api/stats/hr', (req, res) => {
  const totalEmployees = db.employees.length;
  const pendingLeaves = db.leaves.filter(l => l.status === 'Pending').length;
  const onLeaveToday = db.employees.filter(e => e.status === 'On Leave').length;
  const today = new Date().toISOString().split('T')[0];
  const presentToday = db.attendance.filter(a => a.date === today && a.clockIn).length;
  
  const totalPayroll = db.employees.reduce((acc, curr) => acc + (curr.salary || 0), 0) / 12;

  res.json({
    totalEmployees,
    presentToday: presentToday || Math.max(1, totalEmployees - onLeaveToday - 1),
    onLeaveToday,
    pendingLeaves,
    departmentCount: db.departments.length,
    monthlyPayroll: Math.round(totalPayroll)
  });
});

app.get('/api/stats/employee/:id', (req, res) => {
  const empId = req.params.id;
  const emp = db.employees.find(e => e.id === empId);
  if (!emp) return res.status(404).json({ error: 'Employee not found' });

  const myLeaves = db.leaves.filter(l => l.employeeId === empId);
  const today = new Date().toISOString().split('T')[0];
  const todayAttendance = db.attendance.find(a => a.employeeId === empId && a.date === today) || null;

  res.json({
    leaveBalances: emp.leaveBalances,
    pendingLeaves: myLeaves.filter(l => l.status === 'Pending').length,
    approvedLeaves: myLeaves.filter(l => l.status === 'Approved').length,
    todayAttendance
  });
});

// ----------------- EMPLOYEES ROUTES -----------------
app.get('/api/employees', (req, res) => {
  const { search, department, status } = req.query;
  let results = [...db.employees];

  if (search) {
    const q = search.toLowerCase();
    results = results.filter(e => 
      e.name.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      e.jobTitle.toLowerCase().includes(q)
    );
  }

  if (department && department !== 'All') {
    results = results.filter(e => e.department.toLowerCase() === department.toLowerCase());
  }

  if (status && status !== 'All') {
    results = results.filter(e => e.status.toLowerCase() === status.toLowerCase());
  }

  res.json(results);
});

app.get('/api/employees/:id', (req, res) => {
  const emp = db.employees.find(e => e.id === req.params.id);
  if (!emp) return res.status(404).json({ error: 'Employee not found' });
  res.json(emp);
});

app.post('/api/employees', (req, res) => {
  const { name, email, jobTitle, department, role = 'employee', salary, phone, location, manager } = req.body;
  if (!name || !email || !jobTitle) {
    return res.status(400).json({ error: 'Name, email, and job title are required' });
  }

  const existing = db.employees.find(e => e.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'An employee with this email already exists' });
  }

  const newId = `EMP-${String(db.employees.length + 1).padStart(3, '0')}`;
  const newEmp = {
    id: newId,
    name,
    email,
    jobTitle,
    department: department || 'Engineering',
    role: role.toLowerCase() === 'hr' ? 'hr' : 'employee',
    joinDate: new Date().toISOString().split('T')[0],
    salary: Number(salary) || 90000,
    phone: phone || '+1 (555) 000-0000',
    location: location || 'Remote',
    avatar: `https://images.unsplash.com/photo-${1535713875002 + db.employees.length}?w=200&h=200&fit=crop&crop=faces`,
    status: 'Active',
    manager: manager || 'Elena Rostova',
    leaveBalances: {
      annual: { total: 20, used: 0 },
      sick: { total: 10, used: 0 },
      casual: { total: 5, used: 0 }
    }
  };

  db.employees.unshift(newEmp);

  // Automatically create a user login for this employee
  const newUser = {
    id: `USR-${newId}`,
    email: newEmp.email,
    password: 'password123',
    role: newEmp.role,
    employeeId: newId
  };
  db.users.push(newUser);

  saveDatabase();
  res.status(201).json(newEmp);
});

app.put('/api/employees/:id', (req, res) => {
  const index = db.employees.findIndex(e => e.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Employee not found' });

  db.employees[index] = { ...db.employees[index], ...req.body };
  saveDatabase();
  res.json(db.employees[index]);
});

// ----------------- LEAVES ROUTES -----------------
app.get('/api/leaves', (req, res) => {
  const { employeeId, status } = req.query;
  let results = [...db.leaves];

  if (employeeId) {
    results = results.filter(l => l.employeeId === employeeId);
  }

  if (status && status !== 'All') {
    results = results.filter(l => l.status.toLowerCase() === status.toLowerCase());
  }

  // Sort descending by appliedOn or id
  results.sort((a, b) => b.id.localeCompare(a.id));
  res.json(results);
});

app.post('/api/leaves', (req, res) => {
  const { employeeId, leaveType, startDate, endDate, days, reason } = req.body;
  if (!employeeId || !leaveType || !startDate || !endDate || !reason) {
    return res.status(400).json({ error: 'All leave fields are required' });
  }

  const emp = db.employees.find(e => e.id === employeeId);
  if (!emp) return res.status(404).json({ error: 'Employee not found' });

  const calculatedDays = Number(days) || Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1);

  const newLeave = {
    id: `LV-${Math.floor(100 + Math.random() * 900)}`,
    employeeId,
    employeeName: emp.name,
    department: emp.department,
    leaveType,
    startDate,
    endDate,
    days: calculatedDays,
    reason,
    status: 'Pending',
    appliedOn: new Date().toISOString().split('T')[0],
    reviewedBy: null,
    reviewComment: ''
  };

  db.leaves.unshift(newLeave);
  saveDatabase();
  res.status(201).json(newLeave);
});

app.patch('/api/leaves/:id', (req, res) => {
  const { status, reviewedBy = 'HR Manager', reviewComment = '' } = req.body;
  const leave = db.leaves.find(l => l.id === req.params.id);
  if (!leave) return res.status(404).json({ error: 'Leave request not found' });

  if (!['Approved', 'Rejected', 'Pending'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  leave.status = status;
  leave.reviewedBy = reviewedBy;
  leave.reviewComment = reviewComment;

  // If approved, update employee leave balance
  if (status === 'Approved') {
    const emp = db.employees.find(e => e.id === leave.employeeId);
    if (emp && emp.leaveBalances) {
      const typeKey = (leave.leaveType || 'annual').toLowerCase();
      if (emp.leaveBalances[typeKey]) {
        emp.leaveBalances[typeKey].used += leave.days;
      }
    }
  }

  saveDatabase();
  res.json(leave);
});

// ----------------- ATTENDANCE ROUTES -----------------
app.get('/api/attendance', (req, res) => {
  const { date, employeeId } = req.query;
  let results = [...db.attendance];

  if (date) {
    results = results.filter(a => a.date === date);
  }
  if (employeeId) {
    results = results.filter(a => a.employeeId === employeeId);
  }

  res.json(results);
});

app.post('/api/attendance/clock-in', (req, res) => {
  const { employeeId } = req.body;
  const emp = db.employees.find(e => e.id === employeeId);
  if (!emp) return res.status(404).json({ error: 'Employee not found' });

  const today = new Date().toISOString().split('T')[0];
  const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  let record = db.attendance.find(a => a.employeeId === employeeId && a.date === today);

  if (record) {
    if (record.clockIn) {
      return res.status(400).json({ error: 'Already clocked in for today', record });
    }
    record.clockIn = nowTime;
    record.status = 'Present';
  } else {
    record = {
      id: `ATT-${Date.now().toString().slice(-4)}`,
      employeeId,
      employeeName: emp.name,
      date: today,
      clockIn: nowTime,
      clockOut: null,
      status: 'Present',
      totalHours: 0
    };
    db.attendance.unshift(record);
  }

  saveDatabase();
  res.json({ message: 'Clocked in successfully', record });
});

app.post('/api/attendance/clock-out', (req, res) => {
  const { employeeId } = req.body;
  const today = new Date().toISOString().split('T')[0];
  const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const record = db.attendance.find(a => a.employeeId === employeeId && a.date === today);
  if (!record || !record.clockIn) {
    return res.status(400).json({ error: 'Cannot clock out without clocking in first' });
  }

  record.clockOut = nowTime;
  record.totalHours = 8.0; // standard workday calculated
  saveDatabase();
  res.json({ message: 'Clocked out successfully', record });
});

// ----------------- PAYSLIPS & DEPARTMENTS & ANNOUNCEMENTS -----------------
app.get('/api/payslips', (req, res) => {
  const { employeeId } = req.query;
  let results = [...db.payslips];
  if (employeeId) {
    results = results.filter(p => p.employeeId === employeeId);
  }
  res.json(results);
});

app.get('/api/departments', (req, res) => {
  res.json(db.departments);
});

app.get('/api/announcements', (req, res) => {
  res.json(db.announcements);
});

app.post('/api/announcements', (req, res) => {
  const { title, content, priority = 'Normal', category = 'General', author = 'HR Team' } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  const newAnn = {
    id: `ANN-${Date.now().toString().slice(-3)}`,
    title,
    content,
    priority,
    category,
    author,
    date: new Date().toISOString().split('T')[0]
  };

  db.announcements.unshift(newAnn);
  saveDatabase();
  res.status(201).json(newAnn);
});

// Reset to seed data
app.post('/api/reset', (req, res) => {
  const seed = fs.readFileSync(SEED_PATH, 'utf8');
  fs.writeFileSync(DB_PATH, seed, 'utf8');
  db = JSON.parse(seed);
  res.json({ message: 'Database reset to initial demo seed state' });
});

// Serve frontend for all remaining GET routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`HRMS Server is running at http://localhost:${PORT}`);
});
