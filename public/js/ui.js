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
  const notifBtn = document.getElementById('btn-notifications');
  const notifMenu = document.getElementById('notifications-menu');
  if (notifBtn && notifMenu && !notifBtn.contains(e.target) && !notifMenu.contains(e.target)) {
    notifMenu.classList.add('hidden');
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
