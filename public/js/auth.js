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

    const avatar = this.employee?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=faces';
    const name = this.employee?.name || this.user.email;
    const title = this.employee?.jobTitle || (this.user.role === 'hr' ? 'HR Administrator' : 'Staff Member');
    const isHR = this.user.role === 'hr';

    document.getElementById('header-user-avatar').src = avatar;
    document.getElementById('header-user-name').textContent = name;
    document.getElementById('header-user-title').textContent = title;

    const badge = document.getElementById('header-role-badge');
    if (isHR) {
      badge.className = 'hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200';
      badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-indigo-500"></span> HR Administrator`;
    } else {
      badge.className = 'hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200';
      badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500"></span> Employee Portal`;
    }

    App.setupRoleNavigation(this.user.role);
  }
};
