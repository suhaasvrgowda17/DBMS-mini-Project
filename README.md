# VoyageFlow: Travel Agency Management System ✈️

VoyageFlow is a modern, responsive, full-stack MVC web portal built to demonstrate relational DBMS concepts. It covers structured tables, primary/foreign key mappings, role-based dashboards, and atomic transaction routines (such as booking itineraries, executing checkout billing, and auto-calculating commission percentages).

---

## 🛠️ Tech Stack & Key Modules

- **Backend Architecture**: Node.js + Express.js (MVC Pattern, Express Router)
- **Database Engine**: MySQL (mysql2 Connection Pool, Prepared Statements for SQL injection safety)
- **Frontend Presentation**: HTML5, Vanilla HSL CSS, JavaScript ES6 (`fetch` AJAX client), Bootstrap 5, Outfit & Plus Jakarta Sans typography, and Animate.css.
- **Authentication**: Stateful sessions via `express-session` + `cookie-parser`.
- **Security Features**: Password hashing with `bcryptjs` and database rollback safety.

### 🌟 Key Panels & Workspaces:
1. **Admin Workspace**: Aggregate analytics, full Agent CRUD, passenger lists, tour package editing, master booking controls, and billing reports.
2. **Agent panel**: Assigned passenger details management, customer bookings creation (automatic price calculations), booking confirmations, and printable receipts.
3. **Customer Self-Service**: Package browse with real-time text keyword filters, travel checkout payment gateway simulator, transaction history, and custom printable invoice sheets.

---

## 🚀 Step-by-Step Local Setup Instructions

### 1. Initialize Local MySQL Database
Open your local MySQL CLI (or MySQL Workbench / phpMyAdmin) and execute the following commands to initialize the schema and populate the system with seeds immediately:

```sql
-- 1. Create and select the database
CREATE DATABASE IF NOT EXISTS `TravelAgencyManagementSystem`;
USE `TravelAgencyManagementSystem`;

-- 2. Execute/Import all queries from the 'database.sql' file
-- (Simply copy-paste the entire contents of the database.sql file into your query runner and execute it)
```

The database seeds include:
- `1` Admin profile
- `2` Active Travel Agents
- `3` Registered Passenger profiles
- `4` Curated Tour Packages with stock images
- `3` Pre-made bookings & transaction invoices demonstrating entity relationships.

---

### 2. Environment Configuration ✅
The `.env` file has been configured with the following settings:

```ini
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=Suhaas!3030
DB_NAME=TravelAgencyManagementSystem
SESSION_SECRET=super_secret_travel_agency_session_key_2026_xyz
```

**Note**: If you need to modify these settings (e.g., different MySQL password or port), edit the `.env` file in the root directory accordingly.

---

### 3. Start the Web Server
Launch your terminal inside the project directory and execute the following commands:

```bash
# 1. Start the server in standard production mode
npm start

# 2. Or start in active hot-reload development mode
npm run dev
```

Once executed, you will see confirmation in the console:
```text
✔ MySQL Database connected successfully.
====================================================
✨ VoyageFlow Travel Management System Active!
🚀 Server listening on http://localhost:3000
====================================================
```

Open your browser and navigate to: **[http://localhost:3000](http://localhost:3000)**

---

## 🔑 Seed User Logins for Testing

All seeded accounts share the password **`password123`**:

| Account Role | Username | E-mail Address | Password | Main Features |
| :--- | :--- | :--- | :--- | :--- |
| **System Admin** | `admin` | `admin@travelagency.com` | `password123` | Dashboard Analytics, Agent/Customer/Packages CRUD |
| **Travel Agent 1** | `agent1` | `agent1@travelagency.com` | `password123` | Manage Assigned Clients, Place/Confirm Bookings |
| **Travel Agent 2** | `agent2` | `agent2@travelagency.com` | `password123` | Manage Assigned Clients, Place/Confirm Bookings |
| **Customer Passenger** | `suhaas321` | `suhaas@gmail.com` | `password123` | Browse Packages, Place Bookings, Payment Gateway checkout |

---

## 📂 MVC Project Directory Layout
```text
/
├── server.js               # Application Entry Point
├── package.json            # Node.js Dependencies
├── .env                    # Environment variables
├── database.sql            # MySQL Database schema & seed queries
├── README.md               # Setup Guide
│
├── config/
│   └── db.js               # mysql2 Connection Pool Config
│
├── middleware/
│   └── authMiddleware.js   # Session/Role Checks
│
├── models/                 # Database Query Helpers (MVC Models)
│   ├── User.js
│   ├── Agent.js
│   ├── Customer.js
│   ├── Package.js
│   ├── Booking.js
│   └── Payment.js
│
├── controllers/            # Business logic
│   ├── authController.js
│   ├── adminController.js
│   ├── agentController.js
│   ├── customerController.js
│   └── packageController.js
│
├── routes/                 # REST API & Page Routes
│   ├── webRoutes.js        # Server-rendered EJS pages (Dashboards, Invoices)
│   ├── apiAuth.js          # Authentication endpoint
│   ├── apiAdmin.js         # Admin endpoints (Agent CRUD, Stats)
│   ├── apiAgent.js         # Agent endpoints (Customer bookings)
│   ├── apiCustomer.js      # Customer endpoints (Register, Checkouts)
│   └── apiPackages.js      # Package endpoints
│
├── views/                  # EJS templates
│   ├── index.ejs           # Landing / Home Page
│   ├── login.ejs           # Login / Register
│   ├── admin_dashboard.ejs # Admin Panel
│   ├── agent_dashboard.ejs # Agent Panel
│   ├── customer_dashboard.ejs # Customer Panel
│   ├── invoice.ejs         # Tax Invoice sheet
│   └── partials/
│       ├── header.ejs      
│       ├── navbar.ejs      
│       ├── sidebar.ejs     
│       └── footer.ejs      
│
└── public/                 # Static Assets
    ├── css/
    │   └── styles.css      # Design System (Glassmorphic dark/light styles)
    ├── js/
    │   ├── main.js         # Light/Dark mode, validations
    │   ├── admin.js        # Admin AJAX CRUD operations
    │   ├── agent.js        # Agent AJAX CRUD operations
    │   └── customer.js     # Customer AJAX booking operations
```

---

## 💡 DBMS Concepts Demonstrated in Code

1. **Entity-Relationship Model**: Core mappings between base logins (`users`), custom user-attributes (`agents`, `customers`), and joint-transaction metrics (`bookings`, `payments`, `tour_packages`).
2. **Primary & Foreign Keys**: Standard table linkages with cascading integrity rules (`ON DELETE CASCADE` on extended roles, `ON DELETE SET NULL` on agent changes).
3. **Prepared Statements**: Avoid SQL injections by binding arguments safely (`db.execute('SELECT * FROM users WHERE username = ?', [username])`).
4. **Transactions (ACID)**: Uses SQL transaction pipelines (`connection.beginTransaction()`, `connection.commit()`, `connection.rollback()`) on customer registration (users + customers tables), agent provisioning, and billing checkouts (payments + bookings updates).
5. **Relational Reports (JOINS)**: Complex multi-table reporting joins in the Booking and Payment models to compile customer details, assigned agent details, and package parameters in single query operations.
6. **Role-Based Access (RBAC)**: Secure Express routers backed by middlewares evaluating specific state credentials and forwarding appropriate dashboard panels.
