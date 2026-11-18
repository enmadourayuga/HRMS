// Application Coordinator & Router
const App = {
  currentRole: null,

  init() {
    UI.initClock();
    Auth.init();
  },

  setupRoleNavigation(role) {
    this.currentRole = role;
    const isFinance = role === 'finance';
    const isHR = role === 'hr' || role === 'hr_admin' || isFinance;
    const sidebarLabel = document.getElementById('sidebar-role-label');
    const navContainer = document.getElementById('sidebar-nav-links');
    const hrContainer = document.getElementById('hr-view-container');
    const empContainer = document.getElementById('emp-view-container');

    if (isHR) {
      if (isFinance) {
        sidebarLabel.textContent = 'Finance & Payroll Portal';
      } else {
        sidebarLabel.textContent = Auth.isHrAdmin ? 'HR Administration (Admin)' : 'HR Operations Portal';
      }
      hrContainer.classList.remove('hidden');
      empContainer.classList.add('hidden');

      navContainer.innerHTML = `
        <button onclick="App.navigateTo('overview')" id="nav-overview" class="w-full text-left px-3.5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-3 transition-colors">
          <i class="fa-solid fa-gauge-high w-5 text-center text-slate-400"></i>
          <span>Dashboard Overview</span>
        </button>
        <button onclick="App.navigateTo('employees')" id="nav-employees" class="w-full text-left px-3.5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-3 transition-colors">
          <i class="fa-solid fa-users-gear w-5 text-center text-slate-400"></i>
          <span>Employee Directory</span>
        </button>
        <button onclick="App.navigateTo('leaves')" id="nav-leaves" class="w-full text-left px-3.5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-3 transition-colors">
          <i class="fa-solid fa-calendar-check w-5 text-center text-slate-400"></i>
          <span>Leave Requests</span>
        </button>
        <button onclick="App.navigateTo('attendance')" id="nav-attendance" class="w-full text-left px-3.5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-3 transition-colors">
          <i class="fa-solid fa-clock-rotate-left w-5 text-center text-slate-400"></i>
          <span>Attendance Tracker</span>
        </button>
        <button onclick="App.navigateTo('payroll')" id="nav-payroll" class="w-full text-left px-3.5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-3 transition-colors">
          <i class="fa-solid fa-money-check-dollar w-5 text-center text-slate-400"></i>
          <span>Payroll & Compensation</span>
        </button>
        <button onclick="App.navigateTo('announcements')" id="nav-announcements" class="w-full text-left px-3.5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-3 transition-colors">
          <i class="fa-solid fa-bullhorn w-5 text-center text-slate-400"></i>
          <span>Announcements</span>
        </button>
      `;

      HR.init();
      if (isFinance) {
        this.navigateTo('payroll');
      } else {
        this.setActiveNav('overview');
      }
    } else {
      sidebarLabel.textContent = 'Employee Self-Service';
      empContainer.classList.remove('hidden');
      hrContainer.classList.add('hidden');

      navContainer.innerHTML = `
        <button onclick="App.navigateTo('dashboard')" id="nav-dashboard" class="w-full text-left px-3.5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-3 transition-colors">
          <i class="fa-solid fa-house-laptop w-5 text-center text-slate-400"></i>
          <span>My Dashboard</span>
        </button>
        <button onclick="App.navigateTo('attendance')" id="nav-attendance" class="w-full text-left px-3.5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-3 transition-colors">
          <i class="fa-solid fa-fingerprint w-5 text-center text-slate-400"></i>
          <span>Punch Attendance</span>
        </button>
        <button onclick="App.navigateTo('leaves')" id="nav-leaves" class="w-full text-left px-3.5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-3 transition-colors">
          <i class="fa-solid fa-calendar-days w-5 text-center text-slate-400"></i>
          <span>Time Off & Leaves</span>
        </button>
        <button onclick="App.navigateTo('payslips')" id="nav-payslips" class="w-full text-left px-3.5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-3 transition-colors">
          <i class="fa-solid fa-receipt w-5 text-center text-slate-400"></i>
          <span>My Payslips</span>
        </button>
        <button onclick="App.navigateTo('directory')" id="nav-directory" class="w-full text-left px-3.5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-3 transition-colors">
          <i class="fa-solid fa-address-book w-5 text-center text-slate-400"></i>
          <span>Team Directory</span>
        </button>
      `;

      Employee.init();
      this.setActiveNav('dashboard');
    }
  },

  navigateTo(tab) {
    if (this.currentRole === 'hr' || this.currentRole === 'hr_admin' || this.currentRole === 'finance') {
      HR.switchTab(tab);
    } else {
      Employee.switchTab(tab);
    }
    this.setActiveNav(tab);

    // On mobile, auto-collapse sidebar on link click
    if (window.innerWidth < 768) {
      document.getElementById('app-sidebar')?.classList.add('hidden');
      document.getElementById('sidebar-backdrop')?.classList.add('hidden');
    }
  },

  setActiveNav(tab) {
    document.querySelectorAll('#sidebar-nav-links button').forEach(btn => {
      btn.className = 'w-full text-left px-3.5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-3 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors';
      const icon = btn.querySelector('i');
      if (icon) {
        icon.classList.remove('text-indigo-600', 'text-emerald-600', 'text-blue-600');
        icon.classList.add('text-slate-400');
      }
    });

    const activeBtn = document.getElementById(`nav-${tab}`);
    if (activeBtn) {
      const isFin = this.currentRole === 'finance';
      const isHR = this.currentRole === 'hr' || this.currentRole === 'hr_admin';

      if (isFin) {
        activeBtn.className = 'w-full text-left px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-3 bg-blue-50 text-blue-700 shadow-sm border border-blue-100/80 transition-colors';
        const icon = activeBtn.querySelector('i');
        if (icon) {
          icon.classList.remove('text-slate-400');
          icon.classList.add('text-blue-600');
        }
      } else if (isHR) {
        activeBtn.className = 'w-full text-left px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-3 bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100/80 transition-colors';
        const icon = activeBtn.querySelector('i');
        if (icon) {
          icon.classList.remove('text-slate-400');
          icon.classList.add('text-indigo-600');
        }
      } else {
        activeBtn.className = 'w-full text-left px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-3 bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100/80 transition-colors';
        const icon = activeBtn.querySelector('i');
        if (icon) {
          icon.classList.remove('text-slate-400');
          icon.classList.add('text-emerald-600');
        }
      }
    }
  }
};

window.addEventListener('DOMContentLoaded', () => {
  App.init();
});

if (typeof window !== 'undefined') {
  window.App = App;
}
