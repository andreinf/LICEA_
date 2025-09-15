const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixDatabaseSchema() {
  let connection = null;
  
  try {
    console.log('🔧 Fixing database schema...');
    
    // Connect to database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'licea_platform'
    });
    
    console.log('✅ Connected to database');
    
    // Check current table structure
    console.log('📊 Current users table structure:');
    const [columns] = await connection.execute('DESCRIBE users');
    columns.forEach(col => console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(nullable)' : '(not null)'} ${col.Default ? `(default: ${col.Default})` : ''}`));
    
    console.log('\n🔄 Checking for missing columns...');
    
    const columnNames = columns.map(col => col.Field);
    const requiredColumns = {
      'is_verified': 'ADD COLUMN is_verified BOOLEAN DEFAULT FALSE',
      'is_active': 'ADD COLUMN is_active BOOLEAN DEFAULT TRUE',
      'privacy_consent': 'ADD COLUMN privacy_consent BOOLEAN DEFAULT FALSE',
      'terms_accepted': 'ADD COLUMN terms_accepted BOOLEAN DEFAULT FALSE',
      'registration_date': 'ADD COLUMN registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
      'email_verified': 'ADD COLUMN email_verified BOOLEAN DEFAULT FALSE'
    };
    
    const alterQueries = [];
    
    for (const [column, alterStatement] of Object.entries(requiredColumns)) {
      if (!columnNames.includes(column)) {
        console.log(`   ⚠️  Missing column: ${column}`);
        alterQueries.push(`ALTER TABLE users ${alterStatement}`);
      } else {
        console.log(`   ✅ Column exists: ${column}`);
      }
    }
    
    // Execute alter statements
    if (alterQueries.length > 0) {
      console.log('\n🔨 Adding missing columns...');
      for (const query of alterQueries) {
        console.log(`   Executing: ${query}`);
        try {
          await connection.execute(query);
          console.log('   ✅ Success');
        } catch (error) {
          console.log(`   ❌ Error: ${error.message}`);
        }
      }
    } else {
      console.log('\n✅ All required columns exist');
    }
    
    // Check for password reset tables
    console.log('\n🔄 Checking email verification table...');
    try {
      const [emailVerifications] = await connection.execute('DESCRIBE email_verifications');
      console.log('✅ email_verifications table exists');
    } catch (error) {
      console.log('⚠️  Creating email_verifications table...');
      await connection.execute(`
        CREATE TABLE email_verifications (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NOT NULL,
          token VARCHAR(255) NOT NULL,
          expires_at DATETIME NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_token (token),
          INDEX idx_user_id (user_id)
        )
      `);
      console.log('✅ email_verifications table created');
    }
    
    console.log('\n🔄 Checking password reset table...');
    try {
      const [passwordResets] = await connection.execute('DESCRIBE password_resets');
      console.log('✅ password_resets table exists');
    } catch (error) {
      console.log('⚠️  Creating password_resets table...');
      await connection.execute(`
        CREATE TABLE password_resets (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NOT NULL,
          token VARCHAR(255) NOT NULL,
          expires_at DATETIME NOT NULL,
          used BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_token (token),
          INDEX idx_user_id (user_id)
        )
      `);
      console.log('✅ password_resets table created');
    }
    
    // Update existing users to have is_active = TRUE and is_verified = TRUE for development
    console.log('\n🔄 Updating existing users for development...');
    const [updateResult] = await connection.execute(`
      UPDATE users 
      SET is_active = TRUE, is_verified = TRUE 
      WHERE is_active IS NULL OR is_verified IS NULL
    `);
    console.log(`✅ Updated ${updateResult.affectedRows} users`);
    
    // Show final table structure
    console.log('\n📋 Final users table structure:');
    const [finalColumns] = await connection.execute('DESCRIBE users');
    finalColumns.forEach(col => console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(nullable)' : '(not null)'} ${col.Default !== null ? `(default: ${col.Default})` : ''}`));
    
    console.log('\n🎉 Database schema fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing database schema:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the fix
if (require.main === module) {
  fixDatabaseSchema();
}

module.exports = { fixDatabaseSchema };