// tests/test_module2_attendance.js
// Automated verification test suite for Module 2: Attendance Management (ATT-001 to ATT-012, BR-ATT-01 to BR-ATT-06)

const BASE_URL = 'http://localhost:3000/api';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const { headers, ...rest } = options;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(headers || {}) },
    ...rest
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`[FAIL] ${testName} - ${details}`);
    failedCount++;
  }
}

async function runAttendanceTests() {
  console.log('================================================================');
  console.log('   MODULE 2: ATTENDANCE MANAGEMENT VERIFICATION SUITE');
  console.log('   Testing ATT-001 to ATT-012, BR-ATT-01 to BR-ATT-06');
  console.log('================================================================\n');

  try {
    const testDay = Math.floor(10 + Math.random() * 18);
    const testDate = `2026-12-${String(testDay).padStart(2, '0')}`;
    console.log(`[SETUP] Using fresh test date: ${testDate}\n`);

    // -------------------------------------------------------------------------
    // TEST 1: ATT-001 & ATT-004 - Biometric Integration & Employee ID Mapping
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: ATT-001 & ATT-004 - Device Integration & Employee Mapping ---');
    // Ingest punch by biometricRef
    const punch1 = await request('/biometric/punch', {
      method: 'POST',
      body: JSON.stringify({
        biometricRef: 'BIO-EMP-002',
        timestamp: `${testDate} 08:55:00`,
        deviceId: 'DEV-HQ-MAIN'
      })
    });
    assert(
      punch1.status === 201 && punch1.data.punchType === 'ENTRY',
      'ATT-001.1: System integrates with biometric device and ingests punch',
      `Status: ${punch1.status}, punchType: ${punch1.data?.punchType}`
    );
    assert(
      punch1.data.attendanceRecord?.employeeId === 'EMP-002',
      'ATT-004.1: System correctly maps biometricRef (BIO-EMP-002) to Employee ID (EMP-002)',
      `Mapped employeeId: ${punch1.data?.attendanceRecord?.employeeId}`
    );

    // -------------------------------------------------------------------------
    // TEST 2: ATT-002 & ATT-003 - First Punch = Entry, Second Punch = Exit
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: ATT-002 & ATT-003 - First Punch (Entry) & Second Punch (Exit) ---');
    assert(
      Boolean(punch1.data.attendanceRecord?.clockIn) && punch1.data.attendanceRecord?.clockOut === null,
      'ATT-002.1: First biometric punch is automatically captured as check-in entry time',
      `clockIn: ${punch1.data?.attendanceRecord?.clockIn}, clockOut: ${punch1.data?.attendanceRecord?.clockOut}`
    );

    // Second punch for same employee on same day
    const punch2 = await request('/biometric/punch', {
      method: 'POST',
      body: JSON.stringify({
        biometricRef: 'BIO-EMP-002',
        timestamp: `${testDate} 17:35:00`,
        deviceId: 'DEV-HQ-MAIN'
      })
    });
    assert(
      punch2.status === 201 && punch2.data.punchType === 'EXIT',
      'ATT-003.1: Second biometric punch is automatically captured as check-out exit time',
      `Status: ${punch2.status}, punchType: ${punch2.data?.punchType}`
    );
    assert(
      punch2.data.attendanceRecord?.clockOut !== null,
      'ATT-003.2: Attendance record reflects both check-in and check-out after second punch',
      `clockIn: ${punch2.data?.attendanceRecord?.clockIn}, clockOut: ${punch2.data?.attendanceRecord?.clockOut}`
    );

    // -------------------------------------------------------------------------
    // TEST 3: ATT-005 - Calculation of Daily Working Hours
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: ATT-005 - Calculation of Daily Working Hours ---');
    const hours = punch2.data.attendanceRecord?.totalHours;
    // 08:55 to 17:35 = 8 hours 40 minutes = 8.67 -> 8.7 hrs
    assert(
      typeof hours === 'number' && hours >= 8.5 && hours <= 8.8,
      'ATT-005.1: Daily working hours correctly calculated from entry and exit timestamps',
      `Calculated hours: ${hours}`
    );

    // -------------------------------------------------------------------------
    // TEST 4: ATT-006 - Identification of Late Arrivals & Early Departures
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: ATT-006 - Identification of Late Arrivals & Early Departures ---');
    // Employee EMP-003 punches in late (> 09:15 AM)
    const latePunchIn = await request('/biometric/punch', {
      method: 'POST',
      body: JSON.stringify({
        employeeId: 'EMP-003',
        timestamp: `${testDate} 09:35:00`,
        deviceId: 'DEV-HQ-MAIN'
      })
    });
    assert(
      latePunchIn.data.attendanceRecord?.isLate === true && latePunchIn.data.attendanceRecord?.status === 'Late',
      'ATT-006.1: System identifies late arrival when check-in is after scheduled start (09:15 AM)',
      `isLate: ${latePunchIn.data?.attendanceRecord?.isLate}, status: ${latePunchIn.data?.attendanceRecord?.status}`
    );

    // Employee EMP-004 punches out early (< 05:30 PM)
    await request('/biometric/punch', {
      method: 'POST',
      body: JSON.stringify({
        employeeId: 'EMP-004',
        timestamp: `${testDate} 08:50:00`,
        deviceId: 'DEV-HQ-MAIN'
      })
    });
    const earlyPunchOut = await request('/biometric/punch', {
      method: 'POST',
      body: JSON.stringify({
        employeeId: 'EMP-004',
        timestamp: `${testDate} 16:10:00`, // 04:10 PM
        deviceId: 'DEV-HQ-MAIN'
      })
    });
    assert(
      earlyPunchOut.data.attendanceRecord?.isEarlyDeparture === true,
      'ATT-006.2: System identifies early departure when check-out is before scheduled end (05:30 PM)',
      `isEarlyDeparture: ${earlyPunchOut.data?.attendanceRecord?.isEarlyDeparture}`
    );

    // -------------------------------------------------------------------------
    // TEST 5: ATT-007 & BR-ATT-04 - Missing Check-in / Check-out Records
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: ATT-007 & BR-ATT-04 - Identification of Missing Punches ---');
    // Employee EMP-005 punches in only, with no exit punch
    const missingOutPunch = await request('/biometric/punch', {
      method: 'POST',
      body: JSON.stringify({
        employeeId: 'EMP-005',
        timestamp: `${testDate} 09:00:00`,
        deviceId: 'DEV-HQ-MAIN'
      })
    });
    assert(
      missingOutPunch.data.attendanceRecord?.missingPunch === 'checkout',
      'ATT-007.1: System identifies missing check-out punch when exit is missing',
      `missingPunch: ${missingOutPunch.data?.attendanceRecord?.missingPunch}`
    );

    // BR-ATT-04: Validate-all must NOT automatically treat missing punches as full-day attendance
    const autoVal = await request('/attendance/validate-all', {
      method: 'POST',
      headers: { 'X-User-Email': 'hr@hrms.com' },
      body: JSON.stringify({ date: testDate })
    });
    assert(
      autoVal.ok && autoVal.data.skippedMissingPunchCount >= 1,
      'BR-ATT-04: Missing punches are flagged and withheld from automatic validation',
      `Skipped missing punches: ${autoVal.data?.skippedMissingPunchCount}`
    );

    // Verify EMP-005 is still unvalidated
    const emp5Att = await request(`/attendance?employeeId=EMP-005&date=${testDate}`);
    assert(
      emp5Att.ok && emp5Att.data[0]?.isValidated === false,
      'BR-ATT-04.2: Record with missing punch remains unvalidated pending HR review',
      `isValidated: ${emp5Att.data[0]?.isValidated}`
    );

    // -------------------------------------------------------------------------
    // TEST 6: ATT-008 - Display Daily Attendance & Summary for HR Validation
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: ATT-008 - Daily Attendance Display & Summary ---');
    const dayAttendance = await request(`/attendance?date=${testDate}`);
    assert(
      dayAttendance.ok && dayAttendance.data.length >= 3,
      'ATT-008.1: System retrieves and displays daily attendance records for HR validation',
      `Count on ${testDate}: ${dayAttendance.data?.length}`
    );

    const summary = await request(`/attendance/summary?date=${testDate}`);
    assert(
      summary.ok && typeof summary.data.totalLate === 'number' && typeof summary.data.totalMissingPunches === 'number',
      'ATT-008.2: System generates daily KPI summary (scheduled, late, missing punches, validated)',
      `Summary: late=${summary.data?.totalLate}, missing=${summary.data?.totalMissingPunches}, validated=${summary.data?.totalValidated}`
    );

    // -------------------------------------------------------------------------
    // TEST 7: ATT-009 - HR Manager Validates Daily Attendance
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 7: ATT-009 - HR Manager Daily Attendance Validation ---');
    const cleanRecord = dayAttendance.data.find(a => a.employeeId === 'EMP-002');
    const validateRes = await request(`/attendance/${cleanRecord.id}/validate`, {
      method: 'PATCH',
      headers: { 'X-User-Email': 'hr@hrms.com' }
    });
    assert(
      validateRes.ok && validateRes.data.record?.isValidated === true && Boolean(validateRes.data.record?.validatedBy),
      'ATT-009.1: HR Manager validates attendance record, capturing validator and timestamp',
      `isValidated: ${validateRes.data.record?.isValidated}, validatedBy: ${validateRes.data.record?.validatedBy}`
    );

    // -------------------------------------------------------------------------
    // TEST 8: ATT-010 & BR-ATT-03 - HR Corrects Discrepancy with Mandatory Reason
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 8: ATT-010 & BR-ATT-03 - Correction of Discrepancies with Reason ---');
    const missingRec = dayAttendance.data.find(a => a.employeeId === 'EMP-005');

    // 8a. Attempt correction without reason -> must fail with HTTP 400
    const failCorrection = await request(`/attendance/${missingRec.id}/correct`, {
      method: 'PATCH',
      headers: { 'X-User-Email': 'hr@hrms.com' },
      body: JSON.stringify({
        clockOut: '05:30 PM',
        correctionReason: '' // Empty reason
      })
    });
    assert(
      failCorrection.status === 400,
      'BR-ATT-03.1: System enforces mandatory correction reason (rejects empty reason with HTTP 400)',
      `Status: ${failCorrection.status}`
    );

    // 8b. Submit valid correction with official reason
    const validCorrection = await request(`/attendance/${missingRec.id}/correct`, {
      method: 'PATCH',
      headers: { 'X-User-Email': 'hr@hrms.com' },
      body: JSON.stringify({
        clockIn: '09:00 AM',
        clockOut: '05:30 PM',
        status: 'Present',
        correctionReason: 'Employee conducted off-site client demo in the afternoon; verified with manager'
      })
    });
    assert(
      validCorrection.ok && validCorrection.data.record?.isCorrected === true,
      'ATT-010.1: HR Manager corrects attendance discrepancy with audit trail',
      `isCorrected: ${validCorrection.data.record?.isCorrected}, reason: ${validCorrection.data.record?.correctionReason}`
    );
    assert(
      validCorrection.data.record?.correctedBy && validCorrection.data.record?.correctedAt,
      'BR-ATT-03.2: Correction captures user and timestamp in audit trail',
      `correctedBy: ${validCorrection.data.record?.correctedBy}, correctedAt: ${validCorrection.data.record?.correctedAt}`
    );
    assert(
      validCorrection.data.record?.totalHours === 8.5 && validCorrection.data.record?.isValidated === true,
      'ATT-010.2: Corrected record recalculates working hours and sets validated status',
      `recalculated hours: ${validCorrection.data.record?.totalHours}`
    );

    // -------------------------------------------------------------------------
    // TEST 9: ATT-011 & BR-ATT-02 - Maintain Original Biometric Records Separately
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 9: ATT-011 & BR-ATT-02 - Original Biometric Record Preservation ---');
    // Verify originalBiometric field on the corrected record is untouched
    const orig = validCorrection.data.record?.originalBiometric;
    assert(
      orig && orig.clockOut === null,
      'BR-ATT-02.1: Original biometric machine punches remain unoverwritten and stored separately',
      `original clockOut: ${orig?.clockOut}, corrected clockOut: ${validCorrection.data.record?.clockOut}`
    );

    // Retrieve raw device punch stream
    const rawPunches = await request('/biometric/punches');
    assert(
      rawPunches.ok && Array.isArray(rawPunches.data) && rawPunches.data.length >= 10,
      'ATT-011.1: System maintains original immutable biometric machine punches stream',
      `Raw punches count: ${rawPunches.data?.length}`
    );

    // -------------------------------------------------------------------------
    // TEST 10: ATT-012 & BR-ATT-05 - HR-Validated Attendance Records & Payroll Chain
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 10: ATT-012 & BR-ATT-05 - Validated Attendance Integration ---');
    const validatedOnly = await request(`/attendance?date=${testDate}&isValidated=true`);
    assert(
      validatedOnly.ok && validatedOnly.data.every(a => a.isValidated === true),
      'ATT-012.1: System maintains and filters HR-validated attendance records',
      `Validated records retrieved: ${validatedOnly.data?.length}`
    );

    // -------------------------------------------------------------------------
    // TEST 11: BR-ATT-06 - Flag Biometric Synchronization Failures
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 11: BR-ATT-06 - Biometric Synchronization Failure Flagging ---');
    // Attempt punch with unmapped/unknown biometric reference
    const failPunch = await request('/biometric/punch', {
      method: 'POST',
      body: JSON.stringify({
        biometricRef: 'BIO-UNKNOWN-GUEST-88',
        timestamp: `${testDate} 10:00:00`,
        deviceId: 'DEV-GATE-02'
      })
    });
    assert(
      failPunch.status === 422,
      'BR-ATT-06.1: Unmapped biometric device punch is rejected with unprocessable status (HTTP 422)',
      `Status: ${failPunch.status}`
    );

    const failuresList = await request('/biometric/sync-failures');
    const hasFailure = (failuresList.data || []).some(f => f.biometricRef === 'BIO-UNKNOWN-GUEST-88');
    assert(
      failuresList.ok && hasFailure,
      'BR-ATT-06.2: Synchronization failure is logged with device ID and error reason for HR review',
      `Logged failure detected: ${hasFailure}`
    );

    // -------------------------------------------------------------------------
    // TEST 12: Employee Attendance Correction Request Workflow
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 12: Employee Attendance Correction Request Workflow ---');
    const reqRes = await request('/attendance/correction-requests', {
      method: 'POST',
      body: JSON.stringify({
        employeeId: 'EMP-003',
        date: testDate,
        requestedIn: '09:00 AM',
        requestedOut: '05:30 PM',
        reason: 'Badge scanner was undergoing maintenance at north entrance'
      })
    });
    assert(
      reqRes.status === 201 && reqRes.data.status === 'Pending',
      'CORR-001: Employee submits attendance correction request to HR',
      `Status: ${reqRes.data?.status}`
    );

    const reqId = reqRes.data.id;
    // HR approves request
    const approveReq = await request(`/attendance/correction-requests/${reqId}`, {
      method: 'PATCH',
      headers: { 'X-User-Email': 'hr@hrms.com' },
      body: JSON.stringify({ status: 'Approved' })
    });
    assert(
      approveReq.ok && approveReq.data.request?.status === 'Approved',
      'CORR-002: HR Manager approves correction request and automatically updates attendance',
      `Approved status: ${approveReq.data.request?.status}`
    );

  } catch (err) {
    console.error('Fatal error during attendance test execution:', err);
    failedCount++;
  }

  console.log('\n================================================================');
  console.log(`   MODULE 2 TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('================================================================');

  process.exit(failedCount > 0 ? 1 : 0);
}

runAttendanceTests();
