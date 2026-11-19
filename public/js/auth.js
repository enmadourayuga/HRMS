// Authentication Management
const Auth = {
  user: null,
  employee: null,

  async init() {
    const savedToken = localStorage.getItem('nexus_token');
    const savedUser = localStorage.getItem('nexus_user');
    const savedEmp = localStorage.getItem('nexus_employee');

    if (savedToken && savedUser) {
      try {
        this.user = JSON.parse(savedUser);
        this.employee = savedEmp ? JSON.parse(savedEmp) : null;
        this.renderAuthenticatedApp();
        return;
      } catch (err) {
        console.error('Session restore failed:', err);
        this.logout();
      }
    }

    this.showLoginView();
  },

  async handleLogin(event) {
    if (event) event.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('btn-login-submit');

    if (!email || !password) {
      UI.toast('Please provide both email and password', 'error');
      return;
    }

    const originalBtnText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...`;

    try {
      const data = await API.post('/auth/login', { email, password });
      
      this.user = data.user;
      this.employee = data.employee;

      localStorage.setItem('nexus_token', data.token);
      localStorage.setItem('nexus_user', JSON.stringify(data.user));
      localStorage.setItem('nexus_employee', JSON.stringify(data.employee));

      UI.toast(`Welcome back, ${data.employee ? data.employee.name : data.user.email}!`, 'success');
      this.renderAuthenticatedApp();
    } catch (err) {
      UI.toast(err.message || 'Login failed. Please verify credentials.', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalBtnText;
    }
  },

  quickLogin(email, password) {
    const emailInput = document.getElementById('login-email');
    const passInput = document.getElementById('login-password');
    if (emailInput && passInput) {
      emailInput.value = email;
      passInput.value = password;
    }
    this.handleLogin();
  },

  logout() {
    localStorage.removeItem('nexus_token');
    localStorage.removeItem('nexus_user');
    localStorage.removeItem('nexus_employee');
    this.user = null;
    this.employee = null;

    UI.toast('You have been signed out safely.', 'info');
    this.showLoginView();
  },

  showLoginView() {
    document.getElementById('view-login').classList.remove('hidden');
    document.getElementById('view-app').classList.add('hidden');
  },

  renderAuthenticatedApp() {
    document.getElementById('view-login').classList.add('hidden');
    document.getElementById('view-app').classList.remove('hidden');

    // Update Header
    const avatar = this.employee?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=faces';
    const name = this.employee?.name || this.user.email;
    const isFinance = this.user.role === 'finance';
    const isHR = this.user.role === 'hr' || this.user.role === 'hr_admin' || isFinance;
    const isHrAdmin = Boolean(
      this.user.isHrAdmin === true ||
      this.user.role === 'hr_admin' ||
      this.employee?.isHrAdmin === true ||
      this.user.email?.toLowerCase() === 'hr@hrms.com'
    );
    this.isHrAdmin = isHrAdmin;
    this.isFinance = isFinance;

    let defaultTitle = 'Staff Member';
    if (isHrAdmin) defaultTitle = 'HR Administrator';
    else if (isFinance) defaultTitle = 'Finance Lead & Controller';
    else if (isHR) defaultTitle = 'HR Specialist';

    const title = this.employee?.jobTitle || defaultTitle;

    document.getElementById('header-user-avatar').src = avatar;
    document.getElementById('header-user-name').textContent = name;
    document.getElementById('header-user-title').textContent = title;

    const badge = document.getElementById('header-role-badge');
    if (isHrAdmin) {
      badge.className = 'hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200';
      badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-purple-500"></span> 👑 HR Administrator`;
    } else if (isFinance) {
      badge.className = 'hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200';
      badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-blue-500"></span> 💰 Finance Lead`;
    } else if (isHR) {
      badge.className = 'hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200';
      badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-indigo-500"></span> 🛡️ HR Staff`;
    } else {
      badge.className = 'hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200';
      badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500"></span> Employee Portal`;
    }

    // Initialize Role Navigation and Views
    App.setupRoleNavigation(this.user.role);

    // Initial render for profile dropdown in navbar
    const ui = typeof UI !== 'undefined' ? UI : window.UI;
    if (ui && typeof ui.renderProfileDropdown === 'function') {
      ui.renderProfileDropdown();
    }

    // Initial check for notifications
    const emp = typeof Employee !== 'undefined' ? Employee : window.Employee;
    if (emp && typeof emp.loadNotifications === 'function') {
      emp.loadNotifications();
    }
  }
};

if (typeof window !== 'undefined') {
  window.Auth = Auth;
}
