import React, { useState, useEffect } from 'react';

export default function ApplyLeaveModal({
  isOpen,
  onClose,
  leaveForm,
  setLeaveForm,
  onSubmit,
  employeeProfile
}) {
  const [errorMsg, setErrorMsg] = useState('');
  const [shake, setShake] = useState(false);

  // Default fallback balances if none exist
  const balances = employeeProfile?.leave_balances || {
    annual: { total: 20, used: 0 },
    sick: { total: 10, used: 0 },
    casual: { total: 5, used: 0 }
  };

  const currentType = (leaveForm.leave_type || 'Annual').toLowerCase();
  const currentBalanceInfo = balances[currentType] || { total: 10, used: 0 };
  const availableDays = Math.max(0, (currentBalanceInfo.total || 0) - (currentBalanceInfo.used || 0));

  // Automatically calculate days whenever start_date or end_date changes
  useEffect(() => {
    if (leaveForm.start_date && leaveForm.end_date) {
      const start = new Date(leaveForm.start_date);
      const end = new Date(leaveForm.end_date);

      if (end < start) {
        setErrorMsg('End date cannot be earlier than start date.');
        setLeaveForm(prev => ({ ...prev, days: 0 }));
      } else {
        const calculatedDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
        setLeaveForm(prev => ({ ...prev, days: calculatedDays }));

        if (calculatedDays > availableDays) {
          const deficit = calculatedDays - availableDays;
          setErrorMsg(
            `Insufficient balance: Requested ${calculatedDays} day(s), but only ${availableDays} day(s) available for ${leaveForm.leave_type} (exceeds by ${deficit}d).`
          );
        } else {
          setErrorMsg('');
        }
      }
    } else {
      setErrorMsg('');
    }
  }, [leaveForm.start_date, leaveForm.end_date, leaveForm.leave_type, availableDays]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!leaveForm.start_date || !leaveForm.end_date || !leaveForm.reason.trim()) {
      setErrorMsg('Please complete all fields before submitting.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    if (new Date(leaveForm.end_date) < new Date(leaveForm.start_date)) {
      setErrorMsg('End date cannot be earlier than start date.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    if (leaveForm.days > availableDays) {
      const deficit = leaveForm.days - availableDays;
      setErrorMsg(
        `Insufficient balance: Requested ${leaveForm.days} day(s), but only ${availableDays} day(s) remain for ${leaveForm.leave_type} (exceeds by ${deficit}d).`
      );
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    onSubmit(e);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl modal-enter ${shake ? 'animate-shake' : ''}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-base">
              <i className="fa-solid fa-plane-departure"></i>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">Apply for Time Off</h3>
              <p className="text-[11px] text-slate-400">Request leave with automatic balance check</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark text-base"></i>
          </button>
        </div>

        {/* Leave Entitlement Pills */}
        <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-slate-50 border border-slate-100 rounded-2xl">
          {['annual', 'sick', 'casual'].map((typeKey) => {
            const b = balances[typeKey] || { total: 0, used: 0 };
            const rem = Math.max(0, (b.total || 0) - (b.used || 0));
            const isSelected = currentType === typeKey;

            return (
              <div
                key={typeKey}
                onClick={() => setLeaveForm({ ...leaveForm, leave_type: typeKey.charAt(0).toUpperCase() + typeKey.slice(1) })}
                className={`p-2 rounded-xl text-center cursor-pointer transition-all border ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                }`}
              >
                <div className={`text-[10px] uppercase font-bold tracking-wider ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                  {typeKey}
                </div>
                <div className="text-sm font-extrabold mt-0.5">{rem} <span className="text-[10px] font-normal">left</span></div>
                <div className={`text-[9px] mt-0.5 ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                  {b.used || 0}/{b.total || 0} used
                </div>
              </div>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-700">Leave Category</label>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                availableDays > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                {availableDays} day(s) available
              </span>
            </div>
            <select
              value={leaveForm.leave_type}
              onChange={e => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Annual">Annual Leave</option>
              <option value="Sick">Sick Leave</option>
              <option value="Casual">Casual Leave</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                required
                value={leaveForm.start_date}
                onChange={e => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                required
                value={leaveForm.end_date}
                onChange={e => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <span className="font-semibold text-slate-600">Calculated Duration:</span>
            <span className={`font-extrabold text-sm ${leaveForm.days > availableDays ? 'text-rose-600' : 'text-slate-900'}`}>
              {leaveForm.days > 0 ? `${leaveForm.days} day(s)` : '--'}
            </span>
          </div>

          {/* Error / Deficit Warning Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <i className="fa-solid fa-triangle-exclamation text-rose-500 text-sm mt-0.5 shrink-0"></i>
              <span className="font-semibold leading-relaxed">{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Reason / Note</label>
            <textarea
              rows="3"
              required
              value={leaveForm.reason}
              onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })}
              placeholder="State the purpose for your leave..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            ></textarea>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={Boolean(errorMsg) || leaveForm.days <= 0 || leaveForm.days > availableDays}
              className={`px-4 py-2 font-semibold rounded-xl shadow-md transition-all flex items-center gap-2 ${
                Boolean(errorMsg) || leaveForm.days <= 0 || leaveForm.days > availableDays
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
              }`}
            >
              <i className="fa-solid fa-paper-plane text-xs"></i> Submit Application
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
