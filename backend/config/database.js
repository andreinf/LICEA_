const mysql = require('mysql2/promise');
require('dotenv').config();

// Database connection configuration using Railway environment variables
const dbConfig = {
  host: process.env.MYSQLHOST,           // Host proporcionado por Railway
  port: Number(process.env.MYSQLPORT),   // Puerto proporcionado por Railway (3306)
  user: process.env.MYSQLUSER,           // Usuario de la DB
  password: process.env.MYSQLPASSWORD,   // Contraseña de la DB
  database: process.env.MYSQLDATABASE,   // Nombre de la DB
  connectionLimit: 10,
  charset: 'utf8mb4',
  idleTimeout: 60000,
  queueLimit: 0
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('DB Config used:', dbConfig); // Debug info
    process.exit(1);
  }
}

// Execute query with error handling
async function executeQuery(sql, params = []) {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('Database query error:', error.message);
    throw error;
  }
}

// Execute transaction
async function executeTransaction(queries) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const results = [];
    for (const { sql, params } of queries) {
      const [result] = await connection.execute(sql, params || []);
      results.push(result);
    }

    await connection.commit();
    return results;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Get paginated results
async function getPaginatedResults(baseQuery, countQuery, params = [], page = 1, limit = 10) {
  const offset = (page - 1) * limit;

  // Get total count
  const [countResult] = await pool.execute(countQuery, params);
  const total = countResult[0].count;

  // Get paginated data
  const paginatedQuery = `${baseQuery} LIMIT ${limit} OFFSET ${offset}`;
  const [rows] = await pool.execute(paginatedQuery, params);

  return {
    data: rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  };
}

module.exports = {
  pool,
  testConnection,
  executeQuery,
  executeTransaction,
  getPaginatedResults
};
