import { Client } from 'pg';

const connectionString = 'postgresql://postgres:Blu3L@g00n0101@db.hfaouzlfcmjbfxuuktim.supabase.co:5432/postgres';

async function createSuperUser() {
  const client = new Client({
    connectionString,
  });

  try {
    await client.connect();
    
    // Check if user exists
    const checkRes = await client.query("SELECT id FROM auth.users WHERE email = 'mattcoombes247@gmail.com'");
    let userId;
    
    if (checkRes.rows.length > 0) {
      userId = checkRes.rows[0].id;
      console.log('User already exists in auth.users:', userId);
    } else {
      // Insert into auth.users
      const insertRes = await client.query(`
        INSERT INTO auth.users (
          instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change
        ) VALUES (
          '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'mattcoombes247@gmail.com', crypt('Password123!', gen_salt('bf')), now(), now(), now(), '', '', '', ''
        ) RETURNING id;
      `);
      userId = insertRes.rows[0].id;
      console.log('Created user in auth.users:', userId);
    }

    // Check if user exists in forge_users
    const checkForgeRes = await client.query(`SELECT id FROM forge_users WHERE id = $1`, [userId]);
    
    if (checkForgeRes.rows.length === 0) {
      // Insert into forge_users
      await client.query(`
        INSERT INTO forge_users (id, full_name, role)
        VALUES ($1, 'Matt Coombes', 'Super_User')
      `, [userId]);
      console.log('Created user in forge_users as Super_User');
    } else {
      // Update role to Super_User
      await client.query(`
        UPDATE forge_users SET role = 'Super_User' WHERE id = $1
      `, [userId]);
      console.log('Updated user in forge_users to Super_User');
    }

  } catch (err) {
    console.error('Error creating super user', err);
  } finally {
    await client.end();
  }
}

createSuperUser();
