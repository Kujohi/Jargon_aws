import 'server-only';
import { Pool } from 'pg';

// Create a connection pool to AWS RDS PostgreSQL
const pool = new Pool({
  host: process.env.AWS_RDS_ENDPOINT,
  port: process.env.AWS_RDS_PORT || 5432,
  database: process.env.AWS_RDS_DATABASE,
  user: process.env.AWS_RDS_USERNAME,
  password: process.env.AWS_RDS_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20, // Maximum number of connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Database operation helpers
export const dbClient = {
  // Execute a query
  query: async (text, params = []) => {
    const client = await pool.connect();
    try {
      const result = await client.query(text, params);
      return { data: result.rows, error: null };
    } catch (error) {
      console.error('Database query error:', error);
      return { data: null, error };
    } finally {
      client.release();
    }
  },

  // Helper for SELECT operations
  select: async (table, options = {}) => {
    let query = `SELECT `;
    query += options.select || '*';
    query += ` FROM ${table}`;
    
    const params = [];
    let paramIndex = 1;
    
    if (options.where) {
      const whereConditions = [];
      for (const [key, value] of Object.entries(options.where)) {
        whereConditions.push(`${key} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    
    if (options.orderBy) {
      if (typeof options.orderBy === 'string') {
      query += ` ORDER BY ${options.orderBy}`;
      } else if (typeof options.orderBy === 'object') {
        const orderClauses = Object.entries(options.orderBy).map(
          ([column, direction]) => `${column} ${direction.toUpperCase()}`
        );
        query += ` ORDER BY ${orderClauses.join(', ')}`;
      }
    }
    
    if (options.limit) {
      query += ` LIMIT ${options.limit}`;
    }
    
    return await dbClient.query(query, params);
  },

  // Helper for INSERT operations
  insert: async (table, data, options = {}) => {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, index) => `$${index + 1}`);
    
    let query = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders.join(', ')})`;
    
    if (options.returning) {
      query += ` RETURNING ${options.returning}`;
    }
    
    return await dbClient.query(query, values);
  },

  // Helper for UPDATE operations
  update: async (table, data, where, options = {}) => {
    const setClause = [];
    const params = [];
    let paramIndex = 1;
    
    for (const [key, value] of Object.entries(data)) {
      setClause.push(`${key} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }
    
    const whereConditions = [];
    for (const [key, value] of Object.entries(where)) {
      whereConditions.push(`${key} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }
    
    let query = `UPDATE ${table} SET ${setClause.join(', ')} WHERE ${whereConditions.join(' AND ')}`;
    
    if (options.returning) {
      query += ` RETURNING ${options.returning}`;
    }
    
    return await dbClient.query(query, params);
  },

  // Helper for DELETE operations
  delete: async (table, where) => {
    const whereConditions = [];
    const params = [];
    let paramIndex = 1;
    
    for (const [key, value] of Object.entries(where)) {
      whereConditions.push(`${key} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }
    
    const query = `DELETE FROM ${table} WHERE ${whereConditions.join(' AND ')}`;
    return await dbClient.query(query, params);
  },

  // RPC function call
  rpc: async (functionName, params = {}) => {
    const paramKeys = Object.keys(params);
    const paramValues = Object.values(params);
    const paramPlaceholders = paramValues.map((_, index) => `$${index + 1}`);
    
    let query = `SELECT ${functionName}(`;
    if (paramKeys.length > 0) {
      query += paramPlaceholders.join(', ');
    }
    query += ')';
    
    return await dbClient.query(query, paramValues);
  }
};

// Test connection on startup
pool.on('connect', () => {
  console.log('Connected to AWS RDS PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('AWS RDS connection error:', err);
});

export default dbClient; 