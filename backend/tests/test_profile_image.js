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
  console.log('🧪 PROFILE IMAGE VERIFICATION SUITE (ADD & CHANGE PROFILE IMAGE)');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  async function testCase(title, fn) {
    process.stdout.write(`Testing ${title} ... `);
    try {
      await fn();
      console.log('✅ PASSED');
      passed++;
    } catch (err) {
      console.log(`❌ FAILED\n   Error: ${err.message}`);
      failed++;
    }
  }

  // 1. Login as HR Admin
  const hrLogin = await request('POST', '/api/auth/login', {
    email: 'hr@hrms.com',
    password: 'password123'
  });
  assert(hrLogin.status === 200, 'HR Admin login succeeded');
  const hrHeaders = { 'Authorization': `Bearer ${hrLogin.data.token}` };

  const customAvatar1 = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop';
  const customAvatar2 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...mockbase64avatar';
  const customAvatar3 = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop';
  const customHrAvatar = 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop';

  let empId = null;

  // Test 1: Add new employee with custom profile image (URL)
  await testCase('Add employee with custom profile image URL', async () => {
    const res = await request('POST', '/api/employees', {
      name: 'Maya Lin',
      email: 'maya.lin@hrms.com',
      jobTitle: 'UI/UX Designer',
      department: 'Design',
      salary: 1100000,
      avatar: customAvatar1
    }, hrHeaders);

    assert(res.status === 201, `Expected status 201, got ${res.status}`);
    assert(res.data.avatar === customAvatar1, `Expected avatar to match custom URL, got ${res.data.avatar}`);
    empId = res.data.id;
  });

  // Test 2: Add HR account with custom profile image
  await testCase('Add HR account with custom profile image', async () => {
    const res = await request('POST', '/api/hr-accounts', {
      name: 'Vikram Mehta',
      email: 'vikram.hr@hrms.com',
      jobTitle: 'HR Business Partner',
      avatar: customHrAvatar
    }, hrHeaders);

    assert(res.status === 201, `Expected status 201, got ${res.status}`);
    assert(res.data.employee.avatar === customHrAvatar, `Expected HR avatar to match, got ${res.data.employee.avatar}`);
  });

  // Test 3: Change employee profile image via PUT /api/employees/:id
  await testCase('Change employee profile image via PUT /api/employees/:id', async () => {
    const updateRes = await request('PUT', `/api/employees/${empId}`, {
      avatar: customAvatar2
    }, hrHeaders);

    assert(updateRes.status === 200, `Expected 200, got ${updateRes.status}`);
    assert(updateRes.data.avatar === customAvatar2, `Expected avatar to be updated to base64 data URL`);

    // Verify GET persists the updated avatar
    const getRes = await request('GET', `/api/employees/${empId}`);
    assert(getRes.data.avatar === customAvatar2, 'Persisted avatar matches updated value');
  });

  // Test 4: Change employee profile image via dedicated PATCH /api/employees/:id/avatar
  await testCase('Change profile image via PATCH /api/employees/:id/avatar', async () => {
    const patchRes = await request('PATCH', `/api/employees/${empId}/avatar`, {
      avatar: customAvatar3
    }, hrHeaders);

    assert(patchRes.status === 200, `Expected 200, got ${patchRes.status}`);
    assert(patchRes.data.avatar === customAvatar3, `Expected avatar to be updated to customAvatar3`);

    const getRes = await request('GET', `/api/employees/${empId}`);
    assert(getRes.data.avatar === customAvatar3, 'Persisted avatar matches patched value');
  });

  // Test 5: Employee self-service change their own avatar
  await testCase('Employee can change their own profile image', async () => {
    const empLogin = await request('POST', '/api/auth/login', {
      email: 'maya.lin@hrms.com',
      password: 'password123'
    });
    assert(empLogin.status === 200, 'Employee login succeeded');
    const empHeaders = { 'Authorization': `Bearer ${empLogin.data.token}` };

    const newSelfAvatar = 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop';
    const selfPatchRes = await request('PATCH', `/api/employees/${empId}/avatar`, {
      avatar: newSelfAvatar
    }, empHeaders);

    assert(selfPatchRes.status === 200, `Self avatar update returned 200`);
    assert(selfPatchRes.data.avatar === newSelfAvatar, `Avatar updated by employee themselves`);

    // Regular employee cannot change ANOTHER employee's avatar
    const otherPatchRes = await request('PATCH', `/api/employees/EMP-001/avatar`, {
      avatar: newSelfAvatar
    }, empHeaders);

    assert(otherPatchRes.status === 403, `Expected 403 Forbidden when employee tries to change someone else's avatar, got ${otherPatchRes.status}`);
  });

  console.log('\n================================================================');
  console.log(`📊 TEST RESULTS: ${passed} Passed, ${failed} Failed out of ${passed + failed} Tests`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
