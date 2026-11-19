import React from 'react';

export default function Header({
  user,
  employeeProfile,
  demoUsers,
  onSwitchDemo,
  onLogout,
  onOpenProfile
}) {
  const isHR = user.role === 'hr' || user.is_hr_admin;

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <i className="fa-solid fa-people-roof text-lg"></i>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 tracking-tight text-lg">
                Nexus<span className="text-indigo-600">HR</span>
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                isHR ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {isHR ? 'HR Admin' : 'Employee'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Header: Demo Switcher, Profile, Logout */}
      <div className="flex items-center gap-3">
        {/* Quick Demo Switcher Dropdown */}
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">
            <i className="fa-solid fa-repeat text-indigo-500 mr-1"></i>Switch Demo:
          </span>
          <select
            value={user.email}
            onChange={(e) => onSwitchDemo(e.target.value)}
            className="text-xs bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            {demoUsers.map(u => (
              <option key={u.email} value={u.email}>{u.label}</option>
            ))}
          </select>
        </div>

        <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

        {/* User profile button */}
        <button
          onClick={onOpenProfile}
          title="View & Edit My Profile"
          className="flex items-center gap-2.5 p-1.5 -m-1.5 rounded-xl hover:bg-slate-100 transition-colors text-left group"
        >
          {employeeProfile?.avatar ? (
            <img
              src={employeeProfile.avatar}
              alt={employeeProfile.name}
              className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-inner group-hover:ring-2 group-hover:ring-indigo-400 transition-all"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-inner group-hover:ring-2 group-hover:ring-indigo-400 transition-all">
              {employeeProfile?.name ? employeeProfile.name.charAt(0) : user.email.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="hidden md:block text-left">
            <div className="text-xs font-bold text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">
              {employeeProfile?.name || user.email.split('@')[0]}
            </div>
            <div className="text-[10px] text-slate-500">
              {employeeProfile?.job_title || user.role}
            </div>
          </div>
        </button>

        {/* Logout */}
        <button
          onClick={onLogout}
          title="Sign out"
          className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors flex items-center justify-center text-xs"
        >
          <i className="fa-solid fa-arrow-right-from-bracket"></i>
        </button>
      </div>
    </header>
  );
}