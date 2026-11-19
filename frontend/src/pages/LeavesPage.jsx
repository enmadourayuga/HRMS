import React from 'react';

export default function LeavesPage({
  isHR,
  employeeProfile,
  filteredLeaves,
  leaveStatusFilter,
  setLeaveStatusFilter,
  onOpenLeaveModal,
  onLeaveAction
}) {
  const balances = employeeProfile?.leave_balances || {
    annual: { total: 20, used: 0 },
    sick: { total: 10, used: 0 },
    casual: { total: 5, used: 0 }
  };

  const categories = [
    { key: 'annual', label: 'Annual Leave', icon: 'fa-umbrella-beach', color: 'indigo', textClass: 'text-indigo-600', barClass: 'bg-indigo-600', iconClass: 'text-indigo-500' },
    { key: 'sick', label: 'Sick Leave', icon: 'fa-notes-medical', color: 'rose', textClass: 'text-rose-600', barClass: 'bg-rose-600', iconClass: 'text-rose-500' },
    { key: 'casual', label: 'Casual Leave', icon: 'fa-calendar-check', color: 'amber', textClass: 'text-amber-600', barClass: 'bg-amber-600', iconClass: 'text-amber-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Leave Management</h2>
          <p className="text-xs text-slate-500">Track balance entitlements and review absence applications</p>
        </div>
        <button
          onClick={onOpenLeaveModal}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <i className="fa-solid fa-plane-departure"></i> Apply for Leave
        </button>
      </div>

      {/* Leave Balances Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {categories.map(cat => {
          const b = balances[cat.key] || { total: 0, used: 0 };
          const remaining = Math.max(0, (b.total || 0) - (b.used || 0));
          const pct = Math.min(100, Math.round(((b.used || 0) / (b.total || 1)) * 100));

          return (
            <div
              key={cat.key}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase text-slate-400">{cat.label}</span>
                  <i className={`fa-solid ${cat.icon} ${cat.iconClass} text-sm`}></i>
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className={`text-2xl font-extrabold ${cat.textClass}`}>{remaining}</span>
                  <span className="text-xs font-semibold text-slate-500">day(s) left</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {b.used || 0} days used &bull; {b.total || 0} allocated
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="flex justify-between text-[10px] text-slate-400 font-semibold mb-1">
                  <span>Usage</span>
                  <span>{pct}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${cat.barClass}`}
                    style={{ width: `${pct}%` }}
                  ></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        {['All', 'Pending', 'Approved', 'Rejected'].map(status => (
          <button
            key={status}
            onClick={() => setLeaveStatusFilter(status)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              leaveStatusFilter === status
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Dates</th>
                <th className="py-3 px-4">Days</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Status</th>
                {isHR && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeaves.map(lv => (
                <tr key={lv.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-semibold text-slate-900">{lv.employee_name}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-medium">
                      {lv.leave_type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {lv.start_date} &rarr; {lv.end_date}
                  </td>
                  <td className="py-3 px-4 font-bold">{lv.days}</td>
                  <td className="py-3 px-4 max-w-xs truncate text-slate-600" title={lv.reason}>
                    {lv.reason || '---'}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        lv.status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-700'
                          : lv.status === 'Rejected'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {lv.status}
                    </span>
                  </td>
                  {isHR && (
                    <td className="py-3 px-4 text-right">
                      {lv.status === 'Pending' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onLeaveAction(lv.id, 'Approved')}
                            className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-lg"
                            title="Approve"
                          >
                            <i className="fa-solid fa-check"></i>
                          </button>
                          <button
                            onClick={() => onLeaveAction(lv.id, 'Rejected')}
                            className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg"
                            title="Reject"
                          >
                            <i className="fa-solid fa-xmark"></i>
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Reviewed</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
