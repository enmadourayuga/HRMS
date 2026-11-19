# NexusHR - Modern Human Resource Management System

A full-stack, responsive Human Resource Management System (HRMS) featuring role-based interfaces for **HR Administrators** and **Employees**, built with Node.js/Express, Tailwind CSS, and persistent mock data storage.

---

## 🌟 Key Features

### 🏢 1. HR Administrator Portal
- **Executive Dashboard Overview**: Live metrics for total headcount, active employees present today, employees on leave, pending leave approvals, and monthly payroll obligations.
- **Actionable Leave Approvals**: Review pending leave applications with employee reasons, duration, and one-click **Approve** or **Reject** with custom reviewer notes.
- **Employee Directory**: Full directory with live search, department filters (Engineering, Design, Product, etc.), status badges, and an **Add New Employee** modal that automatically creates login accounts.
- **Attendance Monitoring**: Real-time log of daily clock-in/out timestamps, hours worked, and attendance statuses (Present, Late, On Leave).
- **Payroll & Compensation**: Salary distribution across departments, estimated tax/PF deductions, take-home pay, and generated printable **Salary Statements / Payslips**.
- **Company Bulletins**: Publish company-wide announcements categorized by priority (High, Important, Normal).

### 👤 2. Employee Self-Service Portal
- **Personal Dashboard**: Personalized welcome card, leave entitlement counters, today's attendance status, and company announcements.
- **Daily Attendance Punch Desk**: Interactive **Clock-In** and **Clock-Out** buttons with live system timestamps and working hours logging.
- **Time Off & Leave Management**: Track remaining balances for Annual, Sick, and Casual leaves; submit new leave requests with date pickers and reasons; monitor approval statuses (Pending, Approved, Rejected).
- **Salary Statements**: View and print detailed monthly payslip breakdowns including allowances (HRA, Special, Conveyance) and deductions (Tax, PF, Insurance).
- **Team Directory**: Browse department peers, contact emails, and office locations.

---

## 🔑 Demo Login Credentials

You can use the **⚡ Quick Demo Login** buttons on the sign-in screen or type the credentials manually:

| Role | Name | Email | Password |
| :--- | :--- | :--- | :--- |
| **HR Administrator** | Elena Rostova | `hr@hrms.com` | `password123` |
| **Employee (Engineering)** | Alex Morgan | `alex.morgan@hrms.com` | `password123` |
| **Employee (Design)** | Sarah Chen | `sarah.chen@hrms.com` | `password123` |
| **Employee (DevOps)** | Marcus Vance | `marcus.vance@hrms.com` | `password123` |
| **Employee (Marketing)** | Priya Patel | `priya.patel@hrms.com` | `password123` |

*Note: You can easily switch between HR and Employee roles anytime via the **"Switch Demo Role"** dropdown in the top header.*

---

## 🚀 Running Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm start
```
The server will start on [http://localhost:3000](http://localhost:3000).

---

## 📁 Project Architecture

```
HRMS/
├── server.js              # Express REST API & static file server
├── package.json           # Dependencies and startup scripts
├── data/
│   ├── seedData.json      # Initial realistic seed dataset
│   └── db.json            # Dynamic persistent data store
├── public/                # Frontend Single Page Application
│   ├── index.html         # Main HTML layout with Tailwind CSS & modals
│   ├── css/
│   │   └── style.css      # Custom styling, animations, and print media
│   └── js/
│       ├── api.js         # REST API client
│       ├── ui.js          # Toasts, modals, clock, utilities
│       ├── auth.js        # Auth state, quick-login, credentials
│       ├── hr.js          # HR Portal views & action handlers
│       ├── employee.js    # Employee Portal views & action handlers
│       └── app.js         # App bootstrap and role-based navigation
└── README.md              # Project documentation
```
