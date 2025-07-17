const { Client } = require('pg');

async function testConnection() {
  const client = new Client({
    host: 'jargon-ai.cr8kaouuyl3k.ap-southeast-1.rds.amazonaws.com',
    port: 5432,
    database: 'jargon-ai',
    user: 'jargon_admin',
    password: 'hiep123456',
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 10000, // 10 seconds
    query_timeout: 5000, // 5 seconds
  });

  try {
    console.log('🔌 Attempting to connect to RDS...');
    await client.connect();
    console.log('✅ Successfully connected to RDS!');
    
    // Test a simple query
    const result = await client.query('SELECT NOW() as current_time');
    console.log('📅 Current database time:', result.rows[0].current_time);
    
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
    if (error.code === 'ETIMEDOUT') {
      console.log('💡 This is likely a security group issue. Make sure:');
      console.log('   1. Your IP (1.53.131.77) is added to the RDS security group');
      console.log('   2. Port 5432 is open for PostgreSQL');
      console.log('   3. The RDS instance is publicly accessible');
    }
  } finally {
    await client.end();
  }
}

testConnection(); 