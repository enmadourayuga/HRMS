import React from 'react';
import { downloadPayslip } from '../utils/payslipDownload';

export default function PayrollPage({
  isHR,
  payroll,
  employeeProfile,
  onSelectPayslip
}) {
  const displayPayroll = isHR ? payroll : payroll.filter(p => p.employee_id === employeeProfile?.id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Payroll & Salary Slips</h2>
        <p className="text-xs text-slate-500">Monthly compensation statements, breakdown and deductions</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Period</th>
                <th className="py-3 px-4">Base Salary</th>
                <th className="py-3 px-4">Deductions</th>
                <th className="py-3 px-4">Net Take-Home</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Statement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayPayroll.map(ps => (
                <tr key={ps.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-semibold text-slate-900">{ps.employee_name}</td>
                  <td className="py-3 px-4 text-slate-500">
                    {ps.month} {ps.year}
                  </td>
                  <td className="py-3 px-4 font-mono">₹{Number(ps.base_salary).toLocaleString('en-IN')}</td>
                  <td className="py-3 px-4 font-mono text-rose-600">
                    -₹{Number(ps.total_deductions).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-emerald-600">
                    ₹{Number(ps.net_pay).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-slate-100 text-slate-700">
                      {ps.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onSelectPayslip(ps)}
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5"
                        title="View Full Payslip"
                      >
                        <i className="fa-solid fa-file-invoice"></i> View
                      </button>
                      <button
                        onClick={() => downloadPayslip(ps)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5"
                        title="Download Payslip HTML"
                      >
                        <i className="fa-solid fa-download text-indigo-600"></i> Download
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
