import { Client } from 'pg';

const connectionString = 'postgresql://postgres:Blu3L@g00n0101@db.hfaouzlfcmjbfxuuktim.supabase.co:5432/postgres';

async function querySecrets() {
  const client = new Client({
    connectionString,
  });

  try {
    await client.connect();
    
    // Check if there are any tables that might contain the JWT secret
    const res = await client.query(`
      SELECT name, setting FROM pg_settings WHERE name LIKE '%jwt%' OR name LIKE '%secret%';
    `);
    console.log('Settings:', res.rows);

  } catch (err) {
    console.error('Error querying secrets', err);
  } finally {
    await client.end();
  }
}

querySecrets();
