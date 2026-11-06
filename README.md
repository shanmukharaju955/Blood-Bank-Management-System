# 🩸 BloodBank360 - Premium Blood Bank Management System

A production-grade, full-stack **Blood Bank Management System** built with **HTML5, CSS3 3D Design, JavaScript, Node.js, Express.js, MySQL (InnoDB with ACID Transactions), and Chart.js**.

Designed with a high-end **3D Red & White medical aesthetic**, glassmorphism interfaces, interactive 3D blood bag liquid physics, and comprehensive hospital requisition workflows.

---

## 🎨 Design System & Theme

- **Primary Red:** `#D7193F`
- **Dark Red:** `#8B1028`
- **White:** `#FFFFFF`
- **Background:** `#F8F9FC`
- **Dark:** `#171923`
- **Light Pink:** `#FFF0F3`
- **Key Features:**
  - 3D Interactive Tilt Blood Bag with dynamic fluid wave, measurement graduations, clamp, and barcode.
  - Floating 3D erythrocyte (red blood cell) background particles with realistic parallax.
  - Glassmorphic translucent cards (`backdrop-filter: blur(16px)`).
  - Animated live counters synchronized to the backend database.
  - Interactive Chart.js visualizations (Blood Stock Distribution & Requisition Status Doughnut).
  - Responsive layout for Desktop, Tablet, and Mobile screens.

---

## 📁 Project Structure

```
blood-bank-management/
│
├── public/
│   ├── css/
│   │   ├── style.css           # Core styling, 3D theme, glassmorphism, responsive grids
│   │   ├── dashboard.css       # Admin dashboard, sidebar, KPI cards, print stylesheets
│   │   └── animations.css      # Keyframe animations (waves, heartbeat, floating, glow)
│   ├── js/
│   │   ├── main.js             # 3D bag tilt, live counters, mobile menu, home stock matrix
│   │   ├── donors.js           # Donor directory, search, blood group filters, registration
│   │   ├── stock.js            # Live stock monitor, low-stock warnings, batch tables
│   │   └── dashboard.js        # Admin session, Chart.js graphs, CRUD, atomic approvals
│   └── pages/
│       ├── index.html          # Public Home Page
│       ├── about.html          # Mission, vision, cold-chain tech, advisory board
│       ├── donors.html         # Donor registration & active verified registry
│       ├── blood-stock.html    # 8 blood groups matrix, compatibility table, cryo-batches
│       ├── request-blood.html  # Emergency requisition form & live status tracker
│       ├── contact.html        # Coordination office, map coordinates, clinical FAQs
│       ├── admin-login.html    # Secure admin portal authentication (Bcrypt)
│       └── admin-dashboard.html# Executive admin console with tabbed management
│
├── routes/
│   ├── donorRoutes.js          # REST API endpoints for Donors
│   ├── stockRoutes.js          # REST API endpoints for Blood Stock
│   ├── requestRoutes.js        # REST API endpoints for Requisitions & Tracking
│   └── adminRoutes.js          # REST API endpoints for Admin Auth & Analytics
│
├── controllers/
│   ├── donorController.js      # Donor queries, search, filter, and CRUD
│   ├── stockController.js      # Stock aggregation, expiry calculations, batch CRUD
│   ├── requestController.js    # Requisitions, live tracking, and ACID atomic approval
│   └── adminController.js      # Auth, password hashing, KPI metrics, chart datasets
│
├── middleware/
│   ├── authMiddleware.js       # Admin session security & route guards
│   └── validationMiddleware.js # Server-side input validation
│
├── config/
│   └── db.js                   # MySQL pool connection + resilient fallback adapter
│
├── database/
│   ├── blood_bank.sql          # Complete MySQL database schema & rich seed data
│   └── init.js                 # Automated database initialization script
│
├── server.js                   # Main Express application server
├── package.json                # Dependencies and npm scripts
├── .env.example                # Environment variables template
├── .env                        # Local environment configuration
└── README.md                   # Full documentation & setup guide
```

---

## ⚙️ Installation & Setup Instructions

### Prerequisites
- **Node.js** (v18.0.0 or higher)
- **npm** (v9.0.0 or higher)
- **MySQL Server** (8.0 or MariaDB, or XAMPP / WampServer)

---

### Step 1: Install Dependencies
Open your terminal in the project directory and install the required packages:
```bash
npm install
```

---

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env` (or update `.env` directly):
```ini
PORT=5000
NODE_ENV=development

# MySQL Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=blood_bank_db
DB_PORT=3306

# Admin Session Secret
SESSION_SECRET=blood_bank_super_secret_session_key_2026_d7193f
```

---

### Step 3: MySQL Database Setup

#### Option A: Automatic Initialization (Recommended)
Run the built-in database setup script:
```bash
npm run init-db
```
This script automatically:
1. Connects to your MySQL server.
2. Creates the database `blood_bank_db` if it does not exist.
3. Creates all tables (`donors`, `blood_stock`, `blood_requests`, `admin_users`, `activity_logs`) with **InnoDB** engine and foreign keys.
4. Populates realistic seed records for 10 donors, 12 stock batches across all 8 blood groups, 6 sample hospital requests, and the default admin account.

#### Option B: Manual SQL Import
Import `database/blood_bank.sql` using MySQL CLI or MySQL Workbench:
```bash
mysql -u root -p < database/blood_bank.sql
```

> **Zero-Downtime Fallback Mode:**  
> If MySQL Server is not currently running or credentials are being configured, the system automatically runs in a high-fidelity **In-Memory Fallback Mode**. All pages, forms, search filters, Chart.js graphs, and ACID transaction rules remain 100% operational for seamless evaluation.

---

### Step 4: Run the Application
Start the Node.js Express server:
```bash
npm start
```

Console output:
```
========================================================
🚀 Blood Bank Management System Server Running!
🌐 Local Web Portal: http://localhost:5000
🔐 Admin Login URL: http://localhost:5000/pages/admin-login.html
📊 Admin Credentials: admin / admin123
🩺 Health API: http://localhost:5000/api/health
========================================================
```

---

## 🔐 Administrative Account

- **Login URL:** [http://localhost:5000/pages/admin-login.html](http://localhost:5000/pages/admin-login.html)
- **Default Username:** `admin`
- **Default Password:** `admin123`
- **Password Security:** Salted Bcrypt Hash (`$2b$10$ATuA/GLe90ZUsaDxxrS7KOAeyOSBQyZyDd3oAP.xiRQiXkXMdl0tu`)
- **Session Security:** Express-Session with HTTP-only cookies and route middleware protection.

---

## 🌐 Localhost URL Sitemap

| Page | URL | Purpose |
| :--- | :--- | :--- |
| **Home Portal** | `http://localhost:5000/` | Hero section, 3D animated blood bag, live counters, 8-group matrix |
| **About Page** | `http://localhost:5000/pages/about.html` | Mission, vision, cold-chain preservation, medical advisory board |
| **Donors Registry** | `http://localhost:5000/pages/donors.html` | Donor registration form + verified donor search & blood group filters |
| **Blood Stock** | `http://localhost:5000/pages/blood-stock.html` | 8-group stock matrix, low-stock warnings, compatibility guide, batch table |
| **Request Blood** | `http://localhost:5000/pages/request-blood.html` | Emergency hospital requisition form + live 4-step status tracker |
| **Contact Page** | `http://localhost:5000/pages/contact.html` | Contact form, 24/7 hotline, Google maps coordinates, clinical FAQs |
| **Admin Login** | `http://localhost:5000/pages/admin-login.html` | Secure staff portal authentication |
| **Admin Dashboard** | `http://localhost:5000/pages/admin-dashboard.html` | Full management console with Chart.js analytics & atomic approvals |
| **Health API** | `http://localhost:5000/api/health` | System health check & database connection diagnostics |

---

## 🧪 Testing Instructions for Major Features

### 1. 3D Blood Bag & Live Home Counters
1. Open `http://localhost:5000/` in your browser.
2. Move your cursor over the 3D blood bag on the right side of the hero section; observe the dynamic 3D perspective tilt following your cursor.
3. Observe the fluid wave and rising bubbles inside the bag.
4. Check the 4 statistic cards below the hero: notice the numbers count up smoothly from 0 to real database values.
5. Review the 8 blood group cards (A+, A-, B+, B-, AB+, AB-, O+, O-) populated directly from the backend.

### 2. Donor Registration & Search Directory
1. Navigate to **Donors** (`/pages/donors.html`).
2. Fill out the "Donor Registration Form" (e.g., Name: `Jonathan Reed`, Age: `31`, Gender: `Male`, Blood Group: `O-`, Phone: `+1 555-444-2211`, Email: `jreed@example.com`, Address: `12 Beacon Hill, Boston`).
3. Click **Register As A Voluntary Donor**.
4. Observe the green toast notification confirming successful registration.
5. Scroll down to the **Verified Voluntary Donors** section; note that your new donor card appears immediately.
6. Test the blood group filter buttons (`O-`, `A+`, etc.) and the live search bar to verify instantaneous client-side filtering.

### 3. Emergency Blood Request & Live Tracking
1. Navigate to **Request Blood** (`/pages/request-blood.html`).
2. Complete the requisition form:
   - Patient Name: `Katherine Wells`
   - Blood Group: `O+`
   - Units Required: `2`
   - Clinical Urgency: `Emergency (Immediate < 1 hr)`
   - Hospital: `City Memorial Emergency Trauma Center`
   - Contact Phone: `+1 555-987-6543`
3. Click **Submit Clinical Requisition**.
4. A green toast displays the new Request ID (e.g., `#REQ-0007`).
5. Notice that the **Track Request Status** widget on the right immediately displays the requisition with its 4-step progress tracker set to **Submitted (Pending)**.

### 4. Admin Login & Protected Dashboard
1. Navigate to **Staff Portal** (`/pages/admin-login.html`).
2. Click "Click here to auto-fill demo credentials" or enter `admin` and `admin123`.
3. Click **Authenticate & Enter Console**.
4. You are redirected to `/pages/admin-dashboard.html`.
5. Observe the 5 top KPI cards, the **Blood Group Stock Distribution (Bar Chart)**, and the **Requisition Status Ratios (Doughnut Chart)** rendered via Chart.js.

### 5. ACID Transactional Approval & FIFO Stock Deduction
1. In the Admin Dashboard, click the **Blood Requests** tab in the sidebar.
2. Locate the Pending requisition you just created.
3. Click **Approve & Deduct**:
   - The backend begins a **MySQL ACID transaction** with row-level locks (`SELECT ... FOR UPDATE`).
   - It verifies that sufficient non-expired units of the requested blood group exist.
   - It deducts units in **FIFO order** (nearest expiration date first) and updates stock.
   - It marks the requisition as **Approved**.
4. Verify that the requisition status badge changes to **Approved**.
5. Switch to the **Manage Blood Stock** tab: observe that the available units for that blood group have decreased accurately by 2 units.
6. Attempt to approve the same request again: observe that the backend rejects it with:
   `"Duplicate deduction prevented: Request is already Approved."`

### 6. Clinical Audit Report Printing
1. In the Admin Dashboard, click the **Clinical Reports** tab.
2. Review the aggregated inventory summary table.
3. Click **Print Official Report / PDF**:
   - The custom print stylesheet hides navigation bars and buttons, displaying a formal clinical audit document formatted for physical printing or saving as PDF.

---

## 🔒 Security Implementations

- **Password Hashing:** Salted Bcrypt rounds (10) for administrative password security.
- **SQL Injection Prevention:** 100% prepared statements (`?` parameters) across all controllers.
- **Race Condition Prevention:** MySQL `FOR UPDATE` row locks inside atomic transactions.
- **Negative Stock & Expired Unit Protection:** Database constraints exclude `expiry_date < CURDATE()`.
- **Session Protection:** Secure, HTTP-only session cookies with session invalidation on logout.

---

## 📜 License
This project is licensed under the ISC License. Designed for commercial medical logistics and hospital blood bank infrastructure.
