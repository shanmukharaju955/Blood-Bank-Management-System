/**
 * Server-Side Input Validation Middleware
 */

const VALID_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const VALID_GENDERS = ['Male', 'Female', 'Other'];

function validateDonor(req, res, next) {
  const { donor_name, age, gender, blood_group, phone, email, address } = req.body;

  if (!donor_name || typeof donor_name !== 'string' || donor_name.trim().length < 2) {
    return res.status(400).json({ success: false, message: 'Valid donor name (minimum 2 characters) is required.' });
  }

  const ageNum = parseInt(age, 10);
  if (isNaN(ageNum) || ageNum < 18 || ageNum > 65) {
    return res.status(400).json({ success: false, message: 'Donor must be between 18 and 65 years of age.' });
  }

  if (!gender || !VALID_GENDERS.includes(gender)) {
    return res.status(400).json({ success: false, message: 'Gender must be Male, Female, or Other.' });
  }

  if (!blood_group || !VALID_BLOOD_GROUPS.includes(blood_group)) {
    return res.status(400).json({ success: false, message: `Blood group must be one of: ${VALID_BLOOD_GROUPS.join(', ')}` });
  }

  if (!phone || typeof phone !== 'string' || phone.trim().length < 7) {
    return res.status(400).json({ success: false, message: 'Valid contact phone number is required.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email.trim())) {
    return res.status(400).json({ success: false, message: 'A valid email address is required.' });
  }

  if (!address || typeof address !== 'string' || address.trim().length < 5) {
    return res.status(400).json({ success: false, message: 'Complete residential address is required.' });
  }

  next();
}

function validateBloodRequest(req, res, next) {
  const { patient_name, blood_group, units_required, hospital_name, contact_number } = req.body;

  if (!patient_name || typeof patient_name !== 'string' || patient_name.trim().length < 2) {
    return res.status(400).json({ success: false, message: 'Patient name is required.' });
  }

  if (!blood_group || !VALID_BLOOD_GROUPS.includes(blood_group)) {
    return res.status(400).json({ success: false, message: `Blood group must be one of: ${VALID_BLOOD_GROUPS.join(', ')}` });
  }

  const unitsNum = parseInt(units_required, 10);
  if (isNaN(unitsNum) || unitsNum < 1 || unitsNum > 50) {
    return res.status(400).json({ success: false, message: 'Units required must be between 1 and 50 units.' });
  }

  if (!hospital_name || typeof hospital_name !== 'string' || hospital_name.trim().length < 3) {
    return res.status(400).json({ success: false, message: 'Valid hospital or medical center name is required.' });
  }

  if (!contact_number || typeof contact_number !== 'string' || contact_number.trim().length < 7) {
    return res.status(400).json({ success: false, message: 'Emergency contact phone number is required.' });
  }

  next();
}

function validateStock(req, res, next) {
  const { blood_group, units_available, expiry_date, storage_location } = req.body;

  if (!blood_group || !VALID_BLOOD_GROUPS.includes(blood_group)) {
    return res.status(400).json({ success: false, message: `Blood group must be one of: ${VALID_BLOOD_GROUPS.join(', ')}` });
  }

  const unitsNum = parseInt(units_available, 10);
  if (isNaN(unitsNum) || unitsNum < 1) {
    return res.status(400).json({ success: false, message: 'Units available must be a positive number.' });
  }

  if (!expiry_date || isNaN(new Date(expiry_date).getTime())) {
    return res.status(400).json({ success: false, message: 'Valid expiration date is required.' });
  }

  const exp = new Date(expiry_date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (exp < now) {
    return res.status(400).json({ success: false, message: 'Expiration date cannot be in the past.' });
  }

  if (!storage_location || typeof storage_location !== 'string' || storage_location.trim().length < 2) {
    return res.status(400).json({ success: false, message: 'Storage location / refrigeration unit is required.' });
  }

  next();
}

module.exports = {
  validateDonor,
  validateBloodRequest,
  validateStock,
  VALID_BLOOD_GROUPS
};
