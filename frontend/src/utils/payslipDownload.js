// Utility to generate and download an official printable payslip document

export function downloadPayslip(slip) {
  if (!slip) return;

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payslip - ${slip.employee_name} (${slip.month} ${slip.year})</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      padding: 40px 20px;
    }
    .payslip-wrapper {
      max-width: 680px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 24px;
      padding: 40px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 24px;
      border-bottom: 2px solid #f1f5f9;
    }
    .brand-title {
      font-size: 22px;
      font-weight: 800;
      color: #4338ca;
      letter-spacing: -0.5px;
    }
    .brand-sub {
      font-size: 11px;
      color: #64748b;
      margin-top: 2px;
      font-weight: 500;
    }
    .period-box {
      text-align: right;
    }
    .period-title {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
    }
    .status-badge {
      display: inline-block;
      margin-top: 4px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 2px 8px;
      border-radius: 9999px;
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      background: #f8fafc;
      border: 1px solid #f1f5f9;
      border-radius: 16px;
      padding: 20px;
      margin: 24px 0;
    }
    .meta-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #94a3b8;
    }
    .meta-value {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 2px;
    }
    .meta-sub {
      font-size: 11px;
      color: #64748b;
      margin-top: 1px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      overflow: hidden;
    }
    th {
      background: #f8fafc;
      text-align: left;
      padding: 12px 16px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      border-bottom: 1px solid #e2e8f0;
    }
    td {
      padding: 14px 16px;
      font-size: 13px;
      border-bottom: 1px solid #f1f5f9;
    }
    .amount {
      text-align: right;
      font-family: monospace;
      font-weight: 600;
      font-size: 13px;
    }
    .deduction {
      color: #e11d48;
    }
    .net-row {
      background: #f0fdf4;
      font-weight: 800;
      color: #14532d;
      border-top: 2px solid #bbf7d0;
    }
    .net-row td {
      font-size: 15px;
      padding: 16px;
    }
    .net-amount {
      font-size: 16px;
      color: #15803d;
      font-family: monospace;
      text-align: right;
      font-weight: 800;
    }
    .footer {
      margin-top: 28px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #94a3b8;
    }
    .btn-print {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #4f46e5;
      color: #fff;
      border: none;
      padding: 8px 16px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .payslip-wrapper { border: none; box-shadow: none; padding: 0; }
      .btn-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="payslip-wrapper">
    <div class="header">
      <div>
        <div class="brand-title">NexusHR Technologies</div>
        <div class="brand-sub">Official Salary Statement & Remuneration Certificate</div>
      </div>
      <div class="period-box">
        <div class="period-title">${slip.month} ${slip.year}</div>
        <div class="status-badge">${slip.status || 'Approved & Released'}</div>
      </div>
    </div>

    <div class="meta-grid">
      <div>
        <div class="meta-label">Employee Details</div>
        <div class="meta-value">${slip.employee_name}</div>
        <div class="meta-sub">ID: ${slip.employee_id}</div>
      </div>
      <div>
        <div class="meta-label">Disbursement Details</div>
        <div class="meta-value">${slip.pay_date || 'Month-End Processing'}</div>
        <div class="meta-sub">Ref: ${slip.id}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Earnings & Allowances</th>
          <th style="text-align: right;">Amount (INR)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Base Salary & Core Compensation</td>
          <td class="amount">₹${Number(slip.base_salary).toLocaleString('en-IN')}</td>
        </tr>
        <tr>
          <td>Total Deductions (Tax / PF / Attendance)</td>
          <td class="amount deduction">-₹${Number(slip.total_deductions).toLocaleString('en-IN')}</td>
        </tr>
        <tr class="net-row">
          <td>Net Take-Home Pay</td>
          <td class="net-amount">₹${Number(slip.net_pay).toLocaleString('en-IN')}</td>
        </tr>
      </tbody>
    </table>

    <div class="footer">
      <div>
        <div>Generated by NexusHR Automated Payroll System</div>
        <div style="font-size: 10px; margin-top: 2px;">This is a computer-generated document and requires no physical signature.</div>
      </div>
      <button class="btn-print" onclick="window.print()">Print Statement</button>
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeName = (slip.employee_name || slip.employee_id || 'Employee').replace(/[^a-zA-Z0-9_-]/g, '_');
  link.download = `Payslip_${safeName}_${slip.month}_${slip.year}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
