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
  console.log('🧪 MODULE 3: LEAVE MANAGEMENT FUNCTIONAL REQUIREMENTS TEST SUITE');
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

  // Reset to seed data first to ensure clean state
  await request('POST', '/api/reset');

  // Test employee: Alex Morgan (EMP-002)
  const empId = 'EMP-002';
  const empRes = await request('GET', `/api/employees/${empId}`);
  const initialEmp = empRes.data;
  const initialAnnualUsed = initialEmp.leaveBalances.annual.used;
  const initialAnnualTotal = initialEmp.leaveBalances.annual.total;
  const availableAnnual = initialAnnualTotal - initialAnnualUsed;

  let createdLeaveId = null;

  // LEV-001, LEV-002, LEV-003, LEV-004: Apply leave with type, dates, reason, auto duration
  await testCase('LEV-001', 'Employees can apply for leave', async () => {
    const res = await request('POST', '/api/leaves', {
      employeeId: empId,
      leaveType: 'Annual',
      startDate: '2026-12-01',
      endDate: '2026-12-03',
      reason: 'Year-end personal vacation'
    });
    assert(res.status === 201, `Expected status 201, got ${res.status}`);
    assert(res.data.id && res.data.id.startsWith('LV-'), 'Expected leave ID to be generated');
    assert(res.data.status === 'Pending', 'Expected status to be Pending');
    createdLeaveId = res.data.id;
  });

  await testCase('LEV-002', 'Employees can select leave type', async () => {
    assert(createdLeaveId, 'Leave must be created');
    const res = await request('GET', `/api/leaves?employeeId=${empId}`);
    const leave = res.data.find(l => l.id === createdLeaveId);
    assert(leave && leave.leaveType === 'Annual', `Expected leaveType Annual, got ${leave?.leaveType}`);
  });

  await testCase('LEV-003', 'Employees can enter leave dates and reason', async () => {
    const res = await request('GET', `/api/leaves?employeeId=${empId}`);
    const leave = res.data.find(l => l.id === createdLeaveId);
    assert(leave.startDate === '2026-12-01', 'Start date matches');
    assert(leave.endDate === '2026-12-03', 'End date matches');
    assert(leave.reason === 'Year-end personal vacation', 'Reason matches');
  });

  await testCase('LEV-004', 'System shall calculate requested leave duration', async () => {
    const res = await request('GET', `/api/leaves?employeeId=${empId}`);
    const leave = res.data.find(l => l.id === createdLeaveId);
    // Dec 1 to Dec 3 is 3 calendar days
    assert(leave.days === 3, `Expected calculated days to be 3, got ${leave.days}`);
  });

  await testCase('LEV-005', 'System shall check available leave balance and reject insufficient balance', async () => {
    // Attempt to request 99 days of leave when only availableAnnual (~17) days remain
    const excessiveRes = await request('POST', '/api/leaves', {
      employeeId: empId,
      leaveType: 'Annual',
      startDate: '2026-12-01',
      endDate: '2027-03-10', // ~100 days
      reason: 'Excessive leave that exceeds available balance'
    });
    assert(excessiveRes.status === 400, `Expected 400 Bad Request for excessive leave, got ${excessiveRes.status}`);
    assert(excessiveRes.data.error && excessiveRes.data.error.includes('Insufficient leave balance'), 
      `Expected error message to mention Insufficient leave balance, got: ${excessiveRes.data.error}`);
  });

  await testCase('LEV-006', 'HR Manager shall receive leave applications', async () => {
    const res = await request('GET', '/api/leaves?status=Pending');
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const found = res.data.some(l => l.id === createdLeaveId);
    assert(found, `Expected leave ${createdLeaveId} to appear in HR pending leaves queue`);
  });

  await testCase('LEV-007', 'HR Manager can view leave request details', async () => {
    const res = await request('GET', '/api/leaves');
    const leave = res.data.find(l => l.id === createdLeaveId);
    assert(leave, 'Leave record found');
    assert(leave.employeeName === 'Alex Morgan', 'Employee name present');
    assert(leave.department === 'Engineering', 'Department present');
    assert(leave.days === 3, 'Duration present');
    assert(leave.reason === 'Year-end personal vacation', 'Reason present');
  });

  await testCase('LEV-008', 'HR Manager can approve leave requests', async () => {
    const res = await request('PATCH', `/api/leaves/${createdLeaveId}`, {
      status: 'Approved',
      reviewedBy: 'Elena Rostova (HR)',
      reviewComment: 'Approved. Enjoy your time off!'
    });
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    assert(res.data.status === 'Approved', `Expected status Approved, got ${res.data.status}`);
    assert(res.data.reviewedBy === 'Elena Rostova (HR)', 'ReviewedBy recorded');
    assert(res.data.reviewComment === 'Approved. Enjoy your time off!', 'Review comment recorded');
  });

  await testCase('LEV-010', 'System shall update leave balances after approval', async () => {
    const empAfterRes = await request('GET', `/api/employees/${empId}`);
    const updatedEmp = empAfterRes.data;
    const newAnnualUsed = updatedEmp.leaveBalances.annual.used;
    assert(newAnnualUsed === initialAnnualUsed + 3, 
      `Expected annual used to increase by 3 from ${initialAnnualUsed} to ${initialAnnualUsed + 3}, got ${newAnnualUsed}`);
  });

  await testCase('LEV-011', 'System shall notify employees about approval or rejection', async () => {
    // Check notifications generated for employee
    const notifsRes = await request('GET', `/api/notifications?employeeId=${empId}`);
    assert(notifsRes.status === 200, `Expected status 200, got ${notifsRes.status}`);
    const notif = notifsRes.data.find(n => n.referenceId === createdLeaveId && n.type === 'leave_approved');
    assert(notif, 'Approval notification record found');
    assert(notif.title === 'Leave Request Approved', `Title matches, got: ${notif.title}`);
    assert(notif.read === false, 'Notification initially marked as unread');
    assert(notif.message.includes('Elena Rostova (HR)'), 'Notification contains reviewer info');

    // Test marking notification as read
    const markReadRes = await request('PATCH', `/api/notifications/${notif.id}/read`);
    assert(markReadRes.status === 200, 'Mark read returned 200');
    assert(markReadRes.data.read === true, 'Notification marked as read');
  });

  // Test rejection workflow (LEV-009, LEV-010 balance unchanged, LEV-011 rejection notification)
  let rejectedLeaveId = null;
  await testCase('LEV-009', 'HR Manager can reject leave requests (leaving balance unchanged and notifying employee)', async () => {
    // 1. Submit a sick leave request
    const applyRes = await request('POST', '/api/leaves', {
      employeeId: empId,
      leaveType: 'Sick',
      startDate: '2026-12-10',
      endDate: '2026-12-11',
      reason: 'Mild fever checkup'
    });
    assert(applyRes.status === 201, 'Created sick leave');
    rejectedLeaveId = applyRes.data.id;

    // Check sick balance before rejection
    const empBefore = (await request('GET', `/api/employees/${empId}`)).data;
    const sickUsedBefore = empBefore.leaveBalances.sick.used;

    // 2. HR rejects the request with note
    const rejectRes = await request('PATCH', `/api/leaves/${rejectedLeaveId}`, {
      status: 'Rejected',
      reviewedBy: 'Elena Rostova (HR)',
      reviewComment: 'Critical sprint release dates. Please reschedule if possible.'
    });
    assert(rejectRes.status === 200, 'Reject endpoint returned 200');
    assert(rejectRes.data.status === 'Rejected', 'Status is Rejected');

    // 3. Verify balance remained unchanged
    const empAfter = (await request('GET', `/api/employees/${empId}`)).data;
    const sickUsedAfter = empAfter.leaveBalances.sick.used;
    assert(sickUsedAfter === sickUsedBefore, 
      `Sick leave used balance should remain ${sickUsedBefore}, got ${sickUsedAfter}`);

    // 4. Verify rejection notification sent to employee (LEV-011)
    const notifs = (await request('GET', `/api/notifications?employeeId=${empId}`)).data;
    const rejectNotif = notifs.find(n => n.referenceId === rejectedLeaveId && n.type === 'leave_rejected');
    assert(rejectNotif, 'Rejection notification found in notifications list');
    assert(rejectNotif.title === 'Leave Request Rejected', 'Notification title is Leave Request Rejected');
    assert(rejectNotif.message.includes('Critical sprint release dates'), 'Rejection comment included in notification');
  });

  await testCase('LEV-012', 'Approved leave records shall be available for payroll calculation', async () => {
    // Query approved leaves
    const leavesRes = await request('GET', `/api/leaves?employeeId=${empId}&status=Approved`);
    assert(leavesRes.status === 200, 'Leaves query returned 200');
    assert(Array.isArray(leavesRes.data) && leavesRes.data.length > 0, 'Approved leaves returned');
    const hasApproved = leavesRes.data.some(l => l.status === 'Approved');
    assert(hasApproved, 'Approved leave records available');
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
