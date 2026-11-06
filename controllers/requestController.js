const db = require('../config/db');

// Create a new blood request (Default status: Pending)
exports.createRequest = async (req, res) => {
  try {
    const { patient_name, blood_group, units_required, hospital_name, contact_number, request_date } = req.body;

    const sql = `
      INSERT INTO blood_requests (patient_name, blood_group, units_required, hospital_name, contact_number, request_date, request_status)
      VALUES (?, ?, ?, ?, ?, ?, 'Pending')
    `;
    const params = [
      patient_name.trim(),
      blood_group,
      parseInt(units_required, 10),
      hospital_name.trim(),
      contact_number.trim(),
      request_date || new Date().toISOString().split('T')[0]
    ];

    const [result] = await db.query(sql, params);
    const newId = result.insertId || result.request_id;

    return res.status(201).json({
      success: true,
      message: `Emergency blood request #${newId} logged successfully! Our medical team will review it immediately.`,
      request_id: newId
    });
  } catch (error) {
    console.error('Error creating blood request:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit blood request.' });
  }
};

// Get all requests with optional status and search filters
exports.getAllRequests = async (req, res) => {
  try {
    const { status, blood_group, search } = req.query;
    let sql = 'SELECT * FROM blood_requests WHERE 1=1';
    const params = [];

    if (status && status !== 'All') {
      sql += ' AND request_status = ?';
      params.push(status);
    }

    if (blood_group && blood_group !== 'All') {
      sql += ' AND blood_group = ?';
      params.push(blood_group);
    }

    if (search && search.trim() !== '') {
      sql += ' AND (patient_name LIKE ? OR hospital_name LIKE ? OR contact_number LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY request_id DESC';

    const [rows] = await db.query(sql, params);
    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching blood requests:', error);
    return res.status(500).json({ success: false, message: 'Database error fetching requests.' });
  }
};

// Track blood request status by ID or contact phone number
exports.trackRequest = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.trim() === '') {
      return res.status(400).json({ success: false, message: 'Please provide a Request ID or Contact Number.' });
    }

    const trimmed = query.trim();
    const isNumber = !isNaN(Number(trimmed));

    let sql = 'SELECT * FROM blood_requests WHERE contact_number LIKE ?';
    let params = [`%${trimmed}%`];

    if (isNumber) {
      sql = 'SELECT * FROM blood_requests WHERE request_id = ? OR contact_number LIKE ?';
      params = [parseInt(trimmed, 10), `%${trimmed}%`];
    }

    sql += ' ORDER BY request_id DESC';

    const [rows] = await db.query(sql, params);

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No blood request found matching "${trimmed}". Please check your details.`
      });
    }

    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('Error tracking request:', error);
    return res.status(500).json({ success: false, message: 'Error checking request status.' });
  }
};

/**
 * Approve Blood Request
 * CRITICAL LOGIC: Uses MySQL ACID Transactions
 * - Row locking with FOR UPDATE
 * - Prevents duplicate deductions
 * - Verifies non-expired stock only
 * - Prevents negative stock
 * - Deducts in FIFO order (nearest expiry first)
 */
exports.approveRequest = async (req, res) => {
  const { id } = req.params;
  const requestId = parseInt(id, 10);

  if (isNaN(requestId)) {
    return res.status(400).json({ success: false, message: 'Invalid request ID.' });
  }

  // Handle in-memory fallback mode if MySQL server is not running
  if (!db.isMySQLConnected()) {
    const memStore = db.memory;
    const request = memStore.blood_requests.find(r => r.request_id === requestId);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request record not found.' });
    }

    if (request.request_status === 'Approved' || request.request_status === 'Fulfilled') {
      return res.status(400).json({
        success: false,
        message: `Duplicate deduction prevented: Request #${requestId} is already ${request.request_status}.`
      });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const validBatches = memStore.blood_stock
      .filter(s => s.blood_group === request.blood_group && s.units_available > 0 && s.expiry_date >= todayStr)
      .sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));

    const totalAvailable = validBatches.reduce((acc, b) => acc + b.units_available, 0);

    if (totalAvailable < request.units_required) {
      return res.status(400).json({
        success: false,
        message: `Insufficient non-expired stock for blood group ${request.blood_group}. Required: ${request.units_required} units, Available: ${totalAvailable} units.`
      });
    }

    // Deduct FIFO
    let remaining = request.units_required;
    for (const batch of validBatches) {
      if (remaining <= 0) break;
      const deduct = Math.min(batch.units_available, remaining);
      batch.units_available -= deduct;
      batch.updated_at = new Date();
      remaining -= deduct;
    }

    request.request_status = 'Approved';
    memStore.activity_logs.unshift({
      log_id: memStore.nextLogId++,
      action_type: 'REQUEST_APPROVED',
      details: `Request #${requestId} approved: ${request.units_required} units of ${request.blood_group} deducted for ${request.patient_name} (${request.hospital_name}).`,
      created_at: new Date()
    });

    return res.status(200).json({
      success: true,
      message: `Request #${requestId} successfully approved! ${request.units_required} units of ${request.blood_group} safely allocated and deducted from stock.`
    });
  }

  // Pure MySQL Database Transaction Execution
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // 1. Lock and retrieve request to prevent race conditions & duplicate approvals
    const [requestRows] = await connection.query(
      'SELECT * FROM blood_requests WHERE request_id = ? FOR UPDATE',
      [requestId]
    );

    if (!requestRows || requestRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Blood request not found.' });
    }

    const request = requestRows[0];

    // 2. Prevent duplicate deduction
    if (request.request_status === 'Approved' || request.request_status === 'Fulfilled') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Duplicate deduction prevented: Request #${requestId} is already marked as ${request.request_status}.`
      });
    }

    const bloodGroup = request.blood_group;
    const unitsRequired = parseInt(request.units_required, 10);

    // 3. Query non-expired, available blood units with lock (FIFO order)
    const [batches] = await connection.query(`
      SELECT stock_id, units_available, expiry_date, storage_location
      FROM blood_stock
      WHERE blood_group = ? 
        AND expiry_date >= CURDATE() 
        AND units_available > 0
      ORDER BY expiry_date ASC
      FOR UPDATE
    `, [bloodGroup]);

    const totalAvailable = batches.reduce((sum, b) => sum + parseInt(b.units_available, 10), 0);

    // 4. Verify sufficient non-expired stock
    if (totalAvailable < unitsRequired) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Insufficient valid, non-expired stock for ${bloodGroup}. Required: ${unitsRequired} units, Available: ${totalAvailable} units.`
      });
    }

    // 5. Deduct units across batches safely (never negative)
    let unitsToDeduct = unitsRequired;
    for (const batch of batches) {
      if (unitsToDeduct <= 0) break;

      const currentUnits = parseInt(batch.units_available, 10);
      const deductFromThisBatch = Math.min(currentUnits, unitsToDeduct);
      const remainingInBatch = currentUnits - deductFromThisBatch;

      await connection.query(
        'UPDATE blood_stock SET units_available = ? WHERE stock_id = ?',
        [remainingInBatch, batch.stock_id]
      );

      unitsToDeduct -= deductFromThisBatch;
    }

    // 6. Update Request Status to Approved
    await connection.query(
      "UPDATE blood_requests SET request_status = 'Approved' WHERE request_id = ?",
      [requestId]
    );

    // 7. Record in Activity Audit Log
    const auditText = `Request #${requestId} approved: ${unitsRequired} units of ${bloodGroup} deducted for patient ${request.patient_name} at ${request.hospital_name}.`;
    await connection.query(
      'INSERT INTO activity_logs (action_type, details) VALUES (?, ?)',
      ['REQUEST_APPROVED', auditText]
    );

    // 8. Commit ACID transaction
    await connection.commit();

    return res.status(200).json({
      success: true,
      message: `Blood Request #${requestId} approved successfully! ${unitsRequired} units of ${bloodGroup} allocated and deducted.`
    });

  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rbErr) {
        console.error('Error rolling back transaction:', rbErr);
      }
    }
    console.error('Approval transaction failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Transaction failed while approving blood request. No stock was deducted.'
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Reject blood request
exports.rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const [requestRows] = await db.query('SELECT * FROM blood_requests WHERE request_id = ?', [id]);
    if (!requestRows || requestRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    const request = requestRows[0];
    if (request.request_status === 'Fulfilled') {
      return res.status(400).json({ success: false, message: 'Cannot reject an already fulfilled request.' });
    }

    await db.query("UPDATE blood_requests SET request_status = 'Rejected' WHERE request_id = ?", [id]);

    const auditText = `Request #${id} rejected for ${request.patient_name}. ${reason ? `Reason: ${reason}` : ''}`;
    await db.query('INSERT INTO activity_logs (action_type, details) VALUES (?, ?)', ['REQUEST_REJECTED', auditText]);

    return res.status(200).json({
      success: true,
      message: `Request #${id} has been marked as Rejected.`
    });
  } catch (error) {
    console.error('Error rejecting request:', error);
    return res.status(500).json({ success: false, message: 'Database error rejecting request.' });
  }
};

// Mark request as Fulfilled (blood units delivered to hospital/patient)
exports.fulfillRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const [requestRows] = await db.query('SELECT * FROM blood_requests WHERE request_id = ?', [id]);
    if (!requestRows || requestRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    const request = requestRows[0];
    if (request.request_status !== 'Approved') {
      return res.status(400).json({
        success: false,
        message: 'Only approved requests with allocated stock can be marked as Fulfilled.'
      });
    }

    await db.query("UPDATE blood_requests SET request_status = 'Fulfilled' WHERE request_id = ?", [id]);

    const auditText = `Request #${id} fulfilled and dispatched: ${request.units_required} units of ${request.blood_group} delivered to ${request.hospital_name}.`;
    await db.query('INSERT INTO activity_logs (action_type, details) VALUES (?, ?)', ['REQUEST_FULFILLED', auditText]);

    return res.status(200).json({
      success: true,
      message: `Request #${id} marked as Fulfilled and Dispatched.`
    });
  } catch (error) {
    console.error('Error fulfilling request:', error);
    return res.status(500).json({ success: false, message: 'Database error fulfilling request.' });
  }
};
