const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function resetTestPasswords() {
  let connection = null;
  
  try {
    console.log('🔐 Resetting test user passwords...');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'licea_platform'
    });
    
    console.log('✅ Connected to database');
    
    // Hash the new password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const newPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    console.log('🔨 Hashing password with bcrypt...');
    
    // Update admin user
    const [adminResult] = await connection.execute(`
      UPDATE users 
      SET password_hash = ?
      WHERE email = 'admin@licea.edu'
    `, [hashedPassword]);
    
    // Update instructor users
    const [instructorResult] = await connection.execute(`
      UPDATE users 
      SET password_hash = ?
      WHERE role = 'instructor'
    `, [hashedPassword]);
    
    // Update student users
    const [studentResult] = await connection.execute(`
      UPDATE users 
      SET password_hash = ?
      WHERE role = 'student'
    `, [hashedPassword]);
    
    console.log(`✅ Updated admin password: ${adminResult.affectedRows} user(s)`);
    console.log(`✅ Updated instructor passwords: ${instructorResult.affectedRows} user(s)`);
    console.log(`✅ Updated student passwords: ${studentResult.affectedRows} user(s)`);
    
    // Test the password for admin user
    const [testUsers] = await connection.execute(`
      SELECT id, name, email, role, password_hash
      FROM users 
      WHERE email = 'admin@licea.edu'
      LIMIT 1
    `);
    
    if (testUsers.length > 0) {
      const testUser = testUsers[0];
      const passwordMatch = await bcrypt.compare(newPassword, testUser.password_hash);
      console.log(`\n🧪 Password verification test for admin: ${passwordMatch ? '✅ SUCCESS' : '❌ FAILED'}`);
    }
    
    console.log('\n🎉 All test passwords reset successfully!');
    console.log('📝 Test credentials:');
    console.log('   - admin@licea.edu : admin123 (admin)');
    console.log('   - All instructors : admin123');
    console.log('   - All students : admin123');
    
  } catch (error) {
    console.error('❌ Error resetting passwords:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

resetTestPasswords();