const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupDatabase() {
  let connection = null;
  
  try {
    console.log('🔄 Setting up LICEA database...');
    
    // First, connect without specifying a database to create it if needed
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true
    });
    
    console.log('✅ Connected to MySQL server');
    
    // Read the SQL initialization script
    const sqlPath = path.join(__dirname, 'database', 'init.sql');
    const sqlScript = fs.readFileSync(sqlPath, 'utf8');
    
    // Split the script into individual statements
    const statements = sqlScript
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`🔄 Executing ${statements.length} SQL statements...`);
    
    // Execute the entire script at once
    try {
      await connection.query(sqlScript);
    } catch (error) {
      // If bulk execution fails, try individual statements
      console.log('⚠️  Bulk execution failed, trying individual statements...');
      
      for (const statement of statements) {
        try {
          await connection.query(statement);
        } catch (error) {
          // Ignore duplicate key errors for sample data
          if (!error.message.includes('Duplicate entry')) {
            console.log(`Warning: ${error.message}`);
          }
        }
      }
    }
    
    console.log('✅ Database initialized successfully!');
    console.log('');
    console.log('📊 Default users created:');
    console.log('   Admin: admin@licea.edu (password: admin123)');
    console.log('   Instructor: instructor@licea.edu (password: admin123)');
    console.log('   Student: student@licea.edu (password: admin123)');
    console.log('');
    console.log('⚠️  IMPORTANT: Change default passwords in production!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('');
      console.log('💡 Make sure XAMPP is running:');
      console.log('   1. Start XAMPP Control Panel');
      console.log('   2. Start Apache and MySQL services');
      console.log('   3. MySQL should be running on port 3306');
      console.log('');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Test database connection
async function testConnection() {
  let connection = null;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'licea_platform'
    });
    
    console.log('✅ Database connection test successful!');
    
    // Test a simple query
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM users');
    console.log(`📊 Found ${rows[0].count} users in database`);
    
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Main function
async function main() {
  const command = process.argv[2];
  
  if (command === 'test') {
    await testConnection();
  } else {
    await setupDatabase();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { setupDatabase, testConnection };
