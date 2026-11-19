// HR Administrator Modules & Views
const HR = {
  activeTab: 'overview',
  employees: [],
  leaves: [],
  attendance: [],
  announcements: [],
  departments: [],
  payslips: [],
  payrollFilter: 'all',
  leaveFilter: 'All',
  currentReviewLeaveId: null,

  async init() {
    await this.loadAllData();
    this.renderActiveTab();
  },

  async loadAllData() {
    try {
      const [empList, leaveList, attList, annList, deptList, payslipList] = await Promise.all([
        API.get('/employees'),
        API.get('/leaves'),
        API.get('/attendance'),
        API.get('/announcements'),
        API.get('/departments'),
        API.get('/payslips')
      ]);

      this.employees = empList;
      this.leaves = leaveList;
      this.attendance = attList;
      this.announcements = annList;
      this.departments = deptList;
      this.payslips = payslipList || [];
    } catch (err) {
      console.error('Failed to load HR data:', err);
      UI.toast('Could not refresh HR dataset', 'error');
    }
  },

  switchTab(tabName) {
    this.activeTab = tabName;
    document.querySelectorAll('#hr-view-container .tab-content').forEach(el => el.classList.add('hidden'));
    const tabEl = document.getElementById(`hr-tab-${tabName}`);
    if (tabEl) {
      tabEl.classList.remove('hidden');
    }
    this.renderActiveTab();
    const app = typeof App !== 'undefined' ? App : window.App;
    if (app && typeof app.setActiveNav === 'function') {
      app.setActiveNav(tabName);
    }
  },

  renderActiveTab() {
    switch (this.activeTab) {
      case 'overview':
        this.renderOverview();
        break;
      case 'employees':
        this.renderEmployees();
        break;
      case 'leaves':
        this.renderLeaves(this.leaveFilter);
        break;
      case 'attendance':
        this.renderAttendance();
        break;
      case 'payroll':
        this.renderPayroll();
        break;
      case 'announcements':
        this.renderAnnouncements();
        break;
      case 'profile':
        this.renderProfile();
        break;
    }
  },

  // ---------------- 1. HR OVERVIEW ----------------
  async renderOverview() {
    const container = document.getElementById('hr-tab-overview');
    if (!container) return;

    let stats = {
      totalEmployees: this.employees.length,
      presentToday: this.attendance.filter(a => a.clockIn).length,
      onLeaveToday: this.employees.filter(e => e.status === 'On Leave').length,
      pendingLeaves: this.leaves.filter(l => l.status === 'Pending').length,
      monthlyPayroll: Math.round(this.employees.reduce((acc, c) => acc + (c.salary || 0), 0) / 12)
    };

    try {
      stats = await API.get('/stats/hr');
    } catch (e) {}

    const pendingList = this.leaves.filter(l => l.status === 'Pending').slice(0, 5);

    container.innerHTML = `
      <!-- Welcome Banner -->
      <div class="bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-700 rounded-2xl p-6 sm:p-8 text-white shadow-xl shadow-indigo-600/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-medium text-indigo-100 mb-3 border border-white/15">
            <i class="fa-solid fa-sparkles text-amber-300"></i> Executive People Dashboard
          </div>
          <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight">Welcome, ${Auth.employee?.name || 'Administrator'}</h2>
          <p class="text-indigo-100 text-sm mt-1 max-w-xl">
            Here is your live workforce snapshot for today. You have <span class="font-bold underline text-amber-300">${stats.pendingLeaves} leave requests</span> waiting for review.
          </p>
        </div>
        <div class="flex flex-wrap gap-2.5 shrink-0">
          ${Auth.isHrAdmin ? `
            <button onclick="HR.openAddHrModal()" class="px-3.5 py-2.5 bg-purple-900/60 hover:bg-purple-900 text-purple-100 border border-purple-300/30 font-semibold rounded-xl text-xs sm:text-sm transition-all flex items-center gap-2">
              <i class="fa-solid fa-user-shield text-amber-300"></i> New HR Account
            </button>
          ` : ''}
          <button onclick="HR.openAddEmployeeModal()" class="px-4 py-2.5 bg-white text-indigo-700 hover:bg-indigo-50 font-semibold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-2">
            <i class="fa-solid fa-user-plus"></i> Add Employee
          </button>
          <button onclick="HR.switchTab('leaves')" class="px-4 py-2.5 bg-indigo-900/60 hover:bg-indigo-900 text-white border border-white/20 font-semibold rounded-xl text-xs sm:text-sm transition-all flex items-center gap-2">
            <i class="fa-solid fa-clipboard-check"></i> Review Leaves (${stats.pendingLeaves})
          </button>
        </div>
      </div>

      <!-- KPI Metrics Grid -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        
        <div class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div class="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl shrink-0">
            <i class="fa-solid fa-users"></i>
          </div>
          <div>
            <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Headcount</div>
            <div class="text-2xl font-extrabold text-slate-900">${stats.totalEmployees}</div>
            <div class="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
              <i class="fa-solid fa-arrow-trend-up"></i> 100% Active Directory
            </div>
          </div>
        </div>

        <div class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shrink-0">
            <i class="fa-solid fa-user-check"></i>
          </div>
          <div>
            <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Present Today</div>
            <div class="text-2xl font-extrabold text-slate-900">${stats.presentToday}</div>
            <div class="text-[11px] text-slate-500 font-medium mt-0.5">
              Clocked in & logged
            </div>
          </div>
        </div>

        <div class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div class="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl shrink-0">
            <i class="fa-solid fa-clock-rotate-left"></i>
          </div>
          <div>
            <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Leaves</div>
            <div class="text-2xl font-extrabold text-amber-600">${stats.pendingLeaves}</div>
            <div class="text-[11px] text-amber-600 font-medium mt-0.5">
              Awaiting your approval
            </div>
          </div>
        </div>

        <div class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div class="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center text-xl shrink-0">
            <i class="fa-solid fa-wallet"></i>
          </div>
          <div>
            <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Monthly Payroll</div>
            <div class="text-2xl font-extrabold text-slate-900">${UI.formatCurrency(stats.monthlyPayroll)}</div>
            <div class="text-[11px] text-slate-500 font-medium mt-0.5">
              Across ${this.departments.length} departments
            </div>
          </div>
        </div>

      </div>

      <!-- Main Overview Two-Column Sections -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <!-- Left Column: Pending Leaves & Recent Logs (8 cols) -->
        <div class="lg:col-span-8 space-y-6">
          
          <!-- Pending Leaves Widget -->
          <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div class="p-5 border-b border-slate-100 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div class="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                <h3 class="font-bold text-slate-900 text-sm">Action Required: Pending Leave Applications</h3>
              </div>
              <button onclick="HR.switchTab('leaves')" class="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                View All (${this.leaves.length}) &rarr;
              </button>
            </div>

            <div class="divide-y divide-slate-100">
              ${pendingList.length === 0 ? `
                <div class="p-8 text-center text-slate-400 text-sm">
                  <i class="fa-solid fa-circle-check text-emerald-500 text-3xl mb-2"></i>
                  <p>All caught up! No pending leave requests at this time.</p>
                </div>
              ` : pendingList.map(item => `
                <div class="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                  <div class="flex items-start gap-3.5">
                    <div class="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0">
                      ${item.employeeName.charAt(0)}
                    </div>
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="font-bold text-slate-900 text-sm">${item.employeeName}</span>
                        <span class="text-xs px-2 py-0.5 rounded-md font-medium bg-slate-100 text-slate-600">${item.department}</span>
                        <span class="text-xs px-2 py-0.5 rounded-md font-semibold bg-indigo-50 text-indigo-700">${item.leaveType}</span>
                      </div>
                      <p class="text-xs text-slate-600 mt-1">
                        <span class="font-medium text-slate-900">${UI.formatDate(item.startDate)}</span> to <span class="font-medium text-slate-900">${UI.formatDate(item.endDate)}</span> 
                        <span class="text-indigo-600 font-semibold">(${item.days} ${item.days === 1 ? 'day' : 'days'})</span>
                      </p>
                      <p class="text-xs text-slate-500 italic mt-0.5">"${item.reason}"</p>
                    </div>
                  </div>

                  <div class="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button onclick="HR.openReviewModal('${item.id}')" class="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200 transition-colors">
                      Review & Decide
                    </button>
                    <button onclick="HR.quickApproveLeave('${item.id}')" title="Quick Approve" class="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                      <i class="fa-solid fa-circle-check text-lg"></i>
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>



        </div>

        <!-- Right Column: Notice Board Bulletin (4 cols) -->
        <div class="lg:col-span-4 space-y-6">
          
          <!-- Bulletin Board -->
          <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div class="p-4 border-b border-slate-100 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <i class="fa-solid fa-bullhorn text-indigo-600 text-sm"></i>
                <h3 class="font-bold text-slate-900 text-sm">Notice Board</h3>
              </div>
              <button onclick="UI.openModal('modal-new-announcement')" class="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                + New
              </button>
            </div>
            <div class="p-4 space-y-3.5">
              ${this.announcements.map(ann => `
                <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 hover:border-indigo-200 transition-colors">
                  <div class="flex items-center justify-between text-[11px] mb-1.5">
                    <span class="px-2 py-0.5 rounded font-semibold ${ann.priority === 'High' ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-700'}">${ann.priority}</span>
                    <span class="text-slate-400">${UI.formatDate(ann.date)}</span>
                  </div>
                  <h4 class="text-xs font-bold text-slate-900 line-clamp-1">${ann.title}</h4>
                  <p class="text-xs text-slate-600 mt-1 line-clamp-2">${ann.content}</p>
                </div>
              `).join('')}
            </div>
          </div>



        </div>

      </div>
    `;
  },

  // ---------------- 2. HR EMPLOYEES DIRECTORY ----------------
  renderEmployees() {
    const container = document.getElementById('hr-tab-employees');
    if (!container) return;

    const existingQ = document.getElementById('employee-search-input')?.value || '';
    const existingDept = document.getElementById('employee-dept-filter')?.value || 'All';
    const existingType = document.getElementById('employee-type-filter')?.value || 'All';
    const existingStatus = document.getElementById('employee-status-filter')?.value || 'All';

    const defaultDepts = ['Engineering', 'Design', 'Product', 'Infrastructure', 'Human Resources', 'Marketing'];
    const empDepts = (this.employees || []).map(e => e.department).filter(Boolean);
    const allDepts = Array.from(new Set([...defaultDepts, ...empDepts]));

    container.innerHTML = `
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-slate-900">Employee Directory</h2>
          <p class="text-xs text-slate-500 mt-0.5">Manage workforce profiles, roles, departments, and credentials</p>
        </div>
        <div class="flex items-center gap-2">
          ${Auth.isHrAdmin ? `
            <button onclick="HR.openAddHrModal()" class="px-3.5 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-semibold rounded-xl text-xs sm:text-sm shadow-sm transition-all flex items-center gap-2">
              <i class="fa-solid fa-user-shield text-purple-600"></i>
              <span>New HR Account</span>
            </button>
          ` : ''}
          <button onclick="HR.openAddEmployeeModal()" class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm shadow-md shadow-indigo-600/20 flex items-center gap-2">
            <i class="fa-solid fa-user-plus text-xs"></i>
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      <!-- Filters & Search Toolbar -->
      <div class="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-3">
        <div class="relative flex-1">
          <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
          <input type="text" id="employee-search-input" oninput="HR.filterEmployees()" value="${existingQ}" placeholder="Search employee by name, title, or email..." 
                 class="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
        </div>
        <div class="flex flex-wrap gap-2">
          <select id="employee-dept-filter" onchange="HR.filterEmployees()" class="px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm bg-white focus:outline-none focus:border-indigo-500">
            <option value="All" ${existingDept === 'All' ? 'selected' : ''}>All Departments</option>
            ${allDepts.map(d => `<option value="${d}" ${existingDept.toLowerCase() === d.toLowerCase() ? 'selected' : ''}>${d}</option>`).join('')}
          </select>
          <select id="employee-type-filter" onchange="HR.filterEmployees()" class="px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm bg-white focus:outline-none focus:border-indigo-500">
            <option value="All" ${existingType === 'All' ? 'selected' : ''}>All Types</option>
            <option value="Full-Time" ${existingType === 'Full-Time' ? 'selected' : ''}>Full-Time</option>
            <option value="Part-Time" ${existingType === 'Part-Time' ? 'selected' : ''}>Part-Time</option>
            <option value="Contract" ${existingType === 'Contract' ? 'selected' : ''}>Contract</option>
            <option value="Intern" ${existingType === 'Intern' ? 'selected' : ''}>Intern</option>
          </select>
          <select id="employee-status-filter" onchange="HR.filterEmployees()" class="px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm bg-white focus:outline-none focus:border-indigo-500">
            <option value="All" ${existingStatus === 'All' ? 'selected' : ''}>All Statuses</option>
            <option value="Active" ${existingStatus === 'Active' ? 'selected' : ''}>Active</option>
            <option value="On Leave" ${existingStatus === 'On Leave' ? 'selected' : ''}>On Leave</option>
          </select>
        </div>
      </div>

      <!-- Employee List Table -->
      <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th class="px-5 py-3.5">Employee</th>
                <th class="px-5 py-3.5">Department & Type</th>
                <th class="px-5 py-3.5">Contact</th>
                <th class="px-5 py-3.5">Annual Salary</th>
                <th class="px-5 py-3.5 text-center">Status</th>
                <th class="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody id="employee-table-body" class="divide-y divide-slate-100 text-slate-700">
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.filterEmployees();
  },

  getEmploymentTypeBadge(type) {
    const val = type || 'Full-Time';
    switch (val.toLowerCase()) {
      case 'part-time':
        return `<span class="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-md bg-amber-50 text-amber-700 border border-amber-200">Part-Time</span>`;
      case 'contract':
        return `<span class="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-md bg-purple-50 text-purple-700 border border-purple-200">Contract</span>`;
      case 'intern':
        return `<span class="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">Intern</span>`;
      case 'full-time':
      default:
        return `<span class="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-md bg-blue-50 text-blue-700 border border-blue-200">Full-Time</span>`;
    }
  },

  renderEmployeeRows(list) {
    if (!list || list.length === 0) {
      return `<tr><td colspan="6" class="text-center py-8 text-slate-400 text-sm">No employees match your search criteria.</td></tr>`;
    }
    return list.map(emp => `
      <tr class="hover:bg-slate-50 transition-colors ${emp.status === 'Inactive' ? 'bg-slate-50/60 opacity-80' : ''}">
        <td class="px-5 py-4">
          <div class="flex items-center gap-3">
            <img src="${emp.avatar}" class="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200" alt="${emp.name}">
            <div>
              <div class="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span>${emp.name}</span>
                ${emp.status === 'Inactive' ? '<span class="text-[9px] bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded font-semibold uppercase">Deactivated</span>' : ''}
              </div>
              <div class="text-xs text-slate-500">${emp.jobTitle}</div>
              <div class="flex items-center gap-2 mt-1">
                <span class="text-[10px] text-slate-400 font-mono">ID: ${emp.id}</span>
                <span class="text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded font-mono border border-indigo-100 flex items-center gap-1">
                  <i class="fa-solid fa-fingerprint text-[9px]"></i> ${emp.biometricRef || ('BIO-' + emp.id)}
                </span>
              </div>
            </div>
          </div>
        </td>
        <td class="px-5 py-4">
          <div class="font-semibold text-slate-800 text-xs">${emp.department}</div>
          <div class="flex flex-wrap items-center gap-1 mt-1">
            ${this.getEmploymentTypeBadge(emp.employmentType)}
            ${(emp.isHrAdmin || emp.role === 'hr_admin' || (emp.role === 'hr' && (emp.id === 'EMP-001' || emp.email === 'hr@hrms.com'))) ? `
              <span class="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                👑 HR Administrator
              </span>
            ` : (emp.role === 'hr' ? `
              <span class="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                🛡️ HR Staff
              </span>
            ` : '')}
          </div>
        </td>
        <td class="px-5 py-4 text-xs">
          <div class="text-slate-800 font-medium">${emp.email}</div>
          <div class="text-slate-500 text-[11px] mt-0.5">${emp.phone || '--'}</div>
          <div class="text-slate-400 text-[11px]">${emp.location || '--'}</div>
        </td>
        <td class="px-5 py-4 font-mono font-semibold text-slate-900 text-xs">
          ${UI.formatCurrency(emp.salary)}
          <span class="text-[10px] text-slate-400 block font-sans font-normal">Joined ${UI.formatDate(emp.joinDate)}</span>
        </td>
        <td class="px-5 py-4 text-center">
          <span class="px-2.5 py-1 rounded-full text-xs font-semibold ${emp.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : (emp.status === 'Inactive' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-700 border border-amber-200')}">
            ${emp.status || 'Active'}
          </span>
        </td>
        <td class="px-5 py-4 text-right">
          <div class="inline-flex items-center gap-1.5">
            <button onclick="HR.openViewEmployeeModal('${emp.id}')" title="View Full Profile (EMP-009)" class="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200 transition-colors flex items-center gap-1">
              <i class="fa-solid fa-user-circle text-[11px]"></i> Profile
            </button>
            <button onclick="HR.openEditEmployeeModal('${emp.id}')" title="Edit Employee (EMP-008)" class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors flex items-center gap-1">
              <i class="fa-solid fa-pen text-[11px]"></i> Edit
            </button>
            <button onclick="HR.toggleEmployeeStatus('${emp.id}')" title="${emp.status === 'Inactive' ? 'Activate Employee' : 'Deactivate Employee'} (EMP-010)" class="px-2.5 py-1.5 ${emp.status === 'Inactive' ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'} text-xs font-semibold rounded-lg transition-colors flex items-center gap-1">
              <i class="fa-solid ${emp.status === 'Inactive' ? 'fa-user-check' : 'fa-user-slash'} text-[11px]"></i> ${emp.status === 'Inactive' ? 'Activate' : 'Deactivate'}
            </button>
            <button onclick="HR.viewPayslipForEmployee('${emp.id}')" title="View Latest Payslip" class="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg border border-slate-200 transition-colors">
              <i class="fa-solid fa-receipt text-[11px]"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  filterEmployees() {
    const q = (document.getElementById('employee-search-input')?.value || '').toLowerCase().trim();
    const dept = document.getElementById('employee-dept-filter')?.value || 'All';
    const type = document.getElementById('employee-type-filter')?.value || 'All';
    const status = document.getElementById('employee-status-filter')?.value || 'All';

    let filtered = (this.employees || []).filter(emp => {
      const matchesQ = !q || 
        (emp.name && emp.name.toLowerCase().includes(q)) || 
        (emp.email && emp.email.toLowerCase().includes(q)) || 
        (emp.jobTitle && emp.jobTitle.toLowerCase().includes(q)) ||
        (emp.id && emp.id.toLowerCase().includes(q));
      const matchesDept = dept === 'All' || (emp.department && emp.department.toLowerCase() === dept.toLowerCase());
      const matchesType = type === 'All' || ((emp.employmentType || 'Full-Time').toLowerCase() === type.toLowerCase());
      const matchesStatus = status === 'All' || (emp.status && emp.status.toLowerCase() === status.toLowerCase());
      return matchesQ && matchesDept && matchesType && matchesStatus;
    });

    const tbody = document.getElementById('employee-table-body');
    if (tbody) {
      tbody.innerHTML = this.renderEmployeeRows(filtered);
    } else {
      this.renderEmployees();
    }
  },

  setLeaveFilter(filter) {
    this.leaveFilter = filter;
    this.renderLeaves(this.leaveFilter);
  },

  // ---------------- 3. HR LEAVE MANAGEMENT ----------------
  renderLeaves(currentFilter = this.leaveFilter || 'All') {
    this.leaveFilter = currentFilter;
    const container = document.getElementById('hr-tab-leaves');
    if (!container) return;

    let filtered = [...this.leaves];
    if (this.leaveFilter !== 'All') {
      filtered = filtered.filter(l => l.status === this.leaveFilter);
    }

    const counts = {
      all: this.leaves.length,
      pending: this.leaves.filter(l => l.status === 'Pending').length,
      approved: this.leaves.filter(l => l.status === 'Approved').length,
      rejected: this.leaves.filter(l => l.status === 'Rejected').length
    };

    container.innerHTML = `
      <div>
        <h2 class="text-xl font-bold text-slate-900">Leave Requests Management</h2>
        <p class="text-xs text-slate-500 mt-0.5">Review, approve, or reject employee leave applications</p>
      </div>

      <!-- Filter Tabs -->
      <div class="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button onclick="HR.renderLeaves('All')" class="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${this.leaveFilter === 'All' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'}">
          All Requests (${counts.all})
        </button>
        <button onclick="HR.renderLeaves('Pending')" class="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${this.leaveFilter === 'Pending' ? 'bg-amber-500 text-white shadow-sm' : 'bg-white text-amber-700 hover:bg-amber-50'}">
          Pending Review (${counts.pending})
        </button>
        <button onclick="HR.renderLeaves('Approved')" class="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${this.leaveFilter === 'Approved' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-emerald-700 hover:bg-emerald-50'}">
          Approved (${counts.approved})
        </button>
        <button onclick="HR.renderLeaves('Rejected')" class="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${this.leaveFilter === 'Rejected' ? 'bg-rose-600 text-white shadow-sm' : 'bg-white text-rose-700 hover:bg-rose-50'}">
          Rejected (${counts.rejected})
        </button>
      </div>

      <!-- Leave Requests Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${filtered.length === 0 ? `
          <div class="col-span-2 bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200">
            <i class="fa-regular fa-folder-open text-4xl mb-3"></i>
            <p>No leave requests found in this category.</p>
          </div>
        ` : filtered.map(leave => `
          <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between gap-2 mb-3">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold px-2.5 py-1 rounded-lg ${leave.leaveType === 'Sick' ? 'bg-rose-50 text-rose-700 border border-rose-200' : (leave.leaveType === 'Annual' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-amber-50 text-amber-700 border border-amber-200')}">
                    ${leave.leaveType} Leave
                  </span>
                  <span class="text-xs text-slate-400 font-mono">#${leave.id}</span>
                </div>
                <span class="px-2.5 py-1 rounded-full text-xs font-bold ${leave.status === 'Pending' ? 'bg-amber-100 text-amber-800' : (leave.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800')}">
                  ${leave.status}
                </span>
              </div>

              <div class="mb-3">
                <h3 class="text-base font-bold text-slate-900">${leave.employeeName}</h3>
                <p class="text-xs text-slate-500">${leave.department}</p>
              </div>

              <div class="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-3 space-y-1 text-xs">
                <div class="flex items-center justify-between text-slate-600">
                  <span>Duration:</span>
                  <span class="font-bold text-slate-900">${UI.formatDate(leave.startDate)} &rarr; ${UI.formatDate(leave.endDate)} (${leave.days} ${leave.days === 1 ? 'day' : 'days'})</span>
                </div>
                <div class="flex items-center justify-between text-slate-600">
                  <span>Applied On:</span>
                  <span class="text-slate-800">${UI.formatDate(leave.appliedOn)}</span>
                </div>
              </div>

              <p class="text-xs text-slate-700 mb-4 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                <span class="font-semibold block text-slate-500 text-[10px] uppercase mb-0.5">Reason:</span>
                "${leave.reason}"
              </p>

              ${leave.reviewedBy ? `
                <div class="text-[11px] text-slate-500 border-t border-slate-100 pt-2 mb-3">
                  <span class="font-semibold">Reviewer:</span> ${leave.reviewedBy} ${leave.reviewComment ? `— "${leave.reviewComment}"` : ''}
                </div>
              ` : ''}
            </div>

            <!-- Action buttons for Pending -->
            ${leave.status === 'Pending' ? `
              <div class="flex items-center gap-2 pt-3 border-t border-slate-100">
                <button onclick="HR.openReviewModal('${leave.id}')" class="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5">
                  <i class="fa-solid fa-clipboard-check text-xs"></i> Review & Comment
                </button>
                <button onclick="HR.quickApproveLeave('${leave.id}')" class="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold transition-all">
                  Approve
                </button>
              </div>
            ` : `
              <div class="pt-3 border-t border-slate-100 text-right">
                <button onclick="HR.openReviewModal('${leave.id}')" class="text-xs text-slate-500 hover:text-indigo-600 font-medium">
                  Update Decision
                </button>
              </div>
            `}
          </div>
        `).join('')}
      </div>
    `;
  },

  // ---------------- 4. HR ATTENDANCE TRACKER (MODULE 2: ATT-001 to ATT-012) ----------------
  setAttendanceDate(date) {
    this.selectedAttendanceDate = date;
    this.renderAttendance();
  },

  setAttendanceFilter(filter) {
    this.attendanceFilter = filter;
    this.renderAttendance();
  },

  renderAttendance() {
    const container = document.getElementById('hr-tab-attendance');
    if (!container) return;

    const today = new Date().toISOString().split('T')[0];
    const selectedDate = this.selectedAttendanceDate || today;
    const activeFilter = this.attendanceFilter || 'all';

    const dayRecords = (this.attendance || []).filter(a => a.date === selectedDate);
    
    // Calculate stats
    const stats = {
      total: dayRecords.length,
      present: dayRecords.filter(a => a.status === 'Present').length,
      late: dayRecords.filter(a => a.isLate || a.status === 'Late').length,
      earlyDeparture: dayRecords.filter(a => a.isEarlyDeparture).length,
      missingPunches: dayRecords.filter(a => Boolean(a.missingPunch)).length,
      validated: dayRecords.filter(a => a.isValidated).length,
      pendingValidation: dayRecords.filter(a => !a.isValidated).length,
      corrected: dayRecords.filter(a => a.isCorrected).length
    };

    // Filter displayed records
    let displayed = [...dayRecords];
    if (activeFilter === 'pending') {
      displayed = displayed.filter(a => !a.isValidated);
    } else if (activeFilter === 'validated') {
      displayed = displayed.filter(a => a.isValidated);
    } else if (activeFilter === 'late') {
      displayed = displayed.filter(a => a.isLate || a.status === 'Late');
    } else if (activeFilter === 'early') {
      displayed = displayed.filter(a => a.isEarlyDeparture);
    } else if (activeFilter === 'missing') {
      displayed = displayed.filter(a => Boolean(a.missingPunch));
    } else if (activeFilter === 'corrected') {
      displayed = displayed.filter(a => a.isCorrected);
    }

    container.innerHTML = `
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-xl font-bold text-slate-900">Attendance & Biometrics Validation</h2>
            <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Module 2
            </span>
          </div>
          <p class="text-xs text-slate-500 mt-0.5">Daily HR validation, biometric device punch stream, and discrepancy audit trail</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <!-- Date Picker -->
          <div class="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-3 py-1.5 shadow-xs">
            <i class="fa-solid fa-calendar text-indigo-600 text-xs"></i>
            <input type="date" value="${selectedDate}" onchange="HR.setAttendanceDate(this.value)" class="text-xs font-semibold text-slate-700 focus:outline-none bg-transparent">
          </div>

          <button onclick="HR.syncBiometricData()" class="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs sm:text-sm border border-slate-300 shadow-xs flex items-center gap-1.5 transition-colors" title="Synchronize pending device punches">
            <i class="fa-solid fa-arrows-rotate text-xs text-indigo-600"></i>
            <span>Sync Biometrics (ATT-001)</span>
          </button>
          <button onclick="HR.openBiometricStreamModal()" class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs sm:text-sm border border-slate-200 shadow-xs flex items-center gap-1.5 transition-colors" title="Inspect raw device logs">
            <i class="fa-solid fa-fingerprint text-xs text-slate-600"></i>
            <span>Machine Logs (ATT-011)</span>
          </button>
          <button onclick="HR.openCorrectionRequestsModal()" class="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold rounded-xl text-xs sm:text-sm border border-amber-200 shadow-xs flex items-center gap-1.5 transition-colors">
            <i class="fa-solid fa-inbox text-xs text-amber-600"></i>
            <span>Requests</span>
          </button>
          <button onclick="HR.validateDayAttendance('${selectedDate}')" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-colors" title="Validate all clean records for this date">
            <i class="fa-solid fa-check-double text-xs"></i>
            <span>Validate Day (${stats.pendingValidation} Pending)</span>
          </button>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div class="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs">
          <div class="text-[10px] font-bold text-slate-400 uppercase">Total Logged</div>
          <div class="text-xl font-black text-slate-900 mt-0.5">${stats.total}</div>
          <div class="text-[10px] text-slate-500">Employees on date</div>
        </div>
        <div class="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs">
          <div class="text-[10px] font-bold text-emerald-600 uppercase">Present (Clean)</div>
          <div class="text-xl font-black text-emerald-600 mt-0.5">${stats.present}</div>
          <div class="text-[10px] text-slate-500">Full shift recorded</div>
        </div>
        <div class="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs">
          <div class="text-[10px] font-bold text-amber-600 uppercase">Late Arrivals</div>
          <div class="text-xl font-black text-amber-600 mt-0.5">${stats.late}</div>
          <div class="text-[10px] text-slate-500">In > 09:15 AM (ATT-006)</div>
        </div>
        <div class="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs">
          <div class="text-[10px] font-bold text-orange-600 uppercase">Early Departures</div>
          <div class="text-xl font-black text-orange-600 mt-0.5">${stats.earlyDeparture}</div>
          <div class="text-[10px] text-slate-500">Out < 05:30 PM (ATT-006)</div>
        </div>
        <div class="bg-white rounded-xl p-3.5 border ${stats.missingPunches > 0 ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200'} shadow-xs">
          <div class="text-[10px] font-bold text-rose-600 uppercase">Missing Punches</div>
          <div class="text-xl font-black text-rose-600 mt-0.5">${stats.missingPunches}</div>
          <div class="text-[10px] text-rose-600 font-semibold">BR-ATT-04 Held</div>
        </div>
        <div class="bg-white rounded-xl p-3.5 border ${stats.pendingValidation > 0 ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'} shadow-xs">
          <div class="text-[10px] font-bold text-indigo-600 uppercase">Validated by HR</div>
          <div class="text-xl font-black text-indigo-700 mt-0.5">${stats.validated} / ${stats.total}</div>
          <div class="text-[10px] text-slate-500">Payroll Eligible (BR-ATT-05)</div>
        </div>
      </div>

      <!-- Discrepancy & Validation Filter Tabs -->
      <div class="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-2 text-xs font-semibold">
        <button onclick="HR.setAttendanceFilter('all')" class="px-3 py-1.5 rounded-lg transition-colors ${activeFilter === 'all' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}">
          All Logs (${stats.total})
        </button>
        <button onclick="HR.setAttendanceFilter('pending')" class="px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${activeFilter === 'pending' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}">
          <span>Pending Validation</span>
          ${stats.pendingValidation > 0 ? `<span class="px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeFilter === 'pending' ? 'bg-amber-800 text-white' : 'bg-amber-100 text-amber-800'}">${stats.pendingValidation}</span>` : ''}
        </button>
        <button onclick="HR.setAttendanceFilter('validated')" class="px-3 py-1.5 rounded-lg transition-colors ${activeFilter === 'validated' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}">
          Validated (${stats.validated})
        </button>
        <button onclick="HR.setAttendanceFilter('missing')" class="px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${activeFilter === 'missing' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}">
          <span>Missing Punches (ATT-007)</span>
          ${stats.missingPunches > 0 ? `<span class="px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeFilter === 'missing' ? 'bg-rose-800 text-white' : 'bg-rose-100 text-rose-800'}">${stats.missingPunches}</span>` : ''}
        </button>
        <button onclick="HR.setAttendanceFilter('late')" class="px-3 py-1.5 rounded-lg transition-colors ${activeFilter === 'late' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}">
          Late Arrivals (${stats.late})
        </button>
        <button onclick="HR.setAttendanceFilter('early')" class="px-3 py-1.5 rounded-lg transition-colors ${activeFilter === 'early' ? 'bg-orange-500 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}">
          Early Departures (${stats.earlyDeparture})
        </button>
        <button onclick="HR.setAttendanceFilter('corrected')" class="px-3 py-1.5 rounded-lg transition-colors ${activeFilter === 'corrected' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}">
          Corrected (${stats.corrected})
        </button>
      </div>

      <!-- Attendance Table -->
      <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th class="px-5 py-3.5">Employee</th>
                <th class="px-5 py-3.5">Check In (Entry)</th>
                <th class="px-5 py-3.5">Check Out (Exit)</th>
                <th class="px-5 py-3.5">Daily Hours</th>
                <th class="px-5 py-3.5 text-center">Status & Discrepancies</th>
                <th class="px-5 py-3.5 text-center">HR Validation (ATT-009)</th>
                <th class="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-slate-700">
              ${displayed.length === 0 ? `
                <tr>
                  <td colspan="7" class="px-5 py-8 text-center text-xs text-slate-400">
                    No attendance records found for ${UI.formatDate(selectedDate)} matching this filter.
                  </td>
                </tr>
              ` : displayed.map(att => {
                const isMissing = Boolean(att.missingPunch);
                const isLate = att.isLate || att.status === 'Late';
                const isEarly = att.isEarlyDeparture;
                const isCorrected = att.isCorrected;
                const isValidated = att.isValidated;

                return `
                  <tr class="hover:bg-slate-50/80 transition-colors ${isMissing ? 'bg-rose-50/20' : (isLate ? 'bg-amber-50/15' : '')}">
                    <td class="px-5 py-3.5">
                      <div class="font-bold text-slate-900 text-xs">${att.employeeName}</div>
                      <div class="text-[11px] text-slate-500">${att.department || 'Staff'} • ${att.employeeId}</div>
                    </td>
                    <td class="px-5 py-3.5">
                      ${att.clockIn ? `
                        <div class="font-mono text-xs font-semibold ${isLate ? 'text-amber-700' : 'text-emerald-700'} flex items-center gap-1">
                          <i class="fa-regular fa-clock text-[10px]"></i>
                          <span>${att.clockIn}</span>
                        </div>
                        ${isLate ? `<span class="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200 mt-0.5">Late Arrival</span>` : ''}
                      ` : `
                        <span class="text-rose-600 font-semibold text-xs flex items-center gap-1">
                          <i class="fa-solid fa-triangle-exclamation text-[10px]"></i> Missing Entry
                        </span>
                      `}
                    </td>
                    <td class="px-5 py-3.5">
                      ${att.clockOut ? `
                        <div class="font-mono text-xs font-semibold ${isEarly ? 'text-orange-700' : 'text-slate-700'} flex items-center gap-1">
                          <i class="fa-regular fa-clock text-[10px]"></i>
                          <span>${att.clockOut}</span>
                        </div>
                        ${isEarly ? `<span class="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-orange-100 text-orange-800 border border-orange-200 mt-0.5">Early Departure</span>` : ''}
                      ` : `
                        <span class="text-rose-600 font-semibold text-xs flex items-center gap-1">
                          <i class="fa-solid fa-triangle-exclamation text-[10px]"></i> Missing Exit
                        </span>
                      `}
                    </td>
                    <td class="px-5 py-3.5 font-mono text-xs font-bold text-slate-800">
                      ${typeof att.totalHours === 'number' ? `${att.totalHours} hrs` : (att.totalHours ? `${att.totalHours} hrs` : '--')}
                      ${isCorrected ? `<span class="text-[10px] text-purple-600 font-sans font-normal block">Adjusted</span>` : ''}
                    </td>
                    <td class="px-5 py-3.5 text-center">
                      <div class="flex flex-col items-center gap-1">
                        <span class="px-2.5 py-0.5 rounded-full text-xs font-bold ${att.status === 'Present' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : (att.status === 'Late' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-rose-50 text-rose-700 border border-rose-200')}">
                          ${att.status}
                        </span>
                        ${isCorrected ? `
                          <span class="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200" title="Reason: ${att.correctionReason}">
                            <i class="fa-solid fa-pen-to-square text-[9px]"></i> Corrected (ATT-010)
                          </span>
                        ` : ''}
                      </div>
                    </td>
                    <td class="px-5 py-3.5 text-center">
                      ${isValidated ? `
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <i class="fa-solid fa-circle-check text-[9px]"></i> Validated
                        </span>
                        <div class="text-[9px] text-slate-400 mt-0.5">${att.validatedBy || 'HR Admin'}</div>
                      ` : `
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <i class="fa-solid fa-clock text-[9px]"></i> Pending
                        </span>
                        <div class="text-[9px] text-amber-600/80 mt-0.5">Held from Payroll</div>
                      `}
                    </td>
                    <td class="px-5 py-3.5 text-right">
                      <div class="inline-flex items-center gap-1.5">
                        ${!isValidated ? `
                          <button onclick="HR.validateAttendance('${att.id}')" title="Validate attendance record (ATT-009)" class="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1">
                            <i class="fa-solid fa-check text-[11px]"></i> Validate
                          </button>
                        ` : ''}
                        <button onclick="HR.openCorrectAttendanceModal('${att.id}')" title="Correct attendance discrepancy (ATT-010, BR-ATT-03)" class="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold rounded-lg border border-amber-200 transition-colors flex items-center gap-1">
                          <i class="fa-solid fa-user-pen text-[11px]"></i> Correct
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  // ---------------- 5. HR PAYROLL & COMPENSATION ----------------
  setPayrollFilter(filter) {
    this.payrollFilter = filter;
    this.renderPayroll();
  },

  renderPayroll() {
    const container = document.getElementById('hr-tab-payroll');
    if (!container) return;

    const totalAnnual = this.employees.reduce((acc, c) => acc + (c.salary || 0), 0);
    const monthlyPool = Math.round(totalAnnual / 12);
    const pendingSlips = (this.payslips || []).filter(p => p.status === 'Pending Approval');
    const approvedSlips = (this.payslips || []).filter(p => p.status === 'Approved' || p.status === 'Paid');
    const totalLopDeductions = (this.payslips || []).reduce((acc, p) => acc + (p.deductions?.attendanceDeduction || p.deductions?.lossOfPay || 0), 0);

    const activeFilter = this.payrollFilter || 'all';
    let displayedSlips = [...(this.payslips || [])];
    if (activeFilter === 'pending') {
      displayedSlips = pendingSlips;
    } else if (activeFilter === 'approved') {
      displayedSlips = approvedSlips;
    }

    container.innerHTML = `
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-slate-900">Payroll & Salary Slips Review</h2>
          <p class="text-xs text-slate-500 mt-0.5">Review monthly compensation, verified attendance deductions (LOP), and release statements to employees</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button onclick="HR.openSalaryStructuresModal()" class="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs sm:text-sm border border-slate-300 shadow-xs flex items-center gap-2 transition-colors">
            <i class="fa-solid fa-layer-group text-xs text-indigo-600"></i>
            <span>Salary Structures (PAY-001)</span>
          </button>
          <button onclick="HR.recalculateAttendancePayroll()" class="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-xl text-xs sm:text-sm border border-indigo-200 shadow-xs flex items-center gap-2 transition-colors">
            <i class="fa-solid fa-arrows-rotate text-xs"></i>
            <span>Recalculate with Attendance</span>
          </button>
          <button onclick="HR.finalizePayrollCycle('November', 2026)" class="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-md shadow-purple-600/20 flex items-center gap-2 transition-colors">
            <i class="fa-solid fa-lock text-xs"></i>
            <span>Finalize Cycle (PAY-010)</span>
          </button>
          ${pendingSlips.length > 0 ? `
            <button onclick="HR.approveAllPending()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-colors">
              <i class="fa-solid fa-check-double text-xs"></i>
              <span>Approve All (${pendingSlips.length})</span>
            </button>
          ` : `
            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <i class="fa-solid fa-circle-check"></i> All Slips Up to Date
            </span>
          `}
        </div>
      </div>

      <!-- Payroll Summary KPI -->
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Estimated Monthly Outflow</div>
          <div class="text-2xl font-extrabold text-indigo-600 mt-1">${UI.formatCurrency(monthlyPool)}</div>
          <div class="text-[11px] text-slate-500 mt-0.5">Across ${this.employees.length} active employees</div>
        </div>
        <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div class="text-xs font-semibold text-rose-600 uppercase tracking-wider">Attendance Deductions (LOP)</div>
          <div class="text-2xl font-extrabold text-rose-600 mt-1">-${UI.formatCurrency(totalLopDeductions)}</div>
          <div class="text-[11px] text-slate-500 mt-0.5">Applied from attendance & leaves</div>
        </div>
        <div class="bg-white rounded-2xl p-5 border ${pendingSlips.length > 0 ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200'} shadow-sm">
          <div class="flex items-center justify-between">
            <div class="text-xs font-semibold text-amber-700 uppercase tracking-wider">Pending HR Approval</div>
            ${pendingSlips.length > 0 ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">Action Required</span>` : ''}
          </div>
          <div class="text-2xl font-extrabold ${pendingSlips.length > 0 ? 'text-amber-700' : 'text-slate-800'} mt-1">${pendingSlips.length} Statements</div>
          <div class="text-[11px] text-slate-500 mt-0.5">Hidden from employees until approved</div>
        </div>
        <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Approved & Released</div>
          <div class="text-2xl font-extrabold text-emerald-600 mt-1">${approvedSlips.length} Statements</div>
          <div class="text-[11px] text-slate-500 mt-0.5">Visible in employee self-service</div>
        </div>
      </div>

      <!-- Filter Tabs -->
      <div class="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-semibold">
        <button onclick="HR.setPayrollFilter('all')" class="px-3.5 py-1.5 rounded-lg transition-colors ${activeFilter === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}">
          All Slips (${(this.payslips || []).length})
        </button>
        <button onclick="HR.setPayrollFilter('pending')" class="px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${activeFilter === 'pending' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}">
          <span>Pending Review</span>
          ${pendingSlips.length > 0 ? `<span class="px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeFilter === 'pending' ? 'bg-amber-800 text-white' : 'bg-amber-100 text-amber-800'}">${pendingSlips.length}</span>` : ''}
        </button>
        <button onclick="HR.setPayrollFilter('approved')" class="px-3.5 py-1.5 rounded-lg transition-colors ${activeFilter === 'approved' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}">
          Approved & Released (${approvedSlips.length})
        </button>
      </div>

      <!-- Compensation & Slips Table -->
      <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th class="px-5 py-3.5">Employee</th>
                <th class="px-5 py-3.5">Pay Period</th>
                <th class="px-5 py-3.5">Salary</th>
                <th class="px-5 py-3.5">LOP Deduction</th>
                <th class="px-5 py-3.5">Net Disbursed</th>
                <th class="px-5 py-3.5 text-center">Visibility Status</th>
                <th class="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-slate-700">
              ${displayedSlips.length === 0 ? `
                <tr>
                  <td colspan="7" class="px-5 py-8 text-center text-xs text-slate-500">
                    No payslips found matching this filter.
                  </td>
                </tr>
              ` : displayedSlips.map(slip => {
                const emp = this.employees.find(e => e.id === slip.employeeId) || { name: slip.employeeName || slip.employeeId, jobTitle: 'Staff' };
                const isPending = slip.status === 'Pending Approval';
                const isFinalized = slip.status === 'Finalized';
                const lopAmount = slip.deductions?.attendanceDeduction || slip.deductions?.lossOfPay || (slip.totalDeductions !== undefined ? slip.totalDeductions : 0);
                const lopDays = slip.attendanceSummary?.lopDays || (lopAmount > 0 ? 1 : 0);
                const payableDays = slip.attendanceSummary?.payableDays;
                const salary = slip.baseSalary || slip.grossPay || 0;
                const netPay = slip.netPay !== undefined ? slip.netPay : (salary - lopAmount);
                return `
                  <tr class="hover:bg-slate-50/80 transition-colors ${isPending ? 'bg-amber-50/20' : (isFinalized ? 'bg-purple-50/10' : '')}">
                    <td class="px-5 py-3.5">
                      <div class="font-bold text-slate-900">${emp.name}</div>
                      <div class="text-[11px] text-slate-500">${emp.jobTitle} • ${slip.employeeId}</div>
                      ${slip.salaryStructureName ? `<div class="mt-0.5"><span class="text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded font-semibold border border-indigo-100">${slip.salaryStructureName}</span></div>` : ''}
                    </td>
                    <td class="px-5 py-3.5">
                      <div class="font-semibold text-slate-800 text-xs">${slip.month} ${slip.year}</div>
                      <div class="text-[10px] text-slate-400">Pay Date: ${UI.formatDate(slip.payDate)}</div>
                      ${payableDays !== undefined ? `<div class="text-[10px] text-emerald-600 font-medium mt-0.5">${payableDays} Payable Days</div>` : ''}
                    </td>
                    <td class="px-5 py-3.5 font-mono text-xs text-slate-900 font-medium">${UI.formatCurrency(salary)}</td>
                    <td class="px-5 py-3.5">
                      <div class="font-mono text-xs text-rose-600 font-semibold">${lopAmount > 0 ? `-${UI.formatCurrency(lopAmount)}` : '₹0'}</div>
                      ${lopAmount > 0 ? `
                        <div class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 mt-0.5">
                          <i class="fa-solid fa-clock-rotate-left text-[9px]"></i>
                          <span>LOP: -${UI.formatCurrency(lopAmount)}</span>
                          <span class="text-rose-500 font-normal">(${lopDays}d)</span>
                        </div>
                      ` : `
                        <div class="text-[10px] text-emerald-600 mt-0.5 font-medium">₹0 LOP (100% Present)</div>
                      `}
                    </td>
                    <td class="px-5 py-3.5 font-mono text-xs font-bold text-emerald-600">${UI.formatCurrency(netPay)}</td>
                    <td class="px-5 py-3.5 text-center">
                      ${isFinalized ? `
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                          <i class="fa-solid fa-lock text-[10px]"></i> Finalized & Locked
                        </span>
                        <div class="text-[10px] text-purple-700/80 mt-0.5">${slip.finalizedBy || 'Finance/HR'}</div>
                      ` : isPending ? `
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <i class="fa-solid fa-clock text-[10px]"></i> Pending Approval
                        </span>
                        <div class="text-[10px] text-amber-600/80 mt-0.5">Hidden from employee</div>
                      ` : `
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <i class="fa-solid fa-circle-check text-[10px]"></i> Approved
                        </span>
                        <div class="text-[10px] text-emerald-600/80 mt-0.5">Visible to employee</div>
                      `}
                    </td>
                    <td class="px-5 py-3.5 text-right">
                      <div class="inline-flex items-center gap-2">
                        <button onclick="HR.viewPayslip('${slip.id}')" class="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200 transition-colors flex items-center gap-1">
                          <i class="fa-solid fa-eye text-[11px]"></i> View Slip
                        </button>
                        ${isPending ? `
                          <button onclick="HR.approvePayslip('${slip.id}')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1 transition-colors">
                            <i class="fa-solid fa-check text-[11px]"></i> Approve
                          </button>
                        ` : ''}
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  // ---------------- 6. HR ANNOUNCEMENTS ----------------
  renderAnnouncements() {
    const container = document.getElementById('hr-tab-announcements');
    if (!container) return;

    container.innerHTML = `
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-slate-900">Company Announcements & Bulletins</h2>
          <p class="text-xs text-slate-500 mt-0.5">Publish organizational updates, policy changes, and events</p>
        </div>
        <button onclick="UI.openModal('modal-new-announcement')" class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm shadow-md shadow-indigo-600/20 flex items-center gap-2">
          <i class="fa-solid fa-plus text-xs"></i>
          <span>New Announcement</span>
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${this.announcements.map(ann => `
          <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between gap-2 mb-3">
                <span class="px-2.5 py-1 rounded-md text-xs font-bold ${ann.priority === 'High' ? 'bg-rose-100 text-rose-800' : (ann.priority === 'Important' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700')}">
                  ${ann.priority} Priority
                </span>
                <span class="text-xs text-slate-400">${UI.formatDate(ann.date)}</span>
              </div>
              <h3 class="text-base font-bold text-slate-900 mb-2">${ann.title}</h3>
              <p class="text-xs text-slate-600 leading-relaxed mb-4">${ann.content}</p>
            </div>
            <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span>Category: <strong class="text-slate-600">${ann.category}</strong></span>
              <span>Author: <strong class="text-slate-600">${ann.author}</strong></span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  // ---------------- ACTIONS & MODALS ----------------
  openAddEmployeeModal() {
    const form = document.getElementById('form-add-employee');
    if (form) form.reset();

    // 1. Role is strictly Standard Employee: HR option completely removed
    const roleInput = document.getElementById('modal-employee-role');
    if (roleInput) roleInput.value = 'employee';

    // 2. Default employment type to Full-Time
    const typeSelect = document.getElementById('modal-employee-employment-type');
    if (typeSelect) typeSelect.value = 'Full-Time';

    // 3. Department: Hide Human Resources department for standard employee
    const deptHrOption = document.getElementById('dept-option-hr');
    if (deptHrOption) deptHrOption.style.display = 'none';
    const deptSelect = document.getElementById('modal-employee-department');
    if (deptSelect && (deptSelect.value === 'Human Resources' || !deptSelect.value)) {
      deptSelect.value = 'Engineering';
    }

    // 4. Job title placeholder
    const jobTitleInput = document.querySelector('#modal-add-employee input[name="jobTitle"]');
    if (jobTitleInput) jobTitleInput.placeholder = 'e.g. Backend Engineer';

    // 5. Modal header & Icon
    const icon = document.getElementById('modal-employee-icon');
    if (icon) {
      icon.className = 'w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm';
      icon.innerHTML = `<i class="fa-solid fa-user-plus"></i>`;
    }
    const title = document.getElementById('modal-employee-title');
    if (title) title.textContent = 'Add New Employee';
    const subtitle = document.getElementById('modal-employee-subtitle');
    if (subtitle) subtitle.textContent = 'Standard employee profile and login credentials will be created';

    // 6. Submit button
    const submitBtn = document.getElementById('modal-employee-submit-btn');
    if (submitBtn) {
      submitBtn.className = 'px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm shadow-md shadow-indigo-600/20 transition-colors';
      submitBtn.textContent = 'Save Employee';
    }

    // 7. Hide banner
    const banner = document.getElementById('role-access-banner');
    if (banner) {
      banner.className = 'hidden';
      banner.innerHTML = '';
    }

    // 8. Default leave quota allocation (Annual 20, Sick 10, Casual 5)
    const addAnnual = document.getElementById('add-employee-leave-annual');
    if (addAnnual) addAnnual.value = 20;
    const addSick = document.getElementById('add-employee-leave-sick');
    if (addSick) addSick.value = 10;
    const addCasual = document.getElementById('add-employee-leave-casual');
    if (addCasual) addCasual.value = 5;

    UI.openModal('modal-add-employee');
  },

  openAddHrModal() {
    if (!Auth.isHrAdmin) {
      UI.toast('Access Denied: Only the HR Admin can create a new HR account.', 'error');
      return;
    }

    const form = document.getElementById('form-add-employee');
    if (form) form.reset();

    // 1. Role is strictly FIXED on HR: Cannot be changed to employee!
    const roleInput = document.getElementById('modal-employee-role');
    if (roleInput) roleInput.value = 'hr';

    // 2. Default employment type to Full-Time
    const typeSelect = document.getElementById('modal-employee-employment-type');
    if (typeSelect) typeSelect.value = 'Full-Time';

    // 3. Department: Enable and select Human Resources
    const deptHrOption = document.getElementById('dept-option-hr');
    if (deptHrOption) deptHrOption.style.display = 'block';
    const deptSelect = document.getElementById('modal-employee-department');
    if (deptSelect) deptSelect.value = 'Human Resources';

    // 4. Job title default
    const jobTitleInput = document.querySelector('#modal-add-employee input[name="jobTitle"]');
    if (jobTitleInput) jobTitleInput.value = 'HR Specialist';

    // 5. Modal header & Icon
    const icon = document.getElementById('modal-employee-icon');
    if (icon) {
      icon.className = 'w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center text-sm';
      icon.innerHTML = `<i class="fa-solid fa-user-shield"></i>`;
    }
    const title = document.getElementById('modal-employee-title');
    if (title) title.textContent = 'Create New HR Account';
    const subtitle = document.getElementById('modal-employee-subtitle');
    if (subtitle) subtitle.textContent = 'Provision a new HR account with management credentials (HR Admin Only)';

    // 6. Submit button
    const submitBtn = document.getElementById('modal-employee-submit-btn');
    if (submitBtn) {
      submitBtn.className = 'px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl text-sm shadow-md shadow-purple-600/20 transition-colors';
      submitBtn.textContent = 'Create HR Account';
    }

    // 7. Show confirmation banner
    const banner = document.getElementById('role-access-banner');
    if (banner) {
      banner.className = 'col-span-2 p-3.5 rounded-xl border border-purple-200 bg-purple-50 text-purple-900 text-xs flex items-start gap-2.5';
      banner.innerHTML = `
        <i class="fa-solid fa-shield-halved text-purple-600 text-base mt-0.5 shrink-0"></i>
        <div>
          <div class="font-bold text-purple-900">Provisioning HR Account (HR Admin Authorized)</div>
          <div class="text-purple-700 text-[11px] mt-0.5">This user will be created with fixed HR privileges to review attendance, leaves, payroll, and publish announcements.</div>
        </div>
      `;
    }

    // 8. Default HR leave quota allocation (Annual 22, Sick 12, Casual 6)
    const addAnnual = document.getElementById('add-employee-leave-annual');
    if (addAnnual) addAnnual.value = 22;
    const addSick = document.getElementById('add-employee-leave-sick');
    if (addSick) addSick.value = 12;
    const addCasual = document.getElementById('add-employee-leave-casual');
    if (addCasual) addCasual.value = 6;

    UI.openModal('modal-add-employee');
  },

  async submitNewEmployee(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const role = formData.get('role');

    // Strict client-side check
    if ((role === 'hr' || role === 'hr_admin') && !Auth.isHrAdmin) {
      UI.toast('Permission Denied: Only the HR Admin can create a new HR account.', 'error');
      return;
    }

    const isHr = role === 'hr' || role === 'hr_admin';
    const defaultAnnual = isHr ? 22 : 20;
    const defaultSick = isHr ? 12 : 10;
    const defaultCasual = isHr ? 6 : 5;

    const annualVal = formData.get('leaveAnnualTotal');
    const sickVal = formData.get('leaveSickTotal');
    const casualVal = formData.get('leaveCasualTotal');

    const body = {
      name: formData.get('name'),
      email: formData.get('email'),
      jobTitle: formData.get('jobTitle'),
      department: formData.get('department'),
      role: formData.get('role'),
      employmentType: formData.get('employmentType') || 'Full-Time',
      salary: formData.get('salary'),
      joinDate: formData.get('joinDate') || new Date().toISOString().split('T')[0],
      biometricRef: formData.get('biometricRef') || '',
      salaryStructureId: formData.get('salaryStructureId') || 'STR-001',
      phone: formData.get('phone'),
      location: formData.get('location'),
      leaveBalances: {
        annual: { total: (annualVal !== null && annualVal !== '') ? Math.max(0, parseInt(annualVal, 10)) : defaultAnnual, used: 0 },
        sick: { total: (sickVal !== null && sickVal !== '') ? Math.max(0, parseInt(sickVal, 10)) : defaultSick, used: 0 },
        casual: { total: (casualVal !== null && casualVal !== '') ? Math.max(0, parseInt(casualVal, 10)) : defaultCasual, used: 0 }
      }
    };

    try {
      const created = await API.post('/employees', body);
      const isHrCreated = created.role === 'hr' || created.role === 'hr_admin';
      UI.toast(`${isHrCreated ? 'HR Account' : 'Employee'} for ${created.name} created successfully! Login credentials activated.`, 'success');
      UI.closeModal('modal-add-employee');
      form.reset();
      await this.loadAllData();
      this.renderActiveTab();
    } catch (err) {
      UI.toast(err.message || 'Failed to add employee', 'error');
    }
  },

  // EMP-009: View detailed employee profile modal
  async openViewEmployeeModal(empId) {
    try {
      const emp = await API.get(`/employees/${empId}`);
      const content = document.getElementById('view-employee-content');
      if (!content) return;

      const struct = emp.salaryStructure || {
        name: 'Standard Corporate Structure',
        basicPercentage: 50,
        hraPercentage: 30,
        specialAllowancePercentage: 15,
        conveyanceFixed: 1600,
        pfPercentage: 12,
        taxPercentage: 10,
        healthInsuranceFixed: 1200
      };

      const monthly = Math.round((emp.salary || 0) / 12);
      const basic = Math.round(monthly * (struct.basicPercentage / 100));
      const hra = Math.round(monthly * (struct.hraPercentage / 100));
      const special = Math.round(monthly * (struct.specialAllowancePercentage / 100));
      const conveyance = struct.conveyanceFixed || 1600;

      const balances = emp.leaveBalances || {
        annual: { total: 20, used: 0 },
        sick: { total: 10, used: 0 },
        casual: { total: 5, used: 0 }
      };

      const isInactive = emp.status === 'Inactive';

      content.innerHTML = `
        <div class="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <img src="${emp.avatar}" class="w-12 h-12 rounded-full object-cover ring-2 ring-indigo-500/20" alt="${emp.name}">
            <div>
              <div class="flex items-center gap-2">
                <h3 class="font-bold text-slate-900 text-lg">${emp.name}</h3>
                <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold ${isInactive ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}">
                  ${emp.status || 'Active'}
                </span>
              </div>
              <p class="text-xs text-slate-500">${emp.jobTitle} • ${emp.department}</p>
            </div>
          </div>
          <button onclick="UI.closeModal('modal-view-employee')" class="text-slate-400 hover:text-slate-600">
            <i class="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <div class="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          <!-- Identifiers Grid -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <div class="text-[11px] font-semibold text-slate-400 uppercase">Employee ID</div>
              <div class="font-mono font-bold text-slate-800 text-sm mt-0.5">${emp.id}</div>
            </div>
            <div>
              <div class="text-[11px] font-semibold text-slate-400 uppercase">Biometric Ref</div>
              <div class="font-mono font-bold text-indigo-700 text-sm mt-0.5 flex items-center gap-1">
                <i class="fa-solid fa-fingerprint text-xs"></i>
                <span>${emp.biometricRef || ('BIO-' + emp.id)}</span>
              </div>
            </div>
            <div>
              <div class="text-[11px] font-semibold text-slate-400 uppercase">Joining Date</div>
              <div class="font-semibold text-slate-800 text-sm mt-0.5">${UI.formatDate(emp.joinDate)}</div>
            </div>
            <div>
              <div class="text-[11px] font-semibold text-slate-400 uppercase">Employment Type</div>
              <div class="font-semibold text-slate-800 text-sm mt-0.5">${emp.employmentType || 'Full-Time'}</div>
            </div>
          </div>

          <!-- Contact Details -->
          <div>
            <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">Contact & Location</h4>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="p-3 bg-white rounded-xl border border-slate-200">
                <div class="text-[11px] text-slate-500">Work Email</div>
                <div class="font-semibold text-slate-900 text-xs mt-0.5 truncate">${emp.email}</div>
              </div>
              <div class="p-3 bg-white rounded-xl border border-slate-200">
                <div class="text-[11px] text-slate-500">Phone Number</div>
                <div class="font-semibold text-slate-900 text-xs mt-0.5">${emp.phone || '--'}</div>
              </div>
              <div class="p-3 bg-white rounded-xl border border-slate-200">
                <div class="text-[11px] text-slate-500">Location</div>
                <div class="font-semibold text-slate-900 text-xs mt-0.5">${emp.location || '--'}</div>
              </div>
            </div>
          </div>

          <!-- Salary -->
          <div>
            <div class="flex items-center justify-between mb-2.5">
              <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Salary</h4>
            </div>
            <div class="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
              <span class="text-xs text-slate-500 font-medium">Salary</span>
              <span class="text-sm font-extrabold text-emerald-700 font-mono">${UI.formatCurrency(emp.salary)}</span>
            </div>
          </div>

          <!-- Leave Balances -->
          <div>
            <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">Leave Balances</h4>
            <div class="grid grid-cols-3 gap-3">
              <div class="p-3 bg-white rounded-xl border border-slate-200 text-center">
                <div class="text-[11px] font-bold text-indigo-700">Annual Leave</div>
                <div class="text-lg font-bold text-slate-900 mt-1">${(balances.annual?.total || 20) - (balances.annual?.used || 0)}</div>
                <div class="text-[10px] text-slate-400">of ${balances.annual?.total || 20} available</div>
              </div>
              <div class="p-3 bg-white rounded-xl border border-slate-200 text-center">
                <div class="text-[11px] font-bold text-rose-700">Sick Leave</div>
                <div class="text-lg font-bold text-slate-900 mt-1">${(balances.sick?.total || 10) - (balances.sick?.used || 0)}</div>
                <div class="text-[10px] text-slate-400">of ${balances.sick?.total || 10} available</div>
              </div>
              <div class="p-3 bg-white rounded-xl border border-slate-200 text-center">
                <div class="text-[11px] font-bold text-amber-700">Casual Leave</div>
                <div class="text-lg font-bold text-slate-900 mt-1">${(balances.casual?.total || 5) - (balances.casual?.used || 0)}</div>
                <div class="text-[10px] text-slate-400">of ${balances.casual?.total || 5} available</div>
              </div>
            </div>
          </div>
        </div>

        <div class="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <button onclick="UI.closeModal('modal-view-employee'); HR.openEditEmployeeModal('${emp.id}')" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors">
              <i class="fa-solid fa-user-pen"></i> Edit Profile
            </button>
            <button onclick="HR.toggleEmployeeStatus('${emp.id}')" class="px-4 py-2 ${isInactive ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'} rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5">
              <i class="fa-solid ${isInactive ? 'fa-user-check' : 'fa-user-slash'}"></i> ${isInactive ? 'Activate Account' : 'Deactivate Employee'}
            </button>
          </div>
          <button onclick="UI.closeModal('modal-view-employee')" class="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold">
            Close
          </button>
        </div>
      `;

      UI.openModal('modal-view-employee');
    } catch (err) {
      UI.toast(err.message || 'Could not load employee profile', 'error');
    }
  },

  // EMP-008: Open edit employee modal
  async openEditEmployeeModal(empId) {
    let emp = this.employees.find(e => e.id === empId);
    if (!emp) {
      try {
        emp = await API.get(`/employees/${empId}`);
      } catch (e) {
        UI.toast('Could not find employee', 'error');
        return;
      }
    }

    document.getElementById('edit-employee-id').value = emp.id;
    document.getElementById('edit-employee-name').value = emp.name || '';
    document.getElementById('edit-employee-email').value = emp.email || '';
    document.getElementById('edit-employee-title').value = emp.jobTitle || '';
    document.getElementById('edit-employee-department').value = emp.department || 'Engineering';
    document.getElementById('edit-employee-employment-type').value = emp.employmentType || 'Full-Time';
    document.getElementById('edit-employee-salary').value = emp.salary || '';
    document.getElementById('edit-employee-join-date').value = emp.joinDate || new Date().toISOString().split('T')[0];
    document.getElementById('edit-employee-biometric-ref').value = emp.biometricRef || `BIO-${emp.id}`;
    document.getElementById('edit-employee-salary-structure').value = emp.salaryStructureId || 'STR-001';
    document.getElementById('edit-employee-status').value = emp.status || 'Active';
    document.getElementById('edit-employee-phone').value = emp.phone || '';
    document.getElementById('edit-employee-location').value = emp.location || '';

    // Populate Leave Allocations (Default: Annual 20, Sick 10, Casual 5; or HR 22, 12, 6)
    const balances = emp.leaveBalances || {
      annual: { total: 20, used: 0 },
      sick: { total: 10, used: 0 },
      casual: { total: 5, used: 0 }
    };

    const isHr = emp.role === 'hr' || emp.role === 'hr_admin' || emp.isHrAdmin;
    const defaultAnnual = isHr ? 22 : 20;
    const defaultSick = isHr ? 12 : 10;
    const defaultCasual = isHr ? 6 : 5;

    const annualTotal = (balances.annual && typeof balances.annual.total === 'number') ? balances.annual.total : defaultAnnual;
    const sickTotal = (balances.sick && typeof balances.sick.total === 'number') ? balances.sick.total : defaultSick;
    const casualTotal = (balances.casual && typeof balances.casual.total === 'number') ? balances.casual.total : defaultCasual;

    const annualUsed = (balances.annual && typeof balances.annual.used === 'number') ? balances.annual.used : 0;
    const sickUsed = (balances.sick && typeof balances.sick.used === 'number') ? balances.sick.used : 0;
    const casualUsed = (balances.casual && typeof balances.casual.used === 'number') ? balances.casual.used : 0;

    const annualInput = document.getElementById('edit-employee-leave-annual');
    if (annualInput) annualInput.value = annualTotal;
    const sickInput = document.getElementById('edit-employee-leave-sick');
    if (sickInput) sickInput.value = sickTotal;
    const casualInput = document.getElementById('edit-employee-leave-casual');
    if (casualInput) casualInput.value = casualTotal;

    const annualHint = document.getElementById('edit-employee-annual-used-hint');
    if (annualHint) annualHint.textContent = `Used: ${annualUsed} | Default: ${defaultAnnual}`;
    const sickHint = document.getElementById('edit-employee-sick-used-hint');
    if (sickHint) sickHint.textContent = `Used: ${sickUsed} | Default: ${defaultSick}`;
    const casualHint = document.getElementById('edit-employee-casual-used-hint');
    if (casualHint) casualHint.textContent = `Used: ${casualUsed} | Default: ${defaultCasual}`;

    document.getElementById('edit-employee-subtitle').textContent = `Editing ${emp.name} (${emp.id})`;

    UI.openModal('modal-edit-employee');
  },

  // EMP-008: Submit employee edits
  async submitEditEmployee(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const empId = document.getElementById('edit-employee-id').value;

    let emp = this.employees.find(e => e.id === empId);
    const currentBalances = emp?.leaveBalances || {
      annual: { total: 20, used: 0 },
      sick: { total: 10, used: 0 },
      casual: { total: 5, used: 0 }
    };

    const isHr = emp?.role === 'hr' || emp?.role === 'hr_admin' || emp?.isHrAdmin;
    const defaultAnnual = isHr ? 22 : 20;
    const defaultSick = isHr ? 12 : 10;
    const defaultCasual = isHr ? 6 : 5;

    const annualVal = formData.get('leaveAnnualTotal');
    const sickVal = formData.get('leaveSickTotal');
    const casualVal = formData.get('leaveCasualTotal');

    const body = {
      name: formData.get('name'),
      email: formData.get('email'),
      jobTitle: formData.get('jobTitle'),
      department: formData.get('department'),
      employmentType: formData.get('employmentType'),
      salary: Number(formData.get('salary')),
      joinDate: formData.get('joinDate'),
      biometricRef: formData.get('biometricRef'),
      salaryStructureId: formData.get('salaryStructureId'),
      status: formData.get('status'),
      phone: formData.get('phone'),
      location: formData.get('location'),
      leaveBalances: {
        annual: {
          total: (annualVal !== null && annualVal !== '') ? Math.max(0, parseInt(annualVal, 10)) : (currentBalances.annual?.total ?? defaultAnnual),
          used: currentBalances.annual?.used ?? 0
        },
        sick: {
          total: (sickVal !== null && sickVal !== '') ? Math.max(0, parseInt(sickVal, 10)) : (currentBalances.sick?.total ?? defaultSick),
          used: currentBalances.sick?.used ?? 0
        },
        casual: {
          total: (casualVal !== null && casualVal !== '') ? Math.max(0, parseInt(casualVal, 10)) : (currentBalances.casual?.total ?? defaultCasual),
          used: currentBalances.casual?.used ?? 0
        }
      }
    };

    try {
      const updated = await API.put(`/employees/${empId}`, body);
      UI.toast(`Employee details for ${updated.name} updated successfully!`, 'success');
      UI.closeModal('modal-edit-employee');
      await this.loadAllData();
      this.renderActiveTab();
      const viewModal = document.getElementById('modal-view-employee');
      if (viewModal && !viewModal.classList.contains('hidden')) {
        this.openViewEmployeeModal(empId);
      }
    } catch (err) {
      UI.toast(err.message || 'Failed to update employee details', 'error');
    }
  },

  // EMP-010: Toggle employee active/deactivated status
  async toggleEmployeeStatus(empId) {
    const emp = this.employees.find(e => e.id === empId);
    if (!emp) return;

    const targetStatus = emp.status === 'Inactive' ? 'Active' : 'Inactive';
    const actionWord = targetStatus === 'Inactive' ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${actionWord} ${emp.name} (${emp.id})?`)) {
      return;
    }

    try {
      const res = await API.patch(`/employees/${empId}/status`, { status: targetStatus });
      UI.toast(res.message || `Employee ${emp.name} status updated to ${targetStatus}`, 'success');
      UI.closeModal('modal-view-employee');
      await this.loadAllData();
      this.renderActiveTab();
    } catch (err) {
      UI.toast(err.message || `Failed to update status`, 'error');
    }
  },

  openReviewModal(leaveId) {
    const leave = this.leaves.find(l => l.id === leaveId);
    if (!leave) return;

    this.currentReviewLeaveId = leaveId;
    document.getElementById('review-leave-id').value = leaveId;
    document.getElementById('review-leave-comment').value = leave.reviewComment || '';

    const detailsEl = document.getElementById('review-leave-details');
    detailsEl.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="font-bold text-slate-900">${leave.employeeName} (${leave.department})</span>
        <span class="font-semibold text-indigo-600 text-xs">${leave.leaveType} Leave</span>
      </div>
      <div class="text-xs text-slate-600">
        <strong>Dates:</strong> ${UI.formatDate(leave.startDate)} to ${UI.formatDate(leave.endDate)} (${leave.days} days)
      </div>
      <div class="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 mt-2">
        <strong class="text-slate-500">Reason:</strong> "${leave.reason}"
      </div>
    `;

    UI.openModal('modal-review-leave');
  },

  async handleLeaveDecision(decision) {
    const leaveId = this.currentReviewLeaveId || document.getElementById('review-leave-id').value;
    const comment = document.getElementById('review-leave-comment').value;

    try {
      await API.patch(`/leaves/${leaveId}`, {
        status: decision,
        reviewedBy: Auth.employee?.name || 'HR Admin',
        reviewComment: comment
      });

      UI.toast(`Leave request marked as ${decision}!`, decision === 'Approved' ? 'success' : 'info');
      UI.closeModal('modal-review-leave');
      await this.loadAllData();
      this.renderActiveTab();
    } catch (err) {
      UI.toast(err.message || 'Failed to update leave', 'error');
    }
  },

  async quickApproveLeave(leaveId) {
    try {
      await API.patch(`/leaves/${leaveId}`, {
        status: 'Approved',
        reviewedBy: Auth.employee?.name || 'HR Admin',
        reviewComment: 'Approved via Quick Action'
      });
      UI.toast('Leave approved successfully!', 'success');
      await this.loadAllData();
      this.renderActiveTab();
    } catch (err) {
      UI.toast(err.message || 'Failed to approve', 'error');
    }
  },

  async submitAnnouncement(event) {
    event.preventDefault();
    const title = document.getElementById('ann-title').value;
    const category = document.getElementById('ann-category').value;
    const priority = document.getElementById('ann-priority').value;
    const content = document.getElementById('ann-content').value;

    try {
      await API.post('/announcements', {
        title,
        category,
        priority,
        content,
        author: Auth.employee?.name || 'HR Team'
      });
      UI.toast('Announcement published to bulletin!', 'success');
      UI.closeModal('modal-new-announcement');
      document.getElementById('form-new-announcement').reset();
      await this.loadAllData();
      this.renderActiveTab();
    } catch (err) {
      UI.toast(err.message || 'Failed to publish announcement', 'error');
    }
  },

  async viewPayslip(slipId) {
    let slip = (this.payslips || []).find(p => p.id === slipId);
    if (!slip) {
      try {
        slip = await API.get(`/payslips/${slipId}`);
      } catch (e) {
        UI.toast('Could not load payslip', 'error');
        return;
      }
    }

    const emp = this.employees.find(e => e.id === slip.employeeId) || {
      name: slip.employeeName || slip.employeeId,
      id: slip.employeeId,
      jobTitle: 'Staff Member',
      department: 'NexusHR'
    };

    const isPending = slip.status === 'Pending Approval';
    const isFinalized = slip.status === 'Finalized';
    const payslipContainer = document.getElementById('printable-payslip');
    const attSummary = slip.attendanceSummary || {
      salaryDivisor: 30,
      totalWorkingDays: 30,
      presentDays: 30,
      paidLeaveDays: 0,
      payableDays: 30,
      absentDays: 0,
      lateDays: 0,
      lopDays: 0,
      perDayRate: Math.round((slip.baseSalary || 0) / 30),
      attendanceDeduction: slip.deductions?.attendanceDeduction || slip.deductions?.lossOfPay || 0
    };
    const lopAmount = slip.deductions?.attendanceDeduction || slip.deductions?.lossOfPay || attSummary.attendanceDeduction || 0;

    payslipContainer.innerHTML = `
      ${isPending ? `
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs no-print">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs shrink-0">
              <i class="fa-solid fa-clock"></i>
            </div>
            <div>
              <span class="font-bold text-amber-900 text-xs block">Awaiting HR Approval</span>
              <p class="text-amber-700 text-[11px] leading-tight">Review details below and approve to release to ${emp.name}'s portal.</p>
            </div>
          </div>
          <button onclick="HR.approvePayslip('${slip.id}', true)" class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors shrink-0 text-xs">
            <i class="fa-solid fa-check"></i> Approve & Release
          </button>
        </div>
      ` : isFinalized ? `
        <div class="bg-purple-50 border border-purple-200 rounded-xl p-2.5 mb-3.5 flex items-center justify-between text-xs text-purple-900 no-print">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-lock text-purple-600 text-sm"></i>
            <div>
              <span class="font-bold text-xs">Finalized & Locked Cycle</span>
              <span class="text-slate-500 text-[11px] ml-1">• Finalized by ${slip.finalizedBy || 'Finance Lead'} on ${slip.finalizedAt || slip.approvedAt || UI.formatDate(slip.payDate)}</span>
            </div>
          </div>
          <span class="px-2 py-0.5 bg-purple-100 text-purple-800 font-bold rounded-full text-[10px]">LOCKED</span>
        </div>
      ` : `
        <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 mb-3.5 flex items-center justify-between text-xs text-emerald-800 no-print">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-circle-check text-emerald-600 text-sm"></i>
            <div>
              <span class="font-bold text-xs">Approved & Published</span>
              <span class="text-slate-500 text-[11px] ml-1">• Released on ${slip.approvedAt || UI.formatDate(slip.payDate)}</span>
            </div>
          </div>
          <span class="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[10px]">ACTIVE IN PORTAL</span>
        </div>
      `}

      <div class="border-b border-slate-200 pb-3 mb-3.5 flex justify-between items-start">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <div class="w-6 h-6 rounded bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
              <i class="fa-solid fa-people-roof"></i>
            </div>
            <span class="text-base font-extrabold text-slate-900">NexusHR Technologies Pvt. Ltd.</span>
          </div>
          <p class="text-[11px] text-slate-500 leading-tight">Outer Ring Road, Bengaluru, Karnataka 560103</p>
          <p class="text-[11px] text-slate-500 leading-tight">PAN: AABCN8192F • payroll@nexushr.in</p>
        </div>
        <div class="text-right">
          <span class="px-2.5 py-0.5 ${isPending ? 'bg-amber-100 text-amber-800' : (isFinalized ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800')} text-[10px] font-bold rounded-full">
            ${isPending ? 'PENDING APPROVAL' : (isFinalized ? 'FINALIZED & LOCKED' : 'APPROVED / PAID')}
          </span>
          <div class="text-[10px] text-slate-400 mt-1.5">Statement Month</div>
          <div class="text-xs font-bold text-slate-900">${slip.month} ${slip.year}</div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 mb-3.5 text-xs">
        <div>
          <span class="text-slate-400 block text-[10px] uppercase font-semibold">Employee Name</span>
          <strong class="text-slate-900 text-xs">${emp.name}</strong>
          <span class="text-slate-500 block text-[11px] mt-0.5">ID: ${emp.id}</span>
        </div>
        <div>
          <span class="text-slate-400 block text-[10px] uppercase font-semibold">Designation & Department</span>
          <strong class="text-slate-900 text-xs">${emp.jobTitle}</strong>
          <span class="text-slate-500 block text-[11px] mt-0.5">${emp.department || 'General'} • ${emp.employmentType || 'Full-Time'}</span>
        </div>
      </div>

      <!-- Attendance & Working Days Summary Card -->
      <div class="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3 mb-3.5">
        <div class="flex items-center justify-between mb-2">
          <span class="text-[11px] font-bold text-indigo-900 uppercase tracking-wide flex items-center gap-1.5">
            <i class="fa-solid fa-calendar-check text-indigo-600"></i>
            <span>Monthly Attendance & Leave Summary</span>
          </span>
          <span class="text-[10px] text-indigo-700 font-semibold">${slip.salaryStructureName || 'Standard Corporate'} • ${attSummary.salaryDivisor || 30}-Day Divisor (BR-PAY-02)</span>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div class="bg-white p-2 rounded-lg border border-indigo-100 shadow-xs">
            <span class="text-slate-400 block text-[9px] uppercase font-semibold">Cycle Calendar</span>
            <strong class="text-slate-900 text-xs font-mono">${attSummary.salaryDivisor || attSummary.totalWorkingDays || 30} Days</strong>
            <span class="text-[10px] text-slate-500 block">Monthly Divisor</span>
          </div>
          <div class="bg-white p-2 rounded-lg border border-indigo-100 shadow-xs">
            <span class="text-slate-400 block text-[9px] uppercase font-semibold">Payable Days (PAY-004)</span>
            <strong class="text-emerald-700 text-xs font-mono">${attSummary.payableDays !== undefined ? attSummary.payableDays : ((attSummary.presentDays || 0) + (attSummary.paidLeaveDays || 0))} Days</strong>
            <span class="text-[10px] text-slate-500 block">${attSummary.presentDays || 0} Pres + ${attSummary.paidLeaveDays || 0} Lv</span>
          </div>
          <div class="bg-white p-2 rounded-lg border border-indigo-100 shadow-xs">
            <span class="text-slate-400 block text-[9px] uppercase font-semibold">Loss of Pay (LOP)</span>
            <strong class="${(attSummary.lopDays || 0) > 0 ? 'text-rose-600' : 'text-slate-900'} text-xs font-mono">${attSummary.lopDays || 0} Day(s)</strong>
            <span class="text-[10px] text-slate-500 block">${attSummary.absentDays || 0} Absent • ${attSummary.lateDays || 0} Late</span>
          </div>
          <div class="bg-white p-2 rounded-lg border border-indigo-100 shadow-xs">
            <span class="text-slate-400 block text-[9px] uppercase font-semibold">Daily Salary Rate</span>
            <strong class="text-slate-900 text-xs font-mono">${UI.formatCurrency(attSummary.perDayRate || Math.round((slip.monthlyCTC || slip.baseSalary || 0) / (attSummary.salaryDivisor || 30)))}</strong>
            <span class="text-[10px] text-slate-500 block">Base / ${attSummary.salaryDivisor || 30}</span>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4 text-xs mb-3.5">
        <div>
          <h4 class="font-bold text-slate-900 uppercase text-[10px] mb-1.5 pb-1 border-b border-slate-200 text-emerald-700">Earnings (INR)</h4>
          <div class="space-y-1">
            <div class="flex justify-between py-0.5 border-b border-slate-100">
              <span class="text-slate-600">Basic Salary</span>
              <span class="font-mono font-medium">${UI.formatCurrency(slip.baseSalary || slip.grossPay)}</span>
            </div>
            <div class="flex justify-between py-1.5 font-bold text-slate-900">
              <span>Gross Earnings</span>
              <span class="font-mono text-emerald-700">${UI.formatCurrency(slip.baseSalary || slip.grossPay)}</span>
            </div>
          </div>
        </div>

        <div>
          <h4 class="font-bold text-slate-900 uppercase text-[10px] mb-1.5 pb-1 border-b border-slate-200 text-rose-700">Deductions (INR)</h4>
          <div class="space-y-1">
            ${lopAmount > 0 ? `
              <div class="flex justify-between py-1 border-b border-rose-100 bg-rose-50/70 px-1.5 rounded -mx-1">
                <div>
                  <span class="text-rose-800 font-bold flex items-center gap-1 text-[11px]">
                    <i class="fa-solid fa-user-clock text-rose-500 text-[9px]"></i>
                    Attendance / LOP
                  </span>
                  <span class="text-[9px] text-rose-600 block">${attSummary.lopDays || 1}d LOP (${attSummary.absentDays || 0} abs${(attSummary.lateDays || 0) > 0 ? `, ${attSummary.lateDays} late` : ''})</span>
                </div>
                <span class="font-mono font-bold text-rose-700">-${UI.formatCurrency(lopAmount)}</span>
              </div>
            ` : `
              <div class="flex justify-between py-0.5 border-b border-slate-100">
                <span class="text-slate-600">Attendance / LOP</span>
                <span class="font-mono text-emerald-600 font-medium">₹0 (100% Present)</span>
              </div>
            `}
            <div class="flex justify-between py-1.5 font-bold text-slate-900">
              <span>Total Deductions</span>
              <span class="font-mono text-rose-700">${lopAmount > 0 ? `-${UI.formatCurrency(lopAmount)}` : '₹0'}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-indigo-50 border border-indigo-100 p-3 rounded-xl flex items-center justify-between">
        <div>
          <span class="text-[10px] text-indigo-700 uppercase font-semibold block">Net Disbursed Take-Home</span>
          <span class="text-[11px] text-slate-500">NEFT / RTGS Direct Bank Transfer</span>
        </div>
        <div class="text-xl font-black text-indigo-900 font-mono">
          ${UI.formatCurrency((slip.baseSalary || slip.grossPay) - lopAmount)}
        </div>
      </div>
    `;

    UI.openModal('modal-view-payslip');
  },

  async recalculateAttendancePayroll() {
    try {
      UI.toast('Recalculating payroll with attendance data...', 'info');
      const res = await API.post('/payslips/recalculate-all', {
        month: 'November',
        year: 2026
      });
      this.payslips = await API.get('/payslips');
      UI.toast(res.message || 'Attendance deductions recalculated successfully!', 'success');
      this.renderPayroll();
    } catch (err) {
      console.error('Failed to recalculate attendance payroll:', err);
      UI.toast(err.message || 'Could not recalculate attendance deductions', 'error');
    }
  },

  async viewPayslipForEmployee(empId) {
    const slip = (this.payslips || []).find(p => p.employeeId === empId);
    if (slip) {
      await this.viewPayslip(slip.id);
    } else {
      UI.toast('No payslip found for this employee', 'warning');
    }
  },

  async approvePayslip(slipId, closeModal = false) {
    try {
      const updated = await API.patch(`/payslips/${slipId}`, {
        status: 'Approved',
        reviewedBy: Auth.employee?.name || 'Elena Rostova (HR)'
      });

      const idx = (this.payslips || []).findIndex(p => p.id === slipId);
      if (idx !== -1) {
        this.payslips[idx] = updated;
      }

      UI.toast(`Payslip for ${updated.employeeName || updated.employeeId} (${updated.month} ${updated.year}) approved and released!`, 'success');

      if (closeModal) {
        UI.closeModal('modal-view-payslip');
      }

      this.renderPayroll();
    } catch (err) {
      console.error('Failed to approve payslip:', err);
      UI.toast('Could not approve payslip', 'error');
    }
  },

  async approveAllPending() {
    try {
      const res = await API.post('/payslips/approve-all', {
        reviewedBy: Auth.employee?.name || 'Elena Rostova (HR)'
      });

      this.payslips = await API.get('/payslips');
      UI.toast(res.message || 'All pending payslips approved and released to employees!', 'success');
      this.renderPayroll();
    } catch (err) {
      console.error('Failed to bulk approve payslips:', err);
      UI.toast('Could not approve pending payslips', 'error');
    }
  },

  // PAY-001: Open salary structures configuration modal
  async openSalaryStructuresModal() {
    try {
      const structures = await API.get('/salary-structures');
      const content = document.getElementById('salary-structures-content');
      if (!content) return;

      content.innerHTML = `
        <div class="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
              <i class="fa-solid fa-layer-group"></i>
            </div>
            <div>
              <h3 class="font-bold text-slate-900 text-base">Configured Salary Structures</h3>
              <p class="text-xs text-slate-500">Component percentages & statutory deduction rules (PAY-001)</p>
            </div>
          </div>
          <button onclick="UI.closeModal('modal-salary-structures')" class="text-slate-400 hover:text-slate-600">
            <i class="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <div class="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div class="grid grid-cols-1 gap-4">
            ${structures.map(s => `
              <div class="border border-slate-200 rounded-xl p-4 bg-white shadow-xs space-y-3">
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="font-bold text-slate-900 text-sm">${s.name}</h4>
                    <span class="text-xs text-slate-400 font-mono">ID: ${s.id}</span>
                  </div>
                  <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    ${s.isDefault ? 'Default Structure' : 'Custom Structure'}
                  </span>
                </div>
                <p class="text-xs text-slate-500">${s.description || ''}</p>
                
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span class="text-slate-400 block text-[10px] uppercase font-semibold">Basic Pay</span>
                    <strong class="text-slate-800">${s.basicPercentage}%</strong>
                  </div>
                  <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span class="text-slate-400 block text-[10px] uppercase font-semibold">HRA</span>
                    <strong class="text-slate-800">${s.hraPercentage}%</strong>
                  </div>
                  <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span class="text-slate-400 block text-[10px] uppercase font-semibold">Special Allow.</span>
                    <strong class="text-slate-800">${s.specialAllowancePercentage}%</strong>
                  </div>
                  <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span class="text-slate-400 block text-[10px] uppercase font-semibold">Conveyance</span>
                    <strong class="text-slate-800">${UI.formatCurrency(s.conveyanceFixed)}</strong>
                  </div>
                </div>

                <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>PF: <strong class="text-slate-700 font-mono">${s.pfPercentage}%</strong></span>
                  <span>Tax TDS: <strong class="text-slate-700 font-mono">${s.taxPercentage}%</strong></span>
                  <span>Health Insurance: <strong class="text-slate-700 font-mono">${UI.formatCurrency(s.healthInsuranceFixed)}</strong></span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button onclick="UI.closeModal('modal-salary-structures')" class="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold">
            Close
          </button>
        </div>
      `;

      UI.openModal('modal-salary-structures');
    } catch (err) {
      UI.toast(err.message || 'Could not load salary structures', 'error');
    }
  },

  // PAY-010: Finalize payroll cycle (restricted to Finance / HR Admin)
  async finalizePayrollCycle(month = 'November', year = 2026) {
    if (!confirm(`Are you sure you want to finalize and lock the payroll cycle for ${month} ${year}? Once finalized, all statements are frozen and locked.`)) {
      return;
    }

    try {
      const res = await API.post('/payslips/finalize', {
        month,
        year,
        finalizedBy: Auth.employee?.name || Auth.user?.email || 'HR Administrator'
      });

      UI.toast(res.message || `Payroll cycle for ${month} ${year} finalized successfully!`, 'success');
      this.payslips = await API.get('/payslips');
      this.renderPayroll();
    } catch (err) {
      UI.toast(err.message || 'Failed to finalize payroll cycle', 'error');
    }
  },

  // ATT-009: Validate individual attendance record
  async validateAttendance(id) {
    try {
      const res = await API.patch(`/attendance/${id}/validate`, {});
      UI.toast(res.message || 'Attendance record validated successfully!', 'success');
      await this.loadAllData();
      this.renderAttendance();
    } catch (err) {
      UI.toast(err.message || 'Failed to validate record', 'error');
    }
  },

  // ATT-009 & BR-ATT-04: Validate all clean attendance records for selected date
  async validateDayAttendance(date) {
    const targetDate = date || this.selectedAttendanceDate || new Date().toISOString().split('T')[0];
    try {
      const res = await API.post('/attendance/validate-all', { date: targetDate });
      UI.toast(res.message || 'Clean attendance records validated for the day!', 'success');
      await this.loadAllData();
      this.renderAttendance();
    } catch (err) {
      UI.toast(err.message || 'Failed to validate daily attendance', 'error');
    }
  },

  // ATT-010 & BR-ATT-03: Open attendance correction modal
  openCorrectAttendanceModal(id) {
    const record = (this.attendance || []).find(a => a.id === id);
    if (!record) return;

    document.getElementById('correct-att-id').value = id;
    document.getElementById('correct-att-in').value = record.clockIn || '';
    document.getElementById('correct-att-out').value = record.clockOut || '';
    document.getElementById('correct-att-status').value = record.status || 'Present';
    document.getElementById('correct-att-reason').value = '';

    const orig = record.originalBiometric || { clockIn: record.clockIn, clockOut: record.clockOut };
    const info = document.getElementById('correct-att-info');
    if (info) {
      info.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="font-bold text-slate-900">${record.employeeName} (${record.employeeId})</span>
          <span class="text-slate-500 font-mono text-[11px]">${record.date}</span>
        </div>
        <div class="text-[11px] text-slate-600 flex items-center gap-3 pt-1 border-t border-slate-200">
          <span>Machine Check-in: <strong class="font-mono text-slate-800">${orig.clockIn || '--'}</strong></span>
          <span>Machine Check-out: <strong class="font-mono text-slate-800">${orig.clockOut || '--'}</strong></span>
        </div>
        ${record.isCorrected ? `
          <div class="text-[11px] text-purple-700 bg-purple-50 p-2 rounded-lg mt-1 border border-purple-100">
            <strong>Previous Correction:</strong> "${record.correctionReason}" (by ${record.correctedBy})
          </div>
        ` : ''}
      `;
    }

    UI.openModal('modal-correct-attendance');
  },

  // ATT-010 & BR-ATT-03: Submit correction with reason
  async submitAttendanceCorrection(event) {
    event.preventDefault();
    const id = document.getElementById('correct-att-id').value;
    const clockIn = document.getElementById('correct-att-in').value.trim();
    const clockOut = document.getElementById('correct-att-out').value.trim();
    const status = document.getElementById('correct-att-status').value;
    const correctionReason = document.getElementById('correct-att-reason').value.trim();

    if (!correctionReason) {
      UI.toast('Correction reason is mandatory (BR-ATT-03)', 'error');
      return;
    }

    try {
      const res = await API.patch(`/attendance/${id}/correct`, {
        clockIn,
        clockOut,
        status,
        correctionReason
      });

      UI.toast(res.message || 'Attendance discrepancy corrected with audit trail!', 'success');
      UI.closeModal('modal-correct-attendance');
      await this.loadAllData();
      this.renderAttendance();
    } catch (err) {
      UI.toast(err.message || 'Failed to correct attendance', 'error');
    }
  },

  // ATT-001: Sync biometric device data
  async syncBiometricData() {
    try {
      UI.toast('Synchronizing biometric device logs...', 'info');
      const res = await API.post('/biometric/sync', {});
      UI.toast(res.message || 'Biometric data synchronized successfully!', 'success');
      await this.loadAllData();
      this.renderAttendance();
    } catch (err) {
      UI.toast(err.message || 'Failed to synchronize biometric device', 'error');
    }
  },

  // ATT-011 & BR-ATT-06: Open biometric punch stream & sync failures modal
  async openBiometricStreamModal() {
    try {
      const date = this.selectedAttendanceDate || new Date().toISOString().split('T')[0];
      const punches = await API.get('/biometric/punches', { date });
      const failures = await API.get('/biometric/sync-failures');

      const content = document.getElementById('biometric-stream-content');
      if (!content) return;

      content.innerHTML = `
        <div class="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
              <i class="fa-solid fa-fingerprint"></i>
            </div>
            <div>
              <h3 class="font-bold text-slate-900 text-base">Raw Biometric Machine Stream</h3>
              <p class="text-xs text-slate-500">Immutable device log records (ATT-011, BR-ATT-02)</p>
            </div>
          </div>
          <button onclick="UI.closeModal('modal-biometric-stream')" class="text-slate-400 hover:text-slate-600">
            <i class="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <div class="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <!-- Device Sync Failure Alert (BR-ATT-06) -->
          ${failures.length > 0 ? `
            <div class="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-2">
              <div class="font-bold flex items-center gap-2 text-rose-900">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <span>Biometric Device Synchronization Failures (${failures.length} Unresolved)</span>
              </div>
              <div class="space-y-1">
                ${failures.map(f => `
                  <div class="bg-white p-2 rounded-lg border border-rose-200 flex items-center justify-between">
                    <div>
                      <span class="font-mono font-bold text-rose-700">${f.biometricRef}</span>
                      <span class="text-slate-500">• ${f.timestamp}</span>
                      <p class="text-slate-600 text-[11px] mt-0.5">${f.errorReason}</p>
                    </div>
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">BR-ATT-06 Flag</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <div>
            <div class="flex items-center justify-between mb-2">
              <h4 class="text-xs font-bold text-slate-500 uppercase tracking-wider">Device Punch Events (${punches.length} for ${UI.formatDate(date)})</h4>
              <span class="text-[11px] text-slate-400">Device: DEV-HQ-MAIN</span>
            </div>
            <div class="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 font-bold text-slate-500 uppercase text-[10px] border-b border-slate-100">
                  <tr>
                    <th class="px-4 py-2.5">Punch ID</th>
                    <th class="px-4 py-2.5">Biometric Ref / ID</th>
                    <th class="px-4 py-2.5">Punch Time</th>
                    <th class="px-4 py-2.5">Type</th>
                    <th class="px-4 py-2.5 text-right">Device ID</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-slate-700 font-mono">
                  ${punches.length === 0 ? `
                    <tr><td colspan="5" class="text-center py-6 text-slate-400 font-sans">No punches recorded for this date.</td></tr>
                  ` : punches.map(p => `
                    <tr class="hover:bg-slate-50">
                      <td class="px-4 py-2 text-slate-400">${p.id}</td>
                      <td class="px-4 py-2 font-bold text-slate-900">${p.employeeId || p.biometricRef}</td>
                      <td class="px-4 py-2 font-semibold text-emerald-700">${p.punchTime}</td>
                      <td class="px-4 py-2">
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${p.punchType === 'ENTRY' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}">
                          ${p.punchType || 'PUNCH'}
                        </span>
                      </td>
                      <td class="px-4 py-2 text-right text-slate-500">${p.deviceId || 'DEV-HQ-MAIN'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button onclick="UI.closeModal('modal-biometric-stream')" class="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold">
            Close
          </button>
        </div>
      `;

      UI.openModal('modal-biometric-stream');
    } catch (err) {
      UI.toast(err.message || 'Could not load biometric logs', 'error');
    }
  },

  // Open employee correction requests modal
  async openCorrectionRequestsModal() {
    try {
      const requests = await API.get('/attendance/correction-requests');
      const content = document.getElementById('attendance-correction-requests-content');
      if (!content) return;

      content.innerHTML = `
        <div class="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
              <i class="fa-solid fa-inbox"></i>
            </div>
            <div>
              <h3 class="font-bold text-slate-900 text-base">Employee Attendance Correction Requests</h3>
              <p class="text-xs text-slate-500">Review employee-requested punch corrections</p>
            </div>
          </div>
          <button onclick="UI.closeModal('modal-attendance-correction-requests')" class="text-slate-400 hover:text-slate-600">
            <i class="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <div class="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
          ${requests.length === 0 ? `
            <div class="text-center py-10 text-slate-400 text-xs">No pending attendance correction requests.</div>
          ` : requests.map(r => `
            <div class="border border-slate-200 rounded-xl p-4 bg-white shadow-xs space-y-2">
              <div class="flex items-center justify-between">
                <div>
                  <h4 class="font-bold text-slate-900 text-sm">${r.employeeName} (${r.employeeId})</h4>
                  <span class="text-xs text-slate-400 font-mono">Date: ${r.date}</span>
                </div>
                <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold ${r.status === 'Pending' ? 'bg-amber-100 text-amber-800' : (r.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800')}">
                  ${r.status}
                </span>
              </div>
              <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs space-y-1">
                <div><strong>Requested Times:</strong> ${r.requestedIn} &rarr; ${r.requestedOut}</div>
                <div><strong>Reason:</strong> "${r.reason}"</div>
              </div>
              ${r.status === 'Pending' ? `
                <div class="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button onclick="HR.handleCorrectionRequestDecision('${r.id}', 'Rejected')" class="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold">
                    Reject
                  </button>
                  <button onclick="HR.handleCorrectionRequestDecision('${r.id}', 'Approved')" class="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-xs">
                    Approve & Apply
                  </button>
                </div>
              ` : `
                <div class="text-[11px] text-slate-500 italic pt-1 border-t border-slate-100">Reviewed by ${r.reviewedBy || 'HR Admin'}</div>
              `}
            </div>
          `).join('')}
        </div>

        <div class="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button onclick="UI.closeModal('modal-attendance-correction-requests')" class="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold">
            Close
          </button>
        </div>
      `;

      UI.openModal('modal-attendance-correction-requests');
    } catch (err) {
      UI.toast(err.message || 'Could not load requests', 'error');
    }
  },

  async handleCorrectionRequestDecision(id, decision) {
    try {
      const res = await API.patch(`/attendance/correction-requests/${id}`, {
        status: decision,
        reviewComment: `Decision by ${Auth.employee?.name || 'HR Admin'}`
      });
      UI.toast(res.message || `Correction request ${decision.toLowerCase()} successfully!`, 'success');
      await this.loadAllData();
      this.openCorrectionRequestsModal();
      this.renderAttendance();
    } catch (err) {
      UI.toast(err.message || 'Failed to update request', 'error');
    }
  },

  renderProfile() {
    const container = document.getElementById('hr-tab-profile');
    if (!container) return;

    const emp = Auth.employee || (this.employees || []).find(e => e.email === Auth.user?.email) || {};
    const struct = emp.salaryStructure || {
      name: 'Executive Leadership Structure',
      basicPercentage: 45,
      hraPercentage: 35,
      specialAllowancePercentage: 18,
      conveyanceFixed: 3200
    };

    const monthly = Math.round((emp.salary || 0) / 12);
    const basic = Math.round(monthly * ((struct.basicPercentage || 45) / 100));
    const hra = Math.round(monthly * ((struct.hraPercentage || 35) / 100));
    const special = Math.round(monthly * ((struct.specialAllowancePercentage || 18) / 100));
    const conveyance = struct.conveyanceFixed || 3200;

    container.innerHTML = `
      <!-- HR Profile Hero Banner -->
      <div class="bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-purple-900/40 relative overflow-hidden">
        <div class="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div class="flex items-center gap-5">
            <img src="${emp.avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=faces'}" class="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover ring-4 ring-white/10 shadow-xl" alt="${emp.name}">
            <div>
              <div class="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                <h1 class="text-xl sm:text-2xl font-extrabold tracking-tight">${emp.name || 'HR Specialist'}</h1>
                <span class="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  ${Auth.isHrAdmin ? '👑 HR Administrator' : '🛡️ HR Staff'}
                </span>
                <span class="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-white/10 text-purple-200 border border-white/10">
                  ${emp.id || 'EMP-001'}
                </span>
              </div>
              <p class="text-purple-200 text-sm font-medium">${emp.jobTitle || 'Head of People & Culture'} • <span class="text-white/80">${emp.department || 'Human Resources'}</span></p>
              <div class="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-300">
                <span class="flex items-center gap-1.5"><i class="fa-solid fa-location-dot text-purple-400"></i> ${emp.location || 'Bengaluru (HQ)'}</span>
                <span class="flex items-center gap-1.5"><i class="fa-regular fa-calendar-check text-purple-400"></i> Joined ${UI.formatDate(emp.joinDate)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Basic Details Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div class="pb-3 border-b border-slate-100">
            <h3 class="font-bold text-slate-900 text-sm">Personal & Contact Details</h3>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div class="text-[11px] font-medium text-slate-400">Full Name</div>
              <div class="font-bold text-slate-900 mt-0.5">${emp.name || '--'}</div>
            </div>
            <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div class="text-[11px] font-medium text-slate-400">Email</div>
              <div class="font-bold text-slate-900 mt-0.5">${emp.email || '--'}</div>
            </div>
            <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div class="text-[11px] font-medium text-slate-400">Phone</div>
              <div class="font-bold text-slate-900 mt-0.5">${emp.phone || '--'}</div>
            </div>
            <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div class="text-[11px] font-medium text-slate-400">Location</div>
              <div class="font-bold text-slate-900 mt-0.5">${emp.location || '--'}</div>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div class="pb-3 border-b border-slate-100">
            <h3 class="font-bold text-slate-900 text-sm">Employment & Identification</h3>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div class="text-[11px] font-medium text-slate-400">Employee ID</div>
              <div class="font-mono font-bold text-purple-700 mt-0.5">${emp.id || '--'}</div>
            </div>
            <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div class="text-[11px] font-medium text-slate-400">Department</div>
              <div class="font-bold text-slate-900 mt-0.5">${emp.department || '--'}</div>
            </div>
            <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div class="text-[11px] font-medium text-slate-400">Biometric Reference</div>
              <div class="font-mono font-bold text-purple-700 mt-0.5">${emp.biometricRef || ('BIO-' + emp.id)}</div>
            </div>
            <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div class="text-[11px] font-medium text-slate-400">Employment Type</div>
              <div class="font-bold text-slate-900 mt-0.5">${emp.employmentType || 'Full-Time'}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
};

if (typeof window !== 'undefined') {
  window.HR = HR;
}
