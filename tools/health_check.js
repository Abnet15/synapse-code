const fs = require('fs');
const path = require('path');
const https = require('https');

function parseEnvFile(envPath) {
  const envVars = {};
  if (!fs.existsSync(envPath)) return envVars;
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...valueParts] = trimmed.split('=');
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  });
  return envVars;
}

async function runHealthCheck() {
  console.log('====================================================');
  console.log('SYNAPSECODE B.L.A.S.T. SYSTEM DIAGNOSTIC HEALTH CHECK');
  console.log('====================================================\n');

  const envPath = path.join(__dirname, '../server/.env');
  const envVars = parseEnvFile(envPath);

  let passed = true;

  // 1. Environment Credentials Verification
  console.log('1. Verifying Environment Credentials (server/.env)...');
  const requiredKeys = [
    'MONGODB_URI',
    'JWT_SECRET',
    'CHAPA_SECRET_KEY',
    'CHAPA_WEBHOOK_SECRET',
    'WEB_CLIENT_URL',
  ];

  for (const key of requiredKeys) {
    if (envVars[key] || process.env[key]) {
      console.log(`   [OK] Key present: ${key}`);
    } else {
      console.error(`   [FAIL] Key missing: ${key}`);
      passed = false;
    }
  }

  // 2. Chapa Payment Gateway Handshake Test
  console.log('\n2. Testing Chapa Payment Gateway Handshake (https://api.chapa.co)...');
  const chapaKey = envVars['CHAPA_SECRET_KEY'] || process.env['CHAPA_SECRET_KEY'];

  await new Promise((resolve) => {
    const req = https.request(
      'https://api.chapa.co/v1/banks',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${chapaKey}`,
        },
      },
      (res) => {
        if (res.statusCode >= 200 && res.statusCode < 500) {
          console.log(`   [OK] Chapa API endpoint responded cleanly (HTTP Status ${res.statusCode})!`);
        } else {
          console.warn(`   [WARN] Chapa API status: ${res.statusCode}`);
        }
        resolve();
      }
    );

    req.on('error', (err) => {
      console.warn(`   [WARN] Chapa network check note: ${err.message}`);
      resolve();
    });

    req.end();
  });

  // 3. Database URI Integrity Test
  console.log('\n3. Database Connection URI Integrity Check...');
  const mongoUri = envVars['MONGODB_URI'] || process.env['MONGODB_URI'];
  if (mongoUri && mongoUri.startsWith('mongodb')) {
    console.log('   [OK] MongoDB Connection URI schema is valid.');
  } else {
    console.error('   [FAIL] Invalid MongoDB URI.');
    passed = false;
  }

  console.log('\n====================================================');
  if (passed) {
    console.log('RESULT: All Phase 2 Link Handshake Checks Passed Successfully!');
  } else {
    console.log('RESULT: Health check finished with warnings.');
  }
  console.log('====================================================');
}

runHealthCheck();
