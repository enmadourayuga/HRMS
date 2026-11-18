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
    if (window.App && typeof App.setActiveNav === 'function') {
      App.setActiveNav(tabName);
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
        this.renderLeaves();
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

          <!-- Department Headcount & Budget Table -->
          <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div class="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 class="font-bold text-slate-900 text-sm">Department Allocations</h3>
              <span class="text-xs text-slate-500">${this.departments.length} Units Active</span>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead class="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th class="px-5 py-3">Department</th>
                    <th class="px-5 py-3">Department Head</th>
                    <th class="px-5 py-3 text-center">Team Size</th>
                    <th class="px-5 py-3 text-right">Budget</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-slate-700">
                  ${this.departments.map(dept => `
                    <tr class="hover:bg-slate-50/80 transition-colors">
                      <td class="px-5 py-3.5 font-semibold text-slate-900">${dept.name}</td>
                      <td class="px-5 py-3.5 text-slate-600">${dept.head}</td>
                      <td class="px-5 py-3.5 text-center">
                        <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">${dept.count} members</span>
                      </td>
                      <td class="px-5 py-3.5 text-right font-mono font-medium text-slate-900">${dept.budget}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        <!-- Right Column: Announcements Bulletin & Quick Directory (4 cols) -->
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

          <!-- Quick Directory Summary -->
          <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4">
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-bold text-slate-900 text-sm">Quick Directory</h3>
              <button onclick="HR.switchTab('employees')" class="text-xs text-indigo-600 font-semibold hover:underline">View All</button>
            </div>
            <div class="space-y-3">
              ${this.employees.slice(0, 4).map(e => `
                <div class="flex items-center gap-3">
                  <img src="${e.avatar}" class="w-8 h-8 rounded-full object-cover" alt="${e.name}">
                  <div class="min-w-0 flex-1">
                    <div class="text-xs font-bold text-slate-900 truncate">${e.name}</div>
                    <div class="text-[11px] text-slate-500 truncate">${e.jobTitle}</div>
                  </div>
                  <span class="text-[10px] px-2 py-0.5 rounded-full ${e.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'} font-semibold">
                    ${e.status}
                  </span>
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
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="px-5 py-4">
          <div class="flex items-center gap-3">
            <img src="${emp.avatar}" class="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200" alt="${emp.name}">
            <div>
              <div class="font-bold text-slate-900 text-sm">${emp.name}</div>
              <div class="text-xs text-slate-500">${emp.jobTitle}</div>
              <div class="text-[10px] text-slate-400 font-mono mt-0.5">ID: ${emp.id}</div>
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
          <div class="text-slate-500 text-[11px] mt-0.5">${emp.phone}</div>
          <div class="text-slate-400 text-[11px]">${emp.location}</div>
        </td>
        <td class="px-5 py-4 font-mono font-semibold text-slate-900 text-xs">
          ${UI.formatCurrency(emp.salary)}
          <span class="text-[10px] text-slate-400 block font-sans font-normal">Joined ${UI.formatDate(emp.joinDate)}</span>
        </td>
        <td class="px-5 py-4 text-center">
          <span class="px-2.5 py-1 rounded-full text-xs font-semibold ${emp.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}">
            ${emp.status}
          </span>
        </td>
        <td class="px-5 py-4 text-right">
          <button onclick="HR.viewPayslipForEmployee('${emp.id}')" class="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors">
            <i class="fa-solid fa-receipt mr-1"></i> Payslip
          </button>
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

  // ---------------- 3. HR LEAVE MANAGEMENT ----------------
  renderLeaves(currentFilter = 'All') {
    const container = document.getElementById('hr-tab-leaves');
    if (!container) return;

    let filtered = [...this.leaves];
    if (currentFilter !== 'All') {
      filtered = filtered.filter(l => l.status === currentFilter);
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
        <button onclick="HR.renderLeaves('All')" class="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${currentFilter === 'All' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'}">
          All Requests (${counts.all})
        </button>
        <button onclick="HR.renderLeaves('Pending')" class="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${currentFilter === 'Pending' ? 'bg-amber-500 text-white shadow-sm' : 'bg-white text-amber-700 hover:bg-amber-50'}">
          Pending Review (${counts.pending})
        </button>
        <button onclick="HR.renderLeaves('Approved')" class="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${currentFilter === 'Approved' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-emerald-700 hover:bg-emerald-50'}">
          Approved (${counts.approved})
        </button>
        <button onclick="HR.renderLeaves('Rejected')" class="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${currentFilter === 'Rejected' ? 'bg-rose-600 text-white shadow-sm' : 'bg-white text-rose-700 hover:bg-rose-50'}">
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

  // ---------------- 4. HR ATTENDANCE TRACKER ----------------
  renderAttendance() {
    const container = document.getElementById('hr-tab-attendance');
    if (!container) return;

    const today = new Date().toISOString().split('T')[0];
    const todayLogs = this.attendance.filter(a => a.date === today);

    container.innerHTML = `
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-slate-900">Daily Attendance Tracker</h2>
          <p class="text-xs text-slate-500 mt-0.5">Live check-in and working hours log for ${UI.formatDate(today)}</p>
        </div>
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span class="w-2 h-2 rounded-full bg-emerald-500 clock-live-dot"></span> Live Tracking
          </span>
        </div>
      </div>

      <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th class="px-5 py-3.5">Employee</th>
                <th class="px-5 py-3.5">Date</th>
                <th class="px-5 py-3.5">Clock In</th>
                <th class="px-5 py-3.5">Clock Out</th>
                <th class="px-5 py-3.5">Hours Tracked</th>
                <th class="px-5 py-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-slate-700">
              ${todayLogs.map(att => `
                <tr class="hover:bg-slate-50 transition-colors">
                  <td class="px-5 py-3.5 font-bold text-slate-900 flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center text-xs font-bold">
                      ${att.employeeName.charAt(0)}
                    </div>
                    <span>${att.employeeName}</span>
                  </td>
                  <td class="px-5 py-3.5 text-xs text-slate-500 font-mono">${att.date}</td>
                  <td class="px-5 py-3.5 text-xs font-mono font-semibold text-emerald-600">
                    ${att.clockIn ? `<i class="fa-regular fa-clock mr-1"></i> ${att.clockIn}` : '--'}
                  </td>
                  <td class="px-5 py-3.5 text-xs font-mono text-slate-500">
                    ${att.clockOut ? `<i class="fa-regular fa-clock mr-1"></i> ${att.clockOut}` : '<span class="text-amber-500 italic">In Progress</span>'}
                  </td>
                  <td class="px-5 py-3.5 text-xs font-semibold text-slate-800">
                    ${att.totalHours ? `${att.totalHours} hrs` : (att.clockIn ? 'Active' : '--')}
                  </td>
                  <td class="px-5 py-3.5 text-center">
                    <span class="px-2.5 py-1 rounded-full text-xs font-bold ${att.status === 'Present' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : (att.status === 'Late' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-600')}">
                      ${att.status}
                    </span>
                  </td>
                </tr>
              `).join('')}
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
        <div class="flex items-center gap-2">
          <button onclick="HR.recalculateAttendancePayroll()" class="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-xl text-xs sm:text-sm border border-indigo-200 shadow-xs flex items-center gap-2 transition-colors">
            <i class="fa-solid fa-arrows-rotate text-xs"></i>
            <span>Recalculate with Attendance</span>
          </button>
          ${pendingSlips.length > 0 ? `
            <button onclick="HR.approveAllPending()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-colors">
              <i class="fa-solid fa-check-double text-xs"></i>
              <span>Approve All Pending (${pendingSlips.length})</span>
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
                <th class="px-5 py-3.5">Gross Pay</th>
                <th class="px-5 py-3.5">Total Deductions (Inc. LOP)</th>
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
                const lopAmount = slip.deductions?.attendanceDeduction || slip.deductions?.lossOfPay || 0;
                const lopDays = slip.attendanceSummary?.lopDays || (lopAmount > 0 ? 1 : 0);
                return `
                  <tr class="hover:bg-slate-50/80 transition-colors ${isPending ? 'bg-amber-50/20' : ''}">
                    <td class="px-5 py-3.5">
                      <div class="font-bold text-slate-900">${emp.name}</div>
                      <div class="text-[11px] text-slate-500">${emp.jobTitle} • ${slip.employeeId}</div>
                    </td>
                    <td class="px-5 py-3.5">
                      <div class="font-semibold text-slate-800 text-xs">${slip.month} ${slip.year}</div>
                      <div class="text-[10px] text-slate-400">Pay Date: ${UI.formatDate(slip.payDate)}</div>
                    </td>
                    <td class="px-5 py-3.5 font-mono text-xs text-slate-900 font-medium">${UI.formatCurrency(slip.grossPay || slip.baseSalary)}</td>
                    <td class="px-5 py-3.5">
                      <div class="font-mono text-xs text-rose-600 font-semibold">-${UI.formatCurrency(slip.totalDeductions || 0)}</div>
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
                    <td class="px-5 py-3.5 font-mono text-xs font-bold text-emerald-600">${UI.formatCurrency(slip.netPay || slip.baseSalary)}</td>
                    <td class="px-5 py-3.5 text-center">
                      ${isPending ? `
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

    const body = {
      name: formData.get('name'),
      email: formData.get('email'),
      jobTitle: formData.get('jobTitle'),
      department: formData.get('department'),
      role: formData.get('role'),
      employmentType: formData.get('employmentType') || 'Full-Time',
      salary: formData.get('salary'),
      phone: formData.get('phone'),
      location: formData.get('location')
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
    const payslipContainer = document.getElementById('printable-payslip');
    const attSummary = slip.attendanceSummary || {
      totalWorkingDays: 22,
      presentDays: 22,
      paidLeaveDays: 0,
      absentDays: 0,
      lateDays: 0,
      lopDays: 0,
      perDayRate: Math.round((slip.baseSalary || 0) / 22),
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
          <span class="px-2.5 py-0.5 ${isPending ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'} text-[10px] font-bold rounded-full">
            ${isPending ? 'PENDING APPROVAL' : 'APPROVED / PAID'}
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
          <span class="text-[10px] text-indigo-700 font-semibold">${attSummary.totalWorkingDays || 22} Standard Cycle Days</span>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div class="bg-white p-2 rounded-lg border border-indigo-100 shadow-xs">
            <span class="text-slate-400 block text-[9px] uppercase font-semibold">Working Days</span>
            <strong class="text-slate-900 text-xs font-mono">${attSummary.totalWorkingDays || 22} Days</strong>
            <span class="text-[10px] text-slate-500 block">Cycle Calendar</span>
          </div>
          <div class="bg-white p-2 rounded-lg border border-indigo-100 shadow-xs">
            <span class="text-slate-400 block text-[9px] uppercase font-semibold">Days Present / Paid</span>
            <strong class="text-emerald-700 text-xs font-mono">${(attSummary.presentDays || 0) + (attSummary.paidLeaveDays || 0)} Days</strong>
            <span class="text-[10px] text-slate-500 block">${attSummary.presentDays || 0} Pres + ${attSummary.paidLeaveDays || 0} Lv</span>
          </div>
          <div class="bg-white p-2 rounded-lg border border-indigo-100 shadow-xs">
            <span class="text-slate-400 block text-[9px] uppercase font-semibold">Loss of Pay (LOP)</span>
            <strong class="${(attSummary.lopDays || 0) > 0 ? 'text-rose-600' : 'text-slate-900'} text-xs font-mono">${attSummary.lopDays || 0} Day(s)</strong>
            <span class="text-[10px] text-slate-500 block">${attSummary.absentDays || 0} Absent • ${attSummary.lateDays || 0} Late</span>
          </div>
          <div class="bg-white p-2 rounded-lg border border-indigo-100 shadow-xs">
            <span class="text-slate-400 block text-[9px] uppercase font-semibold">Daily Salary Rate</span>
            <strong class="text-slate-900 text-xs font-mono">${UI.formatCurrency(attSummary.perDayRate || Math.round((slip.baseSalary || 0) / 22))}</strong>
            <span class="text-[10px] text-slate-500 block">Basic / 22</span>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4 text-xs mb-3.5">
        <div>
          <h4 class="font-bold text-slate-900 uppercase text-[10px] mb-1.5 pb-1 border-b border-slate-200 text-emerald-700">Earnings (INR)</h4>
          <div class="space-y-1">
            <div class="flex justify-between py-0.5 border-b border-slate-100">
              <span class="text-slate-600">Basic Salary</span>
              <span class="font-mono font-medium">${UI.formatCurrency(slip.baseSalary)}</span>
            </div>
            <div class="flex justify-between py-0.5 border-b border-slate-100">
              <span class="text-slate-600">House Rent Allowance (HRA)</span>
              <span class="font-mono font-medium">${UI.formatCurrency(slip.allowances?.hra || Math.round(slip.baseSalary * 0.40))}</span>
            </div>
            <div class="flex justify-between py-0.5 border-b border-slate-100">
              <span class="text-slate-600">Special Allowance</span>
              <span class="font-mono font-medium">${UI.formatCurrency(slip.allowances?.specialAllowance || Math.round(slip.baseSalary * 0.20))}</span>
            </div>
            <div class="flex justify-between py-0.5 border-b border-slate-100">
              <span class="text-slate-600">Conveyance Allowance</span>
              <span class="font-mono font-medium">${UI.formatCurrency(slip.allowances?.conveyance || 1600)}</span>
            </div>
            <div class="flex justify-between py-1.5 font-bold text-slate-900">
              <span>Gross Earnings</span>
              <span class="font-mono text-emerald-700">${UI.formatCurrency(slip.grossPay)}</span>
            </div>
          </div>
        </div>

        <div>
          <h4 class="font-bold text-slate-900 uppercase text-[10px] mb-1.5 pb-1 border-b border-slate-200 text-rose-700">Deductions (INR)</h4>
          <div class="space-y-1">
            <div class="flex justify-between py-0.5 border-b border-slate-100">
              <span class="text-slate-600">Income Tax (TDS)</span>
              <span class="font-mono font-medium">${UI.formatCurrency(slip.deductions?.incomeTax || Math.round(slip.grossPay * 0.10))}</span>
            </div>
            <div class="flex justify-between py-0.5 border-b border-slate-100">
              <span class="text-slate-600">Provident Fund (EPF)</span>
              <span class="font-mono font-medium">${UI.formatCurrency(slip.deductions?.providentFund || Math.round(slip.baseSalary * 0.12))}</span>
            </div>
            <div class="flex justify-between py-0.5 border-b border-slate-100">
              <span class="text-slate-600">Health Insurance</span>
              <span class="font-mono font-medium">${UI.formatCurrency(slip.deductions?.healthInsurance || 1200)}</span>
            </div>
            ${lopAmount > 0 ? `
              <div class="flex justify-between py-1 border-b border-rose-100 bg-rose-50/70 px-1.5 rounded -mx-1">
                <div>
                  <span class="text-rose-800 font-bold flex items-center gap-1 text-[11px]">
                    <i class="fa-solid fa-user-clock text-rose-500 text-[9px]"></i>
                    Attendance / LOP
                  </span>
                  <span class="text-[9px] text-rose-600 block">${attSummary.lopDays}d LOP (${attSummary.absentDays} abs${attSummary.lateDays > 0 ? `, ${attSummary.lateDays} late` : ''})</span>
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
              <span class="font-mono text-rose-700">-${UI.formatCurrency(slip.totalDeductions)}</span>
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
          ${UI.formatCurrency(slip.netPay)}
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
  }
};
