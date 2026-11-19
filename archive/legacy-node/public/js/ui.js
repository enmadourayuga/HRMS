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
          <div class="relative shrink-0 group cursor-pointer" onclick="UI.openChangeAvatarModal('${emp.id || user.employeeId}'); const m = document.getElementById('profile-menu'); if(m) m.classList.add('hidden');" title="Click to change profile picture">
            <img src="${emp.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=faces'}" class="w-12 h-12 rounded-xl object-cover ring-2 ring-indigo-500/20 group-hover:opacity-85 transition-all" alt="${emp.name || 'User'}">
            <div class="absolute inset-0 bg-slate-900/40 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
              <i class="fa-solid fa-camera text-white text-xs"></i>
            </div>
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
        <div class="pt-1 space-y-2">
          <div class="flex items-center gap-2">
            <button onclick="UI.openFullProfile()" class="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-600/20 transition-all">
              <i class="fa-solid fa-id-card"></i> View Full Profile
            </button>
            <button onclick="UI.openChangeAvatarModal('${emp.id || user.employeeId}'); const m = document.getElementById('profile-menu'); if(m) m.classList.add('hidden');" class="py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors" title="Change Photo">
              <i class="fa-solid fa-camera"></i> Change Photo
            </button>
          </div>
          <button onclick="Auth.logout()" class="w-full py-2 px-3 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors">
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
  },

  // ---------------- PROFILE IMAGE / AVATAR HELPERS ----------------
  avatarPresets: [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=faces',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=faces',
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop&crop=faces',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=faces',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop&crop=faces',
    'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&h=200&fit=crop&crop=faces',
    'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200&h=200&fit=crop&crop=faces'
  ],

  defaultAvatars: {
    employee: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop&crop=faces',
    hr: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=faces'
  },

  async compressAndResizeImage(file, maxWidth = 300, maxHeight = 300, quality = 0.85) {
    if (!file || !file.type.startsWith('image/')) {
      throw new Error('Please select a valid image file (PNG, JPG, WebP, etc.).');
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read selected image file.'));
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error('Failed to parse image data.'));
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  },

  async handleAvatarFileSelect(event, context) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
      const dataUrl = await this.compressAndResizeImage(file);
      this.setAvatarValue(context, dataUrl);
      this.toast('Photo loaded and compressed successfully!', 'success');
    } catch (err) {
      this.toast(err.message || 'Error processing image', 'error');
    }
  },

  handleAvatarUrlInput(context, url) {
    const trimmed = (url || '').trim();
    if (!trimmed) return;
    this.setAvatarValue(context, trimmed, false);
  },

  toggleAvatarUrlInput(context) {
    const wrapper = document.getElementById(`${context}-avatar-url-wrapper`);
    if (wrapper) {
      wrapper.classList.toggle('hidden');
      if (!wrapper.classList.contains('hidden')) {
        const input = document.getElementById(`${context}-avatar-url-input`);
        if (input) input.focus();
      }
    }
  },

  clearAvatarUrlInput(context) {
    const input = document.getElementById(`${context}-avatar-url-input`);
    if (input) input.value = '';
    const wrapper = document.getElementById(`${context}-avatar-url-wrapper`);
    if (wrapper) wrapper.classList.add('hidden');
  },

  setAvatarValue(context, value, updateUrlInput = true) {
    // 1. Update Preview Image
    const preview = document.getElementById(`${context}-avatar-preview`);
    if (preview) {
      preview.src = value;
    }
    // 2. Update Hidden input or storage
    if (context === 'change-modal') {
      const targetVal = document.getElementById('change-avatar-value');
      if (targetVal) targetVal.value = value;
      if (updateUrlInput) {
        const urlInput = document.getElementById('change-avatar-url-input');
        if (urlInput) urlInput.value = value.startsWith('data:') ? '' : value;
      }
    } else {
      const hidden = document.getElementById(`${context}-avatar`);
      if (hidden) hidden.value = value;
      if (updateUrlInput) {
        const urlInput = document.getElementById(`${context}-avatar-url-input`);
        if (urlInput) urlInput.value = value.startsWith('data:') ? '' : value;
      }
    }
  },

  setAvatarPreset(context, url) {
    this.setAvatarValue(context, url, true);
  },

  cyclePresetAvatar(context) {
    const rand = this.avatarPresets[Math.floor(Math.random() * this.avatarPresets.length)];
    this.setAvatarValue(context, rand, true);
  },

  resetAvatarInput(context, defaultUrl = null) {
    const fallback = defaultUrl || this.defaultAvatars.employee;
    this.setAvatarValue(context, fallback, true);
    this.clearAvatarUrlInput(context);
    const fileInput = document.getElementById(`${context}-avatar-file`) || document.getElementById('change-avatar-file-input');
    if (fileInput) fileInput.value = '';
  },

  initAvatarEdit(context, currentAvatar) {
    const val = currentAvatar || this.defaultAvatars.employee;
    this.setAvatarValue(context, val, true);
    this.clearAvatarUrlInput(context);
  },

  renderAvatarPresets(context, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = this.avatarPresets.slice(0, 6).map((url, i) => `
      <button type="button" onclick="UI.setAvatarPreset('${context}', '${url}')" class="shrink-0 w-6 h-6 rounded-lg overflow-hidden border border-slate-200 hover:scale-110 hover:ring-2 hover:ring-indigo-500 transition-all focus:outline-none" title="Select Preset ${i + 1}">
        <img src="${url}" class="w-full h-full object-cover" alt="Preset ${i + 1}">
      </button>
    `).join('');
  },

  renderChangeAvatarModalPresets() {
    const grid = document.getElementById('change-avatar-presets-grid');
    if (!grid) return;
    grid.innerHTML = this.avatarPresets.map((url, i) => `
      <button type="button" onclick="UI.setAvatarPreset('change-modal', '${url}')" class="group relative aspect-square rounded-xl overflow-hidden border-2 border-slate-200 hover:border-indigo-600 hover:scale-105 transition-all focus:outline-none" title="Preset ${i + 1}">
        <img src="${url}" class="w-full h-full object-cover group-hover:brightness-95" alt="Preset ${i + 1}">
      </button>
    `).join('');
  },

  openChangeAvatarModal(targetEmpId = null) {
    const empId = targetEmpId || Auth.employee?.id || Auth.user?.employeeId;
    let emp = null;
    if (typeof HR !== 'undefined' && Array.isArray(HR.employees)) {
      emp = HR.employees.find(e => e.id === empId);
    }
    if (!emp && typeof Employee !== 'undefined' && Employee.employeeData && Employee.employeeData.id === empId) {
      emp = Employee.employeeData;
    }
    if (!emp && Auth.employee) {
      emp = Auth.employee;
    }

    const currentAvatar = emp?.avatar || this.defaultAvatars.employee;
    const name = emp?.name || 'User Profile';

    const targetIdInput = document.getElementById('change-avatar-target-id');
    if (targetIdInput) targetIdInput.value = empId || '';
    const targetValInput = document.getElementById('change-avatar-value');
    if (targetValInput) targetValInput.value = currentAvatar;
    const titleEl = document.getElementById('modal-change-avatar-title');
    if (titleEl) titleEl.textContent = `Change Profile Image`;
    const subEl = document.getElementById('modal-change-avatar-subtitle');
    if (subEl) subEl.textContent = `Update photo for ${name} (${empId || 'Self'})`;
    
    const preview = document.getElementById('change-avatar-preview');
    if (preview) preview.src = currentAvatar;
    
    const urlInput = document.getElementById('change-avatar-url-input');
    if (urlInput) urlInput.value = currentAvatar.startsWith('data:') ? '' : currentAvatar;

    const fileInput = document.getElementById('change-avatar-file-input');
    if (fileInput) fileInput.value = '';

    this.renderChangeAvatarModalPresets();
    this.openModal('modal-change-avatar');
  },

  async saveChangedAvatar() {
    const empId = document.getElementById('change-avatar-target-id')?.value;
    const avatar = document.getElementById('change-avatar-value')?.value;

    if (!empId) {
      this.toast('Employee ID missing', 'error');
      return;
    }
    if (!avatar || !avatar.trim()) {
      this.toast('Please choose or upload a photo', 'warning');
      return;
    }

    const btn = document.getElementById('btn-save-changed-avatar');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;
    }

    try {
      const res = await API.patch(`/employees/${empId}/avatar`, { avatar });
      const updatedAvatar = res.avatar || avatar;

      // 1. Update in HR employees cache
      if (typeof HR !== 'undefined' && Array.isArray(HR.employees)) {
        const target = HR.employees.find(e => e.id === empId);
        if (target) target.avatar = updatedAvatar;
      }

      // 2. Update if this is the authenticated user
      const isCurrentUser = (Auth.user?.employeeId === empId || Auth.employee?.id === empId);
      if (isCurrentUser) {
        if (Auth.employee) Auth.employee.avatar = updatedAvatar;
        const headerAvatar = document.getElementById('header-user-avatar');
        if (headerAvatar) headerAvatar.src = updatedAvatar;
        this.renderProfileDropdown();
      }

      // 3. Update active view if viewing employee profile
      if (typeof Employee !== 'undefined' && Employee.employeeData && Employee.employeeData.id === empId) {
        Employee.employeeData.avatar = updatedAvatar;
        if (typeof Employee.renderProfile === 'function') {
          Employee.renderProfile();
        }
      }

      // 4. Update HR views if in HR portal
      if (typeof HR !== 'undefined') {
        const viewModal = document.getElementById('modal-view-employee');
        if (viewModal && !viewModal.classList.contains('hidden') && typeof HR.openViewEmployeeModal === 'function') {
          HR.openViewEmployeeModal(empId);
        }
        if (typeof HR.renderProfile === 'function' && isCurrentUser) {
          HR.renderProfile();
        }
        if (HR.currentTab === 'employees' && typeof HR.renderActiveTab === 'function') {
          HR.renderActiveTab();
        }
      }

      this.closeModal('modal-change-avatar');
      this.toast('Profile image updated successfully!', 'success');
    } catch (err) {
      this.toast(err.message || 'Failed to update profile image', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `Save Photo`;
      }
    }
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
