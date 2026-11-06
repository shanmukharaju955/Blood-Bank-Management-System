const db = require('../config/db');

// Get all donors with optional search and blood group filter
exports.getAllDonors = async (req, res) => {
  try {
    const { blood_group, search } = req.query;
    let sql = 'SELECT * FROM donors WHERE 1=1';
    const params = [];

    if (blood_group && blood_group !== 'All') {
      sql += ' AND blood_group = ?';
      params.push(blood_group);
    }

    if (search && search.trim() !== '') {
      sql += ' AND (donor_name LIKE ? OR phone LIKE ? OR address LIKE ? OR email LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    sql += ' ORDER BY donor_id DESC';

    const [rows] = await db.query(sql, params);
    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching donors:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve donors from database.'
    });
  }
};

// Get single donor by ID
exports.getDonorById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT * FROM donors WHERE donor_id = ?', [id]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Donor not found.' });
    }

    return res.status(200).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error fetching donor by ID:', error);
    return res.status(500).json({ success: false, message: 'Database error fetching donor.' });
  }
};

// Register new donor
exports.createDonor = async (req, res) => {
  try {
    const { donor_name, age, gender, blood_group, phone, email, address, last_donation_date } = req.body;

    const sql = `
      INSERT INTO donors (donor_name, age, gender, blood_group, phone, email, address, last_donation_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      donor_name.trim(),
      parseInt(age, 10),
      gender,
      blood_group,
      phone.trim(),
      email.trim(),
      address.trim(),
      last_donation_date || null
    ];

    const [result] = await db.query(sql, params);

    return res.status(201).json({
      success: true,
      message: 'Donor successfully registered into the national donor registry!',
      donor_id: result.insertId || result.donor_id
    });
  } catch (error) {
    console.error('Error registering donor:', error);
    return res.status(500).json({ success: false, message: 'Failed to register donor.' });
  }
};

// Update donor details
exports.updateDonor = async (req, res) => {
  try {
    const { id } = req.params;
    const { donor_name, age, gender, blood_group, phone, email, address, last_donation_date } = req.body;

    const sql = `
      UPDATE donors
      SET donor_name = ?, age = ?, gender = ?, blood_group = ?, phone = ?, email = ?, address = ?, last_donation_date = ?
      WHERE donor_id = ?
    `;
    const params = [
      donor_name.trim(),
      parseInt(age, 10),
      gender,
      blood_group,
      phone.trim(),
      email.trim(),
      address.trim(),
      last_donation_date || null,
      id
    ];

    const [result] = await db.query(sql, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Donor not found or no changes made.' });
    }

    return res.status(200).json({ success: true, message: 'Donor details updated successfully.' });
  } catch (error) {
    console.error('Error updating donor:', error);
    return res.status(500).json({ success: false, message: 'Failed to update donor record.' });
  }
};

// Delete donor
exports.deleteDonor = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query('DELETE FROM donors WHERE donor_id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Donor not found.' });
    }

    return res.status(200).json({ success: true, message: 'Donor record deleted successfully.' });
  } catch (error) {
    console.error('Error deleting donor:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete donor record.' });
  }
};
