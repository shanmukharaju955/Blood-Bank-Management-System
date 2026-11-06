const db = require('../config/db');

const ALL_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Get all inventory batches with calculated expiration and status indicators
exports.getAllStock = async (req, res) => {
  try {
    const { blood_group, status } = req.query;
    let sql = 'SELECT * FROM blood_stock WHERE 1=1';
    const params = [];

    if (blood_group && blood_group !== 'All') {
      sql += ' AND blood_group = ?';
      params.push(blood_group);
    }

    sql += ' ORDER BY expiry_date ASC, blood_group ASC';

    const [rows] = await db.query(sql, params);

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const processed = rows.map(item => {
      const expDate = new Date(item.expiry_date);
      const diffTime = expDate - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let expiryStatus = 'Valid';
      let expiryBadge = 'badge-success';

      if (diffDays < 0) {
        expiryStatus = 'Expired';
        expiryBadge = 'badge-danger';
      } else if (diffDays <= 7) {
        expiryStatus = `Expiring in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
        expiryBadge = 'badge-warning';
      } else if (diffDays <= 14) {
        expiryStatus = `Expiring in ${diffDays} days`;
        expiryBadge = 'badge-info';
      }

      return {
        ...item,
        days_to_expiry: diffDays,
        expiry_status: expiryStatus,
        expiry_badge: expiryBadge,
        is_expired: diffDays < 0
      };
    });

    let filtered = processed;
    if (status === 'low') {
      filtered = processed.filter(p => p.units_available < 10);
    } else if (status === 'expiring') {
      filtered = processed.filter(p => p.days_to_expiry <= 14 && p.days_to_expiry >= 0);
    } else if (status === 'expired') {
      filtered = processed.filter(p => p.is_expired);
    }

    return res.status(200).json({
      success: true,
      count: filtered.length,
      data: filtered
    });
  } catch (error) {
    console.error('Error fetching blood stock:', error);
    return res.status(500).json({ success: false, message: 'Database error fetching stock.' });
  }
};

// Get aggregated stock summary by blood group (A+, A-, B+, B-, AB+, AB-, O+, O-)
exports.getStockSummary = async (req, res) => {
  try {
    // Exclude expired units from active available units summary
    const [rows] = await db.query(`
      SELECT 
        blood_group, 
        COALESCE(SUM(CASE WHEN expiry_date >= CURDATE() THEN units_available ELSE 0 END), 0) AS total_units,
        COALESCE(SUM(CASE WHEN expiry_date < CURDATE() THEN units_available ELSE 0 END), 0) AS expired_units,
        COUNT(stock_id) AS batch_count,
        MIN(CASE WHEN expiry_date >= CURDATE() THEN expiry_date ELSE NULL END) AS nearest_expiry
      FROM blood_stock
      GROUP BY blood_group
    `);

    // Ensure all 8 blood groups are represented even if 0 units
    const summaryMap = {};
    ALL_BLOOD_GROUPS.forEach(bg => {
      summaryMap[bg] = {
        blood_group: bg,
        total_units: 0,
        expired_units: 0,
        batch_count: 0,
        nearest_expiry: null,
        stock_status: 'Critical',
        status_color: 'danger'
      };
    });

    rows.forEach(r => {
      const units = parseInt(r.total_units, 10) || 0;
      let status = 'Critical';
      let color = 'danger';

      if (units >= 20) {
        status = 'Healthy';
        color = 'success';
      } else if (units >= 10) {
        status = 'Moderate';
        color = 'warning';
      }

      summaryMap[r.blood_group] = {
        blood_group: r.blood_group,
        total_units: units,
        expired_units: parseInt(r.expired_units, 10) || 0,
        batch_count: parseInt(r.batch_count, 10) || 0,
        nearest_expiry: r.nearest_expiry,
        stock_status: status,
        status_color: color
      };
    });

    const summaryList = ALL_BLOOD_GROUPS.map(bg => summaryMap[bg]);
    const overallTotalUnits = summaryList.reduce((sum, item) => sum + item.total_units, 0);

    return res.status(200).json({
      success: true,
      total_units: overallTotalUnits,
      data: summaryList
    });
  } catch (error) {
    console.error('Error fetching stock summary:', error);
    return res.status(500).json({ success: false, message: 'Database error fetching stock summary.' });
  }
};

// Add new blood stock batch
exports.addStockBatch = async (req, res) => {
  try {
    const { blood_group, units_available, expiry_date, storage_location } = req.body;

    const sql = `
      INSERT INTO blood_stock (blood_group, units_available, expiry_date, storage_location)
      VALUES (?, ?, ?, ?)
    `;
    const params = [
      blood_group,
      parseInt(units_available, 10),
      expiry_date,
      storage_location.trim()
    ];

    const [result] = await db.query(sql, params);

    return res.status(201).json({
      success: true,
      message: `Batch of ${units_available} units (${blood_group}) successfully logged into ${storage_location}.`,
      stock_id: result.insertId || result.stock_id
    });
  } catch (error) {
    console.error('Error adding stock batch:', error);
    return res.status(500).json({ success: false, message: 'Failed to record stock batch.' });
  }
};

// Update blood stock batch
exports.updateStockBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { units_available, expiry_date, storage_location } = req.body;

    const sql = `
      UPDATE blood_stock
      SET units_available = ?, expiry_date = ?, storage_location = ?
      WHERE stock_id = ?
    `;
    const params = [
      parseInt(units_available, 10),
      expiry_date,
      storage_location.trim(),
      id
    ];

    const [result] = await db.query(sql, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Stock batch not found.' });
    }

    return res.status(200).json({ success: true, message: 'Blood stock batch updated successfully.' });
  } catch (error) {
    console.error('Error updating stock batch:', error);
    return res.status(500).json({ success: false, message: 'Failed to update stock batch.' });
  }
};

// Delete blood stock batch
exports.deleteStockBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query('DELETE FROM blood_stock WHERE stock_id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Stock batch not found.' });
    }

    return res.status(200).json({ success: true, message: 'Stock batch removed from inventory.' });
  } catch (error) {
    console.error('Error deleting stock batch:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete stock batch.' });
  }
};
