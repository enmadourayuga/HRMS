import React from 'react';

export default function AddAnnouncementModal({
  isOpen,
  onClose,
  announcementForm,
  setAnnouncementForm,
  onSubmit
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl modal-enter">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Post Company Bulletin</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Title</label>
            <input
              type="text"
              required
              value={announcementForm.title}
              onChange={e => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
              placeholder="e.g. Annual Company Hackathon"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Category</label>
              <input
                type="text"
                value={announcementForm.category}
                onChange={e => setAnnouncementForm({ ...announcementForm, category: e.target.value })}
                placeholder="Culture / Events"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Priority</label>
              <select
                value={announcementForm.priority}
                onChange={e => setAnnouncementForm({ ...announcementForm, priority: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Normal">Normal</option>
                <option value="Important">Important</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Content</label>
            <textarea
              rows="4"
              required
              value={announcementForm.content}
              onChange={e => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
              placeholder="Write the announcement details..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            ></textarea>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-md"
            >
              Publish Bulletin
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
