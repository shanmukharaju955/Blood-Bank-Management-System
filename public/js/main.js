/**
 * BLOOD BANK MANAGEMENT SYSTEM - MAIN JAVASCRIPT
 * Handles 3D tilt effects, animated counters, live data fetching, and toast notifications.
 */

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initBackgroundParticles();
  init3DBloodBag();
  initMobileMenu();
  loadHomeCountersAndStock();
});

// ==========================================
// Toast Notification Utility
// ==========================================
function showToast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let iconClass = 'fa-check-circle';
  if (type === 'error') iconClass = 'fa-exclamation-circle';
  if (type === 'warning') iconClass = 'fa-triangle-exclamation';

  toast.innerHTML = `
    <i class="fas ${iconClass} toast-icon"></i>
    <span class="toast-message">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4200);
}

// ==========================================
// 3D Tilt Effect on Interactive Blood Bag
// ==========================================
function init3DBloodBag() {
  const container = document.querySelector('.blood-bag-container');
  const bag = document.querySelector('.blood-bag-wrapper');

  if (!container || !bag) return;

  container.addEventListener('mousemove', (e) => {
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    const rotX = (y / (rect.height / 2)) * -14;
    const rotY = (x / (rect.width / 2)) * 14;

    bag.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.02)`;
  });

  container.addEventListener('mouseleave', () => {
    bag.style.transform = 'rotateX(0deg) rotateY(0deg) scale(1)';
  });

  // Interactive Blood Group Inspector Chips
  const chips = document.querySelectorAll('.bag-group-chip');
  const groupTag = document.querySelector('.group-tag');
  const groupStatus = document.querySelector('.group-status');
  const fluidEl = document.querySelector('.blood-fluid');

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      const grp = chip.getAttribute('data-group');
      const status = chip.getAttribute('data-status');
      const vol = chip.getAttribute('data-vol') || '70%';

      if (groupTag) groupTag.textContent = grp;
      if (groupStatus) groupStatus.innerHTML = `<i class="fas fa-check"></i> ${status}`;
      if (fluidEl) fluidEl.style.height = vol;
    });
  });
}

// ==========================================
// Background Living Biological Aurora & 3D Erythrocytes
// ==========================================
function initBackgroundParticles() {
  // 1. Cyber-Medical Micro Grid Overlay
  const gridOverlay = document.createElement('div');
  gridOverlay.className = 'bg-medical-grid';
  document.body.prepend(gridOverlay);

  // 2. Ambient Plasma Glow Orbs
  const aurora = document.createElement('div');
  aurora.className = 'plasma-aurora';
  aurora.innerHTML = `
    <div class="plasma-orb plasma-orb-1"></div>
    <div class="plasma-orb plasma-orb-2"></div>
    <div class="plasma-orb plasma-orb-3"></div>
  `;
  document.body.prepend(aurora);

  // 3. Floating 3D Biconcave Red Blood Cells
  const particleBox = document.createElement('div');
  particleBox.className = 'bg-particles';

  const cells = [];
  const particleCount = 16;
  for (let i = 0; i < particleCount; i++) {
    const cell = document.createElement('div');
    cell.className = 'erythrocyte animate-float';
    const size = Math.floor(Math.random() * 50) + 30; // 30px - 80px
    const posX = Math.floor(Math.random() * 96);
    const posY = Math.floor(Math.random() * 94);
    const duration = Math.floor(Math.random() * 7) + 7; // 7s - 14s
    const delay = Math.random() * 5;
    const depthFactor = (size - 30) / 50; // 0 to 1

    cell.style.width = `${size}px`;
    cell.style.height = `${size * 0.85}px`;
    cell.style.left = `${posX}vw`;
    cell.style.top = `${posY}vh`;
    cell.style.animationDuration = `${duration}s`;
    cell.style.animationDelay = `${delay}s`;
    cell.style.opacity = (0.2 + depthFactor * 0.25).toFixed(2);
    if (depthFactor < 0.3) {
      cell.style.filter = 'blur(1.5px)';
    }

    particleBox.appendChild(cell);
    cells.push({ el: cell, speed: (depthFactor + 0.3) * 15, baseX: posX, baseY: posY });
  }

  document.body.prepend(particleBox);

  // Subtle Mouse Parallax on Red Blood Cells
  window.addEventListener('mousemove', (e) => {
    const cx = (e.clientX / window.innerWidth - 0.5) * 2;
    const cy = (e.clientY / window.innerHeight - 0.5) * 2;

    cells.forEach(item => {
      const offsetX = cx * item.speed;
      const offsetY = cy * item.speed;
      item.el.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0)`;
    });
  });
}

// ==========================================
// Smooth Counter Number Animation
// ==========================================
function animateCounter(element, target, duration = 1600) {
  if (!element) return;
  const start = 0;
  const startTime = performance.now();

  function updateCount(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // EaseOutQuad
    const currentVal = Math.floor(progress * (2 - progress) * (target - start) + start);
    element.textContent = currentVal.toLocaleString();

    if (progress < 1) {
      requestAnimationFrame(updateCount);
    } else {
      element.textContent = target.toLocaleString();
    }
  }

  requestAnimationFrame(updateCount);
}

// ==========================================
// Mobile Menu Navigation Toggle
// ==========================================
function initMobileMenu() {
  const toggleBtn = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (toggleBtn && navLinks) {
    toggleBtn.addEventListener('click', () => {
      navLinks.classList.toggle('show');
      const icon = toggleBtn.querySelector('i');
      if (icon) {
        icon.classList.toggle('fa-bars');
        icon.classList.toggle('fa-times');
      }
    });
  }
}

// ==========================================
// Load Live Counters & Blood Stock for Homepage
// ==========================================
async function loadHomeCountersAndStock() {
  const donorsCountEl = document.getElementById('count-donors');
  const stockCountEl = document.getElementById('count-stock');
  const requestsCountEl = document.getElementById('count-requests');
  const fulfilledCountEl = document.getElementById('count-fulfilled');
  const stockGridEl = document.getElementById('home-stock-grid');

  try {
    // 1. Fetch Stock Summary
    const stockRes = await fetch('/api/stock/summary');
    if (stockRes.ok) {
      const stockData = await stockRes.json();
      if (stockCountEl) {
        animateCounter(stockCountEl, stockData.total_units || 0);
      }

      if (stockGridEl && stockData.data) {
        renderHomeStockGrid(stockData.data, stockGridEl);
      }
    }

    // 2. Fetch General Stats
    const statsRes = await fetch('/api/requests');
    const donorsRes = await fetch('/api/donors');

    if (statsRes.ok && donorsRes.ok) {
      const requestsData = await statsRes.json();
      const donorsData = await donorsRes.json();

      if (donorsCountEl) animateCounter(donorsCountEl, donorsData.count || 0);
      if (requestsCountEl) animateCounter(requestsCountEl, requestsData.count || 0);

      if (fulfilledCountEl && requestsData.data) {
        const fulfilled = requestsData.data.filter(r => r.request_status === 'Fulfilled' || r.request_status === 'Approved').length;
        animateCounter(fulfilledCountEl, fulfilled);
      }
    }
  } catch (error) {
    console.warn('Could not fetch live home counters:', error);
  }
}

// Render 8 Blood Groups Matrix on Homepage
function renderHomeStockGrid(stockList, container) {
  const compatibilityMap = {
    'A+': { gives: 'A+, AB+', receives: 'A+, A-, O+, O-' },
    'A-': { gives: 'A+, A-, AB+, AB-', receives: 'A-, O-' },
    'B+': { gives: 'B+, AB+', receives: 'B+, B-, O+, O-' },
    'B-': { gives: 'B+, B-, AB+, AB-', receives: 'B-, O-' },
    'AB+': { gives: 'AB+ Only', receives: 'All Blood Groups (Universal Recipient)' },
    'AB-': { gives: 'AB+, AB-', receives: 'AB-, A-, B-, O-' },
    'O+': { gives: 'O+, A+, B+, AB+', receives: 'O+, O-' },
    'O-': { gives: 'All Blood Groups (Universal Donor)', receives: 'O- Only' }
  };

  container.innerHTML = stockList.map(item => {
    let statusClass = 'status-healthy';
    if (item.stock_status === 'Moderate') statusClass = 'status-moderate';
    if (item.stock_status === 'Critical') statusClass = 'status-critical';

    const compat = compatibilityMap[item.blood_group] || { gives: 'Patients', receives: 'Donors' };

    return `
      <div class="glass-card blood-card glass-card-hover">
        <div>
          <div class="blood-card-top">
            <div class="blood-badge-3d">${item.blood_group}</div>
            <span class="status-badge ${statusClass}">
              <i class="fas fa-circle" style="font-size: 0.5rem;"></i> ${item.stock_status}
            </span>
          </div>
          <div class="blood-units-count">${item.total_units} <span style="font-size: 1rem; font-weight: 500; color: #718096;">Units</span></div>
          <div class="blood-units-text">Non-expired clinical supply</div>
          
          <div class="compatibility-pill">
            <i class="fas fa-hand-holding-heart text-danger"></i> <strong>Can Give To:</strong> ${compat.gives}
          </div>
          <div class="compatibility-pill" style="margin-top: -8px;">
            <i class="fas fa-syringe text-primary"></i> <strong>Can Receive:</strong> ${compat.receives}
          </div>
        </div>

        <div class="blood-card-action" style="margin-top: 18px;">
          <a href="/pages/request-blood.html?group=${encodeURIComponent(item.blood_group)}" class="btn btn-outline" style="flex: 1; padding: 9px 12px; font-size: 0.84rem;">
            Request
          </a>
          <a href="/pages/donors.html?group=${encodeURIComponent(item.blood_group)}" class="btn btn-primary" style="flex: 1; padding: 9px 12px; font-size: 0.84rem;">
            Donate
          </a>
        </div>
      </div>
    `;
  }).join('');
}
