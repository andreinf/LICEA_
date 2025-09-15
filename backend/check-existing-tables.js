const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkExistingTables() {
  let connection = null;
  
  try {
    console.log('🔍 Checking existing table structures...');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'licea_platform'
    });
    
    console.log('✅ Connected to database');
    
    // Check existing tables
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('📊 Existing tables:');
    tables.forEach(table => {
      const tableName = table[`Tables_in_${process.env.DB_NAME || 'licea_platform'}`];
      console.log(`   - ${tableName}`);
    });
    
    // Check courses table structure if it exists
    try {
      const [coursesColumns] = await connection.execute('DESCRIBE courses');
      console.log('\n📚 Current courses table structure:');
      coursesColumns.forEach(col => {
        console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(nullable)' : '(not null)'} ${col.Default !== null ? `(default: ${col.Default})` : ''}`);
      });
      
      // If the table has different structure, drop and recreate it
      const hasTitle = coursesColumns.some(col => col.Field === 'title');
      if (!hasTitle) {
        console.log('\n⚠️  Courses table has old structure. Recreating...');
        await connection.execute('DROP TABLE IF EXISTS courses');
        console.log('🗑️  Old courses table dropped');
      }
      
    } catch (error) {
      console.log('\n📚 Courses table does not exist yet');
    }
    
    // Check other tables and drop if they have old structure
    const tablesToCheck = ['schedules', 'assignments', 'grades', 'enrollments', 'course_materials'];
    
    for (const tableName of tablesToCheck) {
      try {
        const [columns] = await connection.execute(`DESCRIBE ${tableName}`);
        console.log(`\n📊 Current ${tableName} table structure:`);
        columns.forEach(col => {
          console.log(`   - ${col.Field}: ${col.Type}`);
        });
      } catch (error) {
        console.log(`\n📊 ${tableName} table does not exist yet`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking tables:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkExistingTables();