import React from 'react';
import { downloadPayslip } from '../../utils/payslipDownload';

export default function PayslipModal({
  selectedPayslip,
  onClose
}) {
  if (!selectedPayslip) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full p-8 shadow-2xl modal-enter" id="printable-payslip">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
              <i className="fa-solid fa-people-roof"></i>
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base leading-tight">NexusHR Technologies</h3>
              <p className="text-[10px] text-slate-400">Monthly Salary Statement</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 print:hidden">
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <div className="py-6 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl">
            <div>
              <div className="text-slate-400 text-[10px] uppercase font-bold">Employee</div>
              <div className="font-bold text-slate-900 text-sm mt-0.5">{selectedPayslip.employee_name}</div>
              <div className="text-slate-500">{selectedPayslip.employee_id}</div>
            </div>
            <div>
              <div className="text-slate-400 text-[10px] uppercase font-bold">Pay Period</div>
              <div className="font-bold text-slate-900 text-sm mt-0.5">
                {selectedPayslip.month} {selectedPayslip.year}
              </div>
              <div className="text-slate-500">Pay Date: {selectedPayslip.pay_date || 'Month-end'}</div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100/70 px-4 py-2 font-bold text-slate-700 flex justify-between">
              <span>Description</span>
              <span>Amount</span>
            </div>
            <div className="p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600">Base Salary</span>
                <span className="font-mono font-semibold">
                  ₹{Number(selectedPayslip.base_salary).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-rose-600">
                <span>Total Deductions & Tax / PF</span>
                <span className="font-mono font-semibold">
                  -₹{Number(selectedPayslip.total_deductions).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
            <div className="bg-emerald-50 px-4 py-3 border-t border-emerald-100 flex justify-between text-emerald-800 font-bold text-sm">
              <span>Net Take-Home Pay</span>
              <span className="font-mono">₹{Number(selectedPayslip.net_pay).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs print:hidden">
          <span className="text-slate-400">Statement ID: {selectedPayslip.id}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => downloadPayslip(selectedPayslip)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors flex items-center gap-2"
            >
              <i className="fa-solid fa-download text-indigo-600"></i> Download
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md flex items-center gap-2"
            >
              <i className="fa-solid fa-print"></i> Print Payslip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
