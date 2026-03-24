import { Client } from 'pg';

const connectionString = 'postgresql://postgres:Blu3L@g00n0101@db.hfaouzlfcmjbfxuuktim.supabase.co:5432/postgres';

async function getJwtSecret() {
  const client = new Client({
    connectionString,
  });

  try {
    await client.connect();
    const res = await client.query("SHOW app.settings.jwt_secret");
    console.log('JWT Secret:', res.rows[0]);
  } catch (err) {
    console.error('Error getting JWT secret', err);
  } finally {
    await client.end();
  }
}

getJwtSecret();
