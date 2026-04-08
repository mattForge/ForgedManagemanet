import { Client } from 'pg';

const connectionString = 'postgresql://postgres:Blu3L@g00n0101@db.hfaouzlfcmjbfxuuktim.supabase.co:5432/postgres';

async function addEmployeeCode() {
  const client = new Client({
    connectionString,
  });

  try {
    await client.connect();
    console.log('Connected to database');
    await client.query('ALTER TABLE forge_users ADD COLUMN IF NOT EXISTS employee_code TEXT;');
    console.log('Column employee_code added successfully');
  } catch (err) {
    console.error('Error adding column', err);
  } finally {
    await client.end();
  }
}

addEmployeeCode();
