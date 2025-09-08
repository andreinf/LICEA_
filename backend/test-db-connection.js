const mysql = require('mysql2/promise');
require('dotenv').config();

async function testConnection() {
  try {
    console.log('🔗 Intentando conectar con MySQL...');
    console.log(`Host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`Port: ${process.env.DB_PORT || 3306}`);
    console.log(`User: ${process.env.DB_USER || 'root'}`);
    
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      connectTimeout: 30000,
      acquireTimeout: 30000,
      timeout: 30000
    });
    
    console.log('✅ Conexión exitosa con MySQL');
    
    // Probar una consulta simple
    const [rows] = await connection.execute('SELECT VERSION() as version, NOW() as time');
    console.log('📊 Información del servidor:', rows[0]);
    
    // Mostrar bases de datos existentes
    const [databases] = await connection.execute('SHOW DATABASES');
    console.log('📁 Bases de datos disponibles:');
    databases.forEach(db => console.log(`  - ${db.Database}`));
    
    await connection.end();
    console.log('✅ Prueba de conexión completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    console.error('Stack:', error.stack);
  }
}

testConnection();
