// UI Utilities & Helper Functions
const UI = {
  toast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    const bgColors = {
      success: 'bg-emerald-600 text-white',
      error: 'bg-rose-600 text-white',
      info: 'bg-indigo-600 text-white',
      warning: 'bg-amber-500 text-white'
    };

    const icons = {
      success: 'fa-solid fa-circle-check',
      error: 'fa-solid fa-triangle-exclamation',
      info: 'fa-solid fa-circle-info',
      warning: 'fa-solid fa-circle-exclamation'
    };

    toast.className = `${bgColors[type] || bgColors.info} px-4 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-medium transform transition-all duration-300 pointer-events-auto opacity-0 translate-y-2 z-[99999] border border-white/20`;
    toast.innerHTML = `
      <i class="${icons[type] || icons.info} text-base shrink-0"></i>
      <span class="flex-1">${message}</span>
      <button onclick="this.parentElement.remove()" class="opacity-70 hover:opacity-100 transition-opacity ml-2">
        <i class="fa-solid fa-xmark text-sm"></i>
      </button>
    `;

    container.appendChild(toast);

    // Animation in
    requestAnimationFrame(() => {
      toast.classList.remove('opacity-0', 'translate-y-2');
      toast.classList.add('opacity-100', 'translate-y-0');
    });

    // Auto dismiss (give errors more reading time)
    const timeout = (type === 'error' || type === 'warning') ? 5500 : 3500;
    setTimeout(() => {
      toast.classList.remove('opacity-100', 'translate-y-0');
      toast.classList.add('opacity-0', '-translate-y-2');
      setTimeout(() => toast.remove(), 300);
    }, timeout);
  },

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
      if (modalId === 'modal-request-leave') {
        const errorAlert = document.getElementById('leave-error-alert');
        if (errorAlert) errorAlert.classList.add('hidden');
        const emp = typeof Employee !== 'undefined' ? Employee : window.Employee;
        if (emp && typeof emp.updateLeaveBalanceHelper === 'function') {
          emp.updateLeaveBalanceHelper();
        }
      }
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('hidden');
      const emp = typeof Employee !== 'undefined' ? Employee : window.Employee;
      if (modalId === 'modal-request-leave' && emp && typeof emp.resetLeaveModal === 'function') {
        emp.resetLeaveModal();
      }
      const anyOpen = document.querySelector('.fixed.z-50:not(.hidden)');
      if (!anyOpen) {
        document.body.classList.remove('overflow-hidden');
      }
    }
  },

  togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
      input.type = input.type === 'password' ? 'text' : 'password';
    }
  },

  toggleSwitchMenu() {
    const menu = document.getElementById('switch-menu');
    if (menu) {
      menu.classList.toggle('hidden');
    }
  },

  toggleNotificationsMenu() {
    const menu = document.getElementById('notifications-menu');
    if (menu) {
      menu.classList.toggle('hidden');
      const emp = typeof Employee !== 'undefined' ? Employee : window.Employee;
      if (!menu.classList.contains('hidden') && emp && typeof emp.loadNotifications === 'function') {
        emp.loadNotifications();
      }
    }
  },

  toggleProfileMenu() {
    const menu = document.getElementById('profile-menu');
    if (menu) {
      const isHidden = menu.classList.toggle('hidden');
      if (!isHidden) {
        this.renderProfileDropdown();
        document.getElementById('switch-menu')?.classList.add('hidden');
        document.getElementById('notifications-menu')?.classList.add('hidden');
      }
    }
  },

  renderProfileDropdown() {
    const content = document.getElementById('profile-menu-content');
    if (!content) return;

    const auth = typeof Auth !== 'undefined' ? Auth : window.Auth;
    const emp = (typeof Employee !== 'undefined' && Employee.employeeData) ? Employee.employeeData : (auth?.employee || {});
    const user = auth?.user || {};

    if (!emp.id && !user.email) {
      content.innerHTML = `<div class="p-4 text-center text-slate-400 text-xs">No active profile session.</div>`;
      return;
    }

    const struct = emp.salaryStructure || {
      name: emp.salaryStructureId === 'STR-002' ? 'Executive Leadership Structure' :
            emp.salaryStructureId === 'STR-003' ? 'Junior & Trainee Structure' : 'Standard Corporate Structure'
    };

    const isHR = user.role === 'hr' || user.role === 'hr_admin' || user.role === 'finance';
    const status = emp.status || 'Active';
    const isInactive = status === 'Inactive';

    content.innerHTML = `
      <div class="space-y-3.5">
        <!-- Header User Card -->
        <div class="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div class="relative shrink-0">
            <img src="${emp.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=faces'}" class="w-12 h-12 rounded-xl object-cover ring-2 ring-indigo-500/20" alt="${emp.name || 'User'}">
            <span class="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full ${isInactive ? 'bg-rose-500' : 'bg-emerald-500'} ring-2 ring-white"></span>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-1">
              <h4 class="font-bold text-slate-900 text-sm truncate">${emp.name || user.email}</h4>
              <span class="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">${emp.id || 'N/A'}</span>
            </div>
            <p class="text-xs text-slate-500 truncate">${emp.jobTitle || (isHR ? 'HR Team' : 'Employee')}</p>
            <div class="flex items-center gap-1.5 mt-1">
              <span class="text-[10px] font-semibold ${isInactive ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'} border px-2 py-0.5 rounded-full">
                ${status}
              </span>
              <span class="text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                ${emp.employmentType || 'Full-Time'}
              </span>
            </div>
          </div>
        </div>

        <!-- 2-3 Key Basic Details -->
        <div class="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2 text-xs">
          <div class="flex items-center justify-between gap-2">
            <span class="text-slate-500 flex items-center gap-1.5 shrink-0"><i class="fa-regular fa-envelope text-slate-400 w-3.5 text-center"></i> Email:</span>
            <span class="font-semibold text-slate-800 truncate" title="${emp.email || user.email}">${emp.email || user.email}</span>
          </div>

          <div class="flex items-center justify-between gap-2">
            <span class="text-slate-500 flex items-center gap-1.5 shrink-0"><i class="fa-solid fa-phone text-slate-400 w-3.5 text-center"></i> Phone:</span>
            <span class="font-semibold text-slate-800">${emp.phone || '--'}</span>
          </div>

          <div class="flex items-center justify-between gap-2">
            <span class="text-slate-500 flex items-center gap-1.5 shrink-0"><i class="fa-solid fa-location-dot text-slate-400 w-3.5 text-center"></i> Location:</span>
            <span class="font-semibold text-slate-800 truncate">${emp.location || 'HQ Office'}</span>
          </div>
        </div>

        <!-- Action Links -->
        <div class="pt-1 flex items-center gap-2">
          <button onclick="UI.openFullProfile()" class="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-600/20 transition-all">
            <i class="fa-solid fa-id-card"></i> View Full Profile
          </button>
          <button onclick="Auth.logout()" class="py-2 px-3 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors">
            <i class="fa-solid fa-arrow-right-from-bracket"></i> Logout
          </button>
        </div>
      </div>
    `;
  },

  openFullProfile() {
    const profileMenu = document.getElementById('profile-menu');
    if (profileMenu) profileMenu.classList.add('hidden');
    const app = typeof App !== 'undefined' ? App : window.App;
    if (app && typeof app.navigateTo === 'function') {
      app.navigateTo('profile');
    }
  },

  async markAllNotificationsRead() {
    try {
      const empId = Auth.user?.employeeId;
      await API.post('/notifications/mark-all-read', { employeeId: empId });
      const emp = typeof Employee !== 'undefined' ? Employee : window.Employee;
      if (emp && typeof emp.loadNotifications === 'function') {
        await emp.loadNotifications();
      }
      UI.toast('All notifications marked as read', 'success');
    } catch (e) {
      UI.toast('Failed to mark notifications read', 'error');
    }
  },

  updateNotificationBadge(unreadCount) {
    const badge = document.getElementById('notification-badge');
    const countText = document.getElementById('notif-count-text');
    if (badge) {
      if (unreadCount > 0) {
        badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
    if (countText) {
      countText.textContent = `${unreadCount} unread`;
    }
  },

  toggleMobileSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) {
      const isHidden = sidebar.classList.toggle('hidden');
      if (backdrop) {
        if (isHidden) {
          backdrop.classList.add('hidden');
        } else {
          backdrop.classList.remove('hidden');
        }
      }
    }
  },

  formatCurrency(num) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(num || 0);
  },

  formatDate(dateStr) {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  },

  initClock() {
    function update() {
      const el = document.getElementById('current-clock-display');
      if (el) {
        const now = new Date();
        el.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      }
    }
    update();
    setInterval(update, 1000);
  }
};

// Close menus when clicking outside
document.addEventListener('click', (e) => {
  const switchBtn = document.getElementById('btn-switch-account');
  const switchMenu = document.getElementById('switch-menu');
  if (switchBtn && switchMenu && !switchBtn.contains(e.target) && !switchMenu.contains(e.target)) {
    switchMenu.classList.add('hidden');
  }

  const notifBtn = document.getElementById('btn-notifications');
  const notifMenu = document.getElementById('notifications-menu');
  if (notifBtn && notifMenu && !notifBtn.contains(e.target) && !notifMenu.contains(e.target)) {
    notifMenu.classList.add('hidden');
  }

  const profileBtn = document.getElementById('btn-user-profile');
  const profileMenu = document.getElementById('profile-menu');
  if (profileBtn && profileMenu && !profileBtn.contains(e.target) && !profileMenu.contains(e.target)) {
    profileMenu.classList.add('hidden');
  }
});

// Close open modals when pressing Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const openModals = document.querySelectorAll('.fixed.z-50:not(.hidden)');
    openModals.forEach(m => m.classList.add('hidden'));
    document.body.classList.remove('overflow-hidden');
  }
});

if (typeof window !== 'undefined') {
  window.UI = UI;
}
