# NexusHR - Modern Human Resource Management System

A full-stack Human Resource Management System (HRMS) featuring role-based interfaces for **HR Administrators** and **Employees**, built with Node.js/Express, Tailwind CSS, and persistent data storage.

---

## 🚀 Live Production Configuration

This is the clean **Live Server** on branch `main`. All dummy leaves, attendance logs, and mock employees have been cleared. The system is initialized with a single **HR Administrator** root account ready for live onboarding.

### 🔑 Live HR Administrator Account
- **Portal URL**: [http://localhost:3000](http://localhost:3000)
- **Email**: `admin@hrms.com`
- **Password**: `password123`
- **Role**: Head of People & Culture (HR Administrator)

*(Note: The development branch containing full dummy datasets and one-click demo credentials is preserved on branch [`dev1`](https://github.com/enmadourayuga/HRMS/tree/dev1)).*

---

## 🌟 System Capabilities

### 🏢 HR Administrator Portal
- **Workforce Directory**: Add new team members, specify roles (Employee vs HR Administrator), departments, compensation, and contact details. Login credentials are created automatically for every new employee.
- **Leave Request Management**: Review, approve, or reject employee leave requests with optional manager notes.
- **Attendance Tracker**: Monitor daily check-ins, check-outs, and logged hours.
- **Payroll & Statements**: Review compensation pools, view and print formatted monthly salary slips.
- **Announcements**: Broadcast company updates with priority tags across the organization.

### 👤 Employee Portal (Self-Service)
- **Attendance Punch Desk**: Clock-In and Clock-Out with live timestamps.
- **Leave Applications**: View remaining leave balances (Annual, Sick, Casual) and submit time-off requests.
- **Salary Statements**: View and print itemized monthly compensation slips.
- **Team Directory**: Access peer contact information and department directories.

---

## 🛠️ Running Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Live Server
```bash
npm start
```
Server runs at [http://localhost:3000](http://localhost:3000).

---

## 📁 Project Architecture

```
HRMS/
├── server.js              # Express REST API & static file server
├── package.json           # Dependencies and scripts
├── data/
│   ├── seedData.json      # Base clean seed dataset (HR admin only)
│   └── db.json            # Dynamic persistent data store
├── public/                # Frontend Single Page Application
│   ├── index.html         # Main HTML layout with corporate login
│   ├── css/
│   │   └── style.css      # Styling, transitions, and print media
│   └── js/
│       ├── api.js         # REST API client
│       ├── ui.js          # Toasts, modals, clock, utilities
│       ├── auth.js        # Authentication & session management
│       ├── hr.js          # HR Portal views & action handlers
│       ├── employee.js    # Employee Portal views & action handlers
│       └── app.js         # App bootstrap and role-based navigation
└── README.md              # Project documentation
```
