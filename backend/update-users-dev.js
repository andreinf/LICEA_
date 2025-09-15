const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateUsersForDev() {
  let connection = null;
  
  try {
    console.log('🔄 Updating users for development environment...');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'licea_platform'
    });
    
    console.log('✅ Connected to database');
    
    // Update all users to be verified and active for development
    const [result] = await connection.execute(`
      UPDATE users 
      SET is_verified = TRUE, 
          is_active = TRUE,
          privacy_consent = TRUE,
          terms_accepted = TRUE
      WHERE 1=1
    `);
    
    console.log(`✅ Updated ${result.affectedRows} users`);
    
    // Show current users
    const [users] = await connection.execute(`
      SELECT id, name, email, role, is_verified, is_active, privacy_consent, terms_accepted
      FROM users
      LIMIT 5
    `);
    
    console.log('\n👥 Current users (showing first 5):');
    users.forEach(user => {
      console.log(`   - ${user.name} (${user.email}) - Role: ${user.role} - Verified: ${user.is_verified ? '✅' : '❌'} - Active: ${user.is_active ? '✅' : '❌'}`);
    });
    
    console.log('\n🎉 Users updated successfully for development!');
    
  } catch (error) {
    console.error('❌ Error updating users:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

updateUsersForDev();