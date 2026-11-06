/**
 * BLOOD BANK MANAGEMENT SYSTEM - ADMIN DASHBOARD CONTROLLER
 * Full management interface with Chart.js analytics, transactional approvals,
 * and complete CRUD operations for Donors, Stock, and Requests.
 */

let currentAdmin = null;
let stockChartInstance = null;
let requestsChartInstance = null;
let allDonorsList = [];
let allStockBatches = [];
let allRequestsList = [];
let activeRequestStatusFilter = 'All';

document.addEventListener('DOMContentLoaded', async () => {
  const isAuth = await checkAdminSession();
  if (!isAuth) return;

  initSidebarNavigation();
  initModals();
  loadDashboardData();
  setupEventListeners();
});

// ==========================================
// Check Admin Session
// ==========================================
async function checkAdminSession() {
  try {
    const res = await fetch('/api/admin/me');
    if (!res.ok) {
      window.location.href = '/pages/admin-login.html?error=unauthorized';
      return false;
    }
    const data = await res.json();
    currentAdmin = data.user;

    // Update UI elements with admin info
    const nameEls = document.querySelectorAll('.admin-display-name');
    nameEls.forEach(el => el.textContent = currentAdmin.full_name || currentAdmin.username);

    const roleEls = document.querySelectorAll('.admin-display-role');
    roleEls.forEach(el => el.textContent = currentAdmin.role || 'Administrator');

    // Check system / DB health
    checkSystemHealth();
    return true;
  } catch (err) {
    console.error('Session check failed:', err);
    window.location.href = '/pages/admin-login.html?error=connection';
    return false;
  }
}

async function checkSystemHealth() {
  const pill = document.getElementById('db-status-pill');
  if (!pill) return;

  try {
    const res = await fetch('/api/health');
    const data = await res.json();

    if (data.database && data.database.mode === 'mysql') {
      pill.className = 'db-status-pill online';
      pill.innerHTML = `<i class="fas fa-database"></i> MySQL Online (${data.database.database})`;
    } else {
      pill.className = 'db-status-pill warning';
      pill.innerHTML = `<i class="fas fa-shield-alt"></i> Safe Memory Mode`;
      pill.title = 'MySQL is offline. Running in deterministic in-memory failover mode.';
    }
  } catch (e) {
    pill.className = 'db-status-pill warning';
    pill.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Offline`;
  }
}

// ==========================================
// Sidebar Navigation & Tab Switching
// ==========================================
function initSidebarNavigation() {
  const links = document.querySelectorAll('.sidebar-link[data-tab]');
  const tabs = document.querySelectorAll('.tab-pane');
  const pageTitle = document.getElementById('page-title-text');
  const pageSubtitle = document.getElementById('page-subtitle-text');

  const titles = {
    'overview': { title: 'Executive Overview', sub: 'Real-time blood bank metrics, reserve tracking, and live requests.' },
    'donors': { title: 'Manage Registered Donors', sub: 'National registry of verified voluntary and replacement donors.' },
    'stock': { title: 'Manage Blood Stock & Inventory', sub: 'Clinical cold storage batches, cryogenic units, and expiration auditing.' },
    'requests': { title: 'Emergency Blood Requests', sub: 'Review, verify stock, and execute atomic deductions for hospital requests.' },
    'reports': { title: 'Clinical & Operational Reports', sub: 'Exportable analytics, distribution matrices, and audit summaries.' },
    'settings': { title: 'System & Security Settings', sub: 'Administrative credentials, notification parameters, and security policies.' }
  };

  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = link.getAttribute('data-tab');
      if (!tabId) return;

      links.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      tabs.forEach(t => t.classList.remove('active'));
      const activeTab = document.getElementById(`tab-${tabId}`);
      if (activeTab) activeTab.classList.add('active');

      if (titles[tabId] && pageTitle && pageSubtitle) {
        pageTitle.textContent = titles[tabId].title;
        pageSubtitle.textContent = titles[tabId].sub;
      }

      // Close mobile sidebar if open
      const sidebar = document.querySelector('.dash-sidebar');
      if (sidebar) sidebar.classList.remove('open');

      // Refresh specific tab data
      if (tabId === 'donors') loadDonorsTable();
      if (tabId === 'stock') loadStockTable();
      if (tabId === 'requests') loadRequestsTable();
      if (tabId === 'reports') generateReports();
    });
  });

  // Mobile sidebar toggle button
  const toggleBtn = document.getElementById('sidebar-toggle-btn');
  const sidebar = document.querySelector('.dash-sidebar');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  // Logout Button
  const logoutBtn = document.getElementById('sidebar-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
}

// ==========================================
// Load Dashboard Analytics & Charts
// ==========================================
async function loadDashboardData() {
  try {
    const res = await fetch('/api/admin/stats');
    if (!res.ok) throw new Error('Could not fetch stats');
    const data = await res.json();

    if (!data.success) return;

    // 1. Update 5 KPI Cards
    const stats = data.stats;
    document.getElementById('kpi-total-donors').textContent = (stats.total_donors || 0).toLocaleString();
    document.getElementById('kpi-total-units').textContent = (stats.total_units || 0).toLocaleString();
    document.getElementById('kpi-total-requests').textContent = (stats.total_requests || 0).toLocaleString();
    document.getElementById('kpi-pending-requests').textContent = (stats.pending_requests || 0).toLocaleString();
    document.getElementById('kpi-approved-requests').textContent = ((stats.approved_requests || 0) + (stats.fulfilled_requests || 0)).toLocaleString();

    // Update sidebar badges
    const pendingBadge = document.getElementById('badge-pending-count');
    if (pendingBadge) pendingBadge.textContent = stats.pending_requests || 0;

    // 2. Render Charts
    renderStockBarChart(data.charts.stockDistribution);
    renderRequestsPieChart(data.charts.requestsBreakdown);

    // 3. Render Low Stock Banner
    const lowStockContainer = document.getElementById('overview-low-stock-banner');
    if (lowStockContainer) {
      if (data.lowStockAlerts && data.lowStockAlerts.length > 0) {
        lowStockContainer.style.display = 'flex';
        document.getElementById('low-stock-groups-text').textContent = 
          data.lowStockAlerts.map(a => `${a.blood_group} (${a.units} units)`).join(', ');
      } else {
        lowStockContainer.style.display = 'none';
      }
    }

    // 4. Render Overview Tables
    renderRecentRequests(data.recentRequests || []);
    renderRecentDonors(data.recentDonors || []);

  } catch (error) {
    console.error('Error loading dashboard stats:', error);
  }
}

// ==========================================
// Chart.js Visualizations
// ==========================================
function renderStockBarChart(stockData) {
  const canvas = document.getElementById('chart-stock-distribution');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (stockChartInstance) stockChartInstance.destroy();

  // Create Red Gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, 260);
  gradient.addColorStop(0, '#D7193F');
  gradient.addColorStop(1, '#8B1028');

  stockChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: stockData.labels,
      datasets: [{
        label: 'Available Units (Non-Expired)',
        data: stockData.data,
        backgroundColor: gradient,
        borderRadius: 8,
        borderSkipped: false,
        barThickness: 28
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#171923',
          padding: 12,
          cornerRadius: 8,
          titleFont: { size: 14, family: "'Plus Jakarta Sans', sans-serif" }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: '#EDF2F7' },
          ticks: { font: { family: "'Plus Jakarta Sans', sans-serif" } }
        },
        x: {
          grid: { display: false },
          ticks: { font: { weight: 'bold', family: "'Outfit', sans-serif" } }
        }
      }
    }
  });
}

function renderRequestsPieChart(reqData) {
  const canvas = document.getElementById('chart-requests-breakdown');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (requestsChartInstance) requestsChartInstance.destroy();

  requestsChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: reqData.labels,
      datasets: [{
        data: reqData.data,
        backgroundColor: ['#F59E0B', '#3B82F6', '#10B981', '#EF4444'],
        borderWidth: 3,
        borderColor: '#FFFFFF',
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 14,
            padding: 14,
            font: { family: "'Plus Jakarta Sans', sans-serif", weight: '600' }
          }
        }
      }
    }
  });
}

// Overview Recent Tables
function renderRecentRequests(requests) {
  const tbody = document.getElementById('overview-requests-tbody');
  if (!tbody) return;

  if (requests.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center">No recent requests recorded.</td></tr>`;
    return;
  }

  tbody.innerHTML = requests.map(r => `
    <tr>
      <td><strong>#REQ-${String(r.request_id).padStart(4, '0')}</strong></td>
      <td><strong>${r.patient_name}</strong></td>
      <td><span class="badge badge-danger">${r.blood_group}</span></td>
      <td>${r.units_required} Units</td>
      <td>${getStatusBadge(r.request_status)}</td>
    </tr>
  `).join('');
}

function renderRecentDonors(donors) {
  const tbody = document.getElementById('overview-donors-tbody');
  if (!tbody) return;

  if (donors.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center">No donors found.</td></tr>`;
    return;
  }

  tbody.innerHTML = donors.map(d => `
    <tr>
      <td><strong>${d.donor_name}</strong></td>
      <td><span class="badge badge-danger">${d.blood_group}</span></td>
      <td>${d.phone}</td>
      <td>${d.last_donation_date ? new Date(d.last_donation_date).toLocaleDateString() : 'First time'}</td>
    </tr>
  `).join('');
}

// Helper: Status Badges
function getStatusBadge(status) {
  if (status === 'Approved') return `<span class="badge badge-info"><i class="fas fa-check"></i> Approved</span>`;
  if (status === 'Fulfilled') return `<span class="badge badge-success"><i class="fas fa-check-double"></i> Fulfilled</span>`;
  if (status === 'Rejected') return `<span class="badge badge-danger"><i class="fas fa-times"></i> Rejected</span>`;
  return `<span class="badge badge-warning"><i class="fas fa-clock"></i> Pending</span>`;
}

// ==========================================
// SECTION 2: MANAGE DONORS
// ==========================================
async function loadDonorsTable() {
  const tbody = document.getElementById('admin-donors-tbody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding: 24px;"><i class="fas fa-spinner fa-spin"></i> Loading donor database...</td></tr>`;

  try {
    const res = await fetch('/api/donors');
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      allDonorsList = data.data;
      renderAdminDonors(allDonorsList);
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Error loading donors.</td></tr>`;
  }
}

function renderAdminDonors(donors) {
  const tbody = document.getElementById('admin-donors-tbody');
  if (!tbody) return;

  if (donors.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding: 24px;">No donors found.</td></tr>`;
    return;
  }

  tbody.innerHTML = donors.map(d => `
    <tr>
      <td><strong>#DON-${String(d.donor_id).padStart(4, '0')}</strong></td>
      <td><strong>${d.donor_name}</strong></td>
      <td><span class="badge badge-danger" style="font-size: 0.88rem;">${d.blood_group}</span></td>
      <td>${d.gender}, ${d.age} yrs</td>
      <td>${d.phone}</td>
      <td>${d.email}</td>
      <td>${d.last_donation_date ? new Date(d.last_donation_date).toLocaleDateString() : 'Never'}</td>
      <td>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-outline" style="padding: 6px 10px; font-size: 0.8rem;" onclick="openEditDonorModal(${d.donor_id})">
            <i class="fas fa-edit"></i> Edit
          </button>
          <button class="btn btn-dark" style="padding: 6px 10px; font-size: 0.8rem; background: #991B1B;" onclick="deleteDonor(${d.donor_id})">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Delete Donor
window.deleteDonor = async function(donorId) {
  if (!confirm(`Are you sure you want to permanently remove Donor #DON-${String(donorId).padStart(4, '0')}?`)) return;

  try {
    const res = await fetch(`/api/donors/${donorId}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast('Donor deleted successfully.', 'success');
      loadDonorsTable();
      loadDashboardData();
    } else {
      showToast(data.message || 'Could not delete donor.', 'error');
    }
  } catch (err) {
    showToast('Network error while deleting donor.', 'error');
  }
};

// Edit Donor Modal Trigger
window.openEditDonorModal = function(donorId) {
  const donor = allDonorsList.find(d => d.donor_id === donorId);
  if (!donor) return;

  document.getElementById('edit_donor_id').value = donor.donor_id;
  document.getElementById('edit_donor_name').value = donor.donor_name;
  document.getElementById('edit_donor_age').value = donor.age;
  document.getElementById('edit_donor_gender').value = donor.gender;
  document.getElementById('edit_donor_blood_group').value = donor.blood_group;
  document.getElementById('edit_donor_phone').value = donor.phone;
  document.getElementById('edit_donor_email').value = donor.email;
  document.getElementById('edit_donor_address').value = donor.address;
  document.getElementById('edit_donor_last_date').value = donor.last_donation_date ? donor.last_donation_date.split('T')[0] : '';

  openModal('modal-edit-donor');
};

// ==========================================
// SECTION 3: MANAGE BLOOD STOCK
// ==========================================
async function loadStockTable() {
  const tbody = document.getElementById('admin-stock-tbody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding: 24px;"><i class="fas fa-spinner fa-spin"></i> Loading inventory batches...</td></tr>`;

  try {
    const res = await fetch('/api/stock');
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      allStockBatches = data.data;
      renderAdminStock(allStockBatches);
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error loading blood stock.</td></tr>`;
  }
}

function renderAdminStock(batches) {
  const tbody = document.getElementById('admin-stock-tbody');
  if (!tbody) return;

  if (batches.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding: 24px;">No stock batches found.</td></tr>`;
    return;
  }

  tbody.innerHTML = batches.map(b => `
    <tr>
      <td><strong>#BAT-${String(b.stock_id).padStart(4, '0')}</strong></td>
      <td><span class="badge badge-danger" style="font-size: 0.9rem;">${b.blood_group}</span></td>
      <td><strong>${b.units_available} Units</strong></td>
      <td><i class="fas fa-snowflake text-primary"></i> ${b.storage_location}</td>
      <td>${new Date(b.expiry_date).toLocaleDateString()}</td>
      <td><span class="badge ${b.expiry_badge}">${b.expiry_status}</span></td>
      <td>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-outline" style="padding: 6px 10px; font-size: 0.8rem;" onclick="openEditStockModal(${b.stock_id})">
            <i class="fas fa-edit"></i> Edit
          </button>
          <button class="btn btn-dark" style="padding: 6px 10px; font-size: 0.8rem; background: #991B1B;" onclick="deleteStockBatch(${b.stock_id})">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Delete Stock Batch
window.deleteStockBatch = async function(stockId) {
  if (!confirm(`Are you sure you want to delete Batch #BAT-${String(stockId).padStart(4, '0')}?`)) return;

  try {
    const res = await fetch(`/api/stock/${stockId}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast('Batch removed from inventory.', 'success');
      loadStockTable();
      loadDashboardData();
    } else {
      showToast(data.message || 'Could not delete batch.', 'error');
    }
  } catch (err) {
    showToast('Network error while deleting stock batch.', 'error');
  }
};

// Edit Stock Modal Trigger
window.openEditStockModal = function(stockId) {
  const batch = allStockBatches.find(b => b.stock_id === stockId);
  if (!batch) return;

  document.getElementById('edit_stock_id').value = batch.stock_id;
  document.getElementById('edit_stock_group').value = batch.blood_group;
  document.getElementById('edit_stock_units').value = batch.units_available;
  document.getElementById('edit_stock_expiry').value = batch.expiry_date.split('T')[0];
  document.getElementById('edit_stock_location').value = batch.storage_location;

  openModal('modal-edit-stock');
};

// ==========================================
// SECTION 4: MANAGE BLOOD REQUESTS
// ==========================================
async function loadRequestsTable() {
  const tbody = document.getElementById('admin-requests-tbody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding: 24px;"><i class="fas fa-spinner fa-spin"></i> Loading hospital blood requests...</td></tr>`;

  try {
    const res = await fetch('/api/requests');
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      allRequestsList = data.data;
      filterAndRenderRequests();
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Error loading requests.</td></tr>`;
  }
}

function filterAndRenderRequests() {
  const tbody = document.getElementById('admin-requests-tbody');
  if (!tbody) return;

  let filtered = allRequestsList;
  if (activeRequestStatusFilter !== 'All') {
    filtered = filtered.filter(r => r.request_status === activeRequestStatusFilter);
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding: 28px;">No requests match the "${activeRequestStatusFilter}" filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(r => {
    let actionsHtml = '';

    if (r.request_status === 'Pending') {
      actionsHtml = `
        <button class="btn btn-primary" style="padding: 6px 12px; font-size: 0.8rem;" onclick="approveRequest(${r.request_id})">
          <i class="fas fa-check"></i> Approve & Deduct
        </button>
        <button class="btn btn-outline" style="padding: 6px 10px; font-size: 0.8rem;" onclick="rejectRequest(${r.request_id})">
          <i class="fas fa-times"></i> Reject
        </button>
      `;
    } else if (r.request_status === 'Approved') {
      actionsHtml = `
        <button class="btn btn-outline" style="padding: 6px 12px; font-size: 0.8rem; border-color: #10B981; color: #10B981;" onclick="fulfillRequest(${r.request_id})">
          <i class="fas fa-truck"></i> Mark Fulfilled
        </button>
      `;
    } else {
      actionsHtml = `<span style="font-size: 0.82rem; color: #94A3B8;">Completed</span>`;
    }

    return `
      <tr>
        <td><strong>#REQ-${String(r.request_id).padStart(4, '0')}</strong></td>
        <td>
          <strong>${r.patient_name}</strong>
          <div style="font-size: 0.78rem; color: #718096;">${r.contact_number}</div>
        </td>
        <td><span class="badge badge-danger" style="font-size: 0.9rem;">${r.blood_group}</span></td>
        <td><strong>${r.units_required} Units</strong></td>
        <td><i class="fas fa-hospital text-primary"></i> ${r.hospital_name}</td>
        <td>${new Date(r.request_date).toLocaleDateString()}</td>
        <td>${getStatusBadge(r.request_status)}</td>
        <td>
          <div style="display: flex; gap: 6px; align-items: center;">
            ${actionsHtml}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Approve Blood Request - Triggers backend MySQL ACID transaction
window.approveRequest = async function(requestId) {
  if (!confirm(`Are you sure you want to APPROVE Request #REQ-${String(requestId).padStart(4, '0')}? This will verify non-expired stock and safely deduct the required units using an ACID transaction.`)) {
    return;
  }

  try {
    const res = await fetch(`/api/requests/${requestId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await res.json();

    if (res.ok && data.success) {
      showToast(data.message, 'success');
      loadRequestsTable();
      loadDashboardData();
    } else {
      // Detailed error (e.g. Insufficient non-expired stock)
      alert(`Approval Blocked: ${data.message || 'Transaction could not be completed.'}`);
      showToast(data.message || 'Approval failed.', 'error');
    }
  } catch (err) {
    console.error('Approve error:', err);
    showToast('Failed to communicate with server.', 'error');
  }
};

// Reject Blood Request
window.rejectRequest = async function(requestId) {
  const reason = prompt('Please enter a clinical reason or note for rejecting this request:');
  if (reason === null) return; // cancelled

  try {
    const res = await fetch(`/api/requests/${requestId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      showToast(`Request #${requestId} rejected.`, 'warning');
      loadRequestsTable();
      loadDashboardData();
    } else {
      showToast(data.message || 'Could not reject request.', 'error');
    }
  } catch (err) {
    showToast('Error communicating with server.', 'error');
  }
};

// Fulfill Blood Request
window.fulfillRequest = async function(requestId) {
  if (!confirm(`Mark Request #REQ-${String(requestId).padStart(4, '0')} as Fulfilled and Dispatched?`)) return;

  try {
    const res = await fetch(`/api/requests/${requestId}/fulfill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await res.json();
    if (res.ok && data.success) {
      showToast(`Request #${requestId} dispatched and marked as Fulfilled!`, 'success');
      loadRequestsTable();
      loadDashboardData();
    } else {
      showToast(data.message || 'Could not fulfill request.', 'error');
    }
  } catch (err) {
    showToast('Error fulfilling request.', 'error');
  }
};

// ==========================================
// SECTION 5: CLINICAL REPORTS
// ==========================================
async function generateReports() {
  const stockSummaryBody = document.getElementById('report-stock-tbody');
  const dateEl = document.getElementById('report-generated-date');

  if (dateEl) {
    dateEl.textContent = new Date().toLocaleString();
  }

  if (stockSummaryBody) {
    try {
      const res = await fetch('/api/stock/summary');
      const data = await res.json();
      if (data.success && data.data) {
        stockSummaryBody.innerHTML = data.data.map(item => `
          <tr>
            <td><strong>${item.blood_group}</strong></td>
            <td><strong>${item.total_units}</strong></td>
            <td>${item.batch_count}</td>
            <td>${item.nearest_expiry ? new Date(item.nearest_expiry).toLocaleDateString() : 'N/A'}</td>
            <td>${item.stock_status}</td>
          </tr>
        `).join('');
      }
    } catch (e) {
      console.error('Error generating report:', e);
    }
  }
}

// Print Report
window.printReport = function() {
  window.print();
};

// Export Stock Batches to CSV
window.exportStockCSV = async function() {
  try {
    const res = await fetch('/api/stock');
    const data = await res.json();
    if (!data.success || !data.data || data.data.length === 0) {
      showToast('No stock data available to export.', 'warning');
      return;
    }

    const headers = ['Batch ID', 'Blood Group', 'Units Available', 'Storage Location', 'Expiry Date', 'Status'];
    const rows = data.data.map(b => [
      `BAT-${b.stock_id}`,
      b.blood_group,
      b.units_available,
      `"${b.storage_location}"`,
      b.expiry_date.split('T')[0],
      b.expiry_status
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Blood_Stock_Inventory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Blood stock inventory exported to CSV successfully!', 'success');
  } catch (err) {
    showToast('Failed to export stock CSV.', 'error');
  }
};

// Export Certified Donors to CSV
window.exportDonorsCSV = async function() {
  try {
    const res = await fetch('/api/donors');
    const data = await res.json();
    if (!data.success || !data.data || data.data.length === 0) {
      showToast('No donor records to export.', 'warning');
      return;
    }

    const headers = ['Donor ID', 'Name', 'Age', 'Gender', 'Blood Group', 'Phone', 'Email', 'Address', 'Last Donation Date'];
    const rows = data.data.map(d => [
      `DON-${d.donor_id}`,
      `"${d.donor_name}"`,
      d.age,
      d.gender,
      d.blood_group,
      `"${d.phone}"`,
      d.email,
      `"${d.address.replace(/"/g, '""')}"`,
      d.last_donation_date ? d.last_donation_date.split('T')[0] : 'None'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Certified_Donors_Registry_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Certified Donors Registry exported to CSV successfully!', 'success');
  } catch (err) {
    showToast('Failed to export donors CSV.', 'error');
  }
};

// ==========================================
// SECTION 6: SETTINGS
// ==========================================
function initSettingsForm() {
  const profileForm = document.getElementById('admin-profile-form');
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const full_name = document.getElementById('settings_fullname').value.trim();
      const email = document.getElementById('settings_email').value.trim();
      const current_password = document.getElementById('settings_current_pass').value;
      const new_password = document.getElementById('settings_new_pass').value;

      try {
        const res = await fetch('/api/admin/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ full_name, email, current_password, new_password })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          showToast('Profile and security credentials updated successfully!', 'success');
          document.getElementById('settings_current_pass').value = '';
          document.getElementById('settings_new_pass').value = '';
          checkAdminSession();
        } else {
          showToast(data.message || 'Failed to update profile.', 'error');
        }
      } catch (err) {
        showToast('Connection error updating profile.', 'error');
      }
    });
  }
}

// ==========================================
// MODAL CONTROLS & EVENT LISTENERS
// ==========================================
function initModals() {
  // Close buttons
  document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('show'));
    });
  });

  // Add Donor Modal Form
  const addDonorForm = document.getElementById('modal-add-donor-form');
  if (addDonorForm) {
    addDonorForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        donor_name: document.getElementById('add_donor_name').value.trim(),
        age: parseInt(document.getElementById('add_donor_age').value, 10),
        gender: document.getElementById('add_donor_gender').value,
        blood_group: document.getElementById('add_donor_blood_group').value,
        phone: document.getElementById('add_donor_phone').value.trim(),
        email: document.getElementById('add_donor_email').value.trim(),
        address: document.getElementById('add_donor_address').value.trim(),
        last_donation_date: document.getElementById('add_donor_last_date').value || null
      };

      try {
        const res = await fetch('/api/donors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showToast('Donor successfully registered!', 'success');
          addDonorForm.reset();
          closeModal('modal-add-donor');
          loadDonorsTable();
          loadDashboardData();
        } else {
          showToast(data.message || 'Error creating donor.', 'error');
        }
      } catch (err) {
        showToast('Server error.', 'error');
      }
    });
  }

  // Edit Donor Modal Form
  const editDonorForm = document.getElementById('modal-edit-donor-form');
  if (editDonorForm) {
    editDonorForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const donorId = document.getElementById('edit_donor_id').value;
      const payload = {
        donor_name: document.getElementById('edit_donor_name').value.trim(),
        age: parseInt(document.getElementById('edit_donor_age').value, 10),
        gender: document.getElementById('edit_donor_gender').value,
        blood_group: document.getElementById('edit_donor_blood_group').value,
        phone: document.getElementById('edit_donor_phone').value.trim(),
        email: document.getElementById('edit_donor_email').value.trim(),
        address: document.getElementById('edit_donor_address').value.trim(),
        last_donation_date: document.getElementById('edit_donor_last_date').value || null
      };

      try {
        const res = await fetch(`/api/donors/${donorId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showToast('Donor record updated!', 'success');
          closeModal('modal-edit-donor');
          loadDonorsTable();
          loadDashboardData();
        } else {
          showToast(data.message || 'Error updating donor.', 'error');
        }
      } catch (err) {
        showToast('Server error.', 'error');
      }
    });
  }

  // Add Stock Modal Form
  const addStockForm = document.getElementById('modal-add-stock-form');
  if (addStockForm) {
    addStockForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        blood_group: document.getElementById('add_stock_group').value,
        units_available: parseInt(document.getElementById('add_stock_units').value, 10),
        expiry_date: document.getElementById('add_stock_expiry').value,
        storage_location: document.getElementById('add_stock_location').value.trim()
      };

      try {
        const res = await fetch('/api/stock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showToast('New stock batch logged successfully!', 'success');
          addStockForm.reset();
          closeModal('modal-add-stock');
          loadStockTable();
          loadDashboardData();
        } else {
          showToast(data.message || 'Error logging stock.', 'error');
        }
      } catch (err) {
        showToast('Server error.', 'error');
      }
    });
  }

  // Edit Stock Modal Form
  const editStockForm = document.getElementById('modal-edit-stock-form');
  if (editStockForm) {
    editStockForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const stockId = document.getElementById('edit_stock_id').value;
      const payload = {
        blood_group: document.getElementById('edit_stock_group').value,
        units_available: parseInt(document.getElementById('edit_stock_units').value, 10),
        expiry_date: document.getElementById('edit_stock_expiry').value,
        storage_location: document.getElementById('edit_stock_location').value.trim()
      };

      try {
        const res = await fetch(`/api/stock/${stockId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showToast('Stock batch updated!', 'success');
          closeModal('modal-edit-stock');
          loadStockTable();
          loadDashboardData();
        } else {
          showToast(data.message || 'Error updating batch.', 'error');
        }
      } catch (err) {
        showToast('Server error.', 'error');
      }
    });
  }
}

function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('show');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('show');
}

window.openModal = openModal;
window.closeModal = closeModal;

// Setup Event Listeners
function setupEventListeners() {
  initSettingsForm();

  // Requests Status Tabs
  const reqTabs = document.querySelectorAll('.req-filter-btn');
  reqTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      reqTabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeRequestStatusFilter = btn.getAttribute('data-status') || 'All';
      filterAndRenderRequests();
    });
  });

  // Donors Search in Admin
  const adminDonorSearch = document.getElementById('admin-donor-search');
  if (adminDonorSearch) {
    adminDonorSearch.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase().trim();
      const filtered = allDonorsList.filter(d => 
        d.donor_name.toLowerCase().includes(term) ||
        d.phone.includes(term) ||
        d.email.toLowerCase().includes(term) ||
        d.blood_group.toLowerCase().includes(term)
      );
      renderAdminDonors(filtered);
    });
  }
}

// Handle Admin Logout
async function handleLogout() {
  if (!confirm('Log out from administrative console?')) return;
  try {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/pages/admin-login.html';
  } catch (err) {
    window.location.href = '/pages/admin-login.html';
  }
}
