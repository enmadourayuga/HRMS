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

// Helper: Extract authenticated user from Authorization header
function getAuthUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '').trim();
  const parts = token.split('-');
  if (parts.length >= 3) {
    const userId = parts.slice(1, -1).join('-');
    return db.users.find(u => u.id === userId) || null;
  }
  return null;
}

// Helper: Determine if a user has HR Administrator privileges
function isHrAdminUser(user) {
  if (!user) return false;
  if (user.role === 'hr_admin' || user.isHrAdmin === true) return true;
  const emp = db.employees.find(e => e.id === user.employeeId);
  if (emp && (emp.role === 'hr_admin' || emp.isHrAdmin === true)) return true;
  if (user.email && user.email.toLowerCase() === 'hr@hrms.com') return true;
  if (user.id === 'USR-HR-001' || user.employeeId === 'EMP-001') return true;
  return false;
}

// ----------------- AUTH ROUTES -----------------
app.get('/api/auth/demo-users', (req, res) => {
  const demoList = db.users.map(u => {
    const emp = db.employees.find(e => e.id === u.employeeId) || {};
    const isAdmin = isHrAdminUser(u);
    return {
      email: u.email,
      role: u.role,
      isHrAdmin: isAdmin,
      name: emp.name || u.email,
      jobTitle: emp.jobTitle || (isAdmin ? 'HR Administrator' : (u.role === 'hr' ? 'HR Specialist' : 'Employee')),
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
  const isHrAdmin = isHrAdminUser(user);

  res.json({
    token: `token-${user.id}-${Date.now()}`,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      isHrAdmin,
      employeeId: user.employeeId
    },
    employee: employee ? {
      ...employee,
      isHrAdmin
    } : null
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
  const authUser = getAuthUser(req);
  const { name, email, jobTitle, department, role = 'employee', salary, phone, location, manager, isHrAdmin } = req.body;

  if (!name || !email || !jobTitle) {
    return res.status(400).json({ error: 'Name, email, and job title are required' });
  }

  const targetRole = (role || 'employee').toLowerCase();
  const isCreatingHrAccount = targetRole === 'hr' || targetRole === 'hr_admin' || Boolean(isHrAdmin);

  // Authorization check: Only the HR Admin can create an HR account!
  if (isCreatingHrAccount) {
    if (!authUser) {
      return res.status(401).json({ error: 'Authentication required. Only the HR Admin can create a new HR account.' });
    }
    if (!isHrAdminUser(authUser)) {
      return res.status(403).json({ error: 'Access denied: Only the HR Admin can create a new HR account.' });
    }
  } else {
    // If creating a regular employee: must not be an unprivileged employee
    if (authUser && authUser.role === 'employee') {
      return res.status(403).json({ error: 'Access denied: Regular employees cannot create accounts.' });
    }
  }

  const existing = db.employees.find(e => e.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'An employee with this email already exists' });
  }

  const newId = `EMP-${String(db.employees.length + 1).padStart(3, '0')}`;
  const assignedRole = isCreatingHrAccount ? (targetRole === 'hr_admin' ? 'hr_admin' : 'hr') : 'employee';
  const assignedIsHrAdmin = isCreatingHrAccount && (targetRole === 'hr_admin' || Boolean(isHrAdmin));

  const newEmp = {
    id: newId,
    name,
    email,
    jobTitle,
    department: department || (isCreatingHrAccount ? 'Human Resources' : 'Engineering'),
    role: assignedRole,
    isHrAdmin: assignedIsHrAdmin,
    joinDate: new Date().toISOString().split('T')[0],
    salary: Number(salary) || (isCreatingHrAccount ? 1500000 : 900000),
    phone: phone || '+91 98765 00000',
    location: location || 'Bengaluru (HQ)',
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
    password: req.body.password || 'password123',
    role: newEmp.role,
    isHrAdmin: assignedIsHrAdmin,
    employeeId: newId
  };
  db.users.push(newUser);

  saveDatabase();
  res.status(201).json(newEmp);
});

// Dedicated endpoint: Only HR Admin can create an HR account
app.post('/api/hr-accounts', (req, res) => {
  const authUser = getAuthUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Authentication required. Only the HR Admin can create a new HR account.' });
  }
  if (!isHrAdminUser(authUser)) {
    return res.status(403).json({ error: 'Access denied: Only the HR Admin can create a new HR account.' });
  }

  const { name, email, jobTitle = 'HR Specialist', department = 'Human Resources', salary = 1400000, phone, location, isHrAdmin = false } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
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
    department: 'Human Resources',
    role: isHrAdmin ? 'hr_admin' : 'hr',
    isHrAdmin: Boolean(isHrAdmin),
    joinDate: new Date().toISOString().split('T')[0],
    salary: Number(salary) || 1400000,
    phone: phone || '+91 98765 00000',
    location: location || 'Bengaluru (HQ)',
    avatar: `https://images.unsplash.com/photo-${1535713875002 + db.employees.length}?w=200&h=200&fit=crop&crop=faces`,
    status: 'Active',
    manager: 'Elena Rostova',
    leaveBalances: {
      annual: { total: 22, used: 0 },
      sick: { total: 12, used: 0 },
      casual: { total: 6, used: 0 }
    }
  };

  db.employees.unshift(newEmp);

  const newUser = {
    id: `USR-${newId}`,
    email: newEmp.email,
    password: req.body.password || 'password123',
    role: newEmp.role,
    isHrAdmin: Boolean(isHrAdmin),
    employeeId: newId
  };
  db.users.push(newUser);

  saveDatabase();
  res.status(201).json({
    message: 'HR account created successfully',
    employee: newEmp,
    user: { id: newUser.id, email: newUser.email, role: newUser.role, isHrAdmin: newUser.isHrAdmin }
  });
});

app.put('/api/employees/:id', (req, res) => {
  const index = db.employees.findIndex(e => e.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Employee not found' });

  // If modifying role to HR or setting isHrAdmin
  const newRole = req.body.role ? req.body.role.toLowerCase() : null;
  const isGrantingHr = newRole === 'hr' || newRole === 'hr_admin' || req.body.isHrAdmin === true;

  if (isGrantingHr) {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ error: 'Authentication required. Only the HR Admin can assign HR privileges.' });
    }
    if (!isHrAdminUser(authUser)) {
      return res.status(403).json({ error: 'Access denied: Only the HR Admin can assign HR privileges or elevate an account to HR.' });
    }
  }

  db.employees[index] = { ...db.employees[index], ...req.body };

  // Keep db.users in sync if needed
  const user = db.users.find(u => u.employeeId === req.params.id);
  if (user) {
    if (req.body.role) user.role = req.body.role;
    if (req.body.isHrAdmin !== undefined) user.isHrAdmin = req.body.isHrAdmin;
    if (req.body.email) user.email = req.body.email;
  }

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
  const { employeeId, status, month, year } = req.query;
  const authUser = getAuthUser(req);
  let results = [...(db.payslips || [])];

  if (employeeId) {
    results = results.filter(p => p.employeeId === employeeId);
  }

  if (month) {
    results = results.filter(p => p.month.toLowerCase() === month.toLowerCase());
  }

  if (year) {
    results = results.filter(p => String(p.year) === String(year));
  }

  // Employees ONLY see Approved or Paid payslips! Unapproved/pending slips are strictly hidden from employees.
  if (authUser && authUser.role === 'employee') {
    results = results.filter(p => p.status === 'Approved' || p.status === 'Paid');
  } else if (!authUser && req.query.role === 'employee') {
    results = results.filter(p => p.status === 'Approved' || p.status === 'Paid');
  } else if (req.query.approvedOnly === 'true') {
    results = results.filter(p => p.status === 'Approved' || p.status === 'Paid');
  }

  if (status && status !== 'All') {
    results = results.filter(p => p.status.toLowerCase() === status.toLowerCase());
  }

  // Sort descending by payDate or year/month
  results.sort((a, b) => (b.payDate || '').localeCompare(a.payDate || ''));
  res.json(results);
});

app.get('/api/payslips/:id', (req, res) => {
  const authUser = getAuthUser(req);
  const slip = (db.payslips || []).find(p => p.id === req.params.id);
  if (!slip) return res.status(404).json({ error: 'Payslip not found' });

  // If employee requests an unapproved slip, forbid access
  if (authUser && authUser.role === 'employee' && slip.status !== 'Approved' && slip.status !== 'Paid') {
    return res.status(403).json({ error: 'This payslip has not been approved by HR yet' });
  }

  res.json(slip);
});

app.patch('/api/payslips/:id', (req, res) => {
  const { status, reviewedBy = 'Elena Rostova (HR)' } = req.body;
  const slip = (db.payslips || []).find(p => p.id === req.params.id);
  if (!slip) return res.status(404).json({ error: 'Payslip not found' });

  if (status && !['Approved', 'Pending Approval', 'Paid', 'Rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  if (status) {
    slip.status = status;
    slip.reviewedBy = reviewedBy;
    slip.approvedAt = (status === 'Approved' || status === 'Paid') 
      ? new Date().toISOString().split('T')[0] 
      : null;
  }

  saveDatabase();
  res.json(slip);
});

app.post('/api/payslips/approve-all', (req, res) => {
  const { month, year, reviewedBy = 'Elena Rostova (HR)' } = req.body;
  const today = new Date().toISOString().split('T')[0];
  let count = 0;

  (db.payslips || []).forEach(p => {
    const matchesMonth = month ? p.month.toLowerCase() === month.toLowerCase() : true;
    const matchesYear = year ? String(p.year) === String(year) : true;
    if (matchesMonth && matchesYear && p.status === 'Pending Approval') {
      p.status = 'Approved';
      p.reviewedBy = reviewedBy;
      p.approvedAt = today;
      count++;
    }
  });

  saveDatabase();
  res.json({ message: `Successfully approved ${count} payslip(s)`, count });
});

app.post('/api/payslips/generate-cycle', (req, res) => {
  const { month, year = 2026 } = req.body;
  if (!month) return res.status(400).json({ error: 'Month is required' });

  let added = 0;
  (db.employees || []).forEach(emp => {
    const existing = (db.payslips || []).find(p => 
      p.employeeId === emp.id && 
      p.month.toLowerCase() === month.toLowerCase() && 
      String(p.year) === String(year)
    );

    if (!existing) {
      const monthly = Math.round((emp.salary || 900000) / 12);
      const hra = Math.round(monthly * 0.40);
      const special = Math.round(monthly * 0.20);
      const conveyance = 1600;
      const gross = monthly + hra + special + conveyance;
      const tax = Math.round(gross * 0.10);
      const pf = Math.round(monthly * 0.12);
      const insurance = 1200;
      const totalDeductions = tax + pf + insurance;
      const net = gross - totalDeductions;

      const newSlip = {
        id: `PS-${year}-${month.slice(0, 3).toUpperCase()}-${emp.id.replace('EMP-', '')}`,
        employeeId: emp.id,
        employeeName: emp.name,
        month,
        year: Number(year),
        payDate: `${year}-${month === 'November' ? '11-30' : (month === 'December' ? '12-31' : '10-31')}`,
        baseSalary: monthly,
        allowances: { hra, specialAllowance: special, conveyance },
        deductions: { incomeTax: tax, providentFund: pf, healthInsurance: insurance },
        grossPay: gross,
        totalDeductions,
        netPay: net,
        status: 'Pending Approval',
        reviewedBy: null,
        approvedAt: null
      };

      if (!db.payslips) db.payslips = [];
      db.payslips.unshift(newSlip);
      added++;
    }
  });

  saveDatabase();
  res.json({ message: `Generated ${added} payslips in Pending Approval status for ${month} ${year}`, added });
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
