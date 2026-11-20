import React from 'react';
import { calculateWorkedHours } from '../utils/time';

export default function AttendancePage({
  isHR,
  attendance,
  employeeProfile,
  todayAttendance
}) {
  const today = new Date().toISOString().split('T')[0];

  const displayAttendance = (
    isHR ? attendance : attendance.filter(a => a.employee_id === employeeProfile?.id)
  ).slice(0, 50);

  const formatHours = (att) => {
    if (att.clock_in && att.clock_out) {
      const hours = calculateWorkedHours(att.clock_in, att.clock_out);
      return `${hours} hrs`;
    }
    if (att.clock_in && !att.clock_out) {
      if (att.date === today) {
        return <span className="text-amber-600 font-semibold text-[11px]">In progress</span>;
      }
      return <span className="text-slate-400">---</span>;
    }
    return <span className="text-slate-400">---</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Attendance Records</h2>
          <p className="text-xs text-slate-500">Real-time daily punches, work hours, and validations</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-xl text-xs text-slate-600 font-medium border border-slate-200">
          <i className="fa-solid fa-fingerprint text-emerald-600"></i> Biometric Device Sync
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Clock In</th>
                <th className="py-3 px-4">Clock Out</th>
                <th className="py-3 px-4">Hours</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayAttendance.map(att => (
                <tr key={att.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-semibold text-slate-900">{att.employee_name}</td>
                  <td className="py-3 px-4 text-slate-500">{att.date}</td>
                  <td className="py-3 px-4 font-mono text-emerald-600 font-bold">{att.clock_in || '---'}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{att.clock_out || '---'}</td>
                  <td className="py-3 px-4 font-mono font-medium">{formatHours(att)}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        att.status === 'Present'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {att.status}
                    </span>
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
