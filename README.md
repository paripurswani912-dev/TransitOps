# TransitOps — Smart Transport Operations Platform

TransitOps is a centralized fleet operations platform built to digitize vehicle, driver, dispatch, maintenance, and expense management — replacing the spreadsheets and manual logbooks most logistics teams still rely on.

Built in an 8-hour hackathon.

## Problem

Logistics teams commonly struggle with:
- Scheduling conflicts from double-booked vehicles or drivers
- Underutilized vehicles with no real-time visibility
- Missed maintenance windows
- Expired driver licenses going unnoticed
- Inaccurate, scattered expense and fuel tracking
- No single source of truth for operational status

TransitOps solves this by enforcing business rules automatically and giving every role a live, unified view of fleet operations.

## Core Features

- **Authentication & RBAC** — secure login with role-based access for four operational roles
- **Dashboard** — real-time KPIs: active/available vehicles, maintenance status, active/pending trips, drivers on duty, fleet utilization
- **Vehicle Registry** — master vehicle list with unique registration numbers, capacity, odometer, cost, and lifecycle status
- **Driver Management** — driver profiles with license tracking, expiry flagging, and safety scores
- **Trip Dispatcher** — create and dispatch trips with automatic validation:
  - Cargo weight can't exceed vehicle capacity
  - Only available vehicles/drivers can be assigned
  - Expired-license or suspended drivers are blocked from assignment
  - Dispatching a trip auto-flips vehicle and driver status to "On Trip"
  - Completing or cancelling a trip auto-restores "Available" status
- **Maintenance Management** — logging service records automatically takes a vehicle out of the dispatch pool ("In Shop") and restores it on completion
- **Fuel & Expense Tracking** — fuel logs and toll/misc expenses, with automatic operational cost roll-up (Fuel + Maintenance)
- **Reports & Analytics** — fuel efficiency, fleet utilization, operational cost, vehicle ROI, monthly revenue, and top-cost vehicle rankings, with CSV export
- **Settings & RBAC** — general configuration and a role-permission reference matrix

## User Roles

| Role | Responsibilities |
|---|---|
| Fleet Manager | Oversees fleet assets, maintenance, and vehicle lifecycle |
| Dispatcher | Creates trips, assigns vehicles and drivers, monitors active deliveries |
| Safety Officer | Ensures driver compliance, tracks license validity and safety scores |
| Financial Analyst | Reviews expenses, fuel consumption, maintenance costs, and profitability |

## Business Rules Enforced

- Vehicle registration numbers must be unique
- Retired or In Shop vehicles never appear in dispatch selection
- Drivers with expired licenses or Suspended status cannot be assigned to trips
- A vehicle or driver already On Trip cannot be assigned to another trip
- Cargo weight must not exceed a vehicle's maximum load capacity
- Dispatching a trip sets both vehicle and driver status to On Trip
- Completing a trip restores both to Available
- Cancelling a dispatched trip restores both to Available
- Creating an active maintenance record sets vehicle status to In Shop
- Closing maintenance restores vehicle status to Available (unless Retired)

## Tech Stack

- **Frontend:** React 19 (Vite), Tailwind CSS
- **Backend / Database:** Firebase (Authentication + Firestore)
- **Routing:** React Router
- **Charts:** Recharts
- **Icons:** Lucide React

## Data Model

| Collection | Purpose |
|---|---|
| `users` | Account, role, status |
| `vehicles` | Registration, capacity, odometer, cost, status |
| `drivers` | License, expiry, contact, safety score, status |
| `trips` | Route, vehicle/driver assignment, cargo weight, status |
| `maintenance` | Service records linked to vehicles |
| `fuelLogs` | Fuel consumption and cost |
| `expenses` | Toll and miscellaneous trip/vehicle costs |

## Getting Started

```bash
# clone the repo
git clone <repo-url>
cd transitops

# install dependencies
npm install

# add environment variables
# create a .env file in the project root with your Firebase config:
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# run the dev server
npm run dev
```

All contributors should use the same Firebase project (shared `.env`) so data stays in sync across the team.

## Team Workflow

Screens were split across team members and merged via feature branches:

```bash
git checkout -b feature/<screen-name>
# build + test
git push origin feature/<screen-name>
# merge to main once verified working standalone
```

## Known Limitations / Hackathon Scope Notes

- Source/Destination locations are a hardcoded list rather than an admin-managed master data screen
- Vehicle ROI uses a placeholder revenue-per-trip constant, since no billing/revenue module exists in scope
- RBAC enforcement covers core routes; not every edge case is fully locked down given the time constraint
- PDF export is optional/not implemented; CSV export is functional
- Email reminders for license expiry are out of scope for this build

## Demo Flow

1. Sign up / log in
2. Register a vehicle and a driver
3. Create and dispatch a trip — observe capacity validation and status flips
4. Complete or cancel the trip — observe status restoration
5. Log a maintenance record — observe the vehicle leave the dispatch pool
6. View the Dashboard and Analytics screens for live aggregated data
