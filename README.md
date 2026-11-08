# 🌊 FloodRelief (PERN + TypeScript MVP)

A lightweight emergency relief coordination platform built with the **PERN stack** (PostgreSQL, Express, React, Node.js) and TypeScript.

This MVP implements **Phase 1 & Phase 2** of the FloodRelief architecture: focusing on a clean, robust, and offline-capable workflow for disaster victims and relief coordinators.

---

## 🎯 MVP Architecture & Scope

### 1. Two Roles
- **User (Community)**:
  - Register & Login via secure HTTP-only cookie authentication.
  - Submit flood assistance requests with description, location, and urgency (`Low`, `Medium`, `High`, `Critical`).
  - View status of submitted requests (`Pending`, `Verified`, `Fulfilled`, `Rejected`).
  - Inspect allocated relief supplies and dispatch notes from responders.
  - View real-time availability of warehouse relief stock.

- **Admin (Relief Coordinator)**:
  - Real-time KPI dashboard (Total requests, pending verification, fulfilled, critical unresolved, low stock items).
  - Filter requests by status and urgency level.
  - Verify incoming requests with one click.
  - **Fulfill & Allocate Inventory**: Atomically deduct supplies (e.g. clean drinking water, ration packs) from warehouse stock when fulfilling requests.
  - Full CRUD on relief inventory (add items, quick-adjust stock by `+10` / `-10`, delete).

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Custom Accessible CSS |
| **Backend** | Express 4, TypeScript, `tsx` hot-reloader |
| **Database** | PostgreSQL 18 (Relational tables + Foreign key constraints) |
| **Authentication** | JWT stored in `httpOnly` cookies + bcryptjs password hashing |
| **Database Driver** | `pg` (Connection Pooling) |

---

## 📁 Project Structure

```text
FloodRelif/
├── backend/
│   ├── src/
│   │   ├── middleware/
│   │   │   └── auth.ts           # JWT verification & Admin guards
│   │   ├── routes/
│   │   │   ├── authRoutes.ts     # Register, Login, Logout, /me
│   │   │   ├── requestRoutes.ts  # Request submission, filters, stats, inventory allocation
│   │   │   └── inventoryRoutes.ts# Relief stock management
│   │   ├── db.ts                 # PostgreSQL connection pool
│   │   ├── schema.sql            # Table definitions (users, inventory, assistance_requests)
│   │   ├── initDb.ts             # Schema initializer script
│   │   ├── seed.ts               # Sample warehouse inventory seeder
│   │   └── index.ts              # Express server entry point
│   ├── .env                      # Database & server configuration
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── api.ts                # Type-safe API client
│   │   ├── types.ts              # Domain interfaces
│   │   ├── App.tsx               # Reactive single-page UI (User + Admin views)
│   │   └── index.css             # Responsive styling
│   └── vite.config.ts            # Vite dev server + API proxy
└── package.json                  # Root scripts
```

---

## 🚀 Getting Started (100% Offline Compatible)

### Prerequisites
- Node.js (v18+)
- PostgreSQL installed locally on port `5432`

### 1. Database Setup
The backend is pre-configured to connect to local PostgreSQL:
```powershell
# Inside backend folder
cd backend
npm run db:init
npx tsx src/seed.ts
```

### 2. Start the Backend API
```powershell
cd backend
npm run dev
```
API runs on: **[http://localhost:5000](http://localhost:5000)**  
Health check: [http://localhost:5000/api/health](http://localhost:5000/api/health)

### 3. Start the Frontend App
In a second terminal:
```powershell
cd frontend
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## 🔑 Pre-seeded Test Accounts

You can register any new account directly in the UI, or use the pre-tested credentials:

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@example.com` | `adminpassword123` |
| **User** | `john@example.com` | `password123` |

---

## 📡 API Reference

### Auth
- `POST /api/auth/register` - Create account (`role: 'user' | 'admin'`)
- `POST /api/auth/login` - Authenticate & set cookie
- `POST /api/auth/logout` - Clear cookie
- `GET /api/auth/me` - Get current session user

### Requests
- `GET /api/requests?status=...&urgency=...` - List requests (filtered)
- `POST /api/requests` - Submit assistance request
- `PATCH /api/requests/:id/status` - (Admin) Update status & allocate supplies
- `GET /api/requests/stats` - (Admin) Real-time dashboard KPI metrics

### Inventory
- `GET /api/inventory` - View warehouse stock
- `POST /api/inventory` - (Admin) Add new supply item
- `PATCH /api/inventory/:id` - (Admin) Adjust item stock quantity
- `DELETE /api/inventory/:id` - (Admin) Remove item

### Volunteer Tasks
- `GET /api/tasks?status=...&my_tasks=...` - List volunteer missions
- `POST /api/tasks` - (Admin) Dispatch a new field mission
- `PATCH /api/tasks/:id/claim` - Claim mission
- `PATCH /api/tasks/:id/complete` - Mark mission completed
