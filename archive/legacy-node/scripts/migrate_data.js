const fs = require('fs');
const path = require('path');

const SEED_PATH = path.join(__dirname, '..', 'data', 'seedData.json');
const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));

// 1. Add salaryStructures
seed.salaryStructures = [
  {
    id: "STR-001",
    name: "Standard Corporate Structure",
    description: "Default structure for full-time engineering, design, and operations staff",
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
    description: "Structure for department heads, leadership, and finance controllers",
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
    description: "Structure for associates, interns, and contractual specialists",
    basicPercentage: 60,
    hraPercentage: 25,
    specialAllowancePercentage: 10,
    conveyanceFixed: 800,
    pfPercentage: 12,
    taxPercentage: 5,
    healthInsuranceFixed: 800
  }
];

// 2. Add payrollPolicy
seed.payrollPolicy = {
  salaryDivisor: 30,
  defaultWorkHours: 8,
  latePenaltyThreshold: 3,
  latePenaltyDays: 0.5,
  requireAttendanceValidation: true
};

// 3. Add notifications
seed.notifications = [
  {
    id: "NTF-101",
    employeeId: "EMP-002",
    title: "Leave Policy Update",
    message: "Annual leave balances for Q4 have been finalized and credited.",
    type: "system",
    referenceId: null,
    createdAt: "2026-11-15T10:00:00.000Z",
    read: true
  },
  {
    id: "NTF-102",
    employeeId: "EMP-002",
    title: "October Payslip Released",
    message: "Your salary statement for October 2026 has been generated and approved.",
    type: "payroll",
    referenceId: "PS-2026-10-002",
    createdAt: "2026-10-31T17:00:00.000Z",
    read: false
  }
];

// 4. Update existing employees
seed.employees.forEach(emp => {
  if (!emp.biometricRef) {
    emp.biometricRef = `BIO-${emp.id}`;
  }
  if (!emp.salaryStructureId) {
    emp.salaryStructureId = (emp.role === 'hr' || emp.jobTitle.includes('Head') || emp.jobTitle.includes('Lead')) ? 'STR-002' : 'STR-001';
  }
  if (!emp.status) {
    emp.status = 'Active';
  }
  if (!emp.joinDate) {
    emp.joinDate = '2023-01-15';
  }
});

// 5. Add David Miller as EMP-010 (Finance Lead) if not exists
const existingFinEmp = seed.employees.find(e => e.id === 'EMP-010' || e.email === 'finance@hrms.com');
if (!existingFinEmp) {
  seed.employees.push({
    id: "EMP-010",
    name: "David Miller",
    email: "finance@hrms.com",
    jobTitle: "Finance Lead & Controller",
    department: "Finance & Accounts",
    role: "finance",
    isHrAdmin: false,
    joinDate: "2022-04-01",
    salary: 1750000,
    phone: "+91 98765 11223",
    location: "Bengaluru (HQ)",
    biometricRef: "BIO-EMP-010",
    salaryStructureId: "STR-002",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces",
    status: "Active",
    manager: "Executive Team",
    leaveBalances: {
      annual: { total: 22, used: 3 },
      sick: { total: 12, used: 1 },
      casual: { total: 6, used: 0 }
    },
    employmentType: "Full-Time"
  });
}

// 6. Add finance user
const existingFinUser = seed.users.find(u => u.email === 'finance@hrms.com');
if (!existingFinUser) {
  seed.users.push({
    id: "USR-FIN-001",
    email: "finance@hrms.com",
    password: "password123",
    role: "finance",
    isHrAdmin: false,
    employeeId: "EMP-010"
  });
}

// 7. Add Finance & Accounts department if not exists
const existingDept = seed.departments.find(d => d.name.toLowerCase().includes('finance'));
if (!existingDept) {
  seed.departments.push({
    id: "DEP-07",
    name: "Finance & Accounts",
    head: "David Miller",
    count: 4,
    budget: "₹85 L"
  });
}

// 8. Mark attendance records as validated
if (seed.attendance) {
  seed.attendance.forEach(a => {
    if (a.isValidated === undefined) {
      a.isValidated = true;
      a.validatedBy = 'Elena Rostova (HR)';
      a.validatedAt = a.date || '2026-11-18';
    }
  });
}

// Write to seedData.json and db.json
fs.writeFileSync(SEED_PATH, JSON.stringify(seed, null, 2), 'utf8');
fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2), 'utf8');
console.log('Successfully updated seedData.json and db.json!');
