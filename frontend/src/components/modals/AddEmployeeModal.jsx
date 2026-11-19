import React, { useRef, useState } from 'react';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop&crop=faces'
];

export default function AddEmployeeModal({
  isOpen,
  onClose,
  employeeForm,
  setEmployeeForm,
  onSubmit,
  loading = false
}) {
  const fileInputRef = useRef(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setEmployeeForm(prev => ({
        ...prev,
        avatarFile: file,
        avatarPreview: previewUrl,
        avatar: ''
      }));
    }
  };

  const handleApplyUrl = () => {
    if (urlInput.trim()) {
      setEmployeeForm(prev => ({
        ...prev,
        avatar: urlInput.trim(),
        avatarPreview: urlInput.trim(),
        avatarFile: null
      }));
      setShowUrlInput(false);
      setUrlInput('');
    }
  };

  const handleSelectPreset = (url) => {
    setEmployeeForm(prev => ({
      ...prev,
      avatar: url,
      avatarPreview: url,
      avatarFile: null
    }));
  };

  const handleRemovePhoto = () => {
    setEmployeeForm(prev => ({
      ...prev,
      avatar: '',
      avatarPreview: '',
      avatarFile: null
    }));
  };

  const currentPreview =
    employeeForm.avatarPreview ||
    employeeForm.avatar ||
    (employeeForm.name
      ? `https://ui-avatars.com/api/?name=${encodeURIComponent(employeeForm.name)}&background=6366f1&color=fff`
      : 'https://ui-avatars.com/api/?name=Employee&background=e2e8f0&color=64748b');

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl modal-enter my-8">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold">
              <i className="fa-solid fa-user-plus"></i>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Add New Employee</h3>
              <p className="text-xs text-slate-400">Register employee details and profile picture</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 text-xs">
          {/* Profile Picture Section */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <label className="block font-bold text-slate-700 mb-2">Profile Picture</label>
            <div className="flex flex-col sm:flex-row items-center gap-3.5">
              <div className="relative group shrink-0">
                <img
                  src={currentPreview}
                  alt={employeeForm.name || 'Avatar'}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-sm ring-2 ring-indigo-100"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 rounded-2xl bg-slate-900/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-[9px] font-semibold"
                >
                  <i className="fa-solid fa-camera mb-0.5"></i>
                  Change
                </button>
              </div>

              <div className="flex-1 space-y-1.5 text-center sm:text-left w-full">
                <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-xs shadow-sm flex items-center gap-1.5 transition-all"
                  >
                    <i className="fa-solid fa-arrow-up-from-bracket"></i> Upload Photo
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold rounded-lg text-xs transition-colors flex items-center gap-1.5"
                  >
                    <i className="fa-solid fa-link"></i> Image Link
                  </button>

                  {(employeeForm.avatar || employeeForm.avatarFile) && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="px-2 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg font-semibold text-xs transition-colors"
                      title="Clear photo"
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  )}
                </div>

                {showUrlInput && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <input
                      type="url"
                      value={urlInput}
                      onChange={e => setUrlInput(e.target.value)}
                      placeholder="Paste image URL..."
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleApplyUrl}
                      className="px-2.5 py-1 bg-slate-800 text-white rounded-lg font-semibold text-xs hover:bg-slate-700"
                    >
                      Apply
                    </button>
                  </div>
                )}

                {/* Preset Avatars */}
                <div className="pt-0.5">
                  <div className="flex items-center gap-1.5 justify-center sm:justify-start flex-wrap">
                    <span className="text-[10px] text-slate-400">Presets:</span>
                    {PRESET_AVATARS.map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelectPreset(url)}
                        className={`w-6 h-6 rounded-md overflow-hidden border transition-all ${
                          (employeeForm.avatar === url || employeeForm.avatarPreview === url)
                            ? 'ring-2 ring-indigo-500 border-indigo-500 scale-105'
                            : 'border-slate-200 hover:opacity-80'
                        }`}
                      >
                        <img src={url} alt={`Preset ${i + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={employeeForm.name}
                onChange={e => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                placeholder="e.g. John Doe"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={employeeForm.email}
                onChange={e => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                placeholder="john@hrms.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Job Title</label>
              <input
                type="text"
                required
                value={employeeForm.job_title}
                onChange={e => setEmployeeForm({ ...employeeForm, job_title: e.target.value })}
                placeholder="Software Engineer"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Department</label>
              <select
                value={employeeForm.department}
                onChange={e => setEmployeeForm({ ...employeeForm, department: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Engineering">Engineering</option>
                <option value="Product">Product</option>
                <option value="Design">Design</option>
                <option value="Human Resources">Human Resources</option>
                <option value="Marketing">Marketing</option>
                <option value="Sales">Sales</option>
                <option value="Operations">Operations</option>
                <option value="Finance">Finance</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Annual Salary (INR)</label>
              <input
                type="number"
                required
                value={employeeForm.salary}
                onChange={e => setEmployeeForm({ ...employeeForm, salary: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Phone</label>
              <input
                type="text"
                value={employeeForm.phone}
                onChange={e => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Location</label>
              <input
                type="text"
                value={employeeForm.location}
                onChange={e => setEmployeeForm({ ...employeeForm, location: e.target.value })}
                placeholder="Bengaluru (HQ)"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Role Type</label>
              <select
                value={employeeForm.role}
                onChange={e => setEmployeeForm({ ...employeeForm, role: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="employee">Standard Employee</option>
                <option value="hr">HR Admin</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {loading && <i className="fa-solid fa-spinner fa-spin"></i>}
              Create Employee
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}