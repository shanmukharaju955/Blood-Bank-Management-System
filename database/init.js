const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  multipleStatements: true
};

const DB_NAME = process.env.DB_NAME || 'blood_bank_db';

async function initializeDatabase() {
  console.log('====================================================');
  console.log(' Blood Bank Management System - Database Initializer');
  console.log('====================================================');
  console.log(`Target Host: ${dbConfig.host}:${dbConfig.port}`);
  console.log(`Database Name: ${DB_NAME}`);
  console.log(`User: ${dbConfig.user}`);

  let connection;
  try {
    // 1. Connect to MySQL Server (without selecting database first)
    console.log('\n[1/4] Connecting to MySQL server...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✔ Connected to MySQL successfully!');

    // 2. Create Database if not exists
    console.log(`\n[2/4] Ensuring database "${DB_NAME}" exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    console.log(`✔ Database "${DB_NAME}" verified / created.`);

    // 3. Switch to database
    await connection.changeUser({ database: DB_NAME });
    console.log(`✔ Selected database: ${DB_NAME}`);

    // 4. Read and execute SQL schema & seed data
    console.log('\n[3/4] Reading SQL file: database/blood_bank.sql ...');
    const sqlFilePath = path.join(__dirname, 'blood_bank.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('[4/4] Executing schema definitions, tables, and seed data...');
    // Split statements or execute multipleStatements
    await connection.query(sqlContent);
    console.log('✔ All tables created and sample data successfully seeded!');

    // Verification queries
    const [donors] = await connection.query('SELECT COUNT(*) as count FROM donors');
    const [stocks] = await connection.query('SELECT COUNT(*) as count, SUM(units_available) as total_units FROM blood_stock');
    const [requests] = await connection.query('SELECT COUNT(*) as count FROM blood_requests');
    const [admins] = await connection.query('SELECT username, full_name, role FROM admin_users');

    console.log('\n====================================================');
    console.log(' DATABASE INITIALIZATION SUMMARY:');
    console.log(` - Registered Donors: ${donors[0].count}`);
    console.log(` - Stock Batches: ${stocks[0].count} (${stocks[0].total_units || 0} total units)`);
    console.log(` - Initial Requests: ${requests[0].count}`);
    console.log(` - Admin Accounts: ${admins.map(a => `${a.username} (${a.role})`).join(', ')}`);
    console.log('====================================================');
    console.log('Database is ready for production use!\n');

  } catch (error) {
    console.error('\n❌ Database initialization failed with error:');
    console.error(error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n👉 Solution: Ensure MySQL Server is running on your system (e.g. via Windows Services, XAMPP, or MySQL Installer) and check that port 3306 is open.');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n👉 Solution: Check your MySQL username and password in the .env file.');
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase;
