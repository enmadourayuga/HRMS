import React from 'react';

export default function EmployeesPage({
  isHR,
  filteredEmployees,
  searchQuery,
  setSearchQuery,
  deptFilter,
  setDeptFilter,
  departments,
  onOpenEmployeeModal,
  onEditEmployee,
  onToggleStatus,
  currentUserId,
  currentUserEmail
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Employee Directory</h2>
          <p className="text-xs text-slate-500">Manage all registered staff members, photos, roles, and account access</p>
        </div>
        {isHR && (
          <button
            onClick={onOpenEmployeeModal}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 self-start sm:self-auto"
          >
            <i className="fa-solid fa-user-plus"></i> Add New Employee
          </button>
        )}
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name, role, email..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {departments.map(dept => (
            <button
              key={dept}
              onClick={() => setDeptFilter(dept)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                deptFilter === dept ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>
      </div>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEmployees.map(emp => (
          <div
            key={emp.id}
            className={`p-5 rounded-2xl border shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
              emp.status === 'Active'
                ? 'bg-white border-slate-200/80'
                : 'bg-slate-50/80 border-slate-300 border-dashed opacity-85'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="relative group shrink-0">
                    <img
                      src={emp.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=6366f1&color=fff`}
                      alt={emp.name}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-100 shadow-sm"
                    />
                    {isHR && (
                      <button
                        type="button"
                        onClick={() => onEditEmployee?.(emp)}
                        title="Change profile picture or details"
                        className="absolute inset-0 bg-slate-900/50 rounded-xl text-white opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs transition-opacity"
                      >
                        <i className="fa-solid fa-camera"></i>
                      </button>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm leading-tight">{emp.name}</h4>
                    <p className="text-xs text-slate-500">{emp.job_title}</p>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    emp.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${emp.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                  {emp.status}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-building text-slate-400 w-4"></i>
                  <span>{emp.department}</span>
                </div>
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-envelope text-slate-400 w-4"></i>
                  <span className="truncate">{emp.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-location-dot text-slate-400 w-4"></i>
                  <span>{emp.location || 'Remote'}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-400 font-mono text-[11px] mr-1">{emp.id}</span>
                {isHR && (
                  <>
                    <button
                      type="button"
                      onClick={() => onEditEmployee?.(emp)}
                      className="px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-semibold text-[11px] transition-colors flex items-center gap-1"
                      title="Edit employee details and profile picture"
                    >
                      <i className="fa-solid fa-user-pen text-[10px]"></i> Edit
                    </button>
                    {emp.email !== currentUserEmail && emp.id !== currentUserId && (
                      <button
                        type="button"
                        onClick={() => onToggleStatus?.(emp)}
                        className={`px-2 py-0.5 rounded-md font-semibold text-[11px] transition-colors flex items-center gap-1 ${
                          emp.status === 'Active'
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-600'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600'
                        }`}
                        title={emp.status === 'Active' ? 'Deactivate employee account (blocks login)' : 'Reactivate employee account (restores login)'}
                      >
                        <i className={`fa-solid ${emp.status === 'Active' ? 'fa-user-slash text-[10px]' : 'fa-user-check text-[10px]'}`}></i>
                        {emp.status === 'Active' ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </>
                )}
              </div>
              <span className="font-bold text-slate-900">₹{(emp.salary || 0).toLocaleString('en-IN')} / yr</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}