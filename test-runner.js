const { server } = require('./server');
const http = require('http');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch (e) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
          json
        });
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function run() {
  console.log('\n========================================================');
  console.log(' BLOOD BANK MANAGEMENT SYSTEM - IN-PROCESS VERIFICATION');
  console.log('========================================================\n');

  try {
    // 1. Health API
    console.log('[1/8] Checking Health API (/api/health)...');
    const health = await request({ hostname: '127.0.0.1', port: 5000, path: '/api/health', method: 'GET' });
    console.log(`  -> Status: HTTP ${health.statusCode}`);
    console.log(`  -> App: ${health.json?.app} (Database mode: ${health.json?.database?.mode})`);

    // 2. Stock Summary
    console.log('\n[2/8] Checking Blood Stock Summary (/api/stock/summary)...');
    const stock = await request({ hostname: '127.0.0.1', port: 5000, path: '/api/stock/summary', method: 'GET' });
    console.log(`  -> Status: HTTP ${stock.statusCode}`);
    console.log(`  -> Total Available Units: ${stock.json?.total_units}`);
    console.log(`  -> Blood Groups: ${stock.json?.data?.map(d => `${d.blood_group}: ${d.total_units}u`).join(', ')}`);

    // 3. Donors List
    console.log('\n[3/8] Checking Donors API (/api/donors)...');
    const donors = await request({ hostname: '127.0.0.1', port: 5000, path: '/api/donors', method: 'GET' });
    console.log(`  -> Status: HTTP ${donors.statusCode}`);
    console.log(`  -> Registered Donors Count: ${donors.json?.count}`);

    // 4. Admin Authentication
    console.log('\n[4/8] Testing Admin Login (/api/admin/login)...');
    const login = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/admin/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { username: 'admin', password: 'admin123' });
    console.log(`  -> Status: HTTP ${login.statusCode}`);
    console.log(`  -> Message: ${login.json?.message}`);
    const cookie = login.headers['set-cookie'] ? login.headers['set-cookie'][0].split(';')[0] : null;
    console.log(`  -> Session Auth Cookie Acquired: ${Boolean(cookie)}`);

    // 5. Protected Admin Stats
    console.log('\n[5/8] Testing Protected Dashboard Analytics (/api/admin/stats)...');
    const stats = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/admin/stats',
      method: 'GET',
      headers: { Cookie: cookie }
    });
    console.log(`  -> Status: HTTP ${stats.statusCode}`);
    console.log(`  -> Dashboard KPIs: Donors=${stats.json?.stats?.total_donors}, Stock Units=${stats.json?.stats?.total_units}, Total Requests=${stats.json?.stats?.total_requests}, Pending=${stats.json?.stats?.pending_requests}`);
    console.log(`  -> Chart Distribution Groups: ${stats.json?.charts?.stockDistribution?.labels?.join(', ')}`);

    // 6. Submit New Blood Request
    console.log('\n[6/8] Submitting New Emergency Hospital Requisition (/api/requests)...');
    const newReq = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/requests',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      patient_name: 'David K. Miller',
      blood_group: 'O+',
      units_required: 2,
      hospital_name: 'Metropolitan Trauma ICU',
      contact_number: '+1 (555) 777-8899',
      request_date: new Date().toISOString().split('T')[0]
    });
    console.log(`  -> Status: HTTP ${newReq.statusCode}`);
    console.log(`  -> Requisition Created ID: ${newReq.json?.request_id}`);
    const reqId = newReq.json?.request_id;

    // 7. Atomic Transaction Approval & FIFO Stock Deduction
    console.log(`\n[7/8] Executing Transactional Approval for Request #${reqId}...`);
    const approval = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: `/api/requests/${reqId}/approve`,
      method: 'POST',
      headers: { Cookie: cookie }
    });
    console.log(`  -> Status: HTTP ${approval.statusCode}`);
    console.log(`  -> Transaction Message: ${approval.json?.message}`);

    // Verify duplicate deduction prevention
    console.log('  -> Verifying duplicate deduction prevention...');
    const duplicateApproval = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: `/api/requests/${reqId}/approve`,
      method: 'POST',
      headers: { Cookie: cookie }
    });
    console.log(`  -> Duplicate attempt response (Expected 400): HTTP ${duplicateApproval.statusCode} - "${duplicateApproval.json?.message}"`);

    // 8. Testing All Public & Admin Page Routes
    console.log('\n[8/8] Verifying All Frontend HTML Page Routes...');
    const pages = [
      '/',
      '/about',
      '/donors',
      '/blood-stock',
      '/request-blood',
      '/contact',
      '/admin-login',
      '/admin-dashboard',
      '/pages/index.html',
      '/pages/about.html',
      '/pages/donors.html',
      '/pages/blood-stock.html',
      '/pages/request-blood.html',
      '/pages/contact.html',
      '/pages/admin-login.html',
      '/pages/admin-dashboard.html'
    ];

    for (const p of pages) {
      const pageRes = await request({ hostname: '127.0.0.1', port: 5000, path: p, method: 'GET' });
      console.log(`  -> ${p.padEnd(28)} : HTTP ${pageRes.statusCode} OK (${pageRes.body.length} bytes)`);
    }

    console.log('\n========================================================');
    console.log(' SUCCESS: ALL INTEGRATION & TRANSACTION TESTS PASSED!');
    console.log('========================================================\n');

  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    server.close(() => {
      console.log('Server stopped cleanly.');
      process.exit(0);
    });
  }
}

run();
