// Employee Portal Modules & Views
const Employee = {
  activeTab: 'dashboard',
  employeeData: null,
  myLeaves: [],
  myAttendance: [],
  myPayslips: [],
  announcements: [],
  colleagues: [],
  workTimerInterval: null,

  async init() {
    await this.loadData();
    this.renderActiveTab();
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
    if (window.App && typeof App.setActiveNav === 'function') {
      App.setActiveNav(tabName);
    }
  },

  renderActiveTab() {
    switch (this.activeTab) {
      case 'dashboard':
        this.renderDashboard();
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

    container.innerHTML = `
      <!-- Greeting Banner -->
      <div class="bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 rounded-2xl p-6 sm:p-8 text-white shadow-xl shadow-emerald-700/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-medium text-emerald-100 mb-3 border border-white/15">
            <i class="fa-solid fa-id-card-clip text-emerald-200"></i> ${emp.department || 'Employee'} • ${emp.jobTitle || 'Staff'}
          </div>
          <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight">Welcome, ${emp.name || 'Team Member'}</h2>
          <p class="text-emerald-100 text-sm mt-1 max-w-xl">
            Have a productive day! Check your daily attendance, leave balances, and company bulletins below.
          </p>
        </div>
        <div class="flex flex-wrap gap-2.5 shrink-0">
          <button onclick="UI.openModal('modal-request-leave')" class="px-4 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 font-semibold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-2">
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
              <button onclick="Employee.clockIn()" class="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2">
                <i class="fa-solid fa-play text-xs"></i>
                <span>Clock In Now</span>
              </button>
            ` : (!todayAtt?.clockOut ? `
              <button onclick="Employee.clockOut()" class="w-full py-3.5 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-rose-600/20 transition-all flex items-center justify-center gap-2">
                <i class="fa-solid fa-stop text-xs"></i>
                <span>Clock Out for Today</span>
              </button>
            ` : `
              <div class="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs text-emerald-800 font-semibold">
                <i class="fa-solid fa-circle-check text-emerald-600 mr-1.5"></i> Day completed (${todayAtt.totalHours} hours recorded)
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
              <button onclick="UI.openModal('modal-request-leave')" class="text-xs text-emerald-700 hover:underline font-semibold">
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
          <p class="text-xs text-slate-500 mt-0.5">Punch in/out daily and review historical working hours</p>
        </div>
      </div>

      <!-- Action Card -->
      <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm max-w-xl">
        <div class="flex items-center justify-between mb-4">
          <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Shift</span>
          <span class="text-xs font-mono text-slate-600">${UI.formatDate(today)}</span>
        </div>

        <div class="bg-slate-50 rounded-xl p-5 border border-slate-200 text-center mb-5">
          <div class="text-3xl font-extrabold text-slate-900 font-mono mb-1" id="emp-live-clock">
            ${new Date().toLocaleTimeString()}
          </div>
          <p class="text-xs text-slate-500">Official Office Hours: 09:00 AM - 05:30 PM</p>
        </div>

        <div class="space-y-3">
          ${!todayAtt?.clockIn ? `
            <button onclick="Employee.clockIn()" class="w-full py-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2">
              <i class="fa-solid fa-right-to-bracket"></i>
              <span>Punch Clock In</span>
            </button>
          ` : (!todayAtt?.clockOut ? `
            <div class="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs text-emerald-800 font-medium mb-2">
              Clocked in at <strong class="text-emerald-900">${todayAtt.clockIn}</strong>
            </div>
            <button onclick="Employee.clockOut()" class="w-full py-4 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-rose-600/20 transition-all flex items-center justify-center gap-2">
              <i class="fa-solid fa-right-from-bracket"></i>
              <span>Punch Clock Out</span>
            </button>
          ` : `
            <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
              <i class="fa-solid fa-circle-check text-emerald-600 text-2xl mb-1"></i>
              <div class="text-sm font-bold text-slate-900">Shift Completed for Today</div>
              <div class="text-xs text-slate-500 mt-0.5">${todayAtt.clockIn} &rarr; ${todayAtt.clockOut} (${todayAtt.totalHours} hrs)</div>
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
                  <td class="px-5 py-3.5 text-xs font-semibold text-slate-800">${a.totalHours ? `${a.totalHours} hrs` : '--'}</td>
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
        <button onclick="UI.openModal('modal-request-leave')" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm shadow-md shadow-emerald-600/20 flex items-center gap-2">
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

  // ---------------- 4. EMPLOYEE PAYSLIPS ----------------
  renderPayslips() {
    const container = document.getElementById('emp-tab-payslips');
    if (!container) return;

    const emp = this.employeeData || Auth.employee || {};
    // ONLY display payslips that HR has approved / paid!
    const approvedSlips = (this.myPayslips || []).filter(p => p.status === 'Approved' || p.status === 'Paid');

    container.innerHTML = `
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-slate-900">Salary & Compensation Slips</h2>
          <p class="text-xs text-slate-500 mt-0.5">Access and print official monthly payroll statements approved by HR</p>
        </div>
      </div>

      ${approvedSlips.length === 0 ? `
        <div class="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-sm">
          <div class="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-100">
            <i class="fa-solid fa-file-invoice text-2xl"></i>
          </div>
          <h3 class="text-base font-bold text-slate-900">No Approved Payslips Available Yet</h3>
          <p class="text-xs text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">
            Your payroll statements are currently being reviewed by HR. Once HR approves and releases your salary slips, they will automatically appear here for you to view and download.
          </p>
        </div>
      ` : `
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th class="px-5 py-3.5">Pay Period</th>
                  <th class="px-5 py-3.5">Gross Earnings</th>
                  <th class="px-5 py-3.5">Tax & Deductions</th>
                  <th class="px-5 py-3.5">Net Take-Home</th>
                  <th class="px-5 py-3.5 text-center">HR Approval Status</th>
                  <th class="px-5 py-3.5 text-right">Statement</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 text-slate-700">
                ${approvedSlips.map(slip => `
                  <tr class="hover:bg-slate-50 transition-colors">
                    <td class="px-5 py-4">
                      <div class="font-bold text-slate-900">${slip.month} ${slip.year}</div>
                      <div class="text-[11px] text-slate-400">Paid on ${UI.formatDate(slip.payDate)}</div>
                    </td>
                    <td class="px-5 py-4 font-mono text-xs text-slate-900 font-medium">${UI.formatCurrency(slip.grossPay || slip.baseSalary)}</td>
                    <td class="px-5 py-4 font-mono text-xs text-rose-600">-${UI.formatCurrency(slip.totalDeductions || 0)}</td>
                    <td class="px-5 py-4 font-mono text-xs font-bold text-emerald-600">${UI.formatCurrency(slip.netPay || slip.baseSalary)}</td>
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
                `).join('')}
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
      UI.toast('Could not find selected payslip', 'error');
      return;
    }

    // Safety check: employee should NEVER view unapproved slips
    if (slip.status !== 'Approved' && slip.status !== 'Paid') {
      UI.toast('This payslip has not been approved by HR yet', 'warning');
      return;
    }

    const emp = this.employeeData || Auth.employee || {};
    const payslipContainer = document.getElementById('printable-payslip');

    payslipContainer.innerHTML = `
      <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-6 flex items-center justify-between text-xs text-emerald-800 no-print">
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-circle-check text-emerald-600 text-base"></i>
          <div>
            <span class="font-bold">Official Approved Statement</span>
            <span class="text-slate-500 text-[11px] ml-1.5">• Approved by HR on ${slip.approvedAt || UI.formatDate(slip.payDate)}</span>
          </div>
        </div>
        <span class="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[10px]">VERIFIED</span>
      </div>

      <div class="border-b border-slate-200 pb-6 mb-6 flex justify-between items-start">
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
          <span class="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">APPROVED / PAID</span>
          <div class="text-xs text-slate-400 mt-2">Statement Month</div>
          <div class="text-sm font-bold text-slate-900">${slip.month} ${slip.year}</div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 text-xs">
        <div>
          <span class="text-slate-400 block">Employee Name</span>
          <strong class="text-slate-900 text-sm">${emp.name || slip.employeeName}</strong>
          <span class="text-slate-500 block mt-1">ID: ${emp.id || slip.employeeId}</span>
        </div>
        <div>
          <span class="text-slate-400 block">Designation & Department</span>
          <strong class="text-slate-900 text-sm">${emp.jobTitle}</strong>
          <span class="text-slate-500 block mt-1">${emp.department}</span>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-6 text-xs mb-6">
        <div>
          <h4 class="font-bold text-slate-900 uppercase text-[11px] mb-2 pb-1 border-b border-slate-200 text-emerald-700">Earnings (INR)</h4>
          <div class="space-y-1.5">
            <div class="flex justify-between py-1 border-b border-slate-100">
              <span class="text-slate-600">Basic Salary</span>
              <span class="font-mono font-medium">${UI.formatCurrency(slip.baseSalary)}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-100">
              <span class="text-slate-600">House Rent Allowance (HRA)</span>
              <span class="font-mono font-medium">${UI.formatCurrency(slip.allowances?.hra || Math.round(slip.baseSalary * 0.40))}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-100">
              <span class="text-slate-600">Special Allowance</span>
              <span class="font-mono font-medium">${UI.formatCurrency(slip.allowances?.specialAllowance || Math.round(slip.baseSalary * 0.20))}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-100">
              <span class="text-slate-600">Conveyance Allowance</span>
              <span class="font-mono font-medium">${UI.formatCurrency(slip.allowances?.conveyance || 1600)}</span>
            </div>
            <div class="flex justify-between py-2 font-bold text-slate-900">
              <span>Total Gross Earnings</span>
              <span class="font-mono text-emerald-700">${UI.formatCurrency(slip.grossPay)}</span>
            </div>
          </div>
        </div>

        <div>
          <h4 class="font-bold text-slate-900 uppercase text-[11px] mb-2 pb-1 border-b border-slate-200 text-rose-700">Deductions (INR)</h4>
          <div class="space-y-1.5">
            <div class="flex justify-between py-1 border-b border-slate-100">
              <span class="text-slate-600">Income Tax (TDS)</span>
              <span class="font-mono font-medium">${UI.formatCurrency(slip.deductions?.incomeTax || Math.round(slip.grossPay * 0.10))}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-100">
              <span class="text-slate-600">Employees' Provident Fund (EPF)</span>
              <span class="font-mono font-medium">${UI.formatCurrency(slip.deductions?.providentFund || Math.round(slip.baseSalary * 0.12))}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-100">
              <span class="text-slate-600">Health & Group Insurance</span>
              <span class="font-mono font-medium">${UI.formatCurrency(slip.deductions?.healthInsurance || 1200)}</span>
            </div>
            <div class="flex justify-between py-2 font-bold text-slate-900">
              <span>Total Deductions</span>
              <span class="font-mono text-rose-700">-${UI.formatCurrency(slip.totalDeductions)}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-center justify-between">
        <div>
          <span class="text-xs text-indigo-700 uppercase font-semibold block">Net Disbursed Take-Home</span>
          <span class="text-xs text-slate-500">NEFT / RTGS Direct Bank Transfer</span>
        </div>
        <div class="text-2xl font-black text-indigo-900 font-mono">
          ${UI.formatCurrency(slip.netPay)}
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
              <span class="inline-block px-2 py-0.5 text-[10px] bg-slate-100 text-slate-600 rounded font-semibold mt-1">
                ${col.department}
              </span>
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

  async submitLeaveRequest(event) {
    event.preventDefault();
    const empId = Auth.user?.employeeId;
    const leaveType = document.getElementById('leave-type-select').value;
    const startDate = document.getElementById('leave-start-date').value;
    const endDate = document.getElementById('leave-end-date').value;
    const reason = document.getElementById('leave-reason').value;

    if (!startDate || !endDate || !reason) {
      UI.toast('Please fill all required leave fields', 'error');
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      UI.toast('End date cannot be earlier than start date', 'error');
      return;
    }

    try {
      await API.post('/leaves', {
        employeeId: empId,
        leaveType,
        startDate,
        endDate,
        reason
      });

      UI.toast('Leave application submitted for HR review!', 'success');
      UI.closeModal('modal-request-leave');
      document.getElementById('form-request-leave').reset();
      await this.loadData();
      this.renderActiveTab();
    } catch (err) {
      UI.toast(err.message || 'Failed to submit leave', 'error');
    }
  }
};
