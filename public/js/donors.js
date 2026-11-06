/**
 * BLOOD BANK MANAGEMENT SYSTEM - DONORS SCRIPT
 * Manages donor registration, validation, search, and directory filtering.
 */

let allDonors = [];
let currentFilter = 'All';

document.addEventListener('DOMContentLoaded', () => {
  initDonorForm();
  initFilterButtons();
  initSearchInput();
  loadDonors();
});

// Load Donors from Backend API
async function loadDonors() {
  const container = document.getElementById('donors-grid');
  const countBadge = document.getElementById('donors-count-badge');
  if (!container) return;

  container.innerHTML = `
    <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
      <i class="fas fa-spinner fa-spin fa-2x text-danger"></i>
      <p style="margin-top: 12px; color: #718096;">Fetching certified donors from database...</p>
    </div>
  `;

  try {
    const res = await fetch('/api/donors');
    const result = await res.json();

    if (result.success && Array.isArray(result.data)) {
      allDonors = result.data;
      if (countBadge) countBadge.textContent = `${allDonors.length} Donors Registered`;
      filterAndRenderDonors();
    } else {
      container.innerHTML = `<p class="text-danger" style="grid-column: 1 / -1; text-align: center;">Error: ${result.message || 'Could not load donors.'}</p>`;
    }
  } catch (error) {
    console.error('Error loading donors:', error);
    container.innerHTML = `<p class="text-danger" style="grid-column: 1 / -1; text-align: center;">Failed to connect to database server.</p>`;
  }
}

// Filter and Render Donor Cards
function filterAndRenderDonors() {
  const container = document.getElementById('donors-grid');
  const searchInput = document.getElementById('donor-search-input');
  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

  let filtered = allDonors;

  if (currentFilter !== 'All') {
    filtered = filtered.filter(d => d.blood_group === currentFilter);
  }

  if (searchTerm) {
    filtered = filtered.filter(d => 
      (d.donor_name && d.donor_name.toLowerCase().includes(searchTerm)) ||
      (d.phone && d.phone.toLowerCase().includes(searchTerm)) ||
      (d.address && d.address.toLowerCase().includes(searchTerm)) ||
      (d.email && d.email.toLowerCase().includes(searchTerm))
    );
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 50px;" class="glass-card">
        <i class="fas fa-user-slash fa-3x" style="color: #CBD5E0; margin-bottom: 16px;"></i>
        <h4 style="font-size: 1.2rem; color: #2D3748; margin-bottom: 8px;">No Donors Match Your Search</h4>
        <p style="color: #718096; font-size: 0.95rem;">Try selecting another blood group or clearing your search term.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(donor => {
    // Calculate eligibility (90 days interval)
    let isEligible = true;
    let daysToNext = 0;
    let lastDateText = 'Never donated (First-timer)';

    if (donor.last_donation_date) {
      const lastDate = new Date(donor.last_donation_date);
      lastDateText = lastDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      const now = new Date();
      const diffDays = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
      if (diffDays < 90) {
        isEligible = false;
        daysToNext = 90 - diffDays;
      }
    }

    const eligibilityBadge = isEligible
      ? `<span class="badge badge-success"><i class="fas fa-check-circle"></i> Eligible to Donate</span>`
      : `<span class="badge badge-warning"><i class="fas fa-clock"></i> Resting Period (${daysToNext} days left)</span>`;

    return `
      <div class="glass-card glass-card-hover" style="padding: 24px; position: relative; border-radius: var(--radius-lg);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
          <div style="display: flex; gap: 14px; align-items: center;">
            <div class="blood-badge-3d" style="width: 48px; height: 48px; font-size: 1.3rem;">
              ${donor.blood_group}
            </div>
            <div>
              <h4 style="font-size: 1.15rem; color: var(--dark); font-weight: 700;">${donor.donor_name}</h4>
              <div style="font-size: 0.8rem; color: #718096; font-weight: 600;">
                ${donor.gender} • ${donor.age} Years Old
              </div>
            </div>
          </div>
          <div>${eligibilityBadge}</div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.88rem; color: #4A5568; margin-bottom: 18px; border-top: 1px solid #EDF2F7; padding-top: 14px;">
          <div><i class="fas fa-phone-alt text-danger" style="width: 20px;"></i> ${donor.phone}</div>
          <div><i class="fas fa-envelope text-primary" style="width: 20px;"></i> ${donor.email}</div>
          <div><i class="fas fa-map-marker-alt text-warning" style="width: 20px;"></i> ${donor.address}</div>
          <div style="font-size: 0.82rem; color: #718096;">
            <i class="fas fa-calendar-check text-success" style="width: 20px;"></i> Last Donated: <strong>${lastDateText}</strong>
          </div>
        </div>

        <a href="tel:${donor.phone}" class="btn btn-outline" style="width: 100%; padding: 8px 14px; font-size: 0.85rem;">
          <i class="fas fa-phone"></i> Contact Donor
        </a>
      </div>
    `;
  }).join('');
}

// Filter Buttons
function initFilterButtons() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.getAttribute('data-group') || 'All';
      filterAndRenderDonors();
    });
  });

  // Check URL query parameters for pre-selected group
  const urlParams = new URLSearchParams(window.location.search);
  const groupParam = urlParams.get('group');
  if (groupParam) {
    const targetBtn = Array.from(filterBtns).find(b => b.getAttribute('data-group') === groupParam);
    if (targetBtn) {
      filterBtns.forEach(b => b.classList.remove('active'));
      targetBtn.classList.add('active');
      currentFilter = groupParam;
    }
  }
}

// Live Search Input
function initSearchInput() {
  const searchInput = document.getElementById('donor-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      filterAndRenderDonors();
    });
  }
}

// Donor Registration Form Handler
function initDonorForm() {
  const form = document.getElementById('donor-register-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    // Collect values
    const donor_name = document.getElementById('reg_name').value.trim();
    const age = parseInt(document.getElementById('reg_age').value, 10);
    const gender = document.getElementById('reg_gender').value;
    const blood_group = document.getElementById('reg_blood_group').value;
    const phone = document.getElementById('reg_phone').value.trim();
    const email = document.getElementById('reg_email').value.trim();
    const address = document.getElementById('reg_address').value.trim();
    const last_donation_date = document.getElementById('reg_last_date').value || null;

    // Client Validation
    if (!donor_name || donor_name.length < 2) {
      showToast('Please enter a valid donor name.', 'error');
      return;
    }
    if (isNaN(age) || age < 18 || age > 65) {
      showToast('Eligible donor age must be between 18 and 65 years.', 'error');
      return;
    }
    if (!gender) {
      showToast('Please select your gender.', 'error');
      return;
    }
    if (!blood_group) {
      showToast('Please select your blood group.', 'error');
      return;
    }
    if (!phone || phone.length < 7) {
      showToast('Please enter a valid phone number.', 'error');
      return;
    }
    if (!email || !email.includes('@')) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }
    if (!address || address.length < 5) {
      showToast('Please enter your residential address.', 'error');
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Registering Donor...`;

      const response = await fetch('/api/donors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donor_name,
          age,
          gender,
          blood_group,
          phone,
          email,
          address,
          last_donation_date
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showToast('Congratulations! You are officially registered as a life-saving blood donor!', 'success');
        form.reset();
        loadDonors(); // refresh donor list
        // Scroll to donors list
        const directoryEl = document.getElementById('donors-directory-section');
        if (directoryEl) {
          directoryEl.scrollIntoView({ behavior: 'smooth' });
        }
      } else {
        showToast(data.message || 'Registration failed. Please try again.', 'error');
      }
    } catch (err) {
      console.error('Registration error:', err);
      showToast('Server connection error. Please try again later.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });
}
