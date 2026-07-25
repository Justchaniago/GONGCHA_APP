#!/usr/bin/env node
import pg from 'pg';

const { Client } = pg;

console.log('================================================================');
console.log('    Gong Cha V2 - Production Database Provisioning & Readiness   ');
console.log('================================================================');

// 1. ENVIRONMENT VARIABLES READY CHECK
console.log('\n🔍 Step 1: Verifying Production Environment Variables...');

const APP_ENV = process.env.APP_ENV || 'production';
const QR_SECRET = process.env.GONGCHA_V2_QR_SECRET;

console.log(`- APP_ENV: [${APP_ENV}]`);
if (APP_ENV !== 'production') {
  console.log('⚠️  Warning: APP_ENV is not explicitly set to "production".');
} else {
  console.log('✅ APP_ENV is set to "production".');
}

if (!QR_SECRET) {
  console.log('❌ Error: GONGCHA_V2_QR_SECRET environment variable is missing.');
  console.log('   In production, Gate G-001 requires a cryptographically secure HMAC secret key.');
  process.exit(1);
} else if (QR_SECRET === 'GONGCHA_V2_QR_SECRET') {
  console.log('❌ Error: GONGCHA_V2_QR_SECRET is set to the default fallback value.');
  console.log('   This is highly insecure for production and violates G-001 security policy.');
  process.exit(1);
} else if (QR_SECRET.length < 16) {
  console.log('⚠️  Warning: GONGCHA_V2_QR_SECRET is too short (< 16 characters). For production, a 256-bit key is recommended.');
} else {
  console.log('✅ GONGCHA_V2_QR_SECRET is configured and meets production security standards.');
}

// 2. POSTGRES CONNECTION PARAMETERS COMPILATION
console.log('\n🔍 Step 2: Compiling Database Connection Parameters...');

let connectionConfig = {};
let rawUrl = process.env.DATABASE_URL;

if (rawUrl) {
  console.log('- DATABASE_URL detected.');
  // Handle Python +asyncpg adapter conversion
  const parsedUrl = rawUrl.replace(/^postgresql\+[a-zA-Z0-9_]+:\/\//, 'postgresql://');
  connectionConfig.connectionString = parsedUrl;
} else {
  // Try individual connection parameters with defaults
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '5432', 10);
  const user = process.env.DB_USER || 'gongcha';
  const password = process.env.DB_PASSWORD || 'gongcha_local';
  const database = process.env.DB_NAME || 'gongcha';

  console.log(`- host: ${host}`);
  console.log(`- port: ${port}`);
  console.log(`- user: ${user}`);
  console.log(`- database: ${database}`);

  connectionConfig = {
    host,
    port,
    user,
    password,
    database,
  };
}

// 3. DATABASE CONNECTION TEST
console.log('\n🔍 Step 3: Establishing Connection to PostgreSQL...');
const client = new Client(connectionConfig);

try {
  await client.connect();
  console.log('✅ Successfully connected to PostgreSQL database.');
} catch (err) {
  console.error('❌ Connection Failed! Database connection could not be established.');
  console.error(`Reason: ${err.message}`);
  process.exit(1);
}

// 4. MIGRATION STATUS AND SCHEMA VERIFICATION
try {
  console.log('\n🔍 Step 4: Verifying Alembic Schema and Migrations Status...');

  // Check if alembic_version table exists
  const tableCheck = await client.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'alembic_version'
    );
  `);

  const hasAlembic = tableCheck.rows[0].exists;
  if (!hasAlembic) {
    console.error('❌ Error: Table "alembic_version" does not exist.');
    console.error('   The database has not been initialized or migrated.');
    process.exit(1);
  }

  // Fetch active migration version
  const migrationRes = await client.query('SELECT version_num FROM alembic_version LIMIT 1;');
  if (migrationRes.rows.length === 0) {
    console.error('❌ Error: Table "alembic_version" is empty. No migrations applied.');
    process.exit(1);
  }

  const activeVersion = migrationRes.rows[0].version_num;
  console.log(`- Active Migration Version ID: [${activeVersion}]`);

  const EXPECTED_LATEST_VERSION = '0006_member_profile_completion';
  if (activeVersion !== EXPECTED_LATEST_VERSION) {
    console.log(`⚠️  Warning: Database version [${activeVersion}] is not matching expected latest [${EXPECTED_LATEST_VERSION}].`);
  } else {
    console.log('✅ Database schema is fully migrated and matches latest Alembic head.');
  }

  // 5. ESSENTIAL TABLES READINESS CHECK
  console.log('\n🔍 Step 5: Checking Essential Production Tables...');
  const essentialTables = [
    'members',
    'external_identities',
    'integration_events',
    'transactions',
    'payments',
    'refunds',
    'refund_snapshots',
    'loyalty_accounts',
    'point_ledger',
    'redemptions'
  ];
  let missingTables = 0;

  for (const table of essentialTables) {
    const checkTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      );
    `, [table]);

    if (checkTable.rows[0].exists) {
      console.log(`- Table [${table}]: ✅ Available`);
    } else {
      console.log(`- Table [${table}]: ❌ MISSING`);
      missingTables++;
    }
  }

  if (missingTables > 0) {
    console.error(`❌ Error: ${missingTables} essential table(s) are missing from the schema.`);
    process.exit(1);
  } else {
    console.log('✅ All essential production tables are present.');
  }

  console.log('\n================================================================');
  console.log('🎉 SUCCESS: PostgreSQL Database and Production Environment Ready!');
  console.log('================================================================');

} catch (err) {
  console.error('❌ Execution Error during database verification.');
  console.error(err.stack);
  process.exit(1);
} finally {
  await client.end();
}
