/**
 * BLOOD BANK MANAGEMENT SYSTEM - STOCK SCRIPT
 * Manages blood stock monitoring, low-stock warnings, and batch inventory display.
 */

let allBatches = [];
let selectedGroup = 'All';
let selectedStatus = 'All';

document.addEventListener('DOMContentLoaded', () => {
  initStockFilters();
  loadBloodStockData();
});

// Load Stock Summary & Batches
async function loadBloodStockData() {
  const cardsContainer = document.getElementById('stock-cards-grid');
  const tableContainer = document.getElementById('stock-batches-tbody');
  const alertContainer = document.getElementById('low-stock-alert-box');

  try {
    // 1. Fetch Summary for 8 blood groups
    const summaryRes = await fetch('/api/stock/summary');
    const summaryData = await summaryRes.json();

    if (summaryData.success && summaryData.data) {
      renderBloodCards(summaryData.data, cardsContainer);
      renderLowStockAlert(summaryData.data, alertContainer);
    }

    // 2. Fetch Batches
    const batchRes = await fetch('/api/stock');
    const batchData = await batchRes.json();

    if (batchData.success && batchData.data) {
      allBatches = batchData.data;
      filterAndRenderBatches();
    }
  } catch (error) {
    console.error('Error loading blood stock data:', error);
  }
}

// Render 8 Group Cards with Barometers
function renderBloodCards(groups, container) {
  if (!container) return;

  container.innerHTML = groups.map(g => {
    let statusClass = 'status-healthy';
    let statusIcon = 'fa-check-circle';
    let meterColor = '#10B981';
    let meterPercent = Math.min((g.total_units / 30) * 100, 100);

    if (g.stock_status === 'Moderate') {
      statusClass = 'status-moderate';
      statusIcon = 'fa-info-circle';
      meterColor = '#F59E0B';
    } else if (g.stock_status === 'Critical') {
      statusClass = 'status-critical';
      statusIcon = 'fa-exclamation-triangle';
      meterColor = '#EF4444';
    }

    return `
      <div class="glass-card blood-card glass-card-hover">
        <div class="blood-card-top">
          <div class="blood-badge-3d">${g.blood_group}</div>
          <span class="status-badge ${statusClass}">
            <i class="fas ${statusIcon}"></i> ${g.stock_status}
          </span>
        </div>

        <div class="blood-units-count">${g.total_units} <span style="font-size: 1rem; color: #718096; font-weight: 500;">Units</span></div>
        <div class="blood-units-text">${g.batch_count} Active Cryo Batches</div>

        <!-- Stock Health Progress Barometer -->
        <div style="background: #E2E8F0; height: 8px; border-radius: 99px; overflow: hidden; margin-bottom: 14px;">
          <div style="background: ${meterColor}; width: ${meterPercent}%; height: 100%; border-radius: 99px; transition: width 1s ease;"></div>
        </div>

        <div style="font-size: 0.8rem; color: #718096; margin-bottom: 16px;">
          <i class="fas fa-snowflake text-primary"></i> Nearest Expiry: 
          <strong>${g.nearest_expiry ? new Date(g.nearest_expiry).toLocaleDateString() : 'None in stock'}</strong>
        </div>

        <div class="blood-card-action">
          <a href="/pages/request-blood.html?group=${encodeURIComponent(g.blood_group)}" class="btn btn-outline" style="flex: 1; padding: 8px 10px; font-size: 0.82rem;">
            Request
          </a>
          <a href="/pages/donors.html?group=${encodeURIComponent(g.blood_group)}" class="btn btn-primary" style="flex: 1; padding: 8px 10px; font-size: 0.82rem;">
            Donate
          </a>
        </div>
      </div>
    `;
  }).join('');
}

// Low Stock Alert Banner
function renderLowStockAlert(groups, container) {
  if (!container) return;

  const lowGroups = groups.filter(g => g.total_units < 15);
  if (lowGroups.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'flex';
  container.innerHTML = `
    <div style="display: flex; align-items: center; gap: 16px;">
      <i class="fas fa-triangle-exclamation fa-2x" style="color: var(--primary-red);"></i>
      <div>
        <h4 style="font-size: 1.05rem; color: #991B1B; font-weight: 700;">Critical Inventory Alert: Low Stock Warning</h4>
        <p style="font-size: 0.9rem; color: #B91C1C;">
          The following blood groups have fallen below safe reserve thresholds (&lt; 15 units): 
          <strong>${lowGroups.map(g => `${g.blood_group} (${g.total_units} units)`).join(', ')}</strong>. 
          Immediate voluntary donations are urgently required.
        </p>
      </div>
    </div>
    <a href="/pages/donors.html" class="btn btn-primary" style="white-space: nowrap; padding: 10px 20px; font-size: 0.88rem;">
      <i class="fas fa-heart"></i> Donate Now
    </a>
  `;
}

// Filter and Render Detailed Batch Inventory Table
function filterAndRenderBatches() {
  const tbody = document.getElementById('stock-batches-tbody');
  if (!tbody) return;

  let filtered = allBatches;

  if (selectedGroup !== 'All') {
    filtered = filtered.filter(b => b.blood_group === selectedGroup);
  }

  if (selectedStatus === 'expiring') {
    filtered = filtered.filter(b => b.days_to_expiry <= 14 && b.days_to_expiry >= 0);
  } else if (selectedStatus === 'expired') {
    filtered = filtered.filter(b => b.is_expired);
  } else if (selectedStatus === 'healthy') {
    filtered = filtered.filter(b => b.days_to_expiry > 14);
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 32px; color: #718096;">
          <i class="fas fa-inbox fa-2x" style="margin-bottom: 8px; color: #CBD5E0;"></i>
          <p>No inventory batches match the specified filter.</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(batch => {
    let expBadge = `<span class="badge ${batch.expiry_badge}">${batch.expiry_status}</span>`;
    const expDateFormatted = new Date(batch.expiry_date).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });

    return `
      <tr>
        <td><strong>#BAT-${String(batch.stock_id).padStart(4, '0')}</strong></td>
        <td>
          <span class="badge badge-danger" style="font-size: 0.9rem; padding: 4px 10px;">
            ${batch.blood_group}
          </span>
        </td>
        <td><strong>${batch.units_available} Units</strong></td>
        <td><i class="fas fa-temperature-low text-primary"></i> ${batch.storage_location}</td>
        <td>${expDateFormatted}</td>
        <td>${expBadge}</td>
      </tr>
    `;
  }).join('');
}

// Filter Bar Interactions
function initStockFilters() {
  const groupFilters = document.querySelectorAll('.stock-filter-group');
  groupFilters.forEach(btn => {
    btn.addEventListener('click', () => {
      groupFilters.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedGroup = btn.getAttribute('data-group') || 'All';
      filterAndRenderBatches();
    });
  });

  const statusSelect = document.getElementById('stock-status-select');
  if (statusSelect) {
    statusSelect.addEventListener('change', (e) => {
      selectedStatus = e.target.value;
      filterAndRenderBatches();
    });
  }
}
