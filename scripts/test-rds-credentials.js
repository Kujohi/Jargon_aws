const { Client } = require('pg');

const RDS_HOST = 'jargon-ai.cr8kaouuyl3k.ap-southeast-1.rds.amazonaws.com';
const RDS_PORT = 5432;

// Common PostgreSQL usernames
const POSSIBLE_CREDENTIALS = [
  { user: 'postgres', password: 'hiep123456%' },
  { user: 'jargon_admin', password: 'hiep123456%' },
  { user: 'postgres', password: 'hiep123456' },
  { user: 'jargon_admin', password: 'hiep123456' },
  { user: 'admin', password: 'hiep123456%' },
  { user: 'admin', password: 'hiep123456' },
];

async function testCredentials() {
  console.log('🔍 Testing RDS credentials...\n');
  
  for (let i = 0; i < POSSIBLE_CREDENTIALS.length; i++) {
    const { user, password } = POSSIBLE_CREDENTIALS[i];
    
    console.log(`📝 Attempt ${i + 1}/${POSSIBLE_CREDENTIALS.length}: Testing user '${user}'`);
    
    const client = new Client({
      host: RDS_HOST,
      port: RDS_PORT,
      database: 'postgres', // Connect to default database first
      user: user,
      password: password,
      ssl: {
        rejectUnauthorized: false
      },
      connectionTimeoutMillis: 5000,
    });
    
    try {
      await client.connect();
      console.log(`✅ SUCCESS! Credentials work:`, { user, password: '[HIDDEN]' });
      
      // Test a simple query
      const result = await client.query('SELECT version()');
      console.log('📊 Database version:', result.rows[0].version.split(' ').slice(0, 2).join(' '));
      
      await client.end();
      
      console.log('\n🎉 Working credentials found!');
      console.log('📋 Update your environment variables or script with:');
      console.log(`   AWS_RDS_USERNAME=${user}`);
      console.log(`   AWS_RDS_PASSWORD=${password}`);
      return;
      
    } catch (error) {
      console.log(`❌ Failed: ${error.message.split('\n')[0]}`);
      await client.end().catch(() => {}); // Ignore cleanup errors
    }
    
    console.log('');
  }
  
  console.log('🚨 No working credentials found!');
  console.log('\n💡 Please check:');
  console.log('   1. The RDS instance is running and accessible');
  console.log('   2. Your security group allows connections from your IP');
  console.log('   3. The master username and password you set when creating the RDS instance');
  console.log('\n🔧 You can find the master username in the AWS RDS Console:');
  console.log('   - Go to RDS → Databases → jargon-ai');
  console.log('   - Look for "Master username" in the Configuration tab');
}

testCredentials(); 