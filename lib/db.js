// ============================================================
// DATABASE HELPER — Vercel Postgres
// ============================================================
import { sql } from '@vercel/postgres';

export { sql };

// Safe parameterized query wrapper
export async function query(text, params = []) {
  try {
    const result = await sql.query(text, params);
    return result;
  } catch (err) {
    console.error('DB Error:', err.message);
    throw new Error('Database error');
  }
}

// Get single row
export async function getOne(text, params = []) {
  const result = await query(text, params);
  return result.rows[0] || null;
}

// Get multiple rows
export async function getMany(text, params = []) {
  const result = await query(text, params);
  return result.rows;
}

// Insert and return
export async function insertOne(text, params = []) {
  const result = await query(text + ' RETURNING *', params);
  return result.rows[0];
}
