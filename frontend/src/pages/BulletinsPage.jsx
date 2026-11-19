import React from 'react';

export default function BulletinsPage({
  isHR,
  announcements,
  onOpenAnnouncementModal
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Organization Bulletins</h2>
          <p className="text-xs text-slate-500">Company announcements, events, and important updates</p>
        </div>
        {isHR && (
          <button
            onClick={onOpenAnnouncementModal}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-2"
          >
            <i className="fa-solid fa-plus"></i> New Bulletin
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {announcements.map(ann => (
          <div
            key={ann.id}
            className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-3 mb-2">
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                    ann.priority === 'High' ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'
                  }`}
                >
                  {ann.priority} Priority
                </span>
                <span className="text-xs text-slate-400">{ann.date}</span>
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-2">{ann.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{ann.content}</p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center gap-2">
              <i className="fa-solid fa-user-pen"></i> Posted by {ann.author}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
