# HRMS (Human Resource Management System) - Backend

Django REST Framework backend for the HRMS application.

## Project Structure
- `hrms_core/`: Django core configuration and settings
- `authentication/`: Custom User model, JWT authentication endpoints
- `employees/`: Employee directory and management
- `attendance/`: Daily attendance tracking and validation
- `leaves/`: Leave requests and approval workflow
- `payroll/`: Payroll and payslip generation
- `announcements/`: Organization-wide announcements
- `data/`: Seed data fixtures
- `tests/`: Automated unit and integration tests

## Setup & Running Locally

### 1. Activate Virtual Environment
```bash
cd backend
.\venv\Scripts\activate  # Windows
# or: source venv/bin/activate  # macOS / Linux
```

### 2. Apply Migrations
```bash
python manage.py migrate
```

### 3. Load Seed Data
```bash
python manage.py load_seed
```

### 4. Run Development Server
```bash
python manage.py runserver 8000
```
Server runs at: `http://127.0.0.1:8000/`

## API Endpoints

- **Auth Login (JWT)**: `POST /api/auth/login/`
  - Demo login: `hr@hrms.com` / `password123`
- **Current User Profile**: `GET /api/auth/me/` (Requires `Bearer <token>`)
- **Token Refresh**: `POST /api/auth/token/refresh/`
- **Employees**: `GET, POST /api/employees/`
- **Attendance**: `GET, POST /api/attendance/`
- **Leaves**: `GET, POST /api/leaves/`
- **Payroll**: `GET, POST /api/payroll/`
- **Announcements**: `GET, POST /api/announcements/`

## Running Tests
```bash
python manage.py test tests
```

## Render Deployment with PostgreSQL

The project is configured to seamlessly switch between SQLite (local development) and PostgreSQL (production / Render).

1. **Environment Variables**:
   - `DATABASE_URL`: Set automatically by Render when linking a PostgreSQL database (e.g. `postgresql://user:password@host/database`). When provided, Django connects using `psycopg2-binary` and `dj-database-url`.
   - `SECRET_KEY`: Django secret key.
   - `JWT_SECRET` / `REFRESH_SECRET`: Secrets for JWT tokens.
   - `DEBUG`: Set to `False` in production.

2. **Render Blueprint (`render.yaml`)**:
   - Both root `render.yaml` and `backend/render.yaml` are provided with automated provisioning for a free PostgreSQL database (`hrms-postgres`) and the web service.
   - Build Command: `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate`
   - Start Command: `gunicorn hrms_core.wsgi:application`

