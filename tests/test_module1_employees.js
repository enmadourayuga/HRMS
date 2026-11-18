const http = require('http');

const BASE_URL = 'http://localhost:3000';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });

    req.on('error', err => reject(err));
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 MODULE 1: EMPLOYEE MANAGEMENT FUNCTIONAL REQUIREMENTS TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  async function testCase(id, title, fn) {
    process.stdout.write(`Testing [${id}] ${title} ... `);
    try {
      await fn();
      console.log('✅ PASSED');
      passed++;
    } catch (err) {
      console.log(`❌ FAILED\n   Error: ${err.message}`);
      failed++;
    }
  }

  // Reset database to ensure clean state
  await request('POST', '/api/reset');

  // Login as HR Admin to get auth token
  const hrLogin = await request('POST', '/api/auth/login', {
    email: 'hr@hrms.com',
    password: 'password123'
  });
  assert(hrLogin.status === 200, 'HR Admin login succeeded');
  const hrToken = hrLogin.data.token;
  const hrHeaders = { 'Authorization': `Bearer ${hrToken}` };

  let createdEmpId = null;

  // EMP-001, EMP-002, EMP-003, EMP-004, EMP-005, EMP-006, EMP-007
  await testCase('EMP-001', 'HR Manager can add new employees', async () => {
    const res = await request('POST', '/api/employees', {
      name: 'Rohan Sharma',
      email: 'rohan.sharma@hrms.com',
      jobTitle: 'Senior Cloud Architect',
      department: 'Infrastructure & Sec',
      employmentType: 'Full-Time',
      salary: 2200000,
      joinDate: '2026-10-15',
      biometricRef: 'BIO-9801',
      salaryStructureId: 'STR-002',
      phone: '+91 98765 44332',
      location: 'Bengaluru (HQ)'
    }, hrHeaders);

    assert(res.status === 201, `Expected status 201, got ${res.status}`);
    assert(res.data.name === 'Rohan Sharma', 'Employee name matches');
    createdEmpId = res.data.id;
  });

  await testCase('EMP-002', 'System automatically generates a unique Employee ID', async () => {
    assert(createdEmpId, 'Employee must exist');
    assert(/^EMP-\d{3}$/.test(createdEmpId), `Expected format EMP-XXX, got: ${createdEmpId}`);
    
    // Check no duplicate IDs exist
    const allEmps = (await request('GET', '/api/employees')).data;
    const matches = allEmps.filter(e => e.id === createdEmpId);
    assert(matches.length === 1, `Employee ID ${createdEmpId} is strictly unique`);
  });

  await testCase('EMP-003', 'HR Manager can enter personal and contact details', async () => {
    const emp = (await request('GET', `/api/employees/${createdEmpId}`)).data;
    assert(emp.name === 'Rohan Sharma', 'Full name saved');
    assert(emp.email === 'rohan.sharma@hrms.com', 'Email saved');
    assert(emp.phone === '+91 98765 44332', 'Phone number saved');
    assert(emp.location === 'Bengaluru (HQ)', 'Work location saved');
  });

  await testCase('EMP-004', 'HR Manager can enter employment details', async () => {
    const emp = (await request('GET', `/api/employees/${createdEmpId}`)).data;
    assert(emp.jobTitle === 'Senior Cloud Architect', 'Job title saved');
    assert(emp.employmentType === 'Full-Time', 'Employment type saved');
    assert(emp.status === 'Active', 'Initial status is Active');
  });

  await testCase('EMP-005', 'HR Manager can assign department and designation', async () => {
    const emp = (await request('GET', `/api/employees/${createdEmpId}`)).data;
    assert(emp.department === 'Infrastructure & Sec', `Department matches: ${emp.department}`);
    assert(emp.jobTitle === 'Senior Cloud Architect', `Designation matches: ${emp.jobTitle}`);
  });

  await testCase('EMP-006', 'HR Manager can assign joining date and salary structure', async () => {
    const emp = (await request('GET', `/api/employees/${createdEmpId}`)).data;
    assert(emp.joinDate === '2026-10-15', `Joining date matches 2026-10-15, got: ${emp.joinDate}`);
    assert(emp.salaryStructureId === 'STR-002', `Salary structure assigned matches STR-002, got: ${emp.salaryStructureId}`);
    assert(emp.salary === 2200000, `Annual salary matches 2200000, got: ${emp.salary}`);
  });

  await testCase('EMP-007', 'HR Manager can register biometric identification reference', async () => {
    const emp = (await request('GET', `/api/employees/${createdEmpId}`)).data;
    assert(emp.biometricRef === 'BIO-9801', `Biometric reference matches BIO-9801, got: ${emp.biometricRef}`);
  });

  await testCase('EMP-008', 'HR Manager can edit employee details', async () => {
    const updateRes = await request('PUT', `/api/employees/${createdEmpId}`, {
      jobTitle: 'Principal Cloud & Security Architect',
      salary: 2400000,
      phone: '+91 98765 99999',
      location: 'Hyderabad (Tech Hub)',
      biometricRef: 'BIO-9801-V2',
      salaryStructureId: 'STR-002'
    }, hrHeaders);

    assert(updateRes.status === 200, `Expected 200, got ${updateRes.status}`);
    assert(updateRes.data.jobTitle === 'Principal Cloud & Security Architect', 'Designation updated');
    assert(updateRes.data.salary === 2400000, 'Salary updated');
    assert(updateRes.data.phone === '+91 98765 99999', 'Phone updated');
    assert(updateRes.data.location === 'Hyderabad (Tech Hub)', 'Location updated');
    assert(updateRes.data.biometricRef === 'BIO-9801-V2', 'Biometric ref updated');
  });

  await testCase('EMP-009', 'HR Manager can view employee profiles', async () => {
    const profileRes = await request('GET', `/api/employees/${createdEmpId}`);
    assert(profileRes.status === 200, `Expected 200, got ${profileRes.status}`);
    const profile = profileRes.data;

    // Verify comprehensive profile details are populated
    assert(profile.id === createdEmpId, 'Profile ID present');
    assert(profile.name === 'Rohan Sharma', 'Name present');
    assert(profile.email === 'rohan.sharma@hrms.com', 'Email present');
    assert(profile.jobTitle === 'Principal Cloud & Security Architect', 'Job title present');
    assert(profile.department === 'Infrastructure & Sec', 'Department present');
    assert(profile.biometricRef === 'BIO-9801-V2', 'Biometric reference present');
    assert(profile.salaryStructure !== null && typeof profile.salaryStructure === 'object', 'Populated salary structure present');
    assert(profile.salaryStructure.id === 'STR-002', 'Populated salary structure ID matches');
    assert(profile.salaryStructure.basicPercentage !== undefined, 'Salary structure breakdown basic present');
    assert(profile.leaveBalances && profile.leaveBalances.annual, 'Leave balances present');
  });

  await testCase('EMP-010', 'HR Manager can deactivate employees (and prevent login)', async () => {
    // 1. Verify employee can log in initially while Active
    const loginActive = await request('POST', '/api/auth/login', {
      email: 'rohan.sharma@hrms.com',
      password: 'password123'
    });
    assert(loginActive.status === 200, 'Active employee logs in successfully');

    // 2. Deactivate employee
    const deactivateRes = await request('PATCH', `/api/employees/${createdEmpId}/status`, {
      status: 'Inactive'
    }, hrHeaders);
    assert(deactivateRes.status === 200, `Deactivation returned 200, got ${deactivateRes.status}`);
    assert(deactivateRes.data.employee.status === 'Inactive', 'Employee status changed to Inactive');

    // 3. Verify deactivated employee cannot log in (HTTP 403 Forbidden)
    const loginInactive = await request('POST', '/api/auth/login', {
      email: 'rohan.sharma@hrms.com',
      password: 'password123'
    });
    assert(loginInactive.status === 403, `Expected 403 Forbidden for deactivated employee, got ${loginInactive.status}`);
    assert(loginInactive.data.error && loginInactive.data.error.includes('deactivated'), 
      `Expected error to state account is deactivated, got: ${loginInactive.data.error}`);

    // 4. Reactivate employee and verify login works again
    const reactivateRes = await request('PATCH', `/api/employees/${createdEmpId}/status`, {
      status: 'Active'
    }, hrHeaders);
    assert(reactivateRes.status === 200, 'Reactivation returned 200');
    assert(reactivateRes.data.employee.status === 'Active', 'Status returned to Active');

    const loginReactivated = await request('POST', '/api/auth/login', {
      email: 'rohan.sharma@hrms.com',
      password: 'password123'
    });
    assert(loginReactivated.status === 200, 'Reactivated employee logs in successfully');
  });

  console.log('\n================================================================');
  console.log(`📊 TEST RESULTS: ${passed} Passed, ${failed} Failed out of ${passed + failed} Tests`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
