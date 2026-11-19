// Employee Portal Modules & Views
const Employee = {
  activeTab: 'dashboard',
  employeeData: null,
  myLeaves: [],
  myAttendance: [],
  myPayslips: [],
  announcements: [],
  colleagues: [],
  notifications: [],
  workTimerInterval: null,

  async init() {
    this.updateLeaveBalanceHelper();
    await this.loadData();
    await this.loadNotifications();
    this.renderActiveTab();
    this.updateLeaveBalanceHelper();
  },

  async loadData() {
    const empId = Auth.user?.employeeId;
    if (!empId) return;

    try {
      const [emp, leaves, attendance, payslips, announcements, allEmployees] = await Promise.all([
        API.get(`/employees/${empId}`),
        API.get('/leaves', { employeeId: empId }),
        API.get('/attendance', { employeeId: empId }),
        API.get('/payslips', { employeeId: empId }),
        API.get('/announcements'),
        API.get('/employees')
      ]);

      this.employeeData = emp;
      this.myLeaves = leaves;
      this.myAttendance = attendance;
      this.myPayslips = payslips;
      this.announcements = announcements;
      this.colleagues = allEmployees;

      // Update stored employee profile
      Auth.employee = emp;
      localStorage.setItem('nexus_employee', JSON.stringify(emp));
      if (typeof UI !== 'undefined' && typeof UI.renderProfileDropdown === 'function') {
        UI.renderProfileDropdown();
      }
      await this.loadNotifications();
      this.updateLeaveBalanceHelper();
    } catch (err) {
      console.error('Failed to load employee data:', err);
      UI.toast('Could not refresh employee data', 'error');
    }
  },

  switchTab(tabName) {
    this.activeTab = tabName;
    document.querySelectorAll('#emp-view-container .tab-content').forEach(el => el.classList.add('hidden'));
    const tabEl = document.getElementById(`emp-tab-${tabName}`);
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
      case 'dashboard':
        this.renderDashboard();
        break;
      case 'profile':
        this.renderProfile();
        break;
      case 'attendance':
        this.renderAttendance();
        break;
      case 'leaves':
        this.renderLeaves();
        break;
      case 'payslips':
        this.renderPayslips();
        break;
      case 'directory':
        this.renderDirectory();
        break;
    }
  },

  // ---------------- 1. EMPLOYEE DASHBOARD ----------------
  renderDashboard() {
    const container = document.getElementById('emp-tab-dashboard');
    if (!container) return;

    const emp = this.employeeData || Auth.employee || {};
    const today = new Date().toISOString().split('T')[0];
    const todayAtt = this.myAttendance.find(a => a.date === today);
    const balances = emp.leaveBalances || {
      annual: { total: 20, used: 0 },
      sick: { total: 10, used: 0 },
      casual: { total: 5, used: 0 }
    };

    const unreadLeaveNotifs = (this.notifications || []).filter(n => !n.read && n.type && n.type.startsWith('leave_'));

    container.innerHTML = `
      ${unreadLeaveNotifs.length > 0 ? `
        <!-- Unread Leave Notification Alert (LEV-011) -->
        <div class="bg-indigo-50 border border-indigo-200/90 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl ${unreadLeaveNotifs[0].type === 'leave_approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'} flex items-center justify-center shrink-0">
              <i class="fa-solid ${unreadLeaveNotifs[0].type === 'leave_approved' ? 'fa-circle-check' : 'fa-circle-xmark'} text-base"></i>
            </div>
            <div>
              <div class="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                <span>${unreadLeaveNotifs[0].title}</span>
                <span class="text-[10px] font-medium text-slate-400 font-mono">${UI.formatDate(unreadLeaveNotifs[0].createdAt)}</span>
              </div>
              <div class="text-xs text-slate-600 mt-0.5 leading-snug">${unreadLeaveNotifs[0].message}</div>
            </div>
          </div>
          <button onclick="Employee.markNotificationRead('${unreadLeaveNotifs[0].id}')" class="px-3.5 py-1.5 bg-white text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold border border-indigo-200 transition-colors shrink-0">
            Acknowledge
          </button>
        </div>
      ` : ''}

      <!-- Greeting Banner -->
      <div class="bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 rounded-2xl p-6 sm:p-8 text-white shadow-xl shadow-emerald-700/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-medium text-emerald-100 mb-3 border border-white/15">
            <i class="fa-solid fa-id-card-clip text-emerald-200"></i> ${emp.department || 'Employee'} • ${emp.jobTitle || 'Staff'} • <span class="bg-white/20 px-2 py-0.5 rounded text-[11px] font-semibold">${emp.employmentType || 'Full-Time'}</span>
          </div>
          <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight">Welcome, ${emp.name || 'Team Member'}</h2>
          <p class="text-emerald-100 text-sm mt-1 max-w-xl">
            Have a productive day! Check your daily attendance, leave balances, and company bulletins below.
          </p>
        </div>
        <div class="flex flex-wrap gap-2.5 shrink-0">
          <button onclick="Employee.openLeaveModal()" class="px-4 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 font-semibold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-2">
            <i class="fa-solid fa-calendar-plus text-xs"></i> Request Leave
          </button>
          <button onclick="Employee.switchTab('attendance')" class="px-4 py-2.5 bg-emerald-950/50 hover:bg-emerald-950 text-white border border-white/20 font-semibold rounded-xl text-xs sm:text-sm transition-all flex items-center gap-2">
            <i class="fa-solid fa-clock text-xs"></i> Clock-In Desk
          </button>
        </div>
      </div>

      <!-- Quick Attendance Punch Card + Leave Balances Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <!-- Attendance Widget (5 cols) -->
        <div class="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <i class="fa-solid fa-fingerprint text-indigo-600 text-lg"></i>
                <h3 class="font-bold text-slate-900 text-sm">Today's Attendance</h3>
              </div>
              <span class="text-xs font-mono text-slate-500">${UI.formatDate(today)}</span>
            </div>

            <div class="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center mb-4">
              <div class="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Status</div>
              <div class="text-lg font-bold ${todayAtt?.clockIn ? 'text-emerald-600' : 'text-slate-500'}">
                ${todayAtt?.clockIn ? (todayAtt?.clockOut ? 'Clocked Out (Shift Complete)' : 'Clocked In & Active') : 'Not Clocked In Yet'}
              </div>
              <div class="text-xs text-slate-400 mt-1">
                ${todayAtt?.clockIn ? `In at: ${todayAtt.clockIn} ${todayAtt.clockOut ? `| Out at: ${todayAtt.clockOut}` : ''}` : 'Standard shift starts at 09:00 AM'}
              </div>
            </div>
          </div>

          <div>
            ${!todayAtt?.clockIn ? `
              <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-600 font-medium flex items-center justify-center gap-2">
                <i class="fa-solid fa-fingerprint text-slate-400 text-sm"></i>
                <span>Awaiting Biometric Entry Scan</span>
              </div>
            ` : (!todayAtt?.clockOut ? `
              <div class="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs text-emerald-800 font-medium flex items-center justify-center gap-2">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Active Shift &bull; In at ${todayAtt.clockIn}</span>
              </div>
            ` : `
              <div class="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs text-emerald-800 font-semibold flex items-center justify-center gap-1.5">
                <i class="fa-solid fa-circle-check text-emerald-600 text-sm"></i>
                <span>Shift Completed (${typeof todayAtt.totalHours === 'number' ? todayAtt.totalHours : (todayAtt.totalHours || 0)} hrs recorded)</span>
              </div>
            `)}
          </div>
        </div>

        <!-- Leave Balances Widget (7 cols) -->
        <div class="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <i class="fa-solid fa-calendar-check text-emerald-600 text-lg"></i>
                <h3 class="font-bold text-slate-900 text-sm">Time Off Balances</h3>
              </div>
              <button onclick="Employee.openLeaveModal()" class="text-xs text-emerald-700 hover:underline font-semibold">
                + Apply Leave
              </button>
            </div>

            <div class="grid grid-cols-3 gap-3 mb-4">
              <!-- Annual Leave -->
              <div class="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100">
                <div class="text-[11px] font-bold text-indigo-700 uppercase">Annual</div>
                <div class="text-2xl font-black text-indigo-900 mt-1">
                  ${balances.annual.total - balances.annual.used} <span class="text-xs font-normal text-indigo-600">left</span>
                </div>
                <div class="text-[10px] text-slate-500 mt-1">Used ${balances.annual.used} of ${balances.annual.total} days</div>
              </div>

              <!-- Sick Leave -->
              <div class="p-3.5 rounded-xl bg-rose-50/70 border border-rose-100">
                <div class="text-[11px] font-bold text-rose-700 uppercase">Sick</div>
                <div class="text-2xl font-black text-rose-900 mt-1">
                  ${balances.sick.total - balances.sick.used} <span class="text-xs font-normal text-rose-600">left</span>
                </div>
                <div class="text-[10px] text-slate-500 mt-1">Used ${balances.sick.used} of ${balances.sick.total} days</div>
              </div>

              <!-- Casual Leave -->
              <div class="p-3.5 rounded-xl bg-amber-50/70 border border-amber-100">
                <div class="text-[11px] font-bold text-amber-700 uppercase">Casual</div>
                <div class="text-2xl font-black text-amber-900 mt-1">
                  ${balances.casual.total - balances.casual.used} <span class="text-xs font-normal text-amber-600">left</span>
                </div>
                <div class="text-[10px] text-slate-500 mt-1">Used ${balances.casual.used} of ${balances.casual.total} days</div>
              </div>
            </div>
          </div>

          <div class="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Next Public Holiday: <strong>Thanksgiving Break (Nov 26-27)</strong></span>
            <span class="text-emerald-700 font-semibold">2 Days Off</span>
          </div>
        </div>

      </div>

      <!-- My Leave Requests & Company Announcements -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <!-- My Leaves (7 cols) -->
        <div class="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div class="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 class="font-bold text-slate-900 text-sm">My Recent Leave Requests</h3>
            <button onclick="Employee.switchTab('leaves')" class="text-xs font-semibold text-emerald-700 hover:underline">
              View History (${this.myLeaves.length}) &rarr;
            </button>
          </div>

          <div class="divide-y divide-slate-100">
            ${this.myLeaves.length === 0 ? `
              <div class="p-8 text-center text-slate-400 text-sm">
                <p>You haven't requested any leaves yet.</p>
              </div>
            ` : this.myLeaves.slice(0, 4).map(leave => `
              <div class="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-slate-900">${leave.leaveType} Leave</span>
                    <span class="text-xs text-slate-500">(${leave.days} ${leave.days === 1 ? 'day' : 'days'})</span>
                  </div>
                  <div class="text-xs text-slate-500 mt-0.5">
                    ${UI.formatDate(leave.startDate)} to ${UI.formatDate(leave.endDate)}
                  </div>
                  <p class="text-xs text-slate-600 italic mt-0.5">"${leave.reason}"</p>
                  ${leave.reviewComment ? `<p class="text-[11px] text-slate-500 mt-1 font-medium"><i class="fa-solid fa-comment-dots mr-1"></i> Manager Note: ${leave.reviewComment}</p>` : ''}
                </div>
                <span class="px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${leave.status === 'Pending' ? 'bg-amber-100 text-amber-800' : (leave.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800')}">
                  ${leave.status}
                </span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Bulletin Board (5 cols) -->
        <div class="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div class="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 class="font-bold text-slate-900 text-sm">Company Announcements</h3>
            <span class="text-xs text-slate-400">${this.announcements.length} Notices</span>
          </div>

          <div class="p-4 space-y-3">
            ${this.announcements.slice(0, 3).map(ann => `
              <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
                <div class="flex items-center justify-between text-[11px] mb-1">
                  <span class="px-2 py-0.5 rounded font-semibold ${ann.priority === 'High' ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-700'}">${ann.priority}</span>
                  <span class="text-slate-400">${UI.formatDate(ann.date)}</span>
                </div>
                <h4 class="text-xs font-bold text-slate-900">${ann.title}</h4>
                <p class="text-xs text-slate-600 mt-1 line-clamp-2">${ann.content}</p>
              </div>
            `).join('')}
          </div>
        </div>

      </div>
    `;
  },

  // ---------------- 2. EMPLOYEE ATTENDANCE ----------------
  renderAttendance() {
    const container = document.getElementById('emp-tab-attendance');
    if (!container) return;

    const today = new Date().toISOString().split('T')[0];
    const todayAtt = this.myAttendance.find(a => a.date === today);

    container.innerHTML = `
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-slate-900">My Attendance & Hours</h2>
          <p class="text-xs text-slate-500 mt-0.5">Track daily biometric scan times and historical working hours</p>
        </div>
        <button onclick="UI.openModal('modal-request-attendance-correction')" class="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-xl text-xs sm:text-sm border border-indigo-200 flex items-center gap-1.5 transition-colors">
          <i class="fa-solid fa-clock-rotate-left text-xs"></i>
          <span>Request Punch Correction</span>
        </button>
      </div>

      <!-- Action Card -->
      <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm max-w-xl">
        <div class="flex items-center justify-between mb-4">
          <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Shift</span>
          <span class="text-xs font-mono text-slate-600">${UI.formatDate(today)}</span>
        </div>

        <div class="bg-slate-50 rounded-xl p-5 border border-slate-200 text-center mb-5">
          <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Checked In Time</div>
          <div class="text-3xl font-extrabold ${todayAtt?.clockIn ? 'text-slate-900' : 'text-slate-400'} font-mono mb-1" id="emp-checked-in-time">
            ${todayAtt?.clockIn || '--:--'}
          </div>
          <p class="text-xs text-slate-500">Official Office Hours: 09:00 AM - 05:30 PM</p>
        </div>

        <div class="space-y-3">
          ${!todayAtt?.clockIn ? `
            <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
              <i class="fa-solid fa-fingerprint text-slate-400 text-2xl mb-1.5"></i>
              <div class="text-sm font-semibold text-slate-700">Awaiting Biometric Entry Punch</div>
              <p class="text-xs text-slate-500 mt-1">Recorded automatically when you scan at the office biometric device</p>
            </div>
          ` : (!todayAtt?.clockOut ? `
            <div class="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
              <div class="flex items-center justify-center gap-2 mb-1">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span class="text-sm font-bold text-emerald-800">Shift In Progress (Active)</span>
              </div>
              <div class="text-xs text-emerald-700">Clocked in via biometric machine at <strong>${todayAtt.clockIn}</strong></div>
              <div class="text-[11px] text-slate-500 mt-1.5">Scan biometric device on departure to record exit time</div>
            </div>
          ` : `
            <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
              <i class="fa-solid fa-circle-check text-emerald-600 text-2xl mb-1"></i>
              <div class="text-sm font-bold text-slate-900">Shift Completed for Today</div>
              <div class="text-xs text-slate-500 mt-0.5">${todayAtt.clockIn} &rarr; ${todayAtt.clockOut} (${typeof todayAtt.totalHours === 'number' ? todayAtt.totalHours : (todayAtt.totalHours || 0)} hrs)</div>
            </div>
          `)}
        </div>
      </div>

      <!-- History Table -->
      <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div class="p-4 border-b border-slate-100">
          <h3 class="font-bold text-slate-900 text-sm">Attendance History</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th class="px-5 py-3">Date</th>
                <th class="px-5 py-3">Clock In</th>
                <th class="px-5 py-3">Clock Out</th>
                <th class="px-5 py-3">Total Hours</th>
                <th class="px-5 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-slate-700">
              ${this.myAttendance.map(a => `
                <tr class="hover:bg-slate-50 transition-colors">
                  <td class="px-5 py-3.5 font-mono text-xs text-slate-900 font-semibold">${a.date}</td>
                  <td class="px-5 py-3.5 text-xs text-emerald-600 font-mono font-medium">${a.clockIn || '--'}</td>
                  <td class="px-5 py-3.5 text-xs text-slate-600 font-mono">${a.clockOut || '--'}</td>
                  <td class="px-5 py-3.5 text-xs font-semibold text-slate-800">${typeof a.totalHours === 'number' ? `${a.totalHours} hrs` : (a.totalHours ? `${a.totalHours} hrs` : '--')}</td>
                  <td class="px-5 py-3.5 text-center">
                    <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold ${a.status === 'Present' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}">
                      ${a.status}
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

  // ---------------- 3. EMPLOYEE LEAVES ----------------
  renderLeaves() {
    const container = document.getElementById('emp-tab-leaves');
    if (!container) return;

    const emp = this.employeeData || Auth.employee || {};
    const balances = emp.leaveBalances || {
      annual: { total: 20, used: 0 },
      sick: { total: 10, used: 0 },
      casual: { total: 5, used: 0 }
    };

    container.innerHTML = `
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-slate-900">Leave Applications & Entitlements</h2>
          <p class="text-xs text-slate-500 mt-0.5">Submit new time-off requests and monitor approval status</p>
        </div>
        <button onclick="Employee.openLeaveModal()" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm shadow-md shadow-emerald-600/20 flex items-center gap-2">
          <i class="fa-solid fa-calendar-plus text-xs"></i>
          <span>Request Time Off</span>
        </button>
      </div>

      <!-- Balance Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div class="text-xs font-bold text-indigo-700 uppercase tracking-wider">Annual Leave</div>
          <div class="text-3xl font-extrabold text-slate-900 mt-1">${balances.annual.total - balances.annual.used} <span class="text-xs font-normal text-slate-500">days available</span></div>
          <div class="text-xs text-slate-500 mt-1">Total allocated: ${balances.annual.total} | Consumed: ${balances.annual.used}</div>
        </div>

        <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div class="text-xs font-bold text-rose-700 uppercase tracking-wider">Sick Leave</div>
          <div class="text-3xl font-extrabold text-slate-900 mt-1">${balances.sick.total - balances.sick.used} <span class="text-xs font-normal text-slate-500">days available</span></div>
          <div class="text-xs text-slate-500 mt-1">Total allocated: ${balances.sick.total} | Consumed: ${balances.sick.used}</div>
        </div>

        <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div class="text-xs font-bold text-amber-700 uppercase tracking-wider">Casual / Personal</div>
          <div class="text-3xl font-extrabold text-slate-900 mt-1">${balances.casual.total - balances.casual.used} <span class="text-xs font-normal text-slate-500">days available</span></div>
          <div class="text-xs text-slate-500 mt-1">Total allocated: ${balances.casual.total} | Consumed: ${balances.casual.used}</div>
        </div>
      </div>

      <!-- Leaves History Table -->
      <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div class="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 class="font-bold text-slate-900 text-sm">My Leave Records</h3>
          <span class="text-xs text-slate-400">${this.myLeaves.length} Requests Filed</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th class="px-5 py-3">Leave Type</th>
                <th class="px-5 py-3">Duration</th>
                <th class="px-5 py-3">Days</th>
                <th class="px-5 py-3">Reason</th>
                <th class="px-5 py-3">Review Notes</th>
                <th class="px-5 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-slate-700">
              ${this.myLeaves.length === 0 ? `
                <tr><td colspan="6" class="text-center py-8 text-slate-400 text-sm">No leave records yet.</td></tr>
              ` : this.myLeaves.map(leave => `
                <tr class="hover:bg-slate-50 transition-colors">
                  <td class="px-5 py-3.5 font-bold text-slate-900 text-xs">${leave.leaveType} Leave</td>
                  <td class="px-5 py-3.5 text-xs text-slate-600 font-medium">
                    ${UI.formatDate(leave.startDate)} &rarr; ${UI.formatDate(leave.endDate)}
                  </td>
                  <td class="px-5 py-3.5 text-xs font-bold text-slate-800">${leave.days}</td>
                  <td class="px-5 py-3.5 text-xs text-slate-600 max-w-xs truncate">${leave.reason}</td>
                  <td class="px-5 py-3.5 text-xs text-slate-500 italic">${leave.reviewComment || '--'}</td>
                  <td class="px-5 py-3.5 text-center">
                    <span class="px-2.5 py-1 rounded-full text-xs font-bold ${leave.status === 'Pending' ? 'bg-amber-100 text-amber-800' : (leave.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800')}">
                      ${leave.status}
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

  // ---------------- 4. EMPLOYEE PAYROLL ----------------
  renderPayslips() {
    const container = document.getElementById('emp-tab-payslips');
    if (!container) return;

    const emp = this.employeeData || Auth.employee || {};
    // ONLY display payslips that HR/Finance has approved, finalized or paid!
    const approvedSlips = (this.myPayslips || []).filter(p => p.status === 'Approved' || p.status === 'Paid' || p.status === 'Finalized');

    container.innerHTML = `
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-slate-900">Salary & Payroll Statements</h2>
          <p class="text-xs text-slate-500 mt-0.5">Access and print official monthly payroll statements approved by HR</p>
        </div>
      </div>

      ${approvedSlips.length === 0 ? `
        <div class="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-sm">
          <div class="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-100">
            <i class="fa-solid fa-file-invoice text-2xl"></i>
          </div>
          <h3 class="text-base font-bold text-slate-900">No Approved Payroll Statements Available Yet</h3>
          <p class="text-xs text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">
            Your payroll statements are currently being reviewed by HR. Once HR approves and releases your payroll statements, they will automatically appear here for you to view and download.
          </p>
        </div>
      ` : `
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th class="px-5 py-3.5">Pay Period</th>
                  <th class="px-5 py-3.5">Salary</th>
                  <th class="px-5 py-3.5">LOP Deduction</th>
                  <th class="px-5 py-3.5">Net Take-Home</th>
                  <th class="px-5 py-3.5 text-center">HR Approval Status</th>
                  <th class="px-5 py-3.5 text-right">Statement</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 text-slate-700">
                ${approvedSlips.map(slip => {
                  const lopAmount = slip.deductions?.attendanceDeduction || slip.deductions?.lossOfPay || (slip.totalDeductions !== undefined ? slip.totalDeductions : 0);
                  const lopDays = slip.attendanceSummary?.lopDays || (lopAmount > 0 ? 1 : 0);
                  const salary = slip.baseSalary || slip.grossPay || 0;
                  const netPay = slip.netPay !== undefined ? slip.netPay : (salary - lopAmount);
                  return `
                    <tr class="hover:bg-slate-50 transition-colors">
                      <td class="px-5 py-4">
                        <div class="font-bold text-slate-900">${slip.month} ${slip.year}</div>
                        <div class="text-[11px] text-slate-400">Paid on ${UI.formatDate(slip.payDate)}</div>
                      </td>
                      <td class="px-5 py-4 font-mono text-xs text-slate-900 font-medium">${UI.formatCurrency(salary)}</td>
                      <td class="px-5 py-4">
                        <div class="font-mono text-xs text-rose-600 font-semibold">${lopAmount > 0 ? `-${UI.formatCurrency(lopAmount)}` : '₹0'}</div>
                        ${lopAmount > 0 ? `
                          <div class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 mt-1">
                            <i class="fa-solid fa-clock-rotate-left text-[9px]"></i>
                            <span>LOP: -${UI.formatCurrency(lopAmount)} (${lopDays}d)</span>
                          </div>
                        ` : `
                          <div class="text-[10px] text-emerald-600 mt-0.5 font-medium">₹0 LOP (100% Present)</div>
                        `}
                      </td>
                      <td class="px-5 py-4 font-mono text-xs font-bold text-emerald-600">${UI.formatCurrency(netPay)}</td>
                      <td class="px-5 py-4 text-center">
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <i class="fa-solid fa-circle-check text-[10px]"></i> Approved & Released
                        </span>
                      </td>
                      <td class="px-5 py-4 text-right">
                        <button onclick="Employee.viewPayslip('${slip.id}')" class="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200 transition-colors inline-flex items-center gap-1.5">
                          <i class="fa-solid fa-file-invoice"></i> View Statement
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `}
    `;
  },

  viewPayslip(slipId) {
    const slip = (this.myPayslips || []).find(p => p.id === slipId);
    if (!slip) {
      UI.toast('Could not find selected payroll statement', 'error');
      return;
    }

    // Safety check: employee should NEVER view unapproved slips
    if (slip.status !== 'Approved' && slip.status !== 'Paid' && slip.status !== 'Finalized') {
      UI.toast('This payroll statement has not been approved by HR yet', 'warning');
      return;
    }

    const emp = this.employeeData || Auth.employee || {};
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
    const isFinalized = slip.status === 'Finalized';

    payslipContainer.innerHTML = `
      <div class="${isFinalized ? 'bg-purple-50 border-purple-200 text-purple-900' : 'bg-emerald-50 border-emerald-200 text-emerald-800'} border rounded-xl p-2.5 mb-3.5 flex items-center justify-between text-xs no-print">
        <div class="flex items-center gap-2">
          <i class="fa-solid ${isFinalized ? 'fa-lock text-purple-600' : 'fa-circle-check text-emerald-600'} text-base"></i>
          <div>
            <span class="font-bold">${isFinalized ? 'Official Finalized Statement' : 'Official Approved Statement'}</span>
            <span class="text-slate-500 text-[11px] ml-1.5">• Verified on ${slip.finalizedAt || slip.approvedAt || UI.formatDate(slip.payDate)}</span>
          </div>
        </div>
        <span class="px-2.5 py-0.5 ${isFinalized ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'} font-bold rounded-full text-[10px]">VERIFIED</span>
      </div>

      <div class="border-b border-slate-200 pb-3 mb-3.5 flex justify-between items-start">
        <div>
          <div class="flex items-center gap-2.5 mb-2">
            <div class="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
              <i class="fa-solid fa-people-roof"></i>
            </div>
            <span class="text-xl font-extrabold text-slate-900">NexusHR Technologies Pvt. Ltd.</span>
          </div>
          <p class="text-xs text-slate-500">Outer Ring Road, Bengaluru, Karnataka 560103</p>
          <p class="text-xs text-slate-500">PAN: AABCN8192F • payroll@nexushr.in</p>
        </div>
        <div class="text-right">
          <span class="px-3 py-1 ${isFinalized ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'} text-xs font-bold rounded-full">${isFinalized ? 'FINALIZED / PAID' : 'APPROVED / PAID'}</span>
          <div class="text-xs text-slate-400 mt-2">Statement Month</div>
          <div class="text-sm font-bold text-slate-900">${slip.month} ${slip.year}</div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 mb-3.5 text-xs">
        <div>
          <span class="text-slate-400 block">Employee Name</span>
          <strong class="text-slate-900 text-sm">${emp.name || slip.employeeName}</strong>
          <span class="text-slate-500 block mt-1">ID: ${emp.id || slip.employeeId}</span>
        </div>
        <div>
          <span class="text-slate-400 block">Designation & Department</span>
          <strong class="text-slate-900 text-sm">${emp.jobTitle}</strong>
          <span class="text-slate-500 block mt-1">${emp.department} • ${emp.employmentType || 'Full-Time'}</span>
        </div>
      </div>

      <!-- Attendance & Working Days Summary Card -->
      <div class="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3 mb-3.5">
        <div class="flex items-center justify-between mb-2.5">
          <span class="text-xs font-bold text-indigo-900 uppercase tracking-wide flex items-center gap-1.5">
            <i class="fa-solid fa-calendar-check text-indigo-600"></i>
            <span>Monthly Attendance & Leave Summary</span>
          </span>
          <span class="text-[11px] text-indigo-700 font-semibold">${slip.salaryStructureName || 'Standard Corporate'} • ${attSummary.salaryDivisor || 30}-Day Divisor (BR-PAY-02)</span>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div class="bg-white p-2.5 rounded-lg border border-indigo-100 shadow-xs">
            <span class="text-slate-400 block text-[10px] uppercase font-semibold">Working Days</span>
            <strong class="text-slate-900 text-sm font-mono">${attSummary.salaryDivisor || attSummary.totalWorkingDays || 30} Days</strong>
            <span class="text-[10px] text-slate-500 block">Standard Shift Calendar</span>
          </div>
          <div class="bg-white p-2.5 rounded-lg border border-indigo-100 shadow-xs">
            <span class="text-slate-400 block text-[10px] uppercase font-semibold">Payable Days (PAY-004)</span>
            <strong class="text-emerald-700 text-sm font-mono">${attSummary.payableDays !== undefined ? attSummary.payableDays : ((attSummary.presentDays || 0) + (attSummary.paidLeaveDays || 0))} Days</strong>
            <span class="text-[10px] text-slate-500 block">${attSummary.presentDays || 0} Pres + ${attSummary.paidLeaveDays || 0} Paid Lv</span>
          </div>
          <div class="bg-white p-2.5 rounded-lg border border-indigo-100 shadow-xs">
            <span class="text-slate-400 block text-[10px] uppercase font-semibold">Loss of Pay (LOP) Days</span>
            <strong class="${(attSummary.lopDays || 0) > 0 ? 'text-rose-600' : 'text-slate-900'} text-sm font-mono">${attSummary.lopDays || 0} Day(s)</strong>
            <span class="text-[10px] text-slate-500 block">${attSummary.absentDays || 0} Absent • ${attSummary.lateDays || 0} Late</span>
          </div>
          <div class="bg-white p-2.5 rounded-lg border border-indigo-100 shadow-xs">
            <span class="text-slate-400 block text-[10px] uppercase font-semibold">Per-Day Salary Rate</span>
            <strong class="text-slate-900 text-sm font-mono">${UI.formatCurrency(attSummary.perDayRate || Math.round((slip.monthlyCTC || slip.baseSalary || 0) / (attSummary.salaryDivisor || 30)))}</strong>
            <span class="text-[10px] text-slate-500 block">Base / ${attSummary.salaryDivisor || 30}</span>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4 text-xs mb-3.5">
        <div>
          <h4 class="font-bold text-slate-900 uppercase text-[11px] mb-2 pb-1 border-b border-slate-200 text-emerald-700">Earnings (INR)</h4>
          <div class="space-y-1.5">
            <div class="flex justify-between py-1 border-b border-slate-100">
              <span class="text-slate-600">Basic Salary</span>
              <span class="font-mono font-medium">${UI.formatCurrency(slip.baseSalary || slip.grossPay)}</span>
            </div>
            <div class="flex justify-between py-2 font-bold text-slate-900">
              <span>Total Gross Earnings</span>
              <span class="font-mono text-emerald-700">${UI.formatCurrency(slip.baseSalary || slip.grossPay)}</span>
            </div>
          </div>
        </div>

        <div>
          <h4 class="font-bold text-slate-900 uppercase text-[11px] mb-2 pb-1 border-b border-slate-200 text-rose-700">Deductions (INR)</h4>
          <div class="space-y-1.5">
            ${lopAmount > 0 ? `
              <div class="flex justify-between py-1.5 border-b border-rose-100 bg-rose-50/70 px-2 rounded -mx-2">
                <div>
                  <span class="text-rose-800 font-bold flex items-center gap-1">
                    <i class="fa-solid fa-user-clock text-rose-500 text-[10px]"></i>
                    Attendance / Loss of Pay (LOP)
                  </span>
                  <span class="text-[10px] text-rose-600 block mt-0.5">${attSummary.lopDays || 1} day(s) deduction (${attSummary.absentDays || 0} absent${(attSummary.lateDays || 0) > 0 ? `, ${attSummary.lateDays} late` : ''})</span>
                </div>
                <span class="font-mono font-bold text-rose-700">-${UI.formatCurrency(lopAmount)}</span>
              </div>
            ` : `
              <div class="flex justify-between py-1 border-b border-slate-100">
                <span class="text-slate-600">Attendance / LOP Deduction</span>
                <span class="font-mono text-emerald-600 font-medium">₹0 (100% Present)</span>
              </div>
            `}
            <div class="flex justify-between py-2 font-bold text-slate-900">
              <span>Total Deductions</span>
              <span class="font-mono text-rose-700">${lopAmount > 0 ? `-${UI.formatCurrency(lopAmount)}` : '₹0'}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-indigo-50 border border-indigo-100 p-3 rounded-xl flex items-center justify-between">
        <div>
          <span class="text-xs text-indigo-700 uppercase font-semibold block">Net Disbursed Take-Home</span>
          <span class="text-xs text-slate-500">NEFT / RTGS Direct Bank Transfer</span>
        </div>
        <div class="text-2xl font-black text-indigo-900 font-mono">
          ${UI.formatCurrency((slip.baseSalary || slip.grossPay) - lopAmount)}
        </div>
      </div>
    `;

    UI.openModal('modal-view-payslip');
  },

  // ---------------- 5. EMPLOYEE TEAM DIRECTORY ----------------
  renderDirectory() {
    const container = document.getElementById('emp-tab-directory');
    if (!container) return;

    container.innerHTML = `
      <div>
        <h2 class="text-xl font-bold text-slate-900">Team Directory</h2>
        <p class="text-xs text-slate-500 mt-0.5">Find contact info and department peers</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        ${this.colleagues.map(col => `
          <div class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-start gap-4">
            <img src="${col.avatar}" class="w-12 h-12 rounded-full object-cover ring-2 ring-slate-100" alt="${col.name}">
            <div class="min-w-0 flex-1">
              <h4 class="font-bold text-slate-900 text-sm truncate">${col.name}</h4>
              <p class="text-xs text-indigo-600 font-medium truncate">${col.jobTitle}</p>
              <div class="flex items-center gap-1.5 mt-1">
                <span class="inline-block px-2 py-0.5 text-[10px] bg-slate-100 text-slate-600 rounded font-semibold">
                  ${col.department}
                </span>
                <span class="inline-block px-2 py-0.5 text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 rounded font-semibold">
                  ${col.employmentType || 'Full-Time'}
                </span>
              </div>
              <div class="text-[11px] text-slate-500 mt-2 space-y-0.5 truncate">
                <div><i class="fa-regular fa-envelope text-slate-400 mr-1"></i> ${col.email}</div>
                <div><i class="fa-solid fa-location-dot text-slate-400 mr-1"></i> ${col.location}</div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  // ---------------- ACTIONS ----------------
  async clockIn() {
    const empId = Auth.user?.employeeId;
    try {
      await API.post('/attendance/clock-in', { employeeId: empId });
      UI.toast('You have successfully clocked in for today!', 'success');
      await this.loadData();
      this.renderActiveTab();
    } catch (err) {
      UI.toast(err.message || 'Clock in failed', 'error');
    }
  },

  async clockOut() {
    const empId = Auth.user?.employeeId;
    try {
      await API.post('/attendance/clock-out', { employeeId: empId });
      UI.toast('You have successfully clocked out. Great work today!', 'success');
      await this.loadData();
      this.renderActiveTab();
    } catch (err) {
      UI.toast(err.message || 'Clock out failed', 'error');
    }
  },

  openLeaveModal() {
    this.resetLeaveModal();
    UI.openModal('modal-request-leave');
    this.updateLeaveBalanceHelper();
  },

  resetLeaveModal() {
    const badgeContainer = document.getElementById('available-balance-badge');
    if (badgeContainer) {
      badgeContainer.className = 'text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 transition-colors';
    }
    const durContainer = document.getElementById('leave-duration-preview');
    if (durContainer) {
      durContainer.className = 'p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between transition-colors';
      durContainer.classList.remove('animate-shake');
    }
    const durText = document.getElementById('leave-duration-text');
    if (durText) {
      durText.className = 'font-bold text-slate-900';
      durText.textContent = '--';
    }
    const form = document.getElementById('form-request-leave');
    if (form) form.reset();
    this.updateLeaveBalanceHelper();
  },

  updateLeaveBalanceHelper() {
    const typeSelect = document.getElementById('leave-type-select');
    const startInput = document.getElementById('leave-start-date');
    const endInput = document.getElementById('leave-end-date');
    const badgeEl = document.getElementById('leave-balance-count');
    const badgeContainer = document.getElementById('available-balance-badge');
    const durContainer = document.getElementById('leave-duration-preview');
    const durText = document.getElementById('leave-duration-text');

    if (!typeSelect) return;
    const typeKey = (typeSelect.value || 'annual').toLowerCase();
    const typeLabel = typeSelect.options[typeSelect.selectedIndex]?.text || typeSelect.value || 'Leave';
    const emp = this.employeeData || (typeof Auth !== 'undefined' && Auth.employee) || {};
    const defaultBalances = {
      annual: { total: 20, used: 0 },
      sick: { total: 10, used: 0 },
      casual: { total: 5, used: 0 }
    };
    const balances = emp.leaveBalances || defaultBalances;
    const balanceInfo = balances[typeKey] || defaultBalances[typeKey] || { total: 0, used: 0 };
    const remaining = Math.max(0, (balanceInfo.total || 0) - (balanceInfo.used || 0));

    if (badgeEl) {
      badgeEl.textContent = `${remaining} day(s) left`;
    }

    let calculatedDays = 0;
    let hasDates = Boolean(startInput && endInput && startInput.value && endInput.value);
    let isDateInvalid = false;

    if (hasDates && durText) {
      const start = new Date(startInput.value);
      const end = new Date(endInput.value);
      if (end >= start) {
        calculatedDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
        durText.textContent = `${calculatedDays} day${calculatedDays > 1 ? 's' : ''}`;
      } else {
        isDateInvalid = true;
      }
    }

    // Validation checks
    if (isDateInvalid) {
      if (durContainer) {
        durContainer.className = 'p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs flex items-center justify-between transition-colors';
      }
      if (durText) {
        durText.innerHTML = `<span class="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-md border border-rose-200"><i class="fa-solid fa-triangle-exclamation text-[10px]"></i> Invalid date range</span>`;
      }
    } else if (hasDates && calculatedDays > remaining) {
      const deficit = calculatedDays - remaining;
      if (badgeContainer) {
        badgeContainer.className = 'text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-300 transition-colors';
      }
      if (durContainer) {
        durContainer.className = 'p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs flex items-center justify-between transition-colors';
      }
      if (durText) {
        durText.innerHTML = `<span class="text-rose-700 font-extrabold">${calculatedDays} day${calculatedDays > 1 ? 's' : ''}</span> <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-md border border-rose-200"><i class="fa-solid fa-triangle-exclamation text-[10px]"></i> Exceeds limit by ${deficit}d</span>`;
      }
    } else {
      if (badgeContainer) {
        badgeContainer.className = 'text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 transition-colors';
      }
      if (durContainer) {
        durContainer.className = 'p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between transition-colors';
      }
      if (durText) {
        durText.className = 'font-bold text-slate-900';
        if (hasDates) {
          durText.textContent = `${calculatedDays} day${calculatedDays > 1 ? 's' : ''}`;
        } else {
          durText.textContent = '--';
        }
      }
    }
  },

  async submitLeaveRequest(event) {
    event.preventDefault();
    const empId = Auth.user?.employeeId;
    const typeSelect = document.getElementById('leave-type-select');
    const leaveType = typeSelect.value;
    const typeLabel = typeSelect.options[typeSelect.selectedIndex]?.text || leaveType;
    const startDate = document.getElementById('leave-start-date').value;
    const endDate = document.getElementById('leave-end-date').value;
    const reason = document.getElementById('leave-reason').value;
    const durContainer = document.getElementById('leave-duration-preview');

    const showInlineError = (toastMsg) => {
      if (durContainer) {
        durContainer.classList.remove('animate-shake');
        void durContainer.offsetWidth; // trigger reflow for animation restart
        durContainer.classList.add('animate-shake');
      }
      UI.toast(toastMsg, 'error');
    };

    if (!startDate || !endDate || !reason) {
      showInlineError('Please fill all required leave fields before submitting.');
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      showInlineError('End date cannot be earlier than start date.');
      return;
    }

    // LEV-004: Calculate requested leave duration
    const calculatedDays = Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1);

    // LEV-005: System shall check available leave balance
    const typeKey = (leaveType || 'annual').toLowerCase();
    const emp = this.employeeData || (typeof Auth !== 'undefined' && Auth.employee) || {};
    const defaultBalances = {
      annual: { total: 20, used: 0 },
      sick: { total: 10, used: 0 },
      casual: { total: 5, used: 0 }
    };
    const balances = emp.leaveBalances || defaultBalances;
    const balanceInfo = balances[typeKey] || defaultBalances[typeKey];
    if (balanceInfo) {
      const remaining = Math.max(0, (balanceInfo.total || 0) - (balanceInfo.used || 0));
      if (calculatedDays > remaining) {
        const deficit = calculatedDays - remaining;
        showInlineError(
          `Insufficient leave balance: You requested ${calculatedDays} day(s), but only ${remaining} day(s) remain for ${typeLabel} (exceeds by ${deficit}d).`
        );
        return;
      }
    }

    try {
      await API.post('/leaves', {
        employeeId: empId,
        leaveType,
        startDate,
        endDate,
        days: calculatedDays,
        reason
      });

      this.resetLeaveModal();
      UI.toast('Leave application submitted for HR review!', 'success');
      UI.closeModal('modal-request-leave');
      await this.loadData();
      this.renderActiveTab();
      this.updateLeaveBalanceHelper();
    } catch (err) {
      showInlineError(err.message || 'Failed to submit leave application');
    }
  },

  // LEV-011: Notification handlers
  async loadNotifications() {
    try {
      const empId = Auth.user?.employeeId;
      if (!empId) return;
      const notifs = await API.get(`/notifications?employeeId=${empId}`);
      this.notifications = notifs || [];
      const unreadCount = this.notifications.filter(n => !n.read).length;
      UI.updateNotificationBadge(unreadCount);
      this.renderNotificationsList();
    } catch (e) {
      console.warn('Could not load notifications:', e);
    }
  },

  renderNotificationsList() {
    const listEl = document.getElementById('notifications-list');
    if (!listEl) return;
    if (!this.notifications || this.notifications.length === 0) {
      listEl.innerHTML = `<div class="p-4 text-center text-slate-400">No notifications at this time.</div>`;
      return;
    }
    listEl.innerHTML = this.notifications.map(n => `
      <div class="p-2.5 ${n.read ? 'bg-white opacity-70' : 'bg-indigo-50/70 border border-indigo-100'} rounded-xl transition-all">
        <div class="flex items-center justify-between">
          <span class="font-bold text-slate-900">${n.title}</span>
          <span class="text-[10px] text-slate-400 font-mono">${UI.formatDate(n.createdAt)}</span>
        </div>
        <p class="text-slate-600 text-xs mt-1 leading-snug">${n.message}</p>
        ${!n.read ? `
          <button onclick="Employee.markNotificationRead('${n.id}')" class="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold mt-1 inline-flex items-center gap-1">
            <i class="fa-solid fa-check text-[9px]"></i> Mark as read
          </button>
        ` : ''}
      </div>
    `).join('');
  },

  async markNotificationRead(id) {
    try {
      await API.patch(`/notifications/${id}/read`);
      await this.loadNotifications();
      this.renderActiveTab();
    } catch (e) {
      console.error('Failed to mark notification read:', e);
    }
  },

  async submitAttendanceCorrectionRequest(event) {
    event.preventDefault();
    const date = document.getElementById('req-corr-date').value;
    const requestedIn = document.getElementById('req-corr-in').value.trim();
    const requestedOut = document.getElementById('req-corr-out').value.trim();
    const reason = document.getElementById('req-corr-reason').value.trim();

    try {
      const res = await API.post('/attendance/correction-requests', {
        employeeId: Auth.employee?.id || Auth.user?.employeeId,
        date,
        requestedIn,
        requestedOut,
        reason
      });

      UI.toast('Correction request submitted to HR for review!', 'success');
      UI.closeModal('modal-request-attendance-correction');
      document.getElementById('form-request-attendance-correction').reset();
    } catch (err) {
      UI.toast(err.message || 'Failed to submit correction request', 'error');
    }
  },

  // ---------------- 6. EMPLOYEE PROFILE (EMP-009) ----------------
  renderProfile() {
    const container = document.getElementById('emp-tab-profile');
    if (!container) return;

    const emp = this.employeeData || Auth.employee || {};
    const struct = emp.salaryStructure || {
      name: emp.salaryStructureId === 'STR-002' ? 'Executive Leadership Structure' :
            emp.salaryStructureId === 'STR-003' ? 'Junior & Trainee Structure' : 'Standard Corporate Structure',
      basicPercentage: 50,
      hraPercentage: 30,
      specialAllowancePercentage: 15,
      conveyanceFixed: 1600,
      pfPercentage: 12,
      taxPercentage: 10,
      healthInsuranceFixed: 1200
    };

    const monthly = Math.round((emp.salary || 0) / 12);
    const basic = Math.round(monthly * ((struct.basicPercentage || 50) / 100));
    const hra = Math.round(monthly * ((struct.hraPercentage || 30) / 100));
    const special = Math.round(monthly * ((struct.specialAllowancePercentage || 15) / 100));
    const conveyance = struct.conveyanceFixed || 1600;

    const balances = emp.leaveBalances || {
      annual: { total: 20, used: 0 },
      sick: { total: 10, used: 0 },
      casual: { total: 5, used: 0 }
    };

    const isInactive = emp.status === 'Inactive';

    container.innerHTML = `
      <!-- Profile Hero Banner -->
      <div class="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-indigo-900/40 relative overflow-hidden">
        <div class="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute right-12 top-6 opacity-10 hidden sm:block">
          <i class="fa-solid fa-id-card-clip text-9xl"></i>
        </div>

        <div class="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div class="flex items-center gap-5">
            <div class="relative group cursor-pointer shrink-0" onclick="UI.openChangeAvatarModal('${emp.id}')" title="Click to change profile image">
              <img src="${emp.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop&crop=faces'}" class="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover ring-4 ring-white/10 shadow-xl group-hover:opacity-85 transition-all" alt="${emp.name}">
              <div class="absolute inset-0 bg-slate-900/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                <i class="fa-solid fa-camera text-white text-base"></i>
              </div>
              <span class="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-[10px] shadow-lg border-2 border-slate-900" title="Change Photo">
                <i class="fa-solid fa-camera"></i>
              </span>
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                <h1 class="text-xl sm:text-2xl font-extrabold tracking-tight">${emp.name}</h1>
                <span class="px-3 py-1 rounded-full text-xs font-bold ${isInactive ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}">
                  ${emp.status || 'Active'}
                </span>
                <span class="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-white/10 text-indigo-200 border border-white/10">
                  ${emp.id}
                </span>
              </div>
              <p class="text-indigo-200 text-sm font-medium">${emp.jobTitle} • <span class="text-white/80">${emp.department}</span></p>
              <div class="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-300">
                <span class="flex items-center gap-1.5"><i class="fa-solid fa-location-dot text-indigo-400"></i> ${emp.location || 'HQ Office'}</span>
                <span class="flex items-center gap-1.5"><i class="fa-solid fa-briefcase text-indigo-400"></i> ${emp.employmentType || 'Full-Time'}</span>
                <span class="flex items-center gap-1.5"><i class="fa-regular fa-calendar-check text-indigo-400"></i> Joined ${UI.formatDate(emp.joinDate)}</span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="UI.openChangeAvatarModal('${emp.id}')" class="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-semibold backdrop-blur-sm transition-all flex items-center gap-2 shadow-sm">
              <i class="fa-solid fa-camera"></i> Change Photo
            </button>
          </div>
        </div>
      </div>

      <!-- Main Profile Information Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

        <!-- 1. Personal & Contact Details -->
        <div class="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div class="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm">
              <i class="fa-solid fa-user-circle"></i>
            </div>
            <h3 class="font-bold text-slate-900 text-sm">Personal & Contact Details</h3>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div class="text-[11px] font-medium text-slate-400">Full Legal Name</div>
              <div class="font-bold text-slate-900 mt-0.5">${emp.name}</div>
            </div>
            <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div class="text-[11px] font-medium text-slate-400">Official Work Email</div>
              <div class="font-bold text-slate-900 mt-0.5 truncate" title="${emp.email}">${emp.email}</div>
            </div>
            <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div class="text-[11px] font-medium text-slate-400">Primary Phone Number</div>
              <div class="font-bold text-slate-900 mt-0.5">${emp.phone || '--'}</div>
            </div>
            <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div class="text-[11px] font-medium text-slate-400">Office / Work Location</div>
              <div class="font-bold text-slate-900 mt-0.5">${emp.location || '--'}</div>
            </div>
          </div>
        </div>

        <!-- 2. Employment & Organizational Details -->
        <div class="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div class="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm">
              <i class="fa-solid fa-building-user"></i>
            </div>
            <h3 class="font-bold text-slate-900 text-sm">Employment & Role Details</h3>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div class="text-[11px] font-medium text-slate-400">Employee ID</div>
              <div class="font-mono font-bold text-indigo-700 mt-0.5">${emp.id}</div>
            </div>
            <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div class="text-[11px] font-medium text-slate-400">Department</div>
              <div class="font-bold text-slate-900 mt-0.5">${emp.department}</div>
            </div>
            <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div class="text-[11px] font-medium text-slate-400">Designation / Title</div>
              <div class="font-bold text-slate-900 mt-0.5">${emp.jobTitle}</div>
            </div>
            <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div class="text-[11px] font-medium text-slate-400">Employment Classification</div>
              <div class="font-bold text-slate-900 mt-0.5">${emp.employmentType || 'Full-Time'}</div>
            </div>
            <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div class="text-[11px] font-medium text-slate-400">Official Date of Joining</div>
              <div class="font-bold text-slate-900 mt-0.5">${UI.formatDate(emp.joinDate)}</div>
            </div>
            <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div class="text-[11px] font-medium text-slate-400">Reporting Manager</div>
              <div class="font-bold text-slate-900 mt-0.5">${emp.manager || 'Elena Rostova (HR Admin)'}</div>
            </div>
          </div>
        </div>

        <!-- 3. Biometric & Device Identification -->
        <div class="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-sm">
                <i class="fa-solid fa-fingerprint"></i>
              </div>
              <h3 class="font-bold text-slate-900 text-sm">Biometric & System Security</h3>
            </div>
            <span class="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
              Hardware Linked
            </span>
          </div>

          <div class="space-y-3 text-xs">
            <div class="p-3 bg-purple-50/50 rounded-xl border border-purple-100 flex items-center justify-between">
              <div>
                <div class="text-[11px] font-bold text-purple-900">Biometric Reference ID</div>
                <div class="text-[11px] text-purple-600">Registered biometric punch card ID</div>
              </div>
              <div class="font-mono font-bold text-sm text-purple-800 bg-white px-3 py-1.5 rounded-lg border border-purple-200 flex items-center gap-1.5">
                <i class="fa-solid fa-fingerprint text-purple-600"></i>
                <span>${emp.biometricRef || ('BIO-' + emp.id)}</span>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div class="text-[11px] font-medium text-slate-400">System User ID</div>
                <div class="font-mono font-bold text-slate-800 mt-0.5">USR-${emp.id}</div>
              </div>
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div class="text-[11px] font-medium text-slate-400">Portal Role Permission</div>
                <div class="font-semibold text-slate-800 mt-0.5 capitalize">${emp.role || 'employee'}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. Salary -->
        <div class="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm">
                <i class="fa-solid fa-money-check-dollar"></i>
              </div>
              <h3 class="font-bold text-slate-900 text-sm">Salary</h3>
            </div>
          </div>

          <div class="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 flex items-center justify-between">
            <div class="text-xs font-bold text-emerald-950">Salary</div>
            <div class="font-mono font-extrabold text-base text-emerald-700">
              ${UI.formatCurrency(emp.salary)}
            </div>
          </div>
        </div>

      </div>

      <!-- 5. Leave Balances Overview -->
      <div class="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm">
              <i class="fa-solid fa-calendar-days"></i>
            </div>
            <h3 class="font-bold text-slate-900 text-sm">Leave Balance Allocations</h3>
          </div>
          <button onclick="Employee.switchTab('leaves')" class="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
            Request Leave &rarr;
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div class="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 text-center">
            <div class="text-xs font-bold text-indigo-900">Annual Paid Leave</div>
            <div class="text-2xl font-extrabold text-indigo-700 mt-1.5">${(balances.annual?.total || 20) - (balances.annual?.used || 0)} <span class="text-xs text-indigo-500 font-normal">days left</span></div>
            <div class="text-[11px] text-indigo-600 mt-1">${balances.annual?.used || 0} used of ${balances.annual?.total || 20} allocated</div>
          </div>
          <div class="p-4 bg-rose-50/60 rounded-xl border border-rose-100 text-center">
            <div class="text-xs font-bold text-rose-900">Sick & Medical Leave</div>
            <div class="text-2xl font-extrabold text-rose-700 mt-1.5">${(balances.sick?.total || 10) - (balances.sick?.used || 0)} <span class="text-xs text-rose-500 font-normal">days left</span></div>
            <div class="text-[11px] text-rose-600 mt-1">${balances.sick?.used || 0} used of ${balances.sick?.total || 10} allocated</div>
          </div>
          <div class="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100 text-center">
            <div class="text-xs font-bold text-emerald-900">Casual Leave</div>
            <div class="text-2xl font-extrabold text-emerald-700 mt-1.5">${(balances.casual?.total || 5) - (balances.casual?.used || 0)} <span class="text-xs text-emerald-500 font-normal">days left</span></div>
            <div class="text-[11px] text-emerald-600 mt-1">${balances.casual?.used || 0} used of ${balances.casual?.total || 5} allocated</div>
          </div>
        </div>
      </div>
    `;
  },

  openChangeAvatarModal() {
    if (typeof UI !== 'undefined' && typeof UI.openChangeAvatarModal === 'function') {
      UI.openChangeAvatarModal(this.employeeData?.id || Auth.user?.employeeId);
    }
  }
};

if (typeof window !== 'undefined') {
  window.Employee = Employee;
}
