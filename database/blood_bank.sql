-- =======================================================
-- BLOOD BANK MANAGEMENT SYSTEM DATABASE SCHEMA
-- Database: blood_bank_db
-- Engine: InnoDB
-- Charset: utf8mb4
-- =======================================================

CREATE DATABASE IF NOT EXISTS blood_bank_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE blood_bank_db;

-- -------------------------------------------------------
-- Table: admin_users
-- Stores administrator credentials for portal authentication
-- -------------------------------------------------------
DROP TABLE IF EXISTS admin_users;
CREATE TABLE admin_users (
  admin_id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'Super Admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- Table: donors
-- Stores registered blood donors and their eligibility details
-- -------------------------------------------------------
DROP TABLE IF EXISTS donors;
CREATE TABLE donors (
  donor_id INT AUTO_INCREMENT PRIMARY KEY,
  donor_name VARCHAR(100) NOT NULL,
  age INT NOT NULL,
  gender ENUM('Male', 'Female', 'Other') NOT NULL,
  blood_group ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(100) NOT NULL,
  address TEXT NOT NULL,
  last_donation_date DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_donors_blood_group (blood_group),
  INDEX idx_donors_phone (phone),
  INDEX idx_donors_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- Table: blood_stock
-- Tracks inventory batches, storage cryo-units, and expiration dates
-- -------------------------------------------------------
DROP TABLE IF EXISTS blood_stock;
CREATE TABLE blood_stock (
  stock_id INT AUTO_INCREMENT PRIMARY KEY,
  blood_group ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NOT NULL,
  units_available INT NOT NULL DEFAULT 0,
  expiry_date DATE NOT NULL,
  storage_location VARCHAR(100) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_stock_blood_group (blood_group),
  INDEX idx_stock_expiry (expiry_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- Table: blood_requests
-- Manages hospital emergency and planned blood transfusion requests
-- -------------------------------------------------------
DROP TABLE IF EXISTS blood_requests;
CREATE TABLE blood_requests (
  request_id INT AUTO_INCREMENT PRIMARY KEY,
  patient_name VARCHAR(100) NOT NULL,
  blood_group ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NOT NULL,
  units_required INT NOT NULL,
  hospital_name VARCHAR(150) NOT NULL,
  contact_number VARCHAR(20) NOT NULL,
  request_date DATE NOT NULL,
  request_status ENUM('Pending', 'Approved', 'Rejected', 'Fulfilled') NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_requests_status (request_status),
  INDEX idx_requests_blood_group (blood_group),
  INDEX idx_requests_contact (contact_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- Table: activity_logs
-- Audit log tracking administrative actions and stock transactions
-- -------------------------------------------------------
DROP TABLE IF EXISTS activity_logs;
CREATE TABLE activity_logs (
  log_id INT AUTO_INCREMENT PRIMARY KEY,
  action_type VARCHAR(50) NOT NULL,
  details TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_logs_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =======================================================
-- SEED SAMPLE DATA
-- =======================================================

-- Admin user (Default credentials: admin / admin123)
INSERT INTO admin_users (username, password_hash, full_name, email, role) VALUES
('admin', '$2b$10$ATuA/GLe90ZUsaDxxrS7KOAeyOSBQyZyDd3oAP.xiRQiXkXMdl0tu', 'Dr. Sarah Mitchell', 'admin@bloodcare.org', 'Chief Medical Officer');

-- Donors across diverse blood groups
INSERT INTO donors (donor_name, age, gender, blood_group, phone, email, address, last_donation_date) VALUES
('Alexander Wright', 29, 'Male', 'O+', '+1 (555) 234-5678', 'alex.wright@example.com', '742 Evergreen Terrace, Springfield', '2026-08-15'),
('Eleanor Vance', 34, 'Female', 'A+', '+1 (555) 345-6789', 'eleanor.v@example.com', '1204 Elmhurst Blvd, Metro City', '2026-07-20'),
('David Chen', 41, 'Male', 'B+', '+1 (555) 456-7890', 'dchen.md@example.com', '88 Marina Way, Bayview', '2026-09-02'),
('Sophia Rodriguez', 26, 'Female', 'AB+', '+1 (555) 567-8901', 'sophia.r@example.com', '315 Blossom Valley, Highland', '2026-06-11'),
('Marcus Sterling', 38, 'Male', 'O-', '+1 (555) 678-9012', 'marcus.s@example.com', '54 Oakwood Crescent, Riverdale', '2026-08-28'),
('Priya Sharma', 30, 'Female', 'A-', '+1 (555) 789-0123', 'priya.sharma@example.com', '902 Horizon Tower, Uptown', '2026-05-19'),
('Liam O''Connor', 45, 'Male', 'B-', '+1 (555) 890-1234', 'liam.oc@example.com', '67 King George Ave, St. Jude', '2026-07-04'),
('Zoe Nakamura', 24, 'Female', 'AB-', '+1 (555) 901-2345', 'zoe.n@example.com', '410 Sakura Way, Greenfield', '2026-09-14'),
('Carlos Mendoza', 33, 'Male', 'O+', '+1 (555) 112-3344', 'carlos.m@example.com', '19 Sunset Boulevard, Lakeside', '2026-04-10'),
('Grace Hopper', 28, 'Female', 'A+', '+1 (555) 223-4455', 'grace.h@example.com', '101 Computing Way, Silicon Hills', '2026-08-01');

-- Blood Stock Batches with varying expiration and storage locations
INSERT INTO blood_stock (blood_group, units_available, expiry_date, storage_location) VALUES
('O+', 24, DATE_ADD(CURDATE(), INTERVAL 28 DAY), 'Cryo-Vault Alpha (Unit 1)'),
('O+', 18, DATE_ADD(CURDATE(), INTERVAL 38 DAY), 'Cryo-Vault Alpha (Unit 2)'),
('O-', 12, DATE_ADD(CURDATE(), INTERVAL 21 DAY), 'Emergency Cold Safe R-01'),
('A+', 28, DATE_ADD(CURDATE(), INTERVAL 32 DAY), 'Main Refrigerator A-101'),
('A+', 15, DATE_ADD(CURDATE(), INTERVAL 42 DAY), 'Main Refrigerator A-102'),
('A-', 9,  DATE_ADD(CURDATE(), INTERVAL 18 DAY), 'Cold Chamber B-04 (Low Stock)'),
('B+', 22, DATE_ADD(CURDATE(), INTERVAL 30 DAY), 'Refrigerated Unit B-201'),
('B+', 14, DATE_ADD(CURDATE(), INTERVAL 35 DAY), 'Refrigerated Unit B-202'),
('B-', 8,  DATE_ADD(CURDATE(), INTERVAL 15 DAY), 'Cold Storage Vault C-12'),
('AB+', 16, DATE_ADD(CURDATE(), INTERVAL 25 DAY), 'Universal Plasma Freezing Wing'),
('AB-', 6,  DATE_ADD(CURDATE(), INTERVAL 14 DAY), 'Cryo-Cabinet Ultra-02 (Critical)'),
('O+', 10, DATE_ADD(CURDATE(), INTERVAL 45 DAY), 'Mobile Camp Dispatch Unit 4');

-- Initial Blood Requests (Pending, Approved, Fulfilled, Rejected)
INSERT INTO blood_requests (patient_name, blood_group, units_required, hospital_name, contact_number, request_date, request_status) VALUES
('Ethan Walker', 'O+', 3, 'St. Jude General Hospital (Trauma ICU)', '+1 (555) 443-8899', CURDATE(), 'Pending'),
('Beatrice Miller', 'A+', 2, 'City Memorial Medical Center', '+1 (555) 332-9988', CURDATE(), 'Pending'),
('Lucas Bennett', 'B-', 1, 'Children''s Specialty Hospital', '+1 (555) 887-2211', DATE_SUB(CURDATE(), INTERVAL 1 DAY), 'Approved'),
('Amara Okafor', 'AB+', 2, 'Metropolitan Cardiovascular Institute', '+1 (555) 776-5544', DATE_SUB(CURDATE(), INTERVAL 2 DAY), 'Fulfilled'),
('Daniel Kim', 'O-', 4, 'Highland Emergency Trauma Center', '+1 (555) 998-1122', DATE_SUB(CURDATE(), INTERVAL 3 DAY), 'Fulfilled'),
('Rachel Green', 'AB-', 5, 'Valley General Surgery Wing', '+1 (555) 665-3344', DATE_SUB(CURDATE(), INTERVAL 4 DAY), 'Rejected');

-- Activity Logs
INSERT INTO activity_logs (action_type, details) VALUES
('SYSTEM_INITIALIZATION', 'Blood Bank Management System database initialized with complete schema.'),
('STOCK_ENTRY', 'Initial verified blood batch inventory loaded across 8 blood groups.'),
('DONOR_ENROLLMENT', '10 certified voluntary donors registered to database.');
