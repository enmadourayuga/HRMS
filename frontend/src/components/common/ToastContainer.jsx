import React from 'react';

export default function ToastContainer({ toasts }) {
  return (
    <div className="fixed top-5 right-5 z-[99999] flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium flex items-center gap-3 pointer-events-auto transition-all ${
            t.type === 'error' ? 'bg-rose-600' : t.type === 'success' ? 'bg-emerald-600' : 'bg-indigo-600'
          }`}
        >
          <i className={`fa-solid ${t.type === 'error' ? 'fa-circle-xmark' : t.type === 'success' ? 'fa-circle-check' : 'fa-circle-info'}`}></i>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
