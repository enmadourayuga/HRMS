import React from 'react';

export default function DashboardPage({
  isHR,
  user,
  employeeProfile,
  hrStats,
  todayAttendance,
  leaves,
  announcements,
  onOpenLeaveModal,
  onOpenEmployeeModal,
  onOpenAnnouncementModal,
  onLeaveAction,
  onGoToLeaves
}) {
  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div
        className={`rounded-2xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 ${
          isHR
            ? 'bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-700 shadow-indigo-600/10'
            : 'bg-gradient-to-r from-emerald-700 via-teal-600 to-cyan-700 shadow-emerald-600/10'
        }`}
      >
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-medium mb-3 border border-white/15">
            <i className="fa-solid fa-sparkles text-amber-300"></i>{' '}
            {isHR ? 'Executive People Dashboard' : 'Employee Self-Service Desk'}
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome, {employeeProfile?.name || user.email.split('@')[0]}
          </h2>
          <p className="text-white/80 text-sm mt-1 max-w-xl">
            {isHR
              ? `Here is your live workforce snapshot. You have ${hrStats.pendingLeaves} pending leave requests requiring review.`
              : `View your schedule, attendance history, time-off balances, and download monthly compensation statements.`}
          </p>
        </div>

        <div className="flex flex-wrap gap-3 shrink-0">
          {isHR ? (
            <>
              <button
                onClick={onOpenEmployeeModal}
                className="px-4 py-2.5 bg-white text-indigo-700 hover:bg-indigo-50 font-semibold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-2"
              >
                <i className="fa-solid fa-user-plus text-indigo-600"></i> Add Employee
              </button>
              <button
                onClick={onOpenAnnouncementModal}
                className="px-4 py-2.5 bg-indigo-900/40 hover:bg-indigo-900/60 text-white border border-white/20 font-semibold rounded-xl text-xs sm:text-sm transition-all flex items-center gap-2"
              >
                <i className="fa-solid fa-bullhorn text-amber-300"></i> Post Bulletin
              </button>
            </>
          ) : (
            <button
              onClick={onOpenLeaveModal}
              className="px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-xl text-xs sm:text-sm border border-white/20 transition-all flex items-center gap-2"
            >
              <i className="fa-solid fa-plane-departure"></i> Apply for Leave
            </button>
          )}
        </div>
      </div>

      {/* STATS METRICS CARDS */}
      {isHR ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Headcount</div>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">{hrStats.totalEmployees}</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl">
              <i className="fa-solid fa-users"></i>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Present Today</div>
              <div className="text-2xl font-extrabold text-emerald-600 mt-1">{hrStats.presentToday}</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">
              <i className="fa-solid fa-user-check"></i>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">On Leave</div>
              <div className="text-2xl font-extrabold text-sky-600 mt-1">{hrStats.onLeaveToday}</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center text-xl">
              <i className="fa-solid fa-plane-departure"></i>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Leaves</div>
              <div className="text-2xl font-extrabold text-amber-500 mt-1">{hrStats.pendingLeaves}</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl">
              <i className="fa-solid fa-hourglass-half"></i>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between col-span-2 lg:col-span-1">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Monthly Payroll</div>
              <div className="text-xl font-extrabold text-slate-900 mt-1">₹{hrStats.monthlyPayroll.toLocaleString('en-IN')}</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl">
              <i className="fa-solid fa-indian-rupee-sign"></i>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase text-slate-400">Today's Clock</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 clock-live-dot"></span>
            </div>
            <div className="text-2xl font-extrabold text-slate-900">
              {todayAttendance?.clock_in || 'Not Clocked In'}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {todayAttendance?.clock_out ? `Clocked out at ${todayAttendance.clock_out}` : 'Working day in progress'}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase text-slate-400">Annual Leave</span>
              <i className="fa-solid fa-umbrella-beach text-indigo-500"></i>
            </div>
            <div className="text-2xl font-extrabold text-indigo-600">
              {Math.max(0, ((employeeProfile?.leave_balances?.annual?.total ?? 20) - (employeeProfile?.leave_balances?.annual?.used ?? 0)))} <span className="text-xs font-normal text-slate-500">Days</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {employeeProfile?.leave_balances?.annual?.used ?? 0} used of {employeeProfile?.leave_balances?.annual?.total ?? 20}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase text-slate-400">Sick Leave</span>
              <i className="fa-solid fa-notes-medical text-rose-500"></i>
            </div>
            <div className="text-2xl font-extrabold text-rose-600">
              {Math.max(0, ((employeeProfile?.leave_balances?.sick?.total ?? 10) - (employeeProfile?.leave_balances?.sick?.used ?? 0)))} <span className="text-xs font-normal text-slate-500">Days</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {employeeProfile?.leave_balances?.sick?.used ?? 0} used of {employeeProfile?.leave_balances?.sick?.total ?? 10}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase text-slate-400">Casual Leave</span>
              <i className="fa-solid fa-calendar-check text-amber-500"></i>
            </div>
            <div className="text-2xl font-extrabold text-amber-600">
              {Math.max(0, ((employeeProfile?.leave_balances?.casual?.total ?? 5) - (employeeProfile?.leave_balances?.casual?.used ?? 0)))} <span className="text-xs font-normal text-slate-500">Days</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {employeeProfile?.leave_balances?.casual?.used ?? 0} used of {employeeProfile?.leave_balances?.casual?.total ?? 5}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase text-slate-400">Monthly Salary</span>
              <i className="fa-solid fa-coins text-emerald-500"></i>
            </div>
            <div className="text-xl font-extrabold text-slate-900">
              ₹{employeeProfile ? Math.round(employeeProfile.salary / 12).toLocaleString('en-IN') : '---'}
            </div>
            <div className="text-xs text-slate-500 mt-1">Direct deposit active</div>
          </div>
        </div>
      )}

      {/* ACTIONABLE SECTION: Pending leaves & Bulletins */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Pending Leaves List */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Pending Leave Requests</h3>
              <p className="text-xs text-slate-500">Requires review and managerial approval</p>
            </div>
            <button onClick={onGoToLeaves} className="text-xs font-bold text-indigo-600 hover:text-indigo-800">
              View All ({leaves.length}) &rarr;
            </button>
          </div>

          <div className="space-y-3">
            {leaves.filter(l => l.status === 'Pending').length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm border border-dashed rounded-xl">
                <i className="fa-solid fa-circle-check text-2xl text-emerald-500 mb-2"></i>
                <p>No pending leave requests! Everything is up to date.</p>
              </div>
            ) : (
              leaves.filter(l => l.status === 'Pending').slice(0, 4).map(l => (
                <div
                  key={l.id}
                  className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{l.employee_name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">
                        {l.leave_type}
                      </span>
                      <span className="text-xs text-slate-400">({l.days} days)</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {l.start_date} to {l.end_date} &bull; <span className="italic">"{l.reason || 'No reason provided'}"</span>
                    </div>
                  </div>

                  {isHR && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onLeaveAction(l.id, 'Approved')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                      >
                        <i className="fa-solid fa-check"></i> Approve
                      </button>
                      <button
                        onClick={() => onLeaveAction(l.id, 'Rejected')}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                      >
                        <i className="fa-solid fa-xmark"></i> Reject
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Company Announcements / Bulletins */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Company Bulletins</h3>
              <p className="text-xs text-slate-500">Official workplace announcements</p>
            </div>
            {isHR && (
              <button onClick={onOpenAnnouncementModal} className="text-xs font-bold text-indigo-600 hover:text-indigo-800">
                + Post
              </button>
            )}
          </div>

          <div className="space-y-3">
            {announcements.slice(0, 3).map(a => (
              <div key={a.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="font-bold text-slate-900 text-xs sm:text-sm">{a.title}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      a.priority === 'High' ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {a.priority}
                  </span>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{a.content}</p>
                <div className="text-[10px] text-slate-400 mt-2 flex items-center justify-between">
                  <span>By {a.author}</span>
                  <span>{a.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
