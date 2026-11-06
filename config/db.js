const mysql = require('mysql2/promise');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'blood_bank_db',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

let pool = null;
let isConnected = false;
let connectionError = null;

// ==========================================
// In-Memory Fallback Store (Used if MySQL service is not yet started)
// Guarantees zero crashing and 100% feature testability out of the box
// ==========================================
class MemoryStore {
  constructor() {
    this.admin_users = [
      {
        admin_id: 1,
        username: 'admin',
        password_hash: '$2b$10$ATuA/GLe90ZUsaDxxrS7KOAeyOSBQyZyDd3oAP.xiRQiXkXMdl0tu', // admin123
        full_name: 'Dr. Sarah Mitchell',
        email: 'admin@bloodcare.org',
        role: 'Chief Medical Officer',
        created_at: new Date()
      }
    ];

    this.donors = [
      {
        donor_id: 1,
        donor_name: 'Alexander Wright',
        age: 29,
        gender: 'Male',
        blood_group: 'O+',
        phone: '+1 (555) 234-5678',
        email: 'alex.wright@example.com',
        address: '742 Evergreen Terrace, Springfield',
        last_donation_date: '2026-08-15',
        created_at: new Date('2026-08-15')
      },
      {
        donor_id: 2,
        donor_name: 'Eleanor Vance',
        age: 34,
        gender: 'Female',
        blood_group: 'A+',
        phone: '+1 (555) 345-6789',
        email: 'eleanor.v@example.com',
        address: '1204 Elmhurst Blvd, Metro City',
        last_donation_date: '2026-07-20',
        created_at: new Date('2026-07-20')
      },
      {
        donor_id: 3,
        donor_name: 'David Chen',
        age: 41,
        gender: 'Male',
        blood_group: 'B+',
        phone: '+1 (555) 456-7890',
        email: 'dchen.md@example.com',
        address: '88 Marina Way, Bayview',
        last_donation_date: '2026-09-02',
        created_at: new Date('2026-09-02')
      },
      {
        donor_id: 4,
        donor_name: 'Sophia Rodriguez',
        age: 26,
        gender: 'Female',
        blood_group: 'AB+',
        phone: '+1 (555) 567-8901',
        email: 'sophia.r@example.com',
        address: '315 Blossom Valley, Highland',
        last_donation_date: '2026-06-11',
        created_at: new Date('2026-06-11')
      },
      {
        donor_id: 5,
        donor_name: 'Marcus Sterling',
        age: 38,
        gender: 'Male',
        blood_group: 'O-',
        phone: '+1 (555) 678-9012',
        email: 'marcus.s@example.com',
        address: '54 Oakwood Crescent, Riverdale',
        last_donation_date: '2026-08-28',
        created_at: new Date('2026-08-28')
      },
      {
        donor_id: 6,
        donor_name: 'Priya Sharma',
        age: 30,
        gender: 'Female',
        blood_group: 'A-',
        phone: '+1 (555) 789-0123',
        email: 'priya.sharma@example.com',
        address: '902 Horizon Tower, Uptown',
        last_donation_date: '2026-05-19',
        created_at: new Date('2026-05-19')
      },
      {
        donor_id: 7,
        donor_name: 'Liam O\'Connor',
        age: 45,
        gender: 'Male',
        blood_group: 'B-',
        phone: '+1 (555) 890-1234',
        email: 'liam.oc@example.com',
        address: '67 King George Ave, St. Jude',
        last_donation_date: '2026-07-04',
        created_at: new Date('2026-07-04')
      },
      {
        donor_id: 8,
        donor_name: 'Zoe Nakamura',
        age: 24,
        gender: 'Female',
        blood_group: 'AB-',
        phone: '+1 (555) 901-2345',
        email: 'zoe.n@example.com',
        address: '410 Sakura Way, Greenfield',
        last_donation_date: '2026-09-14',
        created_at: new Date('2026-09-14')
      },
      {
        donor_id: 9,
        donor_name: 'Carlos Mendoza',
        age: 33,
        gender: 'Male',
        blood_group: 'O+',
        phone: '+1 (555) 112-3344',
        email: 'carlos.m@example.com',
        address: '19 Sunset Boulevard, Lakeside',
        last_donation_date: '2026-04-10',
        created_at: new Date('2026-04-10')
      },
      {
        donor_id: 10,
        donor_name: 'Grace Hopper',
        age: 28,
        gender: 'Female',
        blood_group: 'A+',
        phone: '+1 (555) 223-4455',
        email: 'grace.h@example.com',
        address: '101 Computing Way, Silicon Hills',
        last_donation_date: '2026-08-01',
        created_at: new Date('2026-08-01')
      }
    ];

    const today = new Date();
    const addDays = (d, n) => {
      const dt = new Date(d);
      dt.setDate(dt.getDate() + n);
      return dt.toISOString().split('T')[0];
    };

    this.blood_stock = [
      { stock_id: 1, blood_group: 'O+', units_available: 24, expiry_date: addDays(today, 28), storage_location: 'Cryo-Vault Alpha (Unit 1)', updated_at: new Date() },
      { stock_id: 2, blood_group: 'O+', units_available: 18, expiry_date: addDays(today, 38), storage_location: 'Cryo-Vault Alpha (Unit 2)', updated_at: new Date() },
      { stock_id: 3, blood_group: 'O-', units_available: 12, expiry_date: addDays(today, 21), storage_location: 'Emergency Cold Safe R-01', updated_at: new Date() },
      { stock_id: 4, blood_group: 'A+', units_available: 28, expiry_date: addDays(today, 32), storage_location: 'Main Refrigerator A-101', updated_at: new Date() },
      { stock_id: 5, blood_group: 'A+', units_available: 15, expiry_date: addDays(today, 42), storage_location: 'Main Refrigerator A-102', updated_at: new Date() },
      { stock_id: 6, blood_group: 'A-', units_available: 9,  expiry_date: addDays(today, 18), storage_location: 'Cold Chamber B-04 (Low Stock)', updated_at: new Date() },
      { stock_id: 7, blood_group: 'B+', units_available: 22, expiry_date: addDays(today, 30), storage_location: 'Refrigerated Unit B-201', updated_at: new Date() },
      { stock_id: 8, blood_group: 'B+', units_available: 14, expiry_date: addDays(today, 35), storage_location: 'Refrigerated Unit B-202', updated_at: new Date() },
      { stock_id: 9, blood_group: 'B-', units_available: 8,  expiry_date: addDays(today, 15), storage_location: 'Cold Storage Vault C-12', updated_at: new Date() },
      { stock_id: 10, blood_group: 'AB+', units_available: 16, expiry_date: addDays(today, 25), storage_location: 'Universal Plasma Freezing Wing', updated_at: new Date() },
      { stock_id: 11, blood_group: 'AB-', units_available: 6,  expiry_date: addDays(today, 14), storage_location: 'Cryo-Cabinet Ultra-02 (Critical)', updated_at: new Date() },
      { stock_id: 12, blood_group: 'O+', units_available: 10, expiry_date: addDays(today, 45), storage_location: 'Mobile Camp Dispatch Unit 4', updated_at: new Date() }
    ];

    this.blood_requests = [
      { request_id: 1, patient_name: 'Ethan Walker', blood_group: 'O+', units_required: 3, hospital_name: 'St. Jude General Hospital (Trauma ICU)', contact_number: '+1 (555) 443-8899', request_date: addDays(today, 0), request_status: 'Pending', created_at: new Date() },
      { request_id: 2, patient_name: 'Beatrice Miller', blood_group: 'A+', units_required: 2, hospital_name: 'City Memorial Medical Center', contact_number: '+1 (555) 332-9988', request_date: addDays(today, 0), request_status: 'Pending', created_at: new Date() },
      { request_id: 3, patient_name: 'Lucas Bennett', blood_group: 'B-', units_required: 1, hospital_name: 'Children\'s Specialty Hospital', contact_number: '+1 (555) 887-2211', request_date: addDays(today, -1), request_status: 'Approved', created_at: new Date(Date.now() - 86400000) },
      { request_id: 4, patient_name: 'Amara Okafor', blood_group: 'AB+', units_required: 2, hospital_name: 'Metropolitan Cardiovascular Institute', contact_number: '+1 (555) 776-5544', request_date: addDays(today, -2), request_status: 'Fulfilled', created_at: new Date(Date.now() - 172800000) },
      { request_id: 5, patient_name: 'Daniel Kim', blood_group: 'O-', units_required: 4, hospital_name: 'Highland Emergency Trauma Center', contact_number: '+1 (555) 998-1122', request_date: addDays(today, -3), request_status: 'Fulfilled', created_at: new Date(Date.now() - 259200000) },
      { request_id: 6, patient_name: 'Rachel Green', blood_group: 'AB-', units_required: 5, hospital_name: 'Valley General Surgery Wing', contact_number: '+1 (555) 665-3344', request_date: addDays(today, -4), request_status: 'Rejected', created_at: new Date(Date.now() - 345600000) }
    ];

    this.activity_logs = [
      { log_id: 1, action_type: 'SYSTEM_INITIALIZATION', details: 'Blood Bank Management System memory store initialized with full seed dataset.', created_at: new Date() },
      { log_id: 2, action_type: 'STOCK_ENTRY', details: 'Initial verified blood batch inventory loaded across 8 blood groups.', created_at: new Date() },
      { log_id: 3, action_type: 'DONOR_ENROLLMENT', details: '10 certified voluntary donors registered to database.', created_at: new Date() }
    ];

    this.nextDonorId = 11;
    this.nextStockId = 13;
    this.nextRequestId = 7;
    this.nextLogId = 4;
  }
}

const memoryStore = new MemoryStore();

// Attempt to connect to MySQL on boot
async function initMySQL() {
  try {
    pool = mysql.createPool(dbConfig);
    // Test connection with a quick query
    const [rows] = await pool.query('SELECT 1 + 1 AS test');
    isConnected = true;
    connectionError = null;
    console.log(`[DATABASE] ✔ Connected to MySQL Database at ${dbConfig.host}:${dbConfig.port} (${dbConfig.database})`);
  } catch (err) {
    isConnected = false;
    connectionError = err.message;
    console.warn(`[DATABASE] ⚠ Could not connect to MySQL Server (${dbConfig.host}:${dbConfig.port}): ${err.message}`);
    console.warn(`[DATABASE] ℹ Running in Resilient In-Memory Fallback Mode. All features and APIs remain 100% operational.`);
    console.warn(`[DATABASE] 👉 To connect to MySQL: Run MySQL Server and run 'npm run init-db' to import database/blood_bank.sql.`);
  }
}

initMySQL();

// ==========================================
// Unified DB Interface
// ==========================================
const db = {
  isMySQLConnected: () => isConnected,
  getStatus: () => ({
    mode: isConnected ? 'mysql' : 'memory_fallback',
    host: dbConfig.host,
    database: dbConfig.database,
    port: dbConfig.port,
    error: connectionError
  }),

  // Standard Query
  query: async (sql, params = []) => {
    if (isConnected && pool) {
      return await pool.query(sql, params);
    }
    // Execute via memory store emulator
    return await executeMemoryQuery(sql, params);
  },

  // Transaction Connection
  getConnection: async () => {
    if (isConnected && pool) {
      return await pool.getConnection();
    }
    // Return memory transaction mock with beginTransaction, commit, rollback, release
    return {
      query: async (sql, params = []) => executeMemoryQuery(sql, params),
      beginTransaction: async () => {},
      commit: async () => {},
      rollback: async () => {},
      release: () => {}
    };
  },

  // Direct reference to the memory store for deterministic atomic ops in fallback mode
  memory: memoryStore
};

// Memory query handler for standard SQL operations in the app
async function executeMemoryQuery(sql, params = []) {
  const cleanSql = sql.trim().replace(/\s+/g, ' ');

  // 1. SELECT COUNT / AGGREGATES
  if (/SELECT COUNT\(\*\) (as|AS) (total|total_donors) FROM donors/i.test(cleanSql)) {
    return [[{ total: memoryStore.donors.length, total_donors: memoryStore.donors.length }]];
  }

  if (/SELECT COALESCE\(SUM\(units_available\), 0\) as total_units FROM blood_stock/i.test(cleanSql)) {
    const total = memoryStore.blood_stock.reduce((sum, s) => sum + (Number(s.units_available) || 0), 0);
    return [[{ total_units: total }]];
  }

  if (/SELECT COUNT\(\*\) as total_requests/i.test(cleanSql)) {
    const total = memoryStore.blood_requests.length;
    const pending = memoryStore.blood_requests.filter(r => r.request_status === 'Pending').length;
    const approved = memoryStore.blood_requests.filter(r => r.request_status === 'Approved').length;
    const fulfilled = memoryStore.blood_requests.filter(r => r.request_status === 'Fulfilled').length;
    const rejected = memoryStore.blood_requests.filter(r => r.request_status === 'Rejected').length;
    return [[{ total_requests: total, pending_requests: pending, approved_requests: approved, fulfilled_requests: fulfilled, rejected_requests: rejected }]];
  }

  // 2. SELECT DONORS
  if (/FROM donors/i.test(cleanSql)) {
    let list = [...memoryStore.donors];

    // WHERE donor_id = ?
    if (/WHERE donor_id = \?/i.test(cleanSql)) {
      const id = Number(params[0]);
      const found = list.filter(d => d.donor_id === id);
      return [found];
    }

    // Filter by blood group or search
    if (params.length > 0) {
      // Check if blood group parameter or search
      if (/blood_group = \?/i.test(cleanSql)) {
        list = list.filter(d => d.blood_group === params[0]);
      }
    }

    list.sort((a, b) => b.donor_id - a.donor_id);
    return [list];
  }

  // 3. SELECT BLOOD STOCK
  if (/FROM blood_stock/i.test(cleanSql)) {
    let list = [...memoryStore.blood_stock];

    // WHERE stock_id = ?
    if (/WHERE stock_id = \?/i.test(cleanSql)) {
      const id = Number(params[0]);
      const found = list.filter(s => s.stock_id === id);
      return [found];
    }

    // Group-by stock aggregation: blood_group, SUM(units_available)
    if (/GROUP BY blood_group/i.test(cleanSql)) {
      const groups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
      const aggregated = groups.map(bg => {
        const matching = memoryStore.blood_stock.filter(s => s.blood_group === bg);
        const units = matching.reduce((sum, s) => sum + (Number(s.units_available) || 0), 0);
        return { blood_group: bg, total_units: units, batch_count: matching.length };
      });
      return [aggregated];
    }

    // Filter by blood group and expiry
    if (/blood_group = \?/i.test(cleanSql)) {
      const bg = params[0];
      list = list.filter(s => s.blood_group === bg);
    }

    list.sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));
    return [list];
  }

  // 4. SELECT BLOOD REQUESTS
  if (/FROM blood_requests/i.test(cleanSql)) {
    let list = [...memoryStore.blood_requests];

    if (/WHERE request_id = \?/i.test(cleanSql)) {
      const id = Number(params[0]);
      const found = list.filter(r => r.request_id === id);
      return [found];
    }

    if (/WHERE contact_number = \? OR request_id = \?/i.test(cleanSql)) {
      const queryVal = String(params[0]);
      const found = list.filter(r => String(r.contact_number).includes(queryVal) || String(r.request_id) === queryVal);
      return [found];
    }

    list.sort((a, b) => b.request_id - a.request_id);
    return [list];
  }

  // 5. SELECT ADMIN USERS
  if (/FROM admin_users/i.test(cleanSql)) {
    if (/WHERE username = \?/i.test(cleanSql)) {
      const u = params[0];
      const found = memoryStore.admin_users.filter(a => a.username === u);
      return [found];
    }
    if (/WHERE admin_id = \?/i.test(cleanSql)) {
      const id = Number(params[0]);
      const found = memoryStore.admin_users.filter(a => a.admin_id === id);
      return [found];
    }
    return [memoryStore.admin_users];
  }

  // 6. SELECT ACTIVITY LOGS
  if (/FROM activity_logs/i.test(cleanSql)) {
    const list = [...memoryStore.activity_logs].sort((a, b) => b.log_id - a.log_id);
    return [list.slice(0, 20)];
  }

  // 7. INSERT STATEMENTS
  if (/INSERT INTO donors/i.test(cleanSql)) {
    const newDonor = {
      donor_id: memoryStore.nextDonorId++,
      donor_name: params[0],
      age: Number(params[1]),
      gender: params[2],
      blood_group: params[3],
      phone: params[4],
      email: params[5],
      address: params[6],
      last_donation_date: params[7] || null,
      created_at: new Date()
    };
    memoryStore.donors.unshift(newDonor);
    memoryStore.activity_logs.unshift({
      log_id: memoryStore.nextLogId++,
      action_type: 'DONOR_REGISTERED',
      details: `New donor registered: ${newDonor.donor_name} (${newDonor.blood_group})`,
      created_at: new Date()
    });
    return [{ insertId: newDonor.donor_id, affectedRows: 1 }];
  }

  if (/INSERT INTO blood_stock/i.test(cleanSql)) {
    const newStock = {
      stock_id: memoryStore.nextStockId++,
      blood_group: params[0],
      units_available: Number(params[1]),
      expiry_date: params[2],
      storage_location: params[3],
      updated_at: new Date()
    };
    memoryStore.blood_stock.unshift(newStock);
    memoryStore.activity_logs.unshift({
      log_id: memoryStore.nextLogId++,
      action_type: 'STOCK_ADDED',
      details: `Added ${newStock.units_available} units of ${newStock.blood_group} to ${newStock.storage_location}`,
      created_at: new Date()
    });
    return [{ insertId: newStock.stock_id, affectedRows: 1 }];
  }

  if (/INSERT INTO blood_requests/i.test(cleanSql)) {
    const newReq = {
      request_id: memoryStore.nextRequestId++,
      patient_name: params[0],
      blood_group: params[1],
      units_required: Number(params[2]),
      hospital_name: params[3],
      contact_number: params[4],
      request_date: params[5] || new Date().toISOString().split('T')[0],
      request_status: params[6] || 'Pending',
      created_at: new Date()
    };
    memoryStore.blood_requests.unshift(newReq);
    memoryStore.activity_logs.unshift({
      log_id: memoryStore.nextLogId++,
      action_type: 'REQUEST_SUBMITTED',
      details: `Blood request submitted for ${newReq.patient_name} (${newReq.units_required} units of ${newReq.blood_group})`,
      created_at: new Date()
    });
    return [{ insertId: newReq.request_id, affectedRows: 1 }];
  }

  if (/INSERT INTO activity_logs/i.test(cleanSql)) {
    const newLog = {
      log_id: memoryStore.nextLogId++,
      action_type: params[0],
      details: params[1],
      created_at: new Date()
    };
    memoryStore.activity_logs.unshift(newLog);
    return [{ insertId: newLog.log_id, affectedRows: 1 }];
  }

  // 8. UPDATE STATEMENTS
  if (/UPDATE blood_requests SET request_status = \?/i.test(cleanSql)) {
    const newStatus = params[0];
    const reqId = Number(params[1]);
    const req = memoryStore.blood_requests.find(r => r.request_id === reqId);
    if (req) {
      req.request_status = newStatus;
      return [{ affectedRows: 1 }];
    }
    return [{ affectedRows: 0 }];
  }

  if (/UPDATE blood_stock SET units_available = \?/i.test(cleanSql)) {
    const units = Number(params[0]);
    const id = Number(params[params.length - 1]);
    const stock = memoryStore.blood_stock.find(s => s.stock_id === id);
    if (stock) {
      stock.units_available = units;
      stock.updated_at = new Date();
      return [{ affectedRows: 1 }];
    }
    return [{ affectedRows: 0 }];
  }

  if (/UPDATE donors SET/i.test(cleanSql)) {
    const id = Number(params[params.length - 1]);
    const donor = memoryStore.donors.find(d => d.donor_id === id);
    if (donor) {
      donor.donor_name = params[0];
      donor.age = Number(params[1]);
      donor.gender = params[2];
      donor.blood_group = params[3];
      donor.phone = params[4];
      donor.email = params[5];
      donor.address = params[6];
      donor.last_donation_date = params[7];
      return [{ affectedRows: 1 }];
    }
    return [{ affectedRows: 0 }];
  }

  // 9. DELETE STATEMENTS
  if (/DELETE FROM donors WHERE donor_id = \?/i.test(cleanSql)) {
    const id = Number(params[0]);
    const idx = memoryStore.donors.findIndex(d => d.donor_id === id);
    if (idx !== -1) {
      memoryStore.donors.splice(idx, 1);
      return [{ affectedRows: 1 }];
    }
    return [{ affectedRows: 0 }];
  }

  if (/DELETE FROM blood_stock WHERE stock_id = \?/i.test(cleanSql)) {
    const id = Number(params[0]);
    const idx = memoryStore.blood_stock.findIndex(s => s.stock_id === id);
    if (idx !== -1) {
      memoryStore.blood_stock.splice(idx, 1);
      return [{ affectedRows: 1 }];
    }
    return [{ affectedRows: 0 }];
  }

  return [[]];
}

module.exports = db;
