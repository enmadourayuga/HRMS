import React, { useState, useRef } from 'react';
import { API } from '../../api';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop&crop=faces'
];

export default function EditEmployeeModal({
  isOpen,
  onClose,
  employee,
  onSave
}) {
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState(() => ({
    name: employee?.name || '',
    email: employee?.email || '',
    job_title: employee?.job_title || '',
    department: employee?.department || 'Engineering',
    role: employee?.role || 'employee',
    salary: employee?.salary || 0,
    phone: employee?.phone || '',
    location: employee?.location || '',
    status: employee?.status || 'Active',
    employment_type: employee?.employment_type || 'Full-Time',
    manager: employee?.manager || '',
    avatar: employee?.avatar || ''
  }));

  const [avatarPreview, setAvatarPreview] = useState(() => employee?.avatar || '');
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInputValue, setUrlInputValue] = useState('');

  if (!isOpen || !employee) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const objectUrl = URL.createObjectURL(file);
      setAvatarPreview(objectUrl);
    }
  };

  const handleApplyUrl = () => {
    if (urlInputValue.trim()) {
      setAvatarPreview(urlInputValue.trim());
      setFormData(prev => ({ ...prev, avatar: urlInputValue.trim() }));
      setSelectedFile(null);
      setShowUrlInput(false);
    }
  };

  const handleSelectPreset = (url) => {
    setAvatarPreview(url);
    setFormData(prev => ({ ...prev, avatar: url }));
    setSelectedFile(null);
  };

  const handleRemovePhoto = () => {
    setAvatarPreview('');
    setSelectedFile(null);
    setFormData(prev => ({ ...prev, avatar: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let finalAvatar = formData.avatar;

      // If a file was selected, upload it
      if (selectedFile) {
        try {
          const uploadRes = await API.updateEmployeeAvatar(employee.id, selectedFile);
          finalAvatar = uploadRes.avatar;
        } catch {
          // Fallback to upload_avatar general endpoint
          const uploadRes = await API.uploadAvatar(selectedFile);
          finalAvatar = uploadRes.avatar_url;
        }
      }

      const payload = {
        name: formData.name,
        email: formData.email,
        job_title: formData.job_title,
        department: formData.department,
        role: formData.role,
        salary: parseInt(formData.salary, 10) || 0,
        phone: formData.phone,
        location: formData.location,
        status: formData.status,
        employment_type: formData.employment_type,
        manager: formData.manager,
        avatar: finalAvatar
      };

      const updated = await API.updateEmployee(employee.id, payload);
      onSave(updated);
      onClose();
    } catch (err) {
      console.error('Failed to update employee:', err);
      alert(err.message || 'Failed to update employee details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl modal-enter my-8">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold">
              <i className="fa-solid fa-user-pen"></i>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Edit Employee & Photo</h3>
              <p className="text-xs text-slate-400">Update details for {employee.name} ({employee.id})</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Profile Picture Section */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <label className="block font-bold text-slate-700 mb-2">Profile Picture</label>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative group shrink-0">
                <img
                  src={avatarPreview || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || 'User')}&background=6366f1&color=fff`}
                  alt={formData.name}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-md ring-2 ring-indigo-100"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 rounded-2xl bg-slate-900/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-[10px] font-semibold"
                >
                  <i className="fa-solid fa-camera text-sm mb-0.5"></i>
                  Change
                </button>
              </div>

              <div className="flex-1 space-y-2 text-center sm:text-left w-full">
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
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-xs shadow-sm flex items-center gap-1.5 transition-all"
                  >
                    <i className="fa-solid fa-arrow-up-from-bracket"></i> Upload Photo
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold rounded-lg text-xs transition-colors flex items-center gap-1.5"
                  >
                    <i className="fa-solid fa-link"></i> Image Link
                  </button>

                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg font-semibold text-xs transition-colors"
                      title="Reset avatar"
                    >
                      <i className="fa-solid fa-trash-can mr-1"></i> Remove
                    </button>
                  )}
                </div>

                {showUrlInput && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <input
                      type="url"
                      value={urlInputValue}
                      onChange={e => setUrlInputValue(e.target.value)}
                      placeholder="Paste image URL (e.g. https://...)"
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleApplyUrl}
                      className="px-3 py-1 bg-slate-800 text-white rounded-lg font-semibold text-xs hover:bg-slate-700"
                    >
                      Apply
                    </button>
                  </div>
                )}

                {/* Preset Avatars */}
                <div className="pt-1">
                  <span className="text-[10px] text-slate-400 font-medium block mb-1">Or select a preset avatar:</span>
                  <div className="flex items-center gap-1.5 justify-center sm:justify-start flex-wrap">
                    {PRESET_AVATARS.map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelectPreset(url)}
                        className={`w-7 h-7 rounded-lg overflow-hidden border transition-all ${
                          avatarPreview === url ? 'ring-2 ring-indigo-500 border-indigo-500 scale-105' : 'border-slate-200 hover:opacity-80'
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

          {/* Basic Info Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
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
                value={formData.job_title}
                onChange={e => setFormData({ ...formData, job_title: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Department</label>
              <select
                value={formData.department}
                onChange={e => setFormData({ ...formData, department: e.target.value })}
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
                value={formData.salary}
                onChange={e => setFormData({ ...formData, salary: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={e => setFormData({ ...formData, location: e.target.value })}
                placeholder="Bengaluru (HQ)"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Active">Active</option>
                <option value="On Leave">On Leave</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Employment Type</label>
              <select
                value={formData.employment_type}
                onChange={e => setFormData({ ...formData, employment_type: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Full-Time">Full-Time</option>
                <option value="Part-Time">Part-Time</option>
                <option value="Contract">Contract</option>
                <option value="Intern">Intern</option>
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
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}