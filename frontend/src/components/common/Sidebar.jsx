import React from 'react';

export default function Sidebar({
  isHR,
  activeTab,
  setActiveTab,
  pendingLeavesCount,
  loading,
  onRefresh
}) {
  return (
    <aside className="w-64 bg-white border-r border-slate-200 p-4 flex flex-col justify-between shrink-0 hidden md:flex">
      <div className="space-y-6">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
            {isHR ? 'HR Operations' : 'Self Service'}
          </div>
          <nav className="space-y-1">
            {isHR ? (
              <>
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === 'overview' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <i className="fa-solid fa-chart-pie w-4"></i> Dashboard Overview
                </button>
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === 'profile' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <i className="fa-solid fa-id-card w-4"></i> My Profile
                </button>
                <button
                  onClick={() => setActiveTab('employees')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === 'employees' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <i className="fa-solid fa-users w-4"></i> Employee Directory
                </button>
                <button
                  onClick={() => setActiveTab('attendance')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === 'attendance' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <i className="fa-solid fa-clock-rotate-left w-4"></i> Attendance Log
                </button>
                <button
                  onClick={() => setActiveTab('leaves')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === 'leaves' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <i className="fa-solid fa-calendar-days w-4"></i> Leave Requests
                  </div>
                  {pendingLeavesCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                      {pendingLeavesCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('payroll')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === 'payroll' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <i className="fa-solid fa-money-bill-wave w-4"></i> Payroll & Payslips
                </button>
                <button
                  onClick={() => setActiveTab('announcements')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === 'announcements' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <i className="fa-solid fa-bullhorn w-4"></i> Bulletins
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === 'overview' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <i className="fa-solid fa-house w-4"></i> My Portal
                </button>
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === 'profile' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <i className="fa-solid fa-id-card w-4"></i> My Profile
                </button>
                <button
                  onClick={() => setActiveTab('leaves')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === 'leaves' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <i className="fa-solid fa-calendar-days w-4"></i> Time Off & Leaves
                </button>
                <button
                  onClick={() => setActiveTab('attendance')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === 'attendance' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <i className="fa-solid fa-clock-rotate-left w-4"></i> Attendance History
                </button>
                <button
                  onClick={() => setActiveTab('payroll')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === 'payroll' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <i className="fa-solid fa-file-invoice-dollar w-4"></i> My Payslips
                </button>
                <button
                  onClick={() => setActiveTab('employees')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === 'employees' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <i className="fa-solid fa-address-book w-4"></i> Team Directory
                </button>
                <button
                  onClick={() => setActiveTab('announcements')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === 'announcements' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <i className="fa-solid fa-bullhorn w-4"></i> Bulletins
                </button>
              </>
            )}
          </nav>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 clock-live-dot"></span> Django REST
          </span>
          <button onClick={onRefresh} title="Refresh dataset" className="hover:text-indigo-600">
            <i className={`fa-solid fa-arrows-rotate ${loading ? 'fa-spin' : ''}`}></i>
          </button>
        </div>
      </div>
    </aside>
  );
}