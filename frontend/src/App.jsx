import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { API, tokenStorage } from './api';
import useNotifications from './hooks/useNotifications';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import EmployeesPage from './pages/EmployeesPage';
import AttendancePage from './pages/AttendancePage';
import LeavesPage from './pages/LeavesPage';
import PayrollPage from './pages/PayrollPage';
import BulletinsPage from './pages/BulletinsPage';
import ProfilePage from './pages/ProfilePage';

// Common components
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Header from './components/common/Header';
import Sidebar from './components/common/Sidebar';

// Modal dialogs
import ApplyLeaveModal from './components/modals/ApplyLeaveModal';
import AddEmployeeModal from './components/modals/AddEmployeeModal';
import EditEmployeeModal from './components/modals/EditEmployeeModal';
import AddAnnouncementModal from './components/modals/AddAnnouncementModal';
import PayslipModal from './components/modals/PayslipModal';

// Demo user shortcuts
const DEMO_USERS = [
  { label: 'Elena Rostova (HR Admin)', email: 'hr@hrms.com', role: 'hr', is_hr_admin: true },
  { label: 'Clara Oswald (HR Staff)', email: 'clara.hr@hrms.com', role: 'hr', is_hr_admin: false },
  { label: 'Alex Morgan (Engineering)', email: 'alex.morgan@hrms.com', role: 'employee' },
  { label: 'Sarah Chen (Design)', email: 'sarah.chen@hrms.com', role: 'employee' },
  { label: 'Marcus Vance (DevOps)', email: 'marcus.vance@hrms.com', role: 'employee' },
  { label: 'Priya Patel (Marketing)', email: 'priya.patel@hrms.com', role: 'employee' },
];

export default function App() {
  const [user, setUser] = useState(tokenStorage.getUser());
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);

  // App datasets
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  // Modals state
  const [modalLeaveOpen, setModalLeaveOpen] = useState(false);
  const [modalEmployeeOpen, setModalEmployeeOpen] = useState(false);
  const [modalEditEmployeeOpen, setModalEditEmployeeOpen] = useState(false);
  const [selectedEmployeeForEdit, setSelectedEmployeeForEdit] = useState(null);
  const [modalAnnouncementOpen, setModalAnnouncementOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [leaveStatusFilter, setLeaveStatusFilter] = useState('All');

  // Form states
  const [leaveForm, setLeaveForm] = useState({
    leave_type: 'Annual',
    start_date: '',
    end_date: '',
    days: 1,
    reason: ''
  });

  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    email: '',
    password: 'password123',
    job_title: '',
    department: 'Engineering',
    role: 'employee',
    salary: '',
    phone: '',
    location: 'Bengaluru (HQ)',
    join_date: new Date().toISOString().split('T')[0],
    employment_type: 'Full-Time',
    manager: '',
    avatar: '',
    avatarFile: null,
    avatarPreview: ''
  });

  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    category: 'General',
    priority: 'Normal',
    content: ''
  });

  // Login form state
  const [loginEmail, setLoginEmail] = useState('hr@hrms.com');
  const [loginPassword, setLoginPassword] = useState('password123');
  const [loginLoading, setLoginLoading] = useState(false);

  const addToast = useCallback((message, type = 'info') => {
    if (type === 'success') {
      toast.success(message);
    } else if (type === 'error') {
      toast.error(message);
    } else if (type === 'warn' || type === 'warning') {
      toast.warning(message);
    } else {
      toast.info(message);
    }
  }, []);

  // Load all data from API
  const refreshData = useCallback(async () => {
    if (!tokenStorage.getAccess()) return;
    try {
      setLoading(true);
      const [empRes, attRes, leaveRes, payRes, annRes] = await Promise.all([
        API.getEmployees().catch(() => []),
        API.getAttendance().catch(() => []),
        API.getLeaves().catch(() => []),
        API.getPayroll().catch(() => []),
        API.getAnnouncements().catch(() => []),
      ]);

      setEmployees(empRes);
      setAttendance(attRes);
      setLeaves(leaveRes);
      setPayroll(payRes);
      setAnnouncements(annRes);

      // Find current user's employee profile
      const currentUser = tokenStorage.getUser();
      if (currentUser) {
        const found = empRes.find(e => e.email === currentUser.email || e.id === currentUser.employee_id);
        if (found) setEmployeeProfile(found);
      }
    } catch (err) {
      console.error('Data refresh error:', err);
      addToast('Failed to sync data from server', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (user) {
      refreshData();
    }
  }, [user, refreshData]);

  // Connect live notifications stream (SSE) with Toastify
  useNotifications(addToast, refreshData, user);

  // Login action
  const handleLogin = async (e, directEmail = null, directPass = null) => {
    if (e) e.preventDefault();
    const emailToUse = directEmail || loginEmail;
    const passToUse = directPass || loginPassword;

    try {
      setLoginLoading(true);
      const res = await API.login(emailToUse, passToUse);
      setUser(res.user);
      addToast(`Welcome back, ${res.user.email}!`, 'success');
    } catch (err) {
      addToast(err.message || 'Login failed. Check credentials.', 'error');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    API.logout();
    setUser(null);
    setEmployeeProfile(null);
    addToast('Signed out successfully.', 'info');
  };

  // Submit Leave Request
  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!employeeProfile) return;
    try {
      const payload = {
        id: `LV-${Date.now().toString().slice(-6)}`,
        employee_id: employeeProfile.id,
        employee_name: employeeProfile.name,
        department: employeeProfile.department,
        leave_type: leaveForm.leave_type,
        start_date: leaveForm.start_date,
        end_date: leaveForm.end_date,
        days: parseInt(leaveForm.days) || 1,
        reason: leaveForm.reason,
        status: 'Pending',
        applied_on: new Date().toISOString().split('T')[0]
      };
      await API.createLeave(payload);
      addToast('Leave request submitted successfully!', 'success');
      setModalLeaveOpen(false);
      setLeaveForm({ leave_type: 'Annual', start_date: '', end_date: '', days: 1, reason: '' });
      refreshData();
    } catch (err) {
      addToast('Failed to submit leave request.', 'error');
    }
  };

  // Leave approval / rejection
  const handleLeaveAction = async (leaveId, newStatus) => {
    try {
      await API.updateLeave(leaveId, {
        status: newStatus,
        reviewed_by: user.email,
        review_comment: `Status marked as ${newStatus} on ${new Date().toLocaleDateString()}`
      });
      addToast(`Leave request ${newStatus.toLowerCase()}!`, 'success');
      refreshData();
    } catch (err) {
      addToast(`Failed to update leave to ${newStatus}.`, 'error');
    }
  };

  // Add Employee
  const handleAddEmployee = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const name = employeeForm.name?.trim() || '';
    const email = employeeForm.email?.trim() || '';
    const password = employeeForm.password?.trim() || '';
    const job_title = employeeForm.job_title?.trim() || '';
    const department = employeeForm.department?.trim() || '';
    const role = employeeForm.role || 'employee';
    const salary = parseInt(employeeForm.salary, 10);
    const phone = employeeForm.phone?.trim() || '';
    const location = employeeForm.location?.trim() || '';
    const join_date = employeeForm.join_date;
    const employment_type = employeeForm.employment_type || 'Full-Time';
    const manager = employeeForm.manager?.trim() || null;

    if (!name) {
      addToast('Please enter the employee full name.', 'error');
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      addToast('Please enter a valid work email address.', 'error');
      return;
    }
    if (!password || password.length < 6) {
      addToast('Please provide a login password (at least 6 characters).', 'error');
      return;
    }
    if (!job_title) {
      addToast('Please enter the job title.', 'error');
      return;
    }
    if (!department) {
      addToast('Please select a department.', 'error');
      return;
    }
    if (isNaN(salary) || salary <= 0) {
      addToast('Please enter a valid annual salary greater than 0.', 'error');
      return;
    }
    if (!phone || phone.replace(/[\s\-\(\)\+]/g, '').length < 7) {
      addToast('Please enter a valid contact phone number (at least 7 digits).', 'error');
      return;
    }
    if (!location) {
      addToast('Please enter the work location.', 'error');
      return;
    }
    if (!join_date) {
      addToast('Please select a joining date.', 'error');
      return;
    }

    try {
      let avatarUrl = employeeForm.avatar;
      if (employeeForm.avatarFile) {
        try {
          const uploadRes = await API.uploadAvatar(employeeForm.avatarFile);
          avatarUrl = uploadRes.avatar_url;
        } catch (uploadErr) {
          console.error('Avatar upload failed, falling back:', uploadErr);
        }
      }
      if (!avatarUrl) {
        avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff`;
      }

      // Compute next numeric EMP ID safely to prevent collisions
      const maxId = employees.reduce((max, emp) => {
        const match = emp.id?.match(/EMP-(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          return num > max ? num : max;
        }
        return max;
      }, 0);
      const nextId = `EMP-${(maxId + 1).toString().padStart(3, '0')}`;

      const isHRAdmin = Boolean(user?.is_hr_admin);
      const isTargetHR = role === 'hr' || Boolean(employeeForm.is_hr_admin);
      if (isTargetHR && !isHRAdmin) {
        addToast('Permission denied: Only HR administrators can create new HR accounts.', 'error');
        return;
      }

      const payload = {
        id: nextId,
        name,
        email,
        password,
        job_title,
        department,
        role,
        is_hr_admin: role === 'hr',
        salary,
        phone,
        location,
        avatar: avatarUrl,
        status: 'Active',
        employment_type,
        join_date,
        manager
      };

      await API.createEmployee(payload);
      addToast(`${role === 'hr' ? 'HR Administrator' : 'Employee'} ${payload.name} added successfully!`, 'success');
      setModalEmployeeOpen(false);
      setEmployeeForm({
        name: '',
        email: '',
        password: 'password123',
        job_title: '',
        department: 'Engineering',
        role: 'employee',
        salary: '',
        phone: '',
        location: 'Bengaluru (HQ)',
        join_date: new Date().toISOString().split('T')[0],
        employment_type: 'Full-Time',
        manager: '',
        avatar: '',
        avatarFile: null,
        avatarPreview: ''
      });
      refreshData();
    } catch (err) {
      addToast(err.message || 'Failed to add employee.', 'error');
    }
  };

  // Update Employee from HR panel
  const handleEmployeeEdited = (updatedEmp) => {
    setEmployees(prev => prev.map(e => (e.id === updatedEmp.id ? updatedEmp : e)));
    if (employeeProfile && employeeProfile.id === updatedEmp.id) {
      setEmployeeProfile(updatedEmp);
    }
    addToast(`Employee ${updatedEmp.name} updated successfully!`, 'success');
    refreshData();
  };

  // Toggle Employee Status (Active / Inactive)
  const handleToggleEmployeeStatus = async (emp) => {
    if (!isHR) return;
    const willDeactivate = emp.status === 'Active';
    if (willDeactivate) {
      if (emp.email === user?.email || emp.id === user?.employee_id) {
        addToast('You cannot deactivate your own HR administrator account.', 'error');
        return;
      }
      const confirmed = window.confirm(
        `Are you sure you want to deactivate ${emp.name}'s account? They will be locked out and cannot log in to the portal.`
      );
      if (!confirmed) return;
    }

    try {
      const res = await API.toggleEmployeeStatus(emp.id);
      const isNowActive = res.status === 'Active';
      addToast(
        `Employee ${emp.name} account has been ${isNowActive ? 'reactivated' : 'deactivated'}.`,
        'success'
      );
      refreshData();
    } catch (err) {
      addToast(err.message || 'Failed to update account status.', 'error');
    }
  };

  // Profile updated by employee directly
  const handleProfileUpdated = (updatedProfile) => {
    setEmployeeProfile(updatedProfile);
    setEmployees(prev => prev.map(e => (e.id === updatedProfile.id ? updatedProfile : e)));
  };

  // Add Announcement
  const handleAddAnnouncement = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        id: `ANN-${Date.now().toString().slice(-6)}`,
        title: announcementForm.title,
        category: announcementForm.category,
        priority: announcementForm.priority,
        author: employeeProfile ? employeeProfile.name : user.email,
        content: announcementForm.content,
        date: new Date().toISOString().split('T')[0]
      };
      await API.createAnnouncement(payload);
      addToast('Announcement posted!', 'success');
      setModalAnnouncementOpen(false);
      setAnnouncementForm({ title: '', category: 'General', priority: 'Normal', content: '' });
      refreshData();
    } catch (err) {
      addToast('Failed to post announcement.', 'error');
    }
  };

  // Stats calculation
  const hrStats = useMemo(() => {
    const totalEmployees = employees.length;
    const presentToday = attendance.filter(a => a.clock_in).length;
    const onLeaveToday = leaves.filter(l => l.status === 'Approved').length;
    const pendingLeaves = leaves.filter(l => l.status === 'Pending').length;
    const monthlyPayroll = Math.round(employees.reduce((sum, e) => sum + (e.salary || 0), 0) / 12);

    return { totalEmployees, presentToday, onLeaveToday, pendingLeaves, monthlyPayroll };
  }, [employees, attendance, leaves]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      const matchSearch =
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.job_title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchDept = deptFilter === 'All' || e.department === deptFilter;
      return matchSearch && matchDept;
    });
  }, [employees, searchQuery, deptFilter]);

  // Unique departments
  const departments = useMemo(() => {
    const set = new Set(employees.map(e => e.department).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [employees]);

  // Filtered leaves
  const filteredLeaves = useMemo(() => {
    if (leaveStatusFilter === 'All') return leaves;
    return leaves.filter(l => l.status.toLowerCase() === leaveStatusFilter.toLowerCase());
  }, [leaves, leaveStatusFilter]);

  // Today's attendance for current user
  const todayAttendance = useMemo(() => {
    if (!employeeProfile) return null;
    const today = new Date().toISOString().split('T')[0];
    return attendance.find(a => a.employee_id === employeeProfile.id && a.date === today);
  }, [attendance, employeeProfile]);

  // -------------------------------------------------------------
  // VIEW: LOGIN SCREEN
  // -------------------------------------------------------------
  if (!user) {
    return (
      <>
        <ToastContainer position="top-right" autoClose={3500} hideProgressBar newestOnTop closeOnClick pauseOnHover theme="light" />
        <LoginPage
          demoUsers={DEMO_USERS}
          loginEmail={loginEmail}
          setLoginEmail={setLoginEmail}
          loginPassword={loginPassword}
          setLoginPassword={setLoginPassword}
          loginLoading={loginLoading}
          onLogin={handleLogin}
        />
      </>
    );
  }

  // -------------------------------------------------------------
  // VIEW: MAIN APPLICATION
  // -------------------------------------------------------------
  const isHR = user.role === 'hr' || user.is_hr_admin;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 font-sans">
      <ToastContainer position="top-right" autoClose={3500} hideProgressBar newestOnTop closeOnClick pauseOnHover theme="light" />

      <Header
        user={user}
        employeeProfile={employeeProfile}
        demoUsers={DEMO_USERS}
        onSwitchDemo={(email) => handleLogin(null, email, 'password123')}
        onLogout={handleLogout}
        onOpenProfile={() => setActiveTab('profile')}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          isHR={isHR}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          pendingLeavesCount={hrStats.pendingLeaves}
          loading={loading}
          onRefresh={refreshData}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {activeTab === 'overview' && (
            <DashboardPage
              isHR={isHR}
              user={user}
              employeeProfile={employeeProfile}
              hrStats={hrStats}
              todayAttendance={todayAttendance}
              leaves={leaves}
              announcements={announcements}
              onOpenLeaveModal={() => setModalLeaveOpen(true)}
              onOpenEmployeeModal={() => setModalEmployeeOpen(true)}
              onOpenAnnouncementModal={() => setModalAnnouncementOpen(true)}
              onLeaveAction={handleLeaveAction}
              onGoToLeaves={() => setActiveTab('leaves')}
            />
          )}

          {activeTab === 'profile' && (
            <ProfilePage
              user={user}
              isHR={isHR}
              employeeProfile={employeeProfile}
              onProfileUpdated={handleProfileUpdated}
              todayAttendance={todayAttendance}
              onGoToLeaves={() => setActiveTab('leaves')}
              onGoToPayroll={() => setActiveTab('payroll')}
              addToast={addToast}
            />
          )}

          {activeTab === 'employees' && (
            <EmployeesPage
              isHR={isHR}
              filteredEmployees={filteredEmployees}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              deptFilter={deptFilter}
              setDeptFilter={setDeptFilter}
              departments={departments}
              onOpenEmployeeModal={() => setModalEmployeeOpen(true)}
              onEditEmployee={(emp) => {
                if (!isHR) {
                  addToast?.('Only HR administrators can edit employee information.', 'error');
                  return;
                }
                setSelectedEmployeeForEdit(emp);
                setModalEditEmployeeOpen(true);
              }}
              onToggleStatus={handleToggleEmployeeStatus}
              currentUserId={user?.employee_id}
              currentUserEmail={user?.email}
            />
          )}

          {activeTab === 'attendance' && (
            <AttendancePage
              isHR={isHR}
              attendance={attendance}
              employeeProfile={employeeProfile}
              todayAttendance={todayAttendance}
            />
          )}

          {activeTab === 'leaves' && (
            <LeavesPage
              isHR={isHR}
              employeeProfile={employeeProfile}
              filteredLeaves={filteredLeaves}
              leaveStatusFilter={leaveStatusFilter}
              setLeaveStatusFilter={setLeaveStatusFilter}
              onOpenLeaveModal={() => setModalLeaveOpen(true)}
              onLeaveAction={handleLeaveAction}
            />
          )}

          {activeTab === 'payroll' && (
            <PayrollPage
              isHR={isHR}
              payroll={payroll}
              employeeProfile={employeeProfile}
              onSelectPayslip={setSelectedPayslip}
            />
          )}

          {activeTab === 'announcements' && (
            <BulletinsPage
              isHR={isHR}
              announcements={announcements}
              onOpenAnnouncementModal={() => setModalAnnouncementOpen(true)}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <ApplyLeaveModal
        isOpen={modalLeaveOpen}
        onClose={() => setModalLeaveOpen(false)}
        leaveForm={leaveForm}
        setLeaveForm={setLeaveForm}
        onSubmit={handleApplyLeave}
        employeeProfile={employeeProfile}
      />

      <AddEmployeeModal
        isOpen={modalEmployeeOpen}
        onClose={() => setModalEmployeeOpen(false)}
        employeeForm={employeeForm}
        setEmployeeForm={setEmployeeForm}
        onSubmit={handleAddEmployee}
        currentUser={user}
        isHRAdmin={Boolean(user?.is_hr_admin)}
      />

      {isHR && modalEditEmployeeOpen && selectedEmployeeForEdit && (
        <EditEmployeeModal
          key={selectedEmployeeForEdit.id}
          isOpen={modalEditEmployeeOpen}
          onClose={() => {
            setModalEditEmployeeOpen(false);
            setSelectedEmployeeForEdit(null);
          }}
          employee={selectedEmployeeForEdit}
          onSave={handleEmployeeEdited}
        />
      )}

      <AddAnnouncementModal
        isOpen={modalAnnouncementOpen}
        onClose={() => setModalAnnouncementOpen(false)}
        announcementForm={announcementForm}
        setAnnouncementForm={setAnnouncementForm}
        onSubmit={handleAddAnnouncement}
      />

      <PayslipModal
        selectedPayslip={selectedPayslip}
        onClose={() => setSelectedPayslip(null)}
      />
    </div>
  );
}
