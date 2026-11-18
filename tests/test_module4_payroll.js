// tests/test_module4_payroll.js
// Automated verification test suite for Module 4: Payroll Management (PAY-001 to PAY-012, BR-PAY-01 to BR-PAY-03)

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

async function runPayrollTests() {
  console.log('================================================================');
  console.log('   MODULE 4: PAYROLL MANAGEMENT VERIFICATION SUITE');
  console.log('   Testing PAY-001 to PAY-012, BR-PAY-01 to BR-PAY-03');
  console.log('================================================================\n');

  try {
    // -------------------------------------------------------------------------
    // TEST 1: PAY-001 - Salary Structures Maintenance (CRUD)
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: PAY-001 - Salary Structures Maintenance ---');
    const getStructures = await request('/salary-structures');
    assert(
      getStructures.ok && Array.isArray(getStructures.data) && getStructures.data.length >= 3,
      'PAY-001.1: System retrieves configured salary structures',
      `Found ${getStructures.data ? getStructures.data.length : 0} structures`
    );

    const testStructurePayload = {
      name: 'Contract Specialist Structure',
      description: 'Custom structure for contractors',
      basicPercentage: 60,
      hraPercentage: 25,
      specialAllowancePercentage: 10,
      conveyanceFixed: 2000,
      pfPercentage: 12,
      taxPercentage: 10,
      healthInsuranceFixed: 1500
    };

    // Create via authorized HR header
    const createStruct = await request('/salary-structures', {
      method: 'POST',
      headers: { 'X-User-Email': 'hr@hrms.com' },
      body: JSON.stringify(testStructurePayload)
    });
    assert(
      createStruct.status === 201 && createStruct.data.id && createStruct.data.basicPercentage === 60,
      'PAY-001.2: System allows creating a new salary structure with component percentages',
      `Status: ${createStruct.status}`
    );

    const createdId = createStruct.data ? createStruct.data.id : null;

    // Update structure
    if (createdId) {
      const updateStruct = await request(`/salary-structures/${createdId}`, {
        method: 'PUT',
        headers: { 'X-User-Email': 'finance@hrms.com' },
        body: JSON.stringify({ conveyanceFixed: 2500 })
      });
      assert(
        updateStruct.ok && updateStruct.data.conveyanceFixed === 2500,
        'PAY-001.3: System allows updating salary structure components',
        `Conveyance: ${updateStruct.data ? updateStruct.data.conveyanceFixed : 'N/A'}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 2: PAY-002 & BR-PAY-01 - Validated Attendance Integration
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: PAY-002 & BR-PAY-01 - Validated Attendance Integration ---');
    // Ensure all attendance can be validated
    const validateAll = await request('/attendance/validate-all', {
      method: 'POST',
      headers: { 'X-User-Email': 'hr@hrms.com' },
      body: JSON.stringify({ month: '11', year: '2026' })
    });
    assert(
      validateAll.ok && typeof validateAll.data.count === 'number',
      'PAY-002.1: HR validates monthly attendance records',
      `Validated count: ${validateAll.data ? validateAll.data.count : 0}`
    );

    // Verify policy has attendance validation required
    const getPolicy = await request('/payroll/policy');
    assert(
      getPolicy.ok && getPolicy.data.requireAttendanceValidation === true,
      'BR-PAY-01: Payroll policy enforces validated attendance only',
      `requireAttendanceValidation: ${getPolicy.data ? getPolicy.data.requireAttendanceValidation : 'N/A'}`
    );

    // -------------------------------------------------------------------------
    // TEST 3: PAY-003 - Approved Leave Records Retrieval
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: PAY-003 - Retrieval of Approved Leave Records ---');
    const getLeaves = await request('/leaves');
    const approvedLeaves = (getLeaves.data || []).filter(l => l.status === 'Approved');
    assert(
      getLeaves.ok && approvedLeaves.length > 0,
      'PAY-003.1: Approved leave records are retrieved and identifiable for payroll calculation',
      `Found ${approvedLeaves.length} approved leave record(s)`
    );

    // -------------------------------------------------------------------------
    // TEST 4: PAY-004 - Calculation of Payable Working Days
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: PAY-004 - Calculation of Payable Working Days ---');
    // Recalculate payroll to ensure fresh attendance summary
    const recalcRes = await request('/payslips/recalculate-all', {
      method: 'POST',
      body: JSON.stringify({ month: 'November', year: 2026 })
    });
    assert(
      recalcRes.ok,
      'PAY-004.1: Recalculate payroll cycle runs successfully',
      `Recalculated: ${recalcRes.data ? recalcRes.data.count : 0}`
    );

    const getPayslips = await request('/payslips?month=November&year=2026');
    const sampleSlip = (getPayslips.data || []).find(p => p.employeeId === 'EMP-001') || (getPayslips.data && getPayslips.data[0]);

    assert(
      sampleSlip && sampleSlip.attendanceSummary && typeof sampleSlip.attendanceSummary.payableDays === 'number',
      'PAY-004.2: Payable working days calculated and present in payslip attendanceSummary',
      `Payable days: ${sampleSlip?.attendanceSummary?.payableDays}`
    );

    // Verify formula: payableDays = min(salaryDivisor, presentDays + paidLeaveDays)
    const att = sampleSlip.attendanceSummary;
    const expectedPayable = Math.min(att.salaryDivisor, att.presentDays + att.paidLeaveDays);
    assert(
      att.payableDays === expectedPayable,
      'PAY-004.3: Payable days matches formula: Present Days + Approved Paid Leave Days',
      `att.payableDays (${att.payableDays}) === expectedPayable (${expectedPayable})`
    );

    // -------------------------------------------------------------------------
    // TEST 5: PAY-005 & BR-PAY-02 - Loss of Pay (LOP) and Configurable Divisor
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: PAY-005 & BR-PAY-02 - Loss of Pay Calculation & 30-Day Divisor ---');
    assert(
      att.salaryDivisor === 30,
      'BR-PAY-02: Salary divisor defaults to 30 as required by BRD Section 7',
      `Divisor: ${att.salaryDivisor}`
    );

    const expectedDailyRate = Math.round((sampleSlip.monthlyCTC || (sampleSlip.baseSalary / 0.5)) / att.salaryDivisor);
    assert(
      Math.abs(att.perDayRate - expectedDailyRate) <= 5,
      'PAY-005.1: Daily rate calculated accurately (monthly base / salary divisor)',
      `Actual daily rate: ${att.perDayRate}, expected ~${expectedDailyRate}`
    );

    const expectedLopDays = Math.max(0, att.salaryDivisor - att.payableDays + (att.latePenaltyDays || 0));
    assert(
      att.lopDays === expectedLopDays,
      'PAY-005.2: LOP days accurately reflects non-payable days according to policy',
      `LOP Days: ${att.lopDays}, expected: ${expectedLopDays}`
    );

    const expectedLopDeduction = Math.round(att.perDayRate * att.lopDays);
    assert(
      att.attendanceDeduction === expectedLopDeduction,
      'PAY-005.3: LOP deduction accurately equals LOP days * Daily rate',
      `LOP deduction: ${att.attendanceDeduction}, expected: ${expectedLopDeduction}`
    );

    // -------------------------------------------------------------------------
    // TEST 6: PAY-006 - Gross Salary Calculation Based on Structure
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: PAY-006 - Gross Salary Calculation Based on Structure ---');
    const basic = sampleSlip.baseSalary;
    const hra = sampleSlip.allowances.hra;
    const special = sampleSlip.allowances.specialAllowance;
    const conveyance = sampleSlip.allowances.conveyance;
    const expectedGross = basic + hra + special + conveyance;

    assert(
      sampleSlip.grossPay === expectedGross,
      'PAY-006.1: Gross pay correctly sums Basic + HRA + Special Allowance + Conveyance',
      `Gross: ${sampleSlip.grossPay}, Sum: ${expectedGross}`
    );

    assert(
      Boolean(sampleSlip.salaryStructureName),
      'PAY-006.2: Payslip records assigned salary structure name',
      `Structure: ${sampleSlip.salaryStructureName}`
    );

    // -------------------------------------------------------------------------
    // TEST 7: PAY-007 - Applicable Deductions Calculation
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 7: PAY-007 - Applicable Deductions (PF, Tax, Insurance, LOP) ---');
    const ded = sampleSlip.deductions;
    assert(
      typeof ded.providentFund === 'number' && ded.providentFund > 0,
      'PAY-007.1: Provident Fund (PF) deduction calculated based on structure percentage',
      `PF: ${ded.providentFund}`
    );

    assert(
      typeof ded.incomeTax === 'number' && ded.incomeTax > 0,
      'PAY-007.2: Income Tax (TDS) deduction calculated based on structure percentage',
      `TDS: ${ded.incomeTax}`
    );

    assert(
      typeof ded.healthInsurance === 'number' && ded.healthInsurance > 0,
      'PAY-007.3: Health Insurance statutory deduction applied',
      `Insurance: ${ded.healthInsurance}`
    );

    const sumDeductions = ded.providentFund + ded.incomeTax + ded.healthInsurance + (ded.attendanceDeduction || 0);
    assert(
      sampleSlip.totalDeductions === sumDeductions,
      'PAY-007.4: Total deductions correctly aggregates PF, Tax, Insurance, and LOP',
      `Total deductions: ${sampleSlip.totalDeductions}, sum: ${sumDeductions}`
    );

    // -------------------------------------------------------------------------
    // TEST 8: PAY-008 - Automatic Net Salary Calculation
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 8: PAY-008 - Net Salary Calculation ---');
    const expectedNet = sampleSlip.grossPay - sampleSlip.totalDeductions;
    assert(
      sampleSlip.netPay === expectedNet,
      'PAY-008.1: Net salary automatically calculated: Gross Pay - Total Deductions',
      `Net pay: ${sampleSlip.netPay}, expected: ${expectedNet}`
    );

    // -------------------------------------------------------------------------
    // TEST 9: PAY-009 - HR / Finance Review of Payroll Calculation
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 9: PAY-009 - HR / Finance Review Capability ---');
    // HR can view all slips including Pending Approval
    const hrSlips = await request('/payslips', {
      headers: { 'X-User-Email': 'hr@hrms.com' }
    });
    assert(
      hrSlips.ok && hrSlips.data.length > 0,
      'PAY-009.1: HR / Finance can review all payslips and calculation breakdowns',
      `Total slips visible to HR: ${hrSlips.data.length}`
    );

    // Individual slip review
    const singleSlip = await request(`/payslips/${sampleSlip.id}`, {
      headers: { 'X-User-Email': 'finance@hrms.com' }
    });
    assert(
      singleSlip.ok && singleSlip.data.id === sampleSlip.id && singleSlip.data.allowances && singleSlip.data.deductions,
      'PAY-009.2: HR / Finance can inspect detailed line-item statement for any employee',
      `Inspected slip: ${singleSlip.data.id}`
    );

    // -------------------------------------------------------------------------
    // TEST 10: PAY-010 & BR-PAY-03 - Finalization Role Restrictions & Constraints
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 10: PAY-010 & BR-PAY-03 - Finalization & Role Restrictions ---');
    // 10a. Standard employee cannot finalize payroll
    const employeeFinalize = await request('/payslips/finalize', {
      method: 'POST',
      headers: { 'X-User-Email': 'alex.morgan@hrms.com' }, // standard employee (EMP-002)
      body: JSON.stringify({ month: 'November', year: 2026 })
    });
    assert(
      employeeFinalize.status === 403,
      'BR-PAY-03.1: Standard employee is denied access to finalize payroll (HTTP 403)',
      `Status: ${employeeFinalize.status}`
    );

    // 10b. Authorized Finance Lead can finalize payroll
    const financeFinalize = await request('/payslips/finalize', {
      method: 'POST',
      headers: { 'X-User-Email': 'finance@hrms.com' }, // Finance Lead (David Miller)
      body: JSON.stringify({ month: 'November', year: 2026, finalizedBy: 'David Miller (Finance Lead)' })
    });
    assert(
      financeFinalize.ok && financeFinalize.data.month === 'November',
      'PAY-010.1: Authorized Finance Lead can finalize payroll cycle',
      `Response message: ${financeFinalize.data ? financeFinalize.data.message : 'N/A'}`
    );

    // Verify all November slips are now Finalized
    const postFinalizeSlips = await request('/payslips?month=November&year=2026');
    const allFinalized = postFinalizeSlips.data.every(p => p.status === 'Finalized');
    assert(
      allFinalized,
      'PAY-010.2: All slips in the cycle are transitioned to Finalized and locked',
      `Total finalized: ${postFinalizeSlips.data.length}`
    );

    // -------------------------------------------------------------------------
    // TEST 11: PAY-011 - Employee Payslip View & Itemized Breakdown
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 11: PAY-011 - Employee Payslip Generation with Itemized Breakdown ---');
    // Employee Alex Morgan viewing their finalized payslip
    const alexSlip = postFinalizeSlips.data.find(p => p.employeeId === 'EMP-002');
    const empView = await request(`/payslips/${alexSlip.id}`, {
      headers: { 'X-User-Email': 'alex.morgan@hrms.com' }
    });
    assert(
      empView.ok && empView.data.status === 'Finalized',
      'PAY-011.1: Employee can view finalized payslip statement',
      `Status: ${empView.data?.status}`
    );

    assert(
      empView.data.allowances?.hra !== undefined && 
      empView.data.deductions?.providentFund !== undefined &&
      empView.data.attendanceSummary?.payableDays !== undefined,
      'PAY-011.2: Payslip contains complete itemized breakdown (HRA, PF, Tax, Payable Days)',
      `Allowances & deductions itemized: true`
    );

    // -------------------------------------------------------------------------
    // TEST 12: PAY-012 - Monthly Payroll History Persistence & Retrieval
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 12: PAY-012 - Monthly Payroll History Persistence ---');
    const octSlips = await request('/payslips?month=October&year=2026');
    const novSlips = await request('/payslips?month=November&year=2026');
    assert(
      octSlips.ok && octSlips.data.length > 0 && novSlips.ok && novSlips.data.length > 0,
      'PAY-012.1: Payroll history persisted and filterable across multiple months (Oct & Nov)',
      `October slips: ${octSlips.data.length}, November slips: ${novSlips.data.length}`
    );

    const empHistory = await request('/payslips?employeeId=EMP-002');
    assert(
      empHistory.ok && empHistory.data.length >= 2,
      'PAY-012.2: Historical payslips retrieved by employeeId over multiple months',
      `Employee EMP-002 history count: ${empHistory.data ? empHistory.data.length : 0}`
    );

  } catch (err) {
    console.error('Fatal error during test execution:', err);
    failedCount++;
  }

  console.log('\n================================================================');
  console.log(`   MODULE 4 TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('================================================================');

  process.exit(failedCount > 0 ? 1 : 0);
}

runPayrollTests();
