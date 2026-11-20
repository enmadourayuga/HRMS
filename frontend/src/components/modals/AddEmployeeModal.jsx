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
  loading = false,
  currentUser = null,
  isHRAdmin = false
}) {
  const fileInputRef = useRef(null);
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  const hasHRAdminPrivilege = Boolean(isHRAdmin || currentUser?.is_hr_admin);

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

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setLocalError('');

    if (!employeeForm.name?.trim()) {
      setLocalError('Full Name is required.');
      return;
    }
    if (!employeeForm.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employeeForm.email.trim())) {
      setLocalError('A valid work email is required.');
      return;
    }
    if (!employeeForm.password?.trim() || employeeForm.password.trim().length < 6) {
      setLocalError('Login password is required (minimum 6 characters).');
      return;
    }
    if (!employeeForm.job_title?.trim()) {
      setLocalError('Job title is required.');
      return;
    }
    if (!employeeForm.department?.trim()) {
      setLocalError('Department is required.');
      return;
    }
    const salaryVal = Number(employeeForm.salary);
    if (!employeeForm.salary || isNaN(salaryVal) || salaryVal <= 0) {
      setLocalError('Annual salary must be a valid positive number greater than 0.');
      return;
    }
    if (!employeeForm.phone?.trim() || employeeForm.phone.replace(/[\s\-\(\)\+]/g, '').length < 7) {
      setLocalError('Phone number is required (at least 7 digits).');
      return;
    }
    if (!employeeForm.location?.trim()) {
      setLocalError('Work location is required.');
      return;
    }
    if (!employeeForm.join_date) {
      setLocalError('Joining date is required.');
      return;
    }
    if ((employeeForm.role === 'hr' || employeeForm.is_hr_admin) && !hasHRAdminPrivilege) {
      setLocalError('Permission denied: Only HR administrators can create new HR accounts.');
      return;
    }

    onSubmit(e);
  };

  const currentPreview =
    employeeForm.avatarPreview ||
    employeeForm.avatar ||
    (employeeForm.name
      ? `https://ui-avatars.com/api/?name=${encodeURIComponent(employeeForm.name)}&background=6366f1&color=fff`
      : 'https://ui-avatars.com/api/?name=Employee&background=e2e8f0&color=64748b');

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl modal-enter my-8">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold">
              <i className="fa-solid fa-user-plus"></i>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {employeeForm.role === 'hr' ? 'Add New HR Administrator' : 'Add New Employee'}
              </h3>
              <p className="text-xs text-slate-400">Register employee profile, role credentials, and access</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {localError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <i className="fa-solid fa-circle-exclamation shrink-0"></i>
            <span>{localError}</span>
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
          {/* Profile Picture Section */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <label className="block font-bold text-slate-700 mb-2">Profile Picture <span className="text-slate-400 font-normal text-[10px]">(Optional)</span></label>
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

                {/* Preset Avatars */}
                <div className="pt-0.5">
                  <div className="flex items-center gap-1.5 justify-center sm:justify-start flex-wrap">
                    <span className="text-[10px] text-slate-400">Presets:</span>
                    {PRESET_AVATARS.map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelectPreset(url)}
                        className={`w-6 h-6 rounded-md overflow-hidden border transition-all ${(employeeForm.avatar === url || employeeForm.avatarPreview === url)
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

          {/* Section: Basic Identity & Role */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={employeeForm.name}
                onChange={e => {
                  setLocalError('');
                  setEmployeeForm({ ...employeeForm, name: e.target.value });
                }}
                placeholder="e.g. John Doe"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Role Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={employeeForm.role}
                onChange={e => {
                  const val = e.target.value;
                  if (val === 'hr' && !hasHRAdminPrivilege) {
                    setLocalError('Permission denied: Only HR administrators can create new HR accounts.');
                    return;
                  }
                  setLocalError('');
                  setEmployeeForm({ ...employeeForm, role: val });
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                <option value="employee">Standard Employee</option>
                {hasHRAdminPrivilege ? (
                  <option value="hr">HR Administrator</option>
                ) : (
                  <option value="hr" disabled>HR Administrator (HR Admin required)</option>
                )}
              </select>
              {!hasHRAdminPrivilege && (
                <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1 font-medium">
                  <i className="fa-solid fa-lock text-amber-500"></i>
                  Only HR Administrators can create new HR accounts
                </p>
              )}
            </div>
          </div>

          {/* Section: Authentication Credentials */}
          <div className="p-3 rounded-2xl bg-indigo-50/50 border border-indigo-100">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Work Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={employeeForm.email}
                  onChange={e => {
                    setLocalError('');
                    setEmployeeForm({ ...employeeForm, email: e.target.value });
                  }}
                  placeholder="name@hrms.com"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Portal Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={employeeForm.password}
                    onChange={e => {
                      setLocalError('');
                      setEmployeeForm({ ...employeeForm, password: e.target.value });
                    }}
                    placeholder="Min. 6 chars (e.g. password123)"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 pr-9 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1">
              <i className="fa-solid fa-shield-halved text-indigo-500"></i>
              Creates active login credentials for the employee portal.
              {employeeForm.role === 'hr' && (
                <span className="font-semibold text-indigo-700 ml-1">Grants full HR Administrator privileges.</span>
              )}
            </p>
          </div>

          {/* Section: Job & Department */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Job Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={employeeForm.job_title}
                onChange={e => {
                  setLocalError('');
                  setEmployeeForm({ ...employeeForm, job_title: e.target.value });
                }}
                placeholder="Software Engineer"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Department <span className="text-rose-500">*</span>
              </label>
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

          {/* Section: Salary & Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Annual Salary (INR) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                placeholder="e.g. 1200000"
                value={employeeForm.salary}
                onChange={e => {
                  setLocalError('');
                  setEmployeeForm({ ...employeeForm, salary: e.target.value });
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Phone Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={employeeForm.phone}
                onChange={e => {
                  setLocalError('');
                  setEmployeeForm({ ...employeeForm, phone: e.target.value });
                }}
                placeholder="+91 98765 43210"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Section: Location & Joining Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Work Location <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={employeeForm.location}
                onChange={e => {
                  setLocalError('');
                  setEmployeeForm({ ...employeeForm, location: e.target.value });
                }}
                placeholder="e.g. Bengaluru (HQ)"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Joining Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={employeeForm.join_date}
                onChange={e => {
                  setLocalError('');
                  setEmployeeForm({ ...employeeForm, join_date: e.target.value });
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Section: Employment Type & Reporting Manager */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Employment Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={employeeForm.employment_type || 'Full-Time'}
                onChange={e => setEmployeeForm({ ...employeeForm, employment_type: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Full-Time">Full-Time</option>
                <option value="Part-Time">Part-Time</option>
                <option value="Contract">Contract</option>
                <option value="Intern">Intern</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Reporting Manager <span className="text-slate-400 font-normal text-[10px]">(Optional)</span>
              </label>
              <input
                type="text"
                value={employeeForm.manager || ''}
                onChange={e => setEmployeeForm({ ...employeeForm, manager: e.target.value })}
                placeholder="e.g. Elena Rostova"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <span className="text-[11px] text-slate-400">
              <span className="text-rose-500 font-bold">*</span> Required fields
            </span>
            <div className="flex items-center gap-2">
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
                {employeeForm.role === 'hr' ? 'Create HR Admin' : 'Create Employee'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}