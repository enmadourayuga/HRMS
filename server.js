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
  const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  if (!data.salaryStructures) {
    data.salaryStructures = [
      {
        id: "STR-001",
        name: "Standard Corporate Structure",
        description: "Default structure for full-time corporate and technical staff",
        basicPercentage: 50,
        hraPercentage: 30,
        specialAllowancePercentage: 15,
        conveyanceFixed: 1600,
        pfPercentage: 12,
        taxPercentage: 10,
        healthInsuranceFixed: 1200
      },
      {
        id: "STR-002",
        name: "Executive Leadership Structure",
        description: "Structure for senior management and executive team",
        basicPercentage: 45,
        hraPercentage: 35,
        specialAllowancePercentage: 18,
        conveyanceFixed: 3200,
        pfPercentage: 12,
        taxPercentage: 15,
        healthInsuranceFixed: 2500
      },
      {
        id: "STR-003",
        name: "Junior & Trainee Structure",
        description: "Structure for associates, trainees and interns",
        basicPercentage: 60,
        hraPercentage: 25,
        specialAllowancePercentage: 10,
        conveyanceFixed: 800,
        pfPercentage: 12,
        taxPercentage: 5,
        healthInsuranceFixed: 800
      }
    ];
  }
  if (!data.payrollPolicy) {
    data.payrollPolicy = {
      salaryDivisor: 30,
      defaultWorkHours: 8,
      latePenaltyThreshold: 3,
      latePenaltyDays: 0.5,
      requireAttendanceValidation: true
    };
  }
  if (!data.notifications) {
    data.notifications = [];
  }
  if (!data.biometricPunches) {
    data.biometricPunches = [];
  }
  if (!data.biometricSyncFailures) {
    data.biometricSyncFailures = [];
  }
  if (!data.attendanceCorrectionRequests) {
    data.attendanceCorrectionRequests = [];
  }
  return data;
}

let db = loadDatabase();

function saveDatabase() {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

// Helper: Extract authenticated user from Authorization or X-User-Email header
function getAuthUser(req) {
  const emailHeader = req.headers['x-user-email'];
  if (emailHeader) {
    const byEmail = (db.users || []).find(u => u.email.toLowerCase() === emailHeader.toLowerCase().trim());
    if (byEmail) return byEmail;
  }
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '').trim();
  const parts = token.split('-');
  if (parts.length >= 3) {
    const userId = parts.slice(1, -1).join('-');
    const byId = (db.users || []).find(u => u.id === userId);
    if (byId) return byId;
  }
  return (db.users || []).find(u => u.id === token || u.email.toLowerCase() === token.toLowerCase()) || null;
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

// Helper: Determine if a user is authorized for Payroll review, configuration and finalization
function isAuthorizedPayrollUser(user) {
  if (!user) return false;
  if (isHrAdminUser(user)) return true;
  if (user.role === 'finance' || user.role === 'hr') return true;
  const emp = db.employees.find(e => e.id === user.employeeId);
  if (emp && (emp.role === 'finance' || emp.role === 'hr')) return true;
  if (user.email && (user.email.toLowerCase() === 'finance@hrms.com' || user.email.toLowerCase() === 'hr@hrms.com')) return true;
  return false;
}

// ----------------- AUTH ROUTES -----------------
app.get('/api/auth/demo-users', (req, res) => {
  const demoList = db.users.map(u => {
    const emp = db.employees.find(e => e.id === u.employeeId) || {};
    const isAdmin = isHrAdminUser(u);
    let jobTitle = emp.jobTitle;
    if (!jobTitle) {
      if (isAdmin) jobTitle = 'HR Administrator';
      else if (u.role === 'finance') jobTitle = 'Finance Lead';
      else if (u.role === 'hr') jobTitle = 'HR Specialist';
      else jobTitle = 'Employee';
    }
    return {
      email: u.email,
      role: u.role,
      isHrAdmin: isAdmin,
      name: emp.name || u.email,
      jobTitle,
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

  // Check if deactivated (EMP-010)
  if (employee && employee.status === 'Inactive') {
    return res.status(403).json({ error: 'This employee account has been deactivated. Please contact HR.' });
  }

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
  const activeEmployees = db.employees.filter(e => e.status !== 'Inactive').length;
  const pendingLeaves = db.leaves.filter(l => l.status === 'Pending').length;
  const onLeaveToday = db.employees.filter(e => e.status === 'On Leave').length;
  const today = new Date().toISOString().split('T')[0];
  const presentToday = db.attendance.filter(a => a.date === today && a.clockIn).length;
  
  const totalPayroll = db.employees.filter(e => e.status !== 'Inactive').reduce((acc, curr) => acc + (curr.salary || 0), 0) / 12;

  res.json({
    totalEmployees,
    activeEmployees,
    presentToday: presentToday || Math.max(1, activeEmployees - onLeaveToday - 1),
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

// ----------------- EMPLOYEES ROUTES (MODULE 1: EMP-001 to EMP-010) -----------------
app.get('/api/employees', (req, res) => {
  const { search, department, status, employmentType } = req.query;
  let results = [...db.employees];

  if (search) {
    const q = search.toLowerCase();
    results = results.filter(e => 
      (e.name && e.name.toLowerCase().includes(q)) ||
      (e.email && e.email.toLowerCase().includes(q)) ||
      (e.jobTitle && e.jobTitle.toLowerCase().includes(q)) ||
      (e.id && e.id.toLowerCase().includes(q)) ||
      (e.biometricRef && e.biometricRef.toLowerCase().includes(q))
    );
  }

  if (department && department !== 'All') {
    results = results.filter(e => e.department && e.department.toLowerCase() === department.toLowerCase());
  }

  if (status && status !== 'All') {
    results = results.filter(e => e.status && e.status.toLowerCase() === status.toLowerCase());
  }

  if (employmentType && employmentType !== 'All') {
    results = results.filter(e => (e.employmentType || 'Full-Time').toLowerCase() === employmentType.toLowerCase());
  }

  res.json(results);
});

// EMP-009: View employee profile with full details and salary structure
app.get('/api/employees/:id', (req, res) => {
  const emp = db.employees.find(e => e.id === req.params.id);
  if (!emp) return res.status(404).json({ error: 'Employee not found' });
  
  const structure = (db.salaryStructures || []).find(s => s.id === (emp.salaryStructureId || 'STR-001')) || null;
  res.json({
    ...emp,
    salaryStructure: structure
  });
});

// EMP-001 to EMP-007: Add new employee
app.post('/api/employees', (req, res) => {
  const authUser = getAuthUser(req);
  const { 
    name, 
    email, 
    jobTitle, 
    department, 
    role = 'employee', 
    salary, 
    phone, 
    location, 
    manager, 
    isHrAdmin, 
    employmentType = 'Full-Time',
    joinDate, 
    biometricRef, 
    salaryStructureId = 'STR-001'
  } = req.body;

  if (!name || !email || !jobTitle) {
    return res.status(400).json({ error: 'Name, email, and job title are required' });
  }

  const targetRole = (role || 'employee').toLowerCase();
  const isCreatingHrAccount = targetRole === 'hr' || targetRole === 'hr_admin' || Boolean(isHrAdmin);

  // Authorization check: Only HR Admin can create HR accounts
  if (isCreatingHrAccount) {
    if (!authUser || !isHrAdminUser(authUser)) {
      return res.status(403).json({ error: 'Access denied: Only the HR Admin can create an HR account.' });
    }
  } else {
    if (authUser && authUser.role === 'employee') {
      return res.status(403).json({ error: 'Access denied: Regular employees cannot create accounts.' });
    }
  }

  const existing = db.employees.find(e => e.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'An employee with this email already exists' });
  }

  // EMP-002: System automatically generates a unique Employee ID
  const maxIdNum = db.employees.reduce((max, e) => {
    const m = String(e.id || '').match(/^EMP-(\d+)$/);
    return m ? Math.max(max, parseInt(m[1], 10)) : max;
  }, 0);
  const newId = `EMP-${String(maxIdNum + 1).padStart(3, '0')}`;

  const assignedRole = isCreatingHrAccount ? (targetRole === 'hr_admin' ? 'hr_admin' : 'hr') : (targetRole === 'finance' ? 'finance' : 'employee');
  const assignedIsHrAdmin = isCreatingHrAccount && (targetRole === 'hr_admin' || Boolean(isHrAdmin));

  const newEmp = {
    id: newId,
    name,
    email,
    jobTitle,
    department: department || (isCreatingHrAccount ? 'Human Resources' : 'Engineering'),
    role: assignedRole,
    employmentType: employmentType || 'Full-Time',
    isHrAdmin: assignedIsHrAdmin,
    // EMP-006: Assign joining date & salary structure
    joinDate: joinDate || new Date().toISOString().split('T')[0],
    salary: Number(salary) || (isCreatingHrAccount ? 1500000 : 900000),
    salaryStructureId: salaryStructureId || 'STR-001',
    // EMP-007: Register biometric identification reference
    biometricRef: biometricRef || `BIO-${newId}`,
    // EMP-003: Personal and contact details
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

// EMP-008: HR Manager can edit employee details
app.put('/api/employees/:id', (req, res) => {
  const index = db.employees.findIndex(e => e.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Employee not found' });

  const authUser = getAuthUser(req);
  const newRole = req.body.role ? req.body.role.toLowerCase() : null;
  const isGrantingHr = newRole === 'hr' || newRole === 'hr_admin' || req.body.isHrAdmin === true;

  if (isGrantingHr) {
    if (!authUser || !isHrAdminUser(authUser)) {
      return res.status(403).json({ error: 'Access denied: Only the HR Admin can assign HR privileges.' });
    }
  }

  const existing = db.employees[index];
  const updatedEmp = {
    ...existing,
    ...req.body,
    id: existing.id // protect ID
  };

  if (req.body.salary !== undefined) {
    updatedEmp.salary = Number(req.body.salary);
  }

  db.employees[index] = updatedEmp;

  // Keep db.users in sync
  const user = db.users.find(u => u.employeeId === req.params.id);
  if (user) {
    if (req.body.role) user.role = req.body.role;
    if (req.body.isHrAdmin !== undefined) user.isHrAdmin = req.body.isHrAdmin;
    if (req.body.email) user.email = req.body.email;
  }

  saveDatabase();
  res.json(db.employees[index]);
});

// EMP-010: HR Manager can deactivate employees
app.patch('/api/employees/:id/status', (req, res) => {
  const { status } = req.body;
  if (!status || !['Active', 'Inactive', 'On Leave'].includes(status)) {
    return res.status(400).json({ error: 'Valid status is required (Active, Inactive, On Leave)' });
  }

  const emp = db.employees.find(e => e.id === req.params.id);
  if (!emp) return res.status(404).json({ error: 'Employee not found' });

  emp.status = status;
  saveDatabase();
  res.json({ message: `Employee ${emp.id} status updated to ${status}`, employee: emp });
});

// Dedicated endpoint: Only HR Admin can create an HR account
app.post('/api/hr-accounts', (req, res) => {
  const authUser = getAuthUser(req);
  if (!authUser || !isHrAdminUser(authUser)) {
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

  const maxIdNum = db.employees.reduce((max, e) => {
    const m = String(e.id || '').match(/^EMP-(\d+)$/);
    return m ? Math.max(max, parseInt(m[1], 10)) : max;
  }, 0);
  const newId = `EMP-${String(maxIdNum + 1).padStart(3, '0')}`;

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
    salaryStructureId: 'STR-002',
    biometricRef: `BIO-${newId}`,
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

// ----------------- LEAVES ROUTES (MODULE 3: LEV-001 to LEV-012) -----------------
app.get('/api/leaves', (req, res) => {
  const { employeeId, status } = req.query;
  let results = [...db.leaves];

  if (employeeId) {
    results = results.filter(l => l.employeeId === employeeId);
  }

  if (status && status !== 'All') {
    results = results.filter(l => l.status.toLowerCase() === status.toLowerCase());
  }

  results.sort((a, b) => b.id.localeCompare(a.id));
  res.json(results);
});

// LEV-001 to LEV-005: Employee applies for leave with balance validation
app.post('/api/leaves', (req, res) => {
  const { employeeId, leaveType, startDate, endDate, days, reason } = req.body;
  if (!employeeId || !leaveType || !startDate || !endDate || !reason) {
    return res.status(400).json({ error: 'All leave fields are required' });
  }

  const emp = db.employees.find(e => e.id === employeeId);
  if (!emp) return res.status(404).json({ error: 'Employee not found' });

  // LEV-004: Calculate requested leave duration
  const calculatedDays = Number(days) || Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1);

  // LEV-005: System shall check available leave balance
  const typeKey = (leaveType || 'annual').toLowerCase();
  const balance = emp.leaveBalances ? emp.leaveBalances[typeKey] : null;
  if (balance) {
    const remaining = (balance.total || 0) - (balance.used || 0);
    if (calculatedDays > remaining) {
      return res.status(400).json({ 
        error: `Insufficient leave balance. You requested ${calculatedDays} day(s), but only ${remaining} day(s) remain for ${leaveType} leave.` 
      });
    }
  }

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

// LEV-008, LEV-009, LEV-010, LEV-011: Approve/reject leave, update balance, and notify employee
app.patch('/api/leaves/:id', (req, res) => {
  const { status, reviewedBy = 'HR Manager', reviewComment = '' } = req.body;
  const leave = db.leaves.find(l => l.id === req.params.id);
  if (!leave) return res.status(404).json({ error: 'Leave request not found' });

  if (!['Approved', 'Rejected', 'Pending'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const previousStatus = leave.status;
  leave.status = status;
  leave.reviewedBy = reviewedBy;
  leave.reviewComment = reviewComment;

  const emp = db.employees.find(e => e.id === leave.employeeId);
  const typeKey = (leave.leaveType || 'annual').toLowerCase();

  // LEV-010: System shall update leave balances after approval
  if (emp && emp.leaveBalances && emp.leaveBalances[typeKey]) {
    if (status === 'Approved' && previousStatus !== 'Approved') {
      emp.leaveBalances[typeKey].used += leave.days;
    } else if (status !== 'Approved' && previousStatus === 'Approved') {
      emp.leaveBalances[typeKey].used = Math.max(0, emp.leaveBalances[typeKey].used - leave.days);
    }
  }

  // LEV-011: System shall notify employees about approval or rejection
  if (status === 'Approved' || status === 'Rejected') {
    const notif = {
      id: `NTF-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      employeeId: leave.employeeId,
      title: `Leave Request ${status}`,
      message: `Your ${leave.leaveType} leave application for ${leave.startDate} to ${leave.endDate} (${leave.days} day(s)) has been ${status.toLowerCase()} by ${reviewedBy}.${reviewComment ? ' Note: ' + reviewComment : ''}`,
      type: status === 'Approved' ? 'leave_approved' : 'leave_rejected',
      referenceId: leave.id,
      createdAt: new Date().toISOString(),
      read: false
    };
    if (!db.notifications) db.notifications = [];
    db.notifications.unshift(notif);
  }

  saveDatabase();
  res.json(leave);
});

// Notifications routes (supporting LEV-011)
app.get('/api/notifications', (req, res) => {
  const { employeeId } = req.query;
  const authUser = getAuthUser(req);
  const targetEmpId = employeeId || (authUser ? authUser.employeeId : null);

  let list = db.notifications || [];
  if (targetEmpId) {
    list = list.filter(n => n.employeeId === targetEmpId);
  }
  res.json(list);
});

app.patch('/api/notifications/:id/read', (req, res) => {
  const notif = (db.notifications || []).find(n => n.id === req.params.id);
  if (!notif) return res.status(404).json({ error: 'Notification not found' });
  notif.read = true;
  saveDatabase();
  res.json(notif);
});

app.post('/api/notifications/mark-all-read', (req, res) => {
  const { employeeId } = req.body;
  let count = 0;
  (db.notifications || []).forEach(n => {
    if (!employeeId || n.employeeId === employeeId) {
      if (!n.read) {
        n.read = true;
        count++;
      }
    }
  });
  saveDatabase();
  res.json({ message: `Marked ${count} notifications as read`, count });
});

// ----------------- MODULE 2: ATTENDANCE MANAGEMENT & BIOMETRICS (ATT-001 to ATT-012, BR-ATT-01 to BR-ATT-06) -----------------

// Helper: Parse 12-hour or 24-hour time to minutes from midnight
function parseTimeToMinutes(t) {
  if (!t) return null;
  t = String(t).trim();
  const match12 = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match12) return null;
  let h = parseInt(match12[1], 10);
  const m = parseInt(match12[2], 10);
  const ampm = match12[3] ? match12[3].toUpperCase() : null;
  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return h * 60 + m;
}

// ATT-005: Calculate daily working hours based on check-in and check-out
function calculateWorkingHours(clockIn, clockOut) {
  if (!clockIn || !clockOut) return 0;
  const inMin = parseTimeToMinutes(clockIn);
  const outMin = parseTimeToMinutes(clockOut);
  if (inMin === null || outMin === null || outMin <= inMin) return 0;
  return Math.round(((outMin - inMin) / 60) * 10) / 10;
}

// ATT-001, ATT-004, ATT-011, BR-ATT-01, BR-ATT-02, BR-ATT-06:
// Synchronize raw biometric punches with daily attendance records
function syncBiometricPunches() {
  if (!db.biometricPunches) db.biometricPunches = [];
  if (!db.biometricSyncFailures) db.biometricSyncFailures = [];

  const punchesByEmpDate = {};

  db.biometricPunches.forEach(punch => {
    // ATT-004: Map biometric records to Employee ID
    let emp = null;
    if (punch.employeeId) {
      emp = (db.employees || []).find(e => e.id === punch.employeeId);
    }
    if (!emp && punch.biometricRef) {
      emp = (db.employees || []).find(e => e.biometricRef === punch.biometricRef || e.id === punch.biometricRef);
    }

    if (!emp) {
      // BR-ATT-06: Flag biometric synchronization failure
      const exists = db.biometricSyncFailures.find(f => f.biometricRef === punch.biometricRef && f.timestamp === punch.timestamp);
      if (!exists) {
        db.biometricSyncFailures.push({
          id: `SYNC-ERR-${Date.now()}-${Math.floor(Math.random() * 900)}`,
          deviceId: punch.deviceId || 'DEV-HQ-MAIN',
          timestamp: punch.timestamp,
          date: punch.date,
          biometricRef: punch.biometricRef,
          errorReason: `Unmapped biometric reference: No matching employee profile found for "${punch.biometricRef}" (BR-ATT-06)`,
          status: 'Logged',
          resolved: false
        });
      }
      return;
    }

    const key = `${emp.id}_${punch.date}`;
    if (!punchesByEmpDate[key]) {
      punchesByEmpDate[key] = {
        emp,
        date: punch.date,
        punches: []
      };
    }
    punchesByEmpDate[key].punches.push(punch);
  });

  let syncedCount = 0;

  Object.values(punchesByEmpDate).forEach(({ emp, date, punches }) => {
    punches.sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));

    // ATT-002: First punch = Entry time (Check-in)
    const firstPunch = punches[0];
    const clockIn = firstPunch ? firstPunch.punchTime : null;

    // ATT-003: Subsequent punch = Exit time (Check-out)
    let clockOut = null;
    if (punches.length > 1) {
      const lastPunch = punches[punches.length - 1];
      clockOut = lastPunch.punchTime;
    }

    // ATT-005: Calculate daily working hours
    const totalHours = calculateWorkingHours(clockIn, clockOut);

    // ATT-006: Identify late arrivals (> 09:15 AM) and early departures (< 05:30 PM)
    const inMinutes = parseTimeToMinutes(clockIn);
    const outMinutes = parseTimeToMinutes(clockOut);
    const isLate = inMinutes !== null && inMinutes > 555;
    const isEarlyDeparture = outMinutes !== null && outMinutes < 1050;

    // ATT-007: Identify missing check-in/check-out records
    let missingPunch = null;
    if (clockIn && !clockOut) {
      missingPunch = 'checkout';
    } else if (!clockIn && clockOut) {
      missingPunch = 'checkin';
    }

    let status = 'Present';
    if (isLate) {
      status = 'Late';
    } else if (missingPunch) {
      status = 'Missing Punch';
    } else if (totalHours > 0 && totalHours < 4.0) {
      status = 'Half Day';
    }

    let attRecord = (db.attendance || []).find(a => a.employeeId === emp.id && a.date === date);

    if (attRecord) {
      // ATT-011 & BR-ATT-02: Maintain original biometric records separately
      if (!attRecord.originalBiometric) {
        attRecord.originalBiometric = {
          clockIn: attRecord.clockIn || clockIn,
          clockOut: attRecord.clockOut || clockOut,
          totalHours: attRecord.totalHours || totalHours
        };
      }

      if (!attRecord.isCorrected) {
        attRecord.clockIn = clockIn;
        attRecord.clockOut = clockOut;
        attRecord.totalHours = totalHours;
        attRecord.status = status;
        attRecord.isLate = isLate;
        attRecord.isEarlyDeparture = isEarlyDeparture;
        attRecord.missingPunch = missingPunch;
      }
      attRecord.originalBiometric = { clockIn, clockOut, totalHours };
    } else {
      attRecord = {
        id: `ATT-${date.replace(/-/g, '')}-${emp.id.replace('EMP-', '')}`,
        employeeId: emp.id,
        employeeName: emp.name,
        department: emp.department,
        date,
        clockIn,
        clockOut,
        totalHours,
        status,
        isLate,
        isEarlyDeparture,
        missingPunch,
        isValidated: false, // BR-ATT-05: requires HR validation
        validatedBy: null,
        validatedAt: null,
        isCorrected: false,
        correctionReason: '',
        correctedBy: null,
        correctedAt: null,
        originalBiometric: { clockIn, clockOut, totalHours } // ATT-011, BR-ATT-02
      };
      if (!db.attendance) db.attendance = [];
      db.attendance.unshift(attRecord);
    }

    syncedCount++;
  });

  saveDatabase();
  return {
    syncedCount,
    failureCount: (db.biometricSyncFailures || []).filter(f => !f.resolved).length
  };
}

// ATT-008: Display daily attendance with filtering for HR validation
app.get('/api/attendance', (req, res) => {
  const { date, employeeId, isValidated, status, discrepancy, search } = req.query;
  let results = [...(db.attendance || [])];

  if (date) {
    results = results.filter(a => a.date === date);
  }
  if (employeeId) {
    results = results.filter(a => a.employeeId === employeeId);
  }
  if (isValidated !== undefined && isValidated !== 'All') {
    const boolVal = isValidated === 'true';
    results = results.filter(a => Boolean(a.isValidated) === boolVal);
  }
  if (status && status !== 'All') {
    results = results.filter(a => (a.status || '').toLowerCase() === status.toLowerCase());
  }
  if (discrepancy) {
    if (discrepancy === 'late') results = results.filter(a => a.isLate);
    else if (discrepancy === 'early_departure') results = results.filter(a => a.isEarlyDeparture);
    else if (discrepancy === 'missing_punch') results = results.filter(a => Boolean(a.missingPunch));
    else if (discrepancy === 'corrected') results = results.filter(a => a.isCorrected);
    else if (discrepancy === 'all_discrepancies') results = results.filter(a => a.isLate || a.isEarlyDeparture || Boolean(a.missingPunch));
  }
  if (search) {
    const q = search.toLowerCase();
    results = results.filter(a => 
      (a.employeeName && a.employeeName.toLowerCase().includes(q)) || 
      (a.employeeId && a.employeeId.toLowerCase().includes(q))
    );
  }

  results.sort((a, b) => b.date.localeCompare(a.date) || a.employeeId.localeCompare(b.employeeId));
  res.json(results);
});

// Daily attendance statistics summary for HR dashboard (ATT-008)
app.get('/api/attendance/summary', (req, res) => {
  const { date = new Date().toISOString().split('T')[0] } = req.query;
  const dayRecords = (db.attendance || []).filter(a => a.date === date);
  const activeEmps = (db.employees || []).filter(e => e.status !== 'Inactive');

  const summary = {
    date,
    totalScheduled: activeEmps.length,
    totalPresent: dayRecords.filter(a => a.status === 'Present').length,
    totalLate: dayRecords.filter(a => a.isLate || a.status === 'Late').length,
    totalEarlyDeparture: dayRecords.filter(a => a.isEarlyDeparture).length,
    totalMissingPunches: dayRecords.filter(a => Boolean(a.missingPunch)).length,
    totalValidated: dayRecords.filter(a => a.isValidated).length,
    totalPendingValidation: dayRecords.filter(a => !a.isValidated).length,
    totalCorrected: dayRecords.filter(a => a.isCorrected).length
  };

  res.json(summary);
});

// ATT-001, ATT-002, ATT-003, ATT-004: Live Biometric Punch Ingestion
// User specification: "the backend data will show employee id with entry time when he uses the biometric first and then employee id and exit time when he uses it again"
app.post('/api/biometric/punch', (req, res) => {
  const { employeeId, biometricRef, timestamp, deviceId = 'DEV-HQ-MAIN' } = req.body;
  if (!employeeId && !biometricRef) {
    return res.status(400).json({ error: 'employeeId or biometricRef is required' });
  }

  // ATT-004: Map biometric records to Employee ID
  let emp = null;
  if (employeeId) {
    emp = (db.employees || []).find(e => e.id === employeeId);
  }
  if (!emp && biometricRef) {
    emp = (db.employees || []).find(e => e.biometricRef === biometricRef || e.id === biometricRef);
  }

  const now = new Date();
  const dateStr = timestamp ? timestamp.split(' ')[0].split('T')[0] : now.toISOString().split('T')[0];
  const timeStr = timestamp && timestamp.includes(' ') 
    ? timestamp.split(' ')[1].slice(0, 5) 
    : now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const fullTimestamp = timestamp || `${dateStr} ${now.toTimeString().split(' ')[0]}`;

  if (!emp) {
    // BR-ATT-06: Flag biometric synchronization failure
    const syncFailure = {
      id: `SYNC-ERR-${Date.now()}-${Math.floor(Math.random() * 900)}`,
      deviceId,
      timestamp: fullTimestamp,
      date: dateStr,
      biometricRef: biometricRef || 'UNKNOWN',
      errorReason: `Unmapped biometric reference: No matching employee profile registered for "${biometricRef}" (BR-ATT-06)`,
      status: 'Logged',
      resolved: false
    };
    if (!db.biometricSyncFailures) db.biometricSyncFailures = [];
    db.biometricSyncFailures.unshift(syncFailure);
    saveDatabase();
    return res.status(422).json({ 
      error: 'Biometric mapping failure: Reference could not be mapped to an employee (BR-ATT-06)', 
      failure: syncFailure 
    });
  }

  // Check existing punches today for this employee to determine if ENTRY or EXIT
  const existingTodayPunches = (db.biometricPunches || []).filter(p => p.employeeId === emp.id && p.date === dateStr);
  const punchType = existingTodayPunches.length === 0 ? 'ENTRY' : 'EXIT';

  const newPunch = {
    id: `BIO-PUNCH-${Date.now()}-${Math.floor(Math.random() * 900)}`,
    employeeId: emp.id,
    biometricRef: emp.biometricRef || `BIO-${emp.id}`,
    timestamp: fullTimestamp,
    punchTime: timeStr,
    date: dateStr,
    deviceId,
    punchType
  };

  if (!db.biometricPunches) db.biometricPunches = [];
  db.biometricPunches.push(newPunch);

  // Sync / update attendance record with new punch
  syncBiometricPunches();

  const record = (db.attendance || []).find(a => a.employeeId === emp.id && a.date === dateStr);
  res.status(201).json({
    message: `Biometric ${punchType} recorded successfully for ${emp.name}`,
    punch: newPunch,
    punchType,
    attendanceRecord: record
  });
});

// Employee Portal Web Punch-in (wraps biometric punch entry)
app.post('/api/attendance/clock-in', (req, res) => {
  const { employeeId } = req.body;
  const emp = (db.employees || []).find(e => e.id === employeeId);
  if (!emp) return res.status(404).json({ error: 'Employee not found' });

  const today = new Date().toISOString().split('T')[0];
  const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const existing = (db.attendance || []).find(a => a.employeeId === employeeId && a.date === today);

  if (existing && existing.clockIn) {
    return res.status(400).json({ error: 'Already clocked in for today', record: existing });
  }

  // Record raw biometric punch
  const punch = {
    id: `BIO-PUNCH-${Date.now()}-${Math.floor(Math.random() * 900)}`,
    employeeId: emp.id,
    biometricRef: emp.biometricRef || `BIO-${emp.id}`,
    timestamp: `${today} ${new Date().toTimeString().split(' ')[0]}`,
    punchTime: nowTime,
    date: today,
    deviceId: 'WEB-PORTAL-PUNCH',
    punchType: 'ENTRY'
  };

  if (!db.biometricPunches) db.biometricPunches = [];
  db.biometricPunches.push(punch);
  syncBiometricPunches();

  const record = (db.attendance || []).find(a => a.employeeId === employeeId && a.date === today);
  res.json({ message: 'Clocked in successfully', record });
});

// Employee Portal Web Punch-out (wraps biometric punch exit)
app.post('/api/attendance/clock-out', (req, res) => {
  const { employeeId } = req.body;
  const emp = (db.employees || []).find(e => e.id === employeeId);
  if (!emp) return res.status(404).json({ error: 'Employee not found' });

  const today = new Date().toISOString().split('T')[0];
  const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const existing = (db.attendance || []).find(a => a.employeeId === employeeId && a.date === today);

  if (!existing || !existing.clockIn) {
    return res.status(400).json({ error: 'Cannot clock out without clocking in first' });
  }

  const punch = {
    id: `BIO-PUNCH-${Date.now()}-${Math.floor(Math.random() * 900)}`,
    employeeId: emp.id,
    biometricRef: emp.biometricRef || `BIO-${emp.id}`,
    timestamp: `${today} ${new Date().toTimeString().split(' ')[0]}`,
    punchTime: nowTime,
    date: today,
    deviceId: 'WEB-PORTAL-PUNCH',
    punchType: 'EXIT'
  };

  if (!db.biometricPunches) db.biometricPunches = [];
  db.biometricPunches.push(punch);
  syncBiometricPunches();

  const record = (db.attendance || []).find(a => a.employeeId === employeeId && a.date === today);
  res.json({ message: 'Clocked out successfully', record });
});

// ATT-001, ATT-004: Batch synchronization of biometric punches
app.post('/api/biometric/sync', (req, res) => {
  const result = syncBiometricPunches();
  res.json({ message: 'Biometric punches synchronized with daily attendance records', ...result });
});

// ATT-011: Retrieve original immutable biometric records
app.get('/api/biometric/punches', (req, res) => {
  const { date, employeeId, deviceId } = req.query;
  let list = db.biometricPunches || [];
  if (date) list = list.filter(p => p.date === date);
  if (employeeId) list = list.filter(p => p.employeeId === employeeId);
  if (deviceId) list = list.filter(p => p.deviceId === deviceId);
  res.json(list);
});

// BR-ATT-06: Retrieve biometric synchronization failures
app.get('/api/biometric/sync-failures', (req, res) => {
  res.json(db.biometricSyncFailures || []);
});

// BR-ATT-06: Resolve or dismiss synchronization failure
app.patch('/api/biometric/sync-failures/:id/resolve', (req, res) => {
  const failure = (db.biometricSyncFailures || []).find(f => f.id === req.params.id);
  if (!failure) return res.status(404).json({ error: 'Sync failure record not found' });

  failure.resolved = true;
  failure.resolvedBy = getAuthUser(req)?.email || 'HR Manager';
  failure.resolvedAt = new Date().toISOString();
  saveDatabase();
  res.json({ message: 'Sync failure resolved', failure });
});

// ATT-009: HR Manager validates single daily attendance record
app.patch('/api/attendance/:id/validate', (req, res) => {
  const record = (db.attendance || []).find(a => a.id === req.params.id);
  if (!record) return res.status(404).json({ error: 'Attendance record not found' });

  const authUser = getAuthUser(req);
  if (authUser && !isAuthorizedPayrollUser(authUser)) {
    return res.status(403).json({ error: 'Access denied: Only HR can validate attendance.' });
  }

  record.isValidated = true;
  record.validatedBy = authUser ? authUser.email : 'Elena Rostova (HR Admin)';
  record.validatedAt = new Date().toISOString().split('T')[0];

  saveDatabase();
  res.json({ message: 'Attendance record validated successfully', record });
});

// ATT-009 & BR-ATT-04: HR Manager validates all clean daily attendance records
// Missing punches are flagged and NOT automatically treated as full-day attendance!
app.post('/api/attendance/validate-all', (req, res) => {
  const authUser = getAuthUser(req);
  if (authUser && !isAuthorizedPayrollUser(authUser)) {
    return res.status(403).json({ error: 'Access denied: Only HR can validate attendance.' });
  }

  const validatedBy = authUser ? authUser.email : 'Elena Rostova (HR Admin)';
  const today = new Date().toISOString().split('T')[0];
  const { date, month, year, allowMissingPunches = false } = req.body;

  let validatedCount = 0;
  let skippedMissingPunchCount = 0;

  (db.attendance || []).forEach(a => {
    let match = true;
    if (date && a.date !== date) match = false;
    if (month && a.date && !a.date.includes(`-${month}-`)) match = false;
    if (year && a.date && !a.date.startsWith(`${year}-`)) match = false;

    if (match) {
      // BR-ATT-04: Records with missing punches must be flagged for HR review
      if (a.missingPunch && !allowMissingPunches) {
        skippedMissingPunchCount++;
        return;
      }
      a.isValidated = true;
      a.validatedBy = validatedBy;
      a.validatedAt = today;
      validatedCount++;
    }
  });

  saveDatabase();
  res.json({ 
    message: `Successfully validated ${validatedCount} attendance record(s). ${skippedMissingPunchCount > 0 ? `${skippedMissingPunchCount} record(s) with missing punches were flagged and held for manual HR review (BR-ATT-04).` : ''}`, 
    count: validatedCount,
    validatedCount,
    skippedMissingPunchCount
  });
});

// ATT-010 & BR-ATT-03: HR Manager corrects attendance discrepancies with mandatory reason
// BR-ATT-02: Original biometric data is preserved separately and never overwritten!
app.patch('/api/attendance/:id/correct', (req, res) => {
  const authUser = getAuthUser(req);
  if (authUser && !isAuthorizedPayrollUser(authUser)) {
    return res.status(403).json({ error: 'Access denied: Only HR can correct attendance records.' });
  }

  const record = (db.attendance || []).find(a => a.id === req.params.id);
  if (!record) return res.status(404).json({ error: 'Attendance record not found' });

  const { clockIn, clockOut, status, correctionReason } = req.body;

  // BR-ATT-03: Any manual correction must capture the reason, user and timestamp
  if (!correctionReason || !correctionReason.trim()) {
    return res.status(400).json({ error: 'Correction reason is mandatory (BR-ATT-03)' });
  }

  // ATT-011 & BR-ATT-02: Ensure original biometric punches are preserved separately
  if (!record.originalBiometric) {
    record.originalBiometric = {
      clockIn: record.clockIn,
      clockOut: record.clockOut,
      totalHours: record.totalHours
    };
  }

  const updatedClockIn = clockIn !== undefined ? clockIn : record.clockIn;
  const updatedClockOut = clockOut !== undefined ? clockOut : record.clockOut;
  const recalculatedHours = calculateWorkingHours(updatedClockIn, updatedClockOut);

  record.clockIn = updatedClockIn;
  record.clockOut = updatedClockOut;
  record.totalHours = recalculatedHours;
  record.status = status || (recalculatedHours >= 8 ? 'Present' : (recalculatedHours > 0 ? 'Half Day' : 'Absent'));
  
  const inMinutes = parseTimeToMinutes(record.clockIn);
  const outMinutes = parseTimeToMinutes(record.clockOut);
  record.isLate = inMinutes !== null && inMinutes > 555;
  record.isEarlyDeparture = outMinutes !== null && outMinutes < 1050;
  record.missingPunch = (!record.clockIn && record.clockOut) ? 'checkin' : (record.clockIn && !record.clockOut) ? 'checkout' : null;

  record.isCorrected = true;
  record.correctionReason = correctionReason.trim();
  record.correctedBy = authUser ? authUser.email : 'Elena Rostova (HR Admin)';
  record.correctedAt = new Date().toISOString();

  // Corrected attendance is certified and validated
  record.isValidated = true;
  record.validatedBy = record.correctedBy;
  record.validatedAt = new Date().toISOString().split('T')[0];

  saveDatabase();
  res.json({ message: 'Attendance discrepancy corrected with audit trail', record });
});

// Section 4 & 5: Employee Attendance Correction Requests
app.get('/api/attendance/correction-requests', (req, res) => {
  const { employeeId, status } = req.query;
  let list = db.attendanceCorrectionRequests || [];
  if (employeeId) list = list.filter(r => r.employeeId === employeeId);
  if (status && status !== 'All') list = list.filter(r => r.status.toLowerCase() === status.toLowerCase());
  res.json(list);
});

app.post('/api/attendance/correction-requests', (req, res) => {
  const { employeeId, date, requestedIn, requestedOut, reason } = req.body;
  if (!employeeId || !date || !reason) {
    return res.status(400).json({ error: 'employeeId, date, and reason are required' });
  }

  const emp = (db.employees || []).find(e => e.id === employeeId);
  if (!emp) return res.status(404).json({ error: 'Employee not found' });

  const newReq = {
    id: `CORR-REQ-${Date.now().toString().slice(-4)}`,
    employeeId,
    employeeName: emp.name,
    department: emp.department,
    date,
    requestedIn: requestedIn || '09:00 AM',
    requestedOut: requestedOut || '05:30 PM',
    reason,
    status: 'Pending',
    requestedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
    reviewedBy: null,
    reviewComment: ''
  };

  if (!db.attendanceCorrectionRequests) db.attendanceCorrectionRequests = [];
  db.attendanceCorrectionRequests.unshift(newReq);
  saveDatabase();
  res.status(201).json(newReq);
});

app.patch('/api/attendance/correction-requests/:id', (req, res) => {
  const authUser = getAuthUser(req);
  if (authUser && !isAuthorizedPayrollUser(authUser)) {
    return res.status(403).json({ error: 'Access denied: Only HR can review attendance correction requests.' });
  }

  const reqItem = (db.attendanceCorrectionRequests || []).find(r => r.id === req.params.id);
  if (!reqItem) return res.status(404).json({ error: 'Correction request not found' });

  const { status, reviewComment = '' } = req.body;
  if (!['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid decision status' });
  }

  reqItem.status = status;
  reqItem.reviewedBy = authUser ? authUser.email : 'Elena Rostova (HR Admin)';
  reqItem.reviewComment = reviewComment;

  if (status === 'Approved') {
    let record = (db.attendance || []).find(a => a.employeeId === reqItem.employeeId && a.date === reqItem.date);
    const emp = (db.employees || []).find(e => e.id === reqItem.employeeId);
    
    if (!record && emp) {
      record = {
        id: `ATT-${reqItem.date.replace(/-/g, '')}-${emp.id.replace('EMP-', '')}`,
        employeeId: emp.id,
        employeeName: emp.name,
        department: emp.department,
        date: reqItem.date,
        clockIn: null,
        clockOut: null,
        totalHours: 0,
        status: 'Present',
        isValidated: true,
        validatedBy: reqItem.reviewedBy,
        validatedAt: new Date().toISOString().split('T')[0],
        originalBiometric: { clockIn: null, clockOut: null, totalHours: 0 }
      };
      db.attendance.unshift(record);
    }

    if (record) {
      if (!record.originalBiometric) {
        record.originalBiometric = { clockIn: record.clockIn, clockOut: record.clockOut, totalHours: record.totalHours };
      }
      record.clockIn = reqItem.requestedIn;
      record.clockOut = reqItem.requestedOut;
      record.totalHours = calculateWorkingHours(reqItem.requestedIn, reqItem.requestedOut);
      record.status = 'Present';
      record.missingPunch = null;
      record.isCorrected = true;
      record.correctionReason = `[Approved Correction Request] ${reqItem.reason}`;
      record.correctedBy = reqItem.reviewedBy;
      record.correctedAt = new Date().toISOString();
      record.isValidated = true;
      record.validatedBy = reqItem.reviewedBy;
      record.validatedAt = new Date().toISOString().split('T')[0];
    }
  }

  saveDatabase();
  res.json({ message: `Correction request ${status.toLowerCase()} successfully`, request: reqItem });
});

// ----------------- SALARY STRUCTURES ROUTES (PAY-001) -----------------
app.get('/api/salary-structures', (req, res) => {
  res.json(db.salaryStructures || []);
});

app.get('/api/salary-structures/:id', (req, res) => {
  const struct = (db.salaryStructures || []).find(s => s.id === req.params.id);
  if (!struct) return res.status(404).json({ error: 'Salary structure not found' });
  res.json(struct);
});

app.post('/api/salary-structures', (req, res) => {
  const authUser = getAuthUser(req);
  if (authUser && !isAuthorizedPayrollUser(authUser)) {
    return res.status(403).json({ error: 'Access denied: Only HR or Finance can create salary structures.' });
  }

  const { name, description, basicPercentage = 50, hraPercentage = 30, specialAllowancePercentage = 15, conveyanceFixed = 1600, pfPercentage = 12, taxPercentage = 10, healthInsuranceFixed = 1200 } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Structure name is required' });
  }

  const newId = `STR-${String((db.salaryStructures || []).length + 1).padStart(3, '0')}`;
  const newStructure = {
    id: newId,
    name,
    description: description || '',
    basicPercentage: Number(basicPercentage),
    hraPercentage: Number(hraPercentage),
    specialAllowancePercentage: Number(specialAllowancePercentage),
    conveyanceFixed: Number(conveyanceFixed),
    pfPercentage: Number(pfPercentage),
    taxPercentage: Number(taxPercentage),
    healthInsuranceFixed: Number(healthInsuranceFixed)
  };

  if (!db.salaryStructures) db.salaryStructures = [];
  db.salaryStructures.push(newStructure);
  saveDatabase();
  res.status(201).json(newStructure);
});

app.put('/api/salary-structures/:id', (req, res) => {
  const authUser = getAuthUser(req);
  if (authUser && !isAuthorizedPayrollUser(authUser)) {
    return res.status(403).json({ error: 'Access denied: Only HR or Finance can update salary structures.' });
  }

  const idx = (db.salaryStructures || []).findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Salary structure not found' });

  db.salaryStructures[idx] = {
    ...db.salaryStructures[idx],
    ...req.body,
    id: db.salaryStructures[idx].id // protect ID
  };

  saveDatabase();
  res.json(db.salaryStructures[idx]);
});

// ----------------- PAYROLL POLICY (PAY-005, BR-PAY-02) -----------------
app.get('/api/payroll/policy', (req, res) => {
  res.json(db.payrollPolicy || {
    salaryDivisor: 30,
    defaultWorkHours: 8,
    latePenaltyThreshold: 3,
    latePenaltyDays: 0.5,
    requireAttendanceValidation: true
  });
});

app.put('/api/payroll/policy', (req, res) => {
  const authUser = getAuthUser(req);
  if (authUser && !isAuthorizedPayrollUser(authUser)) {
    return res.status(403).json({ error: 'Access denied: Only authorized Finance or HR can configure payroll policies.' });
  }

  db.payrollPolicy = {
    ...db.payrollPolicy,
    ...req.body
  };

  saveDatabase();
  res.json(db.payrollPolicy);
});

// ----------------- PAYROLL CALCULATION HELPER (PAY-001 to PAY-008, Section 7) -----------------
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function calculateAttendanceSummary(employeeId, month, year, baseSalary) {
  const policy = db.payrollPolicy || { salaryDivisor: 30, requireAttendanceValidation: true };
  const salaryDivisor = policy.salaryDivisor || 30; // BRD Section 7: illustrative 30-day divisor
  const perDayRate = Math.round((baseSalary || 0) / salaryDivisor);

  const monthIdx = MONTH_NAMES.findIndex(m => m.toLowerCase() === (month || '').toLowerCase());
  const monthPrefix = monthIdx !== -1 
    ? `${year}-${String(monthIdx + 1).padStart(2, '0')}`
    : `${year}-11`;

  // PAY-002 & BR-PAY-01: Retrieve validated attendance records only
  const empAtt = (db.attendance || []).filter(a => {
    if (a.employeeId !== employeeId) return false;
    const matchesDate = a.date ? a.date.startsWith(monthPrefix) : true;
    if (!matchesDate) return false;
    if (policy.requireAttendanceValidation) {
      return Boolean(a.isValidated);
    }
    return true;
  });

  let presentCount = 0;
  let lateCount = 0;
  let absentCount = 0;

  empAtt.forEach(a => {
    if (a.status === 'Present') presentCount++;
    else if (a.status === 'Late') {
      presentCount++;
      lateCount++;
    } else if (a.status === 'Absent') absentCount++;
  });

  // PAY-003: Retrieve approved leave records
  const empLeaves = (db.leaves || []).filter(l => {
    if (l.employeeId !== employeeId) return false;
    const startMatches = (l.startDate || '').startsWith(monthPrefix);
    const endMatches = (l.endDate || '').startsWith(monthPrefix);
    return startMatches || endMatches;
  });

  let approvedPaidLeaveDays = 0;
  let unpaidLeaveDays = 0;

  empLeaves.forEach(l => {
    if (l.status === 'Approved') {
      if (['annual', 'sick', 'casual'].includes((l.leaveType || '').toLowerCase())) {
        approvedPaidLeaveDays += Number(l.days) || 0;
      } else {
        unpaidLeaveDays += Number(l.days) || 0;
      }
    } else if (l.status === 'Rejected') {
      unpaidLeaveDays += Number(l.days) || 0;
    }
  });

  // Late policy penalty from configurable policy (BR-PAY-02)
  const penaltyThreshold = policy.latePenaltyThreshold || 3;
  const latePenaltyUnit = policy.latePenaltyDays || 0.5;
  const latePenaltyDays = Math.floor(lateCount / penaltyThreshold) * latePenaltyUnit;

  // PAY-004: Calculate payable working days (BRD Section 7 & Glossary: Present days + Approved paid leave)
  // If no attendance records for this month, default presentCount reasonably based on salary divisor - unpaid
  const effectivePresentDays = empAtt.length > 0 
    ? presentCount 
    : Math.max(0, salaryDivisor - approvedPaidLeaveDays - unpaidLeaveDays);

  const payableDays = Math.min(salaryDivisor, effectivePresentDays + approvedPaidLeaveDays);

  // PAY-005: Calculate loss of pay (LOP) days and deduction
  const lopDays = Math.max(0, salaryDivisor - payableDays + latePenaltyDays);
  const attendanceDeduction = Math.round(perDayRate * lopDays);

  return {
    salaryDivisor,
    totalWorkingDays: salaryDivisor,
    presentDays: effectivePresentDays,
    paidLeaveDays: approvedPaidLeaveDays,
    payableDays,
    absentDays: absentCount,
    lateDays: lateCount,
    unpaidLeaveDays,
    latePenaltyDays,
    lopDays,
    perDayRate,
    attendanceDeduction,
    lossOfPay: attendanceDeduction
  };
}

// ----------------- PAYSLIPS & PAYROLL ROUTES (MODULE 4: PAY-001 to PAY-012) -----------------
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

  // Employees see only Approved, Finalized, or Paid payslips
  if (authUser && authUser.role === 'employee') {
    results = results.filter(p => ['Approved', 'Finalized', 'Paid'].includes(p.status));
  } else if (!authUser && req.query.role === 'employee') {
    results = results.filter(p => ['Approved', 'Finalized', 'Paid'].includes(p.status));
  } else if (req.query.approvedOnly === 'true') {
    results = results.filter(p => ['Approved', 'Finalized', 'Paid'].includes(p.status));
  }

  if (status && status !== 'All') {
    results = results.filter(p => p.status.toLowerCase() === status.toLowerCase());
  }

  results.sort((a, b) => (b.payDate || '').localeCompare(a.payDate || ''));
  res.json(results);
});

app.get('/api/payslips/:id', (req, res) => {
  const authUser = getAuthUser(req);
  const slip = (db.payslips || []).find(p => p.id === req.params.id);
  if (!slip) return res.status(404).json({ error: 'Payslip not found' });

  if (authUser && authUser.role === 'employee' && !['Approved', 'Finalized', 'Paid'].includes(slip.status)) {
    return res.status(403).json({ error: 'This payslip has not been finalized by HR/Finance yet' });
  }

  res.json(slip);
});

app.patch('/api/payslips/:id', (req, res) => {
  const authUser = getAuthUser(req);
  if (authUser && !isAuthorizedPayrollUser(authUser)) {
    return res.status(403).json({ error: 'Access denied: Only authorized Finance or HR can modify payslips.' });
  }

  const { status, reviewedBy = 'Finance Lead' } = req.body;
  const slip = (db.payslips || []).find(p => p.id === req.params.id);
  if (!slip) return res.status(404).json({ error: 'Payslip not found' });

  if (status && !['Approved', 'Pending Approval', 'Finalized', 'Paid', 'Rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  if (status) {
    slip.status = status;
    slip.reviewedBy = reviewedBy;
    slip.approvedAt = ['Approved', 'Finalized', 'Paid'].includes(status) 
      ? new Date().toISOString().split('T')[0] 
      : null;
  }

  saveDatabase();
  res.json(slip);
});

// PAY-010 & BR-PAY-03: Finalize Payroll for a period (Authorized users only: Finance / HR Admin)
app.post('/api/payslips/finalize', (req, res) => {
  const authUser = getAuthUser(req);
  if (!authUser || !isAuthorizedPayrollUser(authUser)) {
    return res.status(403).json({ error: 'Access denied: Only authorized Finance or HR Admin can finalize payroll.' });
  }

  const { month, year = 2026, finalizedBy } = req.body;
  if (!month) return res.status(400).json({ error: 'Month is required to finalize payroll cycle' });

  const finalizerName = finalizedBy || (authUser ? authUser.email : 'Finance Lead & Controller');
  const today = new Date().toISOString().split('T')[0];
  let count = 0;

  // Constraint check: verify attendance for period
  const monthIdx = MONTH_NAMES.findIndex(m => m.toLowerCase() === month.toLowerCase());
  const monthPrefix = monthIdx !== -1 ? `${year}-${String(monthIdx + 1).padStart(2, '0')}` : `${year}-11`;
  const unvalidatedAttendance = (db.attendance || []).filter(a => a.date && a.date.startsWith(monthPrefix) && !a.isValidated);

  if (unvalidatedAttendance.length > 0) {
    return res.status(400).json({ 
      error: `Constraint violation: Cannot finalize payroll. There are ${unvalidatedAttendance.length} unvalidated attendance record(s) for ${month} ${year}. Please validate all attendance records first.`,
      unvalidatedCount: unvalidatedAttendance.length
    });
  }

  (db.payslips || []).forEach(p => {
    const matchesMonth = p.month.toLowerCase() === month.toLowerCase();
    const matchesYear = String(p.year) === String(year);
    if (matchesMonth && matchesYear && p.status !== 'Finalized') {
      p.status = 'Finalized';
      p.reviewedBy = finalizerName;
      p.finalizedBy = finalizerName;
      p.finalizedAt = today;
      p.approvedAt = today;
      count++;
    }
  });

  saveDatabase();
  res.json({
    message: `Payroll for ${month} ${year} finalized successfully (${count} payslips).`,
    month,
    year,
    finalizedCount: count,
    finalizedBy: finalizerName,
    finalizedAt: today
  });
});

app.post('/api/payslips/approve-all', (req, res) => {
  const authUser = getAuthUser(req);
  if (authUser && !isAuthorizedPayrollUser(authUser)) {
    return res.status(403).json({ error: 'Access denied: Only authorized Finance or HR can approve payslips.' });
  }

  const { month, year, reviewedBy = 'Finance Lead' } = req.body;
  const today = new Date().toISOString().split('T')[0];
  let count = 0;

  (db.payslips || []).forEach(p => {
    const matchesMonth = month ? p.month.toLowerCase() === month.toLowerCase() : true;
    const matchesYear = year ? String(p.year) === String(year) : true;
    if (matchesMonth && matchesYear && (p.status === 'Pending Approval' || p.status === 'Approved')) {
      p.status = 'Finalized';
      p.reviewedBy = reviewedBy;
      p.finalizedBy = reviewedBy;
      p.approvedAt = today;
      p.finalizedAt = today;
      count++;
    }
  });

  saveDatabase();
  res.json({ message: `Successfully approved & finalized ${count} payslip(s)`, count });
});

// PAY-001, PAY-006 to PAY-011: Generate monthly payroll cycle using salary structures and validated attendance
app.post('/api/payslips/generate-cycle', (req, res) => {
  const authUser = getAuthUser(req);
  if (authUser && !isAuthorizedPayrollUser(authUser)) {
    return res.status(403).json({ error: 'Access denied: Only authorized Finance or HR can generate payroll.' });
  }

  const { month, year = 2026, forceRecalculate = false } = req.body;
  if (!month) return res.status(400).json({ error: 'Month is required' });

  let added = 0;
  let updated = 0;

  (db.employees || []).filter(e => e.status !== 'Inactive').forEach(emp => {
    let slip = (db.payslips || []).find(p => 
      p.employeeId === emp.id && 
      p.month.toLowerCase() === month.toLowerCase() && 
      String(p.year) === String(year)
    );

    // If already finalized, do not overwrite unless forced
    if (slip && slip.status === 'Finalized' && !forceRecalculate) {
      return;
    }

    // PAY-001: Retrieve employee's assigned salary structure
    const struct = (db.salaryStructures || []).find(s => s.id === (emp.salaryStructureId || 'STR-001')) || (db.salaryStructures && db.salaryStructures[0]) || {
      name: "Standard Corporate Structure",
      basicPercentage: 50,
      hraPercentage: 30,
      specialAllowancePercentage: 15,
      conveyanceFixed: 1600,
      pfPercentage: 12,
      taxPercentage: 10,
      healthInsuranceFixed: 1200
    };

    const monthlyCTC = Math.round((emp.salary || 900000) / 12);
    
    // PAY-006: Calculate gross salary components according to assigned salary structure
    const basic = Math.round(monthlyCTC * (struct.basicPercentage / 100));
    const hra = Math.round(monthlyCTC * (struct.hraPercentage / 100));
    const special = Math.round(monthlyCTC * (struct.specialAllowancePercentage / 100));
    const conveyance = struct.conveyanceFixed || 1600;
    const gross = basic + hra + special + conveyance;

    // PAY-002, PAY-004, PAY-005: Retrieve validated attendance, calculate payable days and LOP
    const attSummary = calculateAttendanceSummary(emp.id, month, Number(year), monthlyCTC);

    // PAY-007: Calculate applicable deductions
    const pf = Math.round(basic * ((struct.pfPercentage || 12) / 100));
    const tax = Math.round(gross * ((struct.taxPercentage || 10) / 100));
    const insurance = struct.healthInsuranceFixed || 1200;
    const attDeduction = attSummary.attendanceDeduction;
    const totalDeductions = tax + pf + insurance + attDeduction;

    // PAY-008: Calculate net salary automatically
    const net = gross - totalDeductions;

    if (!slip) {
      slip = {
        id: `PS-${year}-${month.slice(0, 3).toUpperCase()}-${emp.id.replace('EMP-', '')}`,
        employeeId: emp.id,
        employeeName: emp.name,
        month,
        year: Number(year),
        payDate: `${year}-${month === 'November' ? '11-30' : (month === 'December' ? '12-31' : '10-31')}`,
        salaryStructureId: struct.id,
        salaryStructureName: struct.name,
        baseSalary: basic,
        monthlyCTC,
        allowances: { 
          hra, 
          specialAllowance: special, 
          conveyance 
        },
        deductions: { 
          incomeTax: tax, 
          providentFund: pf, 
          healthInsurance: insurance,
          attendanceDeduction: attDeduction,
          lossOfPay: attDeduction
        },
        attendanceSummary: attSummary,
        grossPay: gross,
        totalDeductions,
        netPay: net,
        status: 'Pending Approval',
        reviewedBy: null,
        approvedAt: null
      };

      if (!db.payslips) db.payslips = [];
      db.payslips.unshift(slip);
      added++;
    } else if (forceRecalculate || slip.status !== 'Finalized') {
      slip.salaryStructureId = struct.id;
      slip.salaryStructureName = struct.name;
      slip.baseSalary = basic;
      slip.monthlyCTC = monthlyCTC;
      slip.allowances = { hra, specialAllowance: special, conveyance };
      slip.attendanceSummary = attSummary;
      slip.deductions = {
        incomeTax: tax,
        providentFund: pf,
        healthInsurance: insurance,
        attendanceDeduction: attDeduction,
        lossOfPay: attDeduction
      };
      slip.grossPay = gross;
      slip.totalDeductions = totalDeductions;
      slip.netPay = net;
      updated++;
    }
  });

  saveDatabase();
  res.json({ 
    message: `Processed payroll cycle for ${month} ${year}: ${added} generated, ${updated} recalculated using assigned salary structures & validated attendance`, 
    added, 
    updated 
  });
});

app.post('/api/payslips/recalculate-all', (req, res) => {
  const { month = 'November', year = 2026 } = req.body;
  let count = 0;

  (db.payslips || []).forEach(slip => {
    const matchesMonth = month ? slip.month.toLowerCase() === month.toLowerCase() : true;
    const matchesYear = year ? String(slip.year) === String(year) : true;
    if (matchesMonth && matchesYear && slip.status !== 'Finalized') {
      const emp = (db.employees || []).find(e => e.id === slip.employeeId);
      const struct = (db.salaryStructures || []).find(s => s.id === (emp?.salaryStructureId || 'STR-001')) || (db.salaryStructures && db.salaryStructures[0]);
      
      const monthlyCTC = Math.round((emp?.salary || 900000) / 12);
      const attSummary = calculateAttendanceSummary(slip.employeeId, slip.month, slip.year, monthlyCTC);

      const basic = Math.round(monthlyCTC * (struct.basicPercentage / 100));
      const hra = Math.round(monthlyCTC * (struct.hraPercentage / 100));
      const special = Math.round(monthlyCTC * (struct.specialAllowancePercentage / 100));
      const conveyance = struct.conveyanceFixed || 1600;
      const gross = basic + hra + special + conveyance;

      const pf = Math.round(basic * ((struct.pfPercentage || 12) / 100));
      const tax = Math.round(gross * ((struct.taxPercentage || 10) / 100));
      const insurance = struct.healthInsuranceFixed || 1200;
      const attDeduction = attSummary.attendanceDeduction;

      slip.salaryStructureId = struct.id;
      slip.salaryStructureName = struct.name;
      slip.baseSalary = basic;
      slip.monthlyCTC = monthlyCTC;
      slip.allowances = { hra, specialAllowance: special, conveyance };
      slip.attendanceSummary = attSummary;
      slip.deductions = {
        incomeTax: tax,
        providentFund: pf,
        healthInsurance: insurance,
        attendanceDeduction: attDeduction,
        lossOfPay: attDeduction
      };

      slip.grossPay = gross;
      slip.totalDeductions = pf + tax + insurance + attDeduction;
      slip.netPay = gross - slip.totalDeductions;
      count++;
    }
  });

  saveDatabase();
  res.json({ message: `Successfully recalculated payroll calculations for ${count} payslip(s)`, count });
});

// ----------------- MISC ROUTES -----------------
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
  try {
    syncBiometricPunches();
  } catch (e) {}
  res.json({ message: 'Database reset to initial demo seed state' });
});

// Serve frontend for all remaining GET routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Synchronize biometric punches upon server startup
try {
  syncBiometricPunches();
} catch (e) {
  console.error('Initial biometric punch sync error:', e);
}

app.listen(PORT, () => {
  console.log(`HRMS Server is running at http://localhost:${PORT}`);
});
