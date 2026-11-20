import React, { useState, useRef } from 'react';
import { API } from '../api';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop&crop=faces'
];

export default function ProfilePage({
  user,
  isHR,
  employeeProfile,
  onProfileUpdated,
  todayAttendance,
  onGoToLeaves,
  onGoToPayroll,
  addToast
}) {
  const isUserHR = Boolean(isHR ?? (user?.role === 'hr' || user?.is_hr_admin));
  const todayFormatted = React.useMemo(() => new Date().toLocaleDateString(), []);
  const fileInputRef = useRef(null);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [editInfoOpen, setEditInfoOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);

  // Edit contact info form state
  const [contactForm, setContactForm] = useState({
    phone: employeeProfile?.phone || '',
    location: employeeProfile?.location || ''
  });

  // Fallback profile if employeeProfile not yet loaded
  const profile = employeeProfile || {
    id: user.employee_id || 'EMP-USER',
    name: user.email.split('@')[0],
    email: user.email,
    job_title: user.role === 'hr' ? 'HR Administrator' : 'Staff Member',
    department: 'General',
    role: user.role,
    salary: 0,
    phone: 'Not provided',
    location: 'Bengaluru (HQ)',
    status: 'Active',
    employment_type: 'Full-Time',
    join_date: '2024-01-15',
    avatar: null,
    manager: 'Management'
  };

  const handleAvatarFileSelected = async (e) => {
    if (!isUserHR) {
      addToast?.('Only HR administrators can change profile pictures.', 'error');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      let newAvatarUrl = '';
      if (profile.id) {
        try {
          const res = await API.updateEmployeeAvatar(profile.id, file);
          newAvatarUrl = res.avatar;
        } catch {
          const res = await API.uploadAvatar(file);
          newAvatarUrl = res.avatar_url;
          await API.updateEmployee(profile.id, { avatar: newAvatarUrl });
        }
      } else {
        const res = await API.uploadAvatar(file);
        newAvatarUrl = res.avatar_url;
      }

      onProfileUpdated({ ...profile, avatar: newAvatarUrl });
      addToast?.('Profile picture updated successfully!', 'success');
      setPhotoModalOpen(false);
    } catch (err) {
      console.error(err);
      addToast?.(err.message || 'Failed to upload profile picture.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSetAvatarUrl = async (url) => {
    if (!isUserHR) {
      addToast?.('Only HR administrators can change profile pictures.', 'error');
      return;
    }
    try {
      setUploading(true);
      if (profile.id) {
        await API.updateEmployee(profile.id, { avatar: url });
      }
      onProfileUpdated({ ...profile, avatar: url });
      addToast?.('Profile picture updated!', 'success');
      setPhotoModalOpen(false);
    } catch (err) {
      console.error(err);
      addToast?.('Failed to update profile picture.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveContactInfo = async (e) => {
    e.preventDefault();
    if (!isUserHR) {
      addToast?.('Employees are not allowed to edit their information.', 'error');
      setEditInfoOpen(false);
      return;
    }
    try {
      setSavingInfo(true);
      if (profile.id) {
        await API.updateEmployee(profile.id, {
          phone: contactForm.phone,
          location: contactForm.location
        });
      }
      onProfileUpdated({
        ...profile,
        phone: contactForm.phone,
        location: contactForm.location
      });
      addToast?.('Contact details saved!', 'success');
      setEditInfoOpen(false);
    } catch (err) {
      console.error(err);
      addToast?.('Failed to update details.', 'error');
    } finally {
      setSavingInfo(false);
    }
  };

  const currentAvatarSrc =
    profile.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=6366f1&color=fff&size=256`;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">My Profile</h2>
          <p className="text-xs text-slate-500">
            {isUserHR
              ? 'View and manage employee credentials, photo, and job details'
              : 'View your employee credentials, photo, and job details (managed by HR)'}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {isUserHR && (
            <>
              <button
                onClick={() => {
                  setContactForm({ phone: profile.phone || '', location: profile.location || '' });
                  setEditInfoOpen(true);
                }}
                className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-2"
              >
                <i className="fa-solid fa-pen-to-square text-indigo-500"></i> Edit Contact Info
              </button>
              <button
                onClick={() => setPhotoModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all flex items-center gap-2"
              >
                <i className="fa-solid fa-camera"></i> Change Photo
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Profile Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Decorative Cover Gradient */}
        <div className="h-32 sm:h-40 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 relative">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute top-3 right-4 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-white text-[11px] font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            {profile.status || 'Active'}
          </div>
        </div>

        {/* Profile Content Bar */}
        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-4">
            {/* Avatar with Camera Overlay */}
            <div className="relative group self-center sm:self-auto">
              <img
                src={currentAvatarSrc}
                alt={profile.name}
                className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl object-cover border-4 border-white shadow-xl ring-2 ring-indigo-100 bg-white"
              />
              {isUserHR ? (
                <button
                  type="button"
                  onClick={() => setPhotoModalOpen(true)}
                  title="Change Profile Picture"
                  className="absolute bottom-1 right-1 w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center text-xs shadow-lg transition-transform hover:scale-105 border-2 border-white"
                >
                  <i className="fa-solid fa-camera"></i>
                </button>
              ) : (
                <div
                  title="Profile picture can only be changed by HR administrators"
                  className="absolute bottom-1 right-1 w-8 h-8 rounded-xl bg-slate-900/60 backdrop-blur-sm text-white flex items-center justify-center text-xs shadow-md border-2 border-white cursor-not-allowed"
                >
                  <i className="fa-solid fa-lock text-[10px]"></i>
                </div>
              )}
            </div>

            {/* Quick Action Badges */}
            <div className="flex items-center gap-2 self-center sm:self-end flex-wrap justify-center sm:justify-start">
              <span className="px-3 py-1 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center gap-1.5">
                <i className="fa-solid fa-id-badge text-indigo-500"></i> {profile.id}
              </span>
              <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs flex items-center gap-1.5">
                <i className="fa-solid fa-briefcase text-slate-400"></i> {profile.employment_type || 'Full-Time'}
              </span>
              <span className={`px-3 py-1 rounded-xl font-bold text-xs uppercase tracking-wider ${
                profile.is_hr_admin
                  ? 'bg-indigo-100 text-indigo-700'
                  : profile.role === 'hr'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}>
                {profile.is_hr_admin ? 'HR Admin' : profile.role === 'hr' ? 'HR Staff' : 'Employee'}
              </span>
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-black text-slate-900 leading-tight">{profile.name}</h1>
            <p className="text-sm font-medium text-slate-500 flex items-center gap-2 mt-0.5">
              <span>{profile.job_title}</span>
              <span className="text-slate-300">•</span>
              <span className="text-indigo-600 font-semibold">{profile.department}</span>
            </p>
            {!isUserHR && (
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-1.5">
                <i className="fa-solid fa-lock text-indigo-400"></i> Employee information is managed by HR (read-only)
              </p>
            )}
          </div>

          {/* Quick info row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-5 border-t border-slate-100 text-xs text-slate-600">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                <i className="fa-solid fa-envelope"></i>
              </div>
              <div className="truncate">
                <div className="text-[10px] text-slate-400 font-medium">Work Email</div>
                <div className="font-semibold text-slate-800 truncate">{profile.email}</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                <i className="fa-solid fa-phone"></i>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-medium">Phone Number</div>
                <div className="font-semibold text-slate-800">{profile.phone || 'Not provided'}</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                <i className="fa-solid fa-location-dot"></i>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-medium">Location</div>
                <div className="font-semibold text-slate-800">{profile.location || 'Remote'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Detailed Info & Compensation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Basic & Employment Information (2 cols wide on lg) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                  <i className="fa-solid fa-id-card"></i>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Basic Information</h3>
                  <p className="text-xs text-slate-400">Personal identity and company records</p>
                </div>
              </div>
              {isUserHR && (
                <button
                  onClick={() => {
                    setContactForm({ phone: profile.phone || '', location: profile.location || '' });
                    setEditInfoOpen(true);
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                >
                  <i className="fa-solid fa-pen text-[10px]"></i> Edit
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Full Name</span>
                <span className="font-bold text-slate-800 text-sm">{profile.name}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Employee ID</span>
                <span className="font-mono font-bold text-indigo-600 text-sm">{profile.id}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Official Email</span>
                <span className="font-semibold text-slate-800 truncate block">{profile.email}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Contact Phone</span>
                <span className="font-semibold text-slate-800">{profile.phone || 'Not provided'}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Job Designation</span>
                <span className="font-semibold text-slate-800">{profile.job_title}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Department</span>
                <span className="font-semibold text-slate-800">{profile.department}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Work Location</span>
                <span className="font-semibold text-slate-800">{profile.location || 'Remote'}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Employment Type</span>
                <span className="font-semibold text-slate-800">{profile.employment_type || 'Full-Time'}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Date Joined</span>
                <span className="font-semibold text-slate-800">{profile.join_date || 'N/A'}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Reporting Manager</span>
                <span className="font-semibold text-slate-800">{profile.manager || 'HR Operations'}</span>
              </div>
            </div>
          </div>

          {/* Today's Punch & Attendance Snapshot */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
                  <i className="fa-solid fa-clock"></i>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Attendance Status</h3>
                  <p className="text-xs text-slate-400">Current work day session summary</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-lg text-xs font-semibold text-slate-600 border border-slate-200">
                <i className="fa-solid fa-fingerprint text-emerald-600"></i> Biometric Sync
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 font-medium block">Date</span>
                <span className="font-bold text-slate-800">{todayFormatted}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 font-medium block">Clock In</span>
                <span className="font-bold text-emerald-600">{todayAttendance?.clock_in || '--:--'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 font-medium block">Clock Out</span>
                <span className="font-bold text-amber-600">{todayAttendance?.clock_out || '--:--'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 font-medium block">Status</span>
                <span className="font-bold text-slate-800">{todayAttendance ? 'Present' : 'Not Clocked In'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Compensation & Quick Links */}
        <div className="space-y-6">
          {/* Compensation Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 mb-4">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
                <i className="fa-solid fa-money-bill-wave"></i>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Compensation</h3>
                <p className="text-xs text-slate-400">Payroll structure & details</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100">
                <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Annual Gross CTC</div>
                <div className="text-2xl font-black text-indigo-700 mt-0.5">
                  ₹{(profile.salary || 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-indigo-500 mt-1">
                  Est. ₹{Math.round((profile.salary || 0) / 12).toLocaleString('en-IN')} / month
                </div>
              </div>

              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                  <span className="text-slate-400">Salary Tier</span>
                  <span className="font-bold text-slate-800">{profile.salary_structure_id || 'Standard (Level 2)'}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                  <span className="text-slate-400">Biometric Ref ID</span>
                  <span className="font-mono font-bold text-slate-800">{profile.biometric_ref || `BIO-${profile.id}`}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                  <span className="text-slate-400">Tax Regime</span>
                  <span className="font-bold text-slate-800">New Regime (Standard)</span>
                </div>
              </div>

              <button
                onClick={onGoToPayroll}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-file-invoice-dollar"></i> View My Payslips
              </button>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 text-sm mb-3">Self-Service Actions</h3>
            <div className="space-y-2">
              <button
                onClick={onGoToLeaves}
                className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-100 flex items-center justify-between text-xs text-slate-700 hover:text-indigo-600 font-semibold transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <i className="fa-solid fa-calendar-plus text-slate-400 group-hover:text-indigo-500"></i>
                  <span>Apply for Time Off</span>
                </div>
                <i className="fa-solid fa-chevron-right text-[10px] text-slate-400 group-hover:translate-x-0.5 transition-transform"></i>
              </button>

              {isUserHR ? (
                <button
                  onClick={() => setPhotoModalOpen(true)}
                  className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-100 flex items-center justify-between text-xs text-slate-700 hover:text-indigo-600 font-semibold transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <i className="fa-solid fa-camera text-slate-400 group-hover:text-indigo-500"></i>
                    <span>Update Profile Picture</span>
                  </div>
                  <i className="fa-solid fa-chevron-right text-[10px] text-slate-400 group-hover:translate-x-0.5 transition-transform"></i>
                </button>
              ) : (
                <div
                  className="w-full p-3 rounded-2xl bg-slate-50/60 border border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium cursor-not-allowed"
                  title="Profile pictures can only be changed by HR administrators"
                >
                  <div className="flex items-center gap-2.5">
                    <i className="fa-solid fa-lock text-slate-300"></i>
                    <span>Profile Photo (HR Only)</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded font-semibold">Locked</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Change Profile Picture (HR Only) */}
      {isUserHR && photoModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl modal-enter">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                  <i className="fa-solid fa-camera"></i>
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Update Profile Picture</h3>
              </div>
              <button onClick={() => setPhotoModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex flex-col items-center justify-center py-2">
                <img
                  src={currentAvatarSrc}
                  alt={profile.name}
                  className="w-24 h-24 rounded-3xl object-cover border-4 border-slate-100 shadow-md ring-2 ring-indigo-100 mb-2"
                />
                <span className="text-slate-400 text-[11px]">Current Photo</span>
              </div>

              {/* Upload options */}
              <div className="space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarFileSelected}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i> Uploading...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-arrow-up-from-bracket"></i> Upload Photo from Device
                    </>
                  )}
                </button>
              </div>

              {/* Presets */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[11px] font-semibold text-slate-500 block mb-2">Or choose from sample avatars:</span>
                <div className="grid grid-cols-6 gap-2">
                  {PRESET_AVATARS.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      disabled={uploading}
                      onClick={() => handleSetAvatarUrl(url)}
                      className={`aspect-square rounded-xl overflow-hidden border-2 transition-all hover:scale-105 ${
                        profile.avatar === url ? 'border-indigo-600 ring-2 ring-indigo-200' : 'border-slate-200'
                      }`}
                    >
                      <img src={url} alt={`Preset ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setPhotoModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Edit Contact Info (HR Only) */}
      {isUserHR && editInfoOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl modal-enter">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                  <i className="fa-solid fa-pen-to-square"></i>
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Edit Contact Information</h3>
              </div>
              <button onClick={() => setEditInfoOpen(false)} className="text-slate-400 hover:text-slate-600">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleSaveContactInfo} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={contactForm.phone}
                  onChange={e => setContactForm({ ...contactForm, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Work Location / City</label>
                <input
                  type="text"
                  value={contactForm.location}
                  onChange={e => setContactForm({ ...contactForm, location: e.target.value })}
                  placeholder="e.g. Bengaluru (HQ) or Remote"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditInfoOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingInfo}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {savingInfo && <i className="fa-solid fa-spinner fa-spin"></i>}
                  Save Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}