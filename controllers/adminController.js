const bcrypt = require('bcryptjs');
const db = require('../config/db');

const ALL_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Admin Login
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    const [rows] = await db.query('SELECT * FROM admin_users WHERE username = ?', [username.trim()]);

    if (!rows || rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid administrative credentials.' });
    }

    const admin = rows[0];
    const passwordMatch = await bcrypt.compare(password, admin.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid administrative credentials.' });
    }

    // Initialize session
    req.session.adminUser = {
      id: admin.admin_id,
      username: admin.username,
      full_name: admin.full_name,
      email: admin.email,
      role: admin.role
    };

    // Log admin login activity
    try {
      await db.query(
        'INSERT INTO activity_logs (action_type, details) VALUES (?, ?)',
        ['ADMIN_LOGIN', `Admin ${admin.username} logged into the dashboard.`]
      );
    } catch (e) {
      // Non-fatal
    }

    return res.status(200).json({
      success: true,
      message: `Welcome back, ${admin.full_name}!`,
      user: req.session.adminUser
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error during authentication.' });
  }
};

// Admin Logout
exports.logout = (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ success: false, message: 'Could not log out. Please try again.' });
    }
    res.clearCookie('connect.sid');
    return res.status(200).json({ success: true, message: 'Logged out successfully.' });
  });
};

// Get Current Authenticated Admin
exports.getCurrentAdmin = (req, res) => {
  if (req.session && req.session.adminUser) {
    return res.status(200).json({ success: true, user: req.session.adminUser });
  }
  return res.status(401).json({ success: false, message: 'Not authenticated.' });
};

// Get Full Dashboard Statistics & Analytics
exports.getDashboardStats = async (req, res) => {
  try {
    // 1. Total Donors
    const [donorRes] = await db.query('SELECT COUNT(*) AS total FROM donors');
    const totalDonors = (donorRes && donorRes[0]) ? (donorRes[0].total ?? donorRes[0].total_donors ?? 0) : 0;

    // 2. Total Available Blood Units (non-expired)
    const [stockRes] = await db.query(`
      SELECT COALESCE(SUM(units_available), 0) AS total_units 
      FROM blood_stock 
      WHERE expiry_date >= CURDATE()
    `);
    const totalUnits = stockRes[0].total_units || 0;

    // 3. Blood Requests Counts by Status
    const [reqStatusRes] = await db.query(`
      SELECT 
        COUNT(*) AS total_requests,
        SUM(CASE WHEN request_status = 'Pending' THEN 1 ELSE 0 END) AS pending_requests,
        SUM(CASE WHEN request_status = 'Approved' THEN 1 ELSE 0 END) AS approved_requests,
        SUM(CASE WHEN request_status = 'Fulfilled' THEN 1 ELSE 0 END) AS fulfilled_requests,
        SUM(CASE WHEN request_status = 'Rejected' THEN 1 ELSE 0 END) AS rejected_requests
      FROM blood_requests
    `);
    const reqStats = reqStatusRes[0] || {};
    const totalRequests = reqStats.total_requests || 0;
    const pendingRequests = reqStats.pending_requests || 0;
    const approvedRequests = reqStats.approved_requests || 0;
    const fulfilledRequests = reqStats.fulfilled_requests || 0;
    const rejectedRequests = reqStats.rejected_requests || 0;

    // 4. Blood Stock Distribution by Group (for Chart.js)
    const [groupStockRes] = await db.query(`
      SELECT 
        blood_group, 
        COALESCE(SUM(CASE WHEN expiry_date >= CURDATE() THEN units_available ELSE 0 END), 0) AS units
      FROM blood_stock
      GROUP BY blood_group
    `);

    const groupMap = {};
    ALL_BLOOD_GROUPS.forEach(bg => { groupMap[bg] = 0; });
    groupStockRes.forEach(r => { groupMap[r.blood_group] = parseInt(r.units, 10) || 0; });

    const stockChartLabels = ALL_BLOOD_GROUPS;
    const stockChartData = ALL_BLOOD_GROUPS.map(bg => groupMap[bg]);

    // Low stock warnings (< 15 units)
    const lowStockAlerts = ALL_BLOOD_GROUPS
      .filter(bg => groupMap[bg] < 15)
      .map(bg => ({ blood_group: bg, units: groupMap[bg] }));

    // 5. Recent Requests (top 6)
    const [recentRequests] = await db.query(`
      SELECT request_id, patient_name, blood_group, units_required, hospital_name, request_date, request_status, created_at
      FROM blood_requests
      ORDER BY request_id DESC
      LIMIT 6
    `);

    // 6. Recent Donors (top 6)
    const [recentDonors] = await db.query(`
      SELECT donor_id, donor_name, age, gender, blood_group, phone, last_donation_date, created_at
      FROM donors
      ORDER BY donor_id DESC
      LIMIT 6
    `);

    // 7. Recent Activity Logs
    const [recentLogs] = await db.query(`
      SELECT log_id, action_type, details, created_at
      FROM activity_logs
      ORDER BY log_id DESC
      LIMIT 10
    `);

    return res.status(200).json({
      success: true,
      stats: {
        total_donors: totalDonors,
        total_units: totalUnits,
        total_requests: totalRequests,
        pending_requests: pendingRequests,
        approved_requests: approvedRequests,
        fulfilled_requests: fulfilledRequests,
        rejected_requests: rejectedRequests
      },
      charts: {
        stockDistribution: {
          labels: stockChartLabels,
          data: stockChartData
        },
        requestsBreakdown: {
          labels: ['Pending', 'Approved', 'Fulfilled', 'Rejected'],
          data: [pendingRequests, approvedRequests, fulfilledRequests, rejectedRequests]
        }
      },
      lowStockAlerts,
      recentRequests,
      recentDonors,
      recentLogs
    });
  } catch (error) {
    console.error('Error compiling dashboard stats:', error);
    return res.status(500).json({ success: false, message: 'Database error compiling statistics.' });
  }
};

// Update Admin Profile & Password
exports.updateProfile = async (req, res) => {
  try {
    const adminId = req.session.adminUser.id;
    const { full_name, email, current_password, new_password } = req.body;

    const [rows] = await db.query('SELECT * FROM admin_users WHERE admin_id = ?', [adminId]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Admin user not found.' });
    }

    const admin = rows[0];

    // If changing password, verify current password
    let passwordHash = admin.password_hash;
    if (new_password && new_password.trim().length >= 6) {
      if (!current_password) {
        return res.status(400).json({ success: false, message: 'Current password is required to set a new password.' });
      }
      const match = await bcrypt.compare(current_password, admin.password_hash);
      if (!match) {
        return res.status(400).json({ success: false, message: 'Incorrect current password.' });
      }
      passwordHash = await bcrypt.hash(new_password.trim(), 10);
    }

    const updatedFullName = full_name ? full_name.trim() : admin.full_name;
    const updatedEmail = email ? email.trim() : admin.email;

    await db.query(
      'UPDATE admin_users SET full_name = ?, email = ?, password_hash = ? WHERE admin_id = ?',
      [updatedFullName, updatedEmail, passwordHash, adminId]
    );

    req.session.adminUser.full_name = updatedFullName;
    req.session.adminUser.email = updatedEmail;

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: req.session.adminUser
    });
  } catch (error) {
    console.error('Error updating admin profile:', error);
    return res.status(500).json({ success: false, message: 'Database error updating profile.' });
  }
};
