# Hormuud University Smart Lab Management System

A web application for reporting, assigning and resolving computer-lab problems at Hormuud University.

## Features
- **Authentication**: JWT sessions (Bearer token + httpOnly cookie), bcrypt-hashed passwords, rate-limited login/registration, and automatic sign-out when an account is deactivated or deleted.
- **Role-based access control**: Super Admin, Admin, Technician and User, enforced on the server for every endpoint.
- **Problem reports**: students report issues by faculty, department, lab and PC, with category and urgency. They can track progress and cancel a report while it is still pending.
- **Issue management**: search, filters, pagination, technician assignment, status workflow, priority, internal notes and replies to the reporter. Technicians see their own queue plus unassigned reports and can claim them.
- **Dashboard**: live, role-scoped statistics, a 30-day trend, status and category charts, the labs with the most issues, and average time to resolve.
- **Administration**: full create/edit/delete for users, faculties, departments and labs, with integrity checks (for example, a lab that has reports cannot be deleted).
- **Audit trail**: activity log of sign-ins, report changes and admin actions, with the client's IP address.
- **Responsive UI**: works on desktop and mobile (collapsible sidebar).

## Tech Stack
- **Frontend**: React 18, React Router, Tailwind CSS, Recharts, Lucide icons, Axios, react-hot-toast (Vite)
- **Backend**: Node.js, Express, MongoDB (Mongoose), JWT, bcrypt, helmet, express-rate-limit
- **Tests**: Node's built-in test runner (`node:test`), end-to-end API tests

## Getting Started

> **Windows PowerShell:** if `npm` fails with "running scripts is disabled on this system", use `npm.cmd` instead (e.g. `npm.cmd run dev`, `npm.cmd test`). Also run one command per line: PowerShell 5.1 does not support `&&`.

### Prerequisites
- Node.js 18 or newer
- MongoDB running locally, or a MongoDB Atlas connection string

### 1. Install
```bash
npm install
npm run install-all
```

### 2. Configure the backend
Copy `server/.env.example` to `server/.env` and fill in the values:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/hu_smart_lab
JWT_SECRET=a_long_random_secret
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

### 3. Seed the database
> ⚠️ The seeder **deletes all existing data** in the database named in `MONGODB_URI` before inserting fresh data.
```bash
cd server
npm run seed            # university structure, default users and sample reports
node seeder.js --no-demo  # same, but without the sample reports
npm run seed:destroy    # wipe everything
```

Default accounts (password `password123`, change them after first login):

| Role        | Email                |
|-------------|----------------------|
| Super Admin | admin@hu.edu.so      |
| Admin       | labadmin@hu.edu.so   |
| Technician  | tech@hu.edu.so       |
| Technician  | tech2@hu.edu.so      |
| User        | student@hu.edu.so    |

### 4. Run in development
From the project root:
```bash
npm run dev
```
The API runs on http://localhost:5000 and the web app on http://localhost:5173.

### 5. Run the tests
```bash
cd server
npm test
```
The tests seed and use a separate database (`hu_smart_lab_test`, override with `TEST_MONGODB_URI`), so your real data is never touched.

## Production
```bash
cd client
npm run build
cd ../server
npm start   # with NODE_ENV=production set in server/.env
```
With `NODE_ENV=production`, the Express server also serves the built React app from `client/dist`, so you deploy a single service. Always set a strong `JWT_SECRET` and serve it over HTTPS (session cookies are `secure` in production).

## User Roles
| Capability                                   | User | Technician | Admin | Super Admin |
|----------------------------------------------|:----:|:----------:|:-----:|:-----------:|
| Report problems / track own reports          | ✅   |            | ✅    | ✅          |
| See and update assigned + unassigned issues  |      | ✅         |       |             |
| See all issues, assign technicians, priority |      |            | ✅    | ✅          |
| Delete reports                               | own pending only |    | ✅    | ✅          |
| Manage users, faculties, departments, labs   |      |            |       | ✅          |
| View activity logs                           |      |            |       | ✅          |

## API Overview
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/api/auth/register`, `/api/auth/login` | Public |
| POST | `/api/auth/logout` · GET/PUT `/api/auth/me` · PATCH `/api/auth/change-password` | Signed in |
| GET/POST | `/api/reports` (filters: `status`, `category`, `priority`, `lab`, `assignedTo`, `q`, `mine`, `page`, `limit`) | Signed in (role-scoped) |
| GET | `/api/reports/stats`, `/api/reports/:id` | Signed in (role-scoped) |
| PUT | `/api/reports/:id` | Technician / Admin / Super Admin |
| DELETE | `/api/reports/:id` | Admin / Super Admin, or reporter while pending |
| GET | `/api/admin/faculties`, `/departments`, `/labs` | Public |
| GET | `/api/admin/assignees` | Admin / Super Admin |
| CRUD | `/api/admin/users`, `/faculties`, `/departments`, `/labs` · GET `/api/admin/logs` | Super Admin |
| GET | `/api/health` | Public |

## License
Custom developed for Hormuud University, Mogadishu, Somalia.
