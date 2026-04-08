import { Client } from 'pg';

const connectionString = 'postgresql://postgres:Blu3L@g00n0101@db.hfaouzlfcmjbfxuuktim.supabase.co:5432/postgres';

const schema = `
-- Drop existing tables if they exist
DROP TABLE IF EXISTS it_assets CASCADE;
DROP TABLE IF EXISTS hr_timesheets CASCADE;
DROP TABLE IF EXISTS forge_tickets CASCADE;
DROP TABLE IF EXISTS help_desk_tickets CASCADE;
DROP TABLE IF EXISTS forge_tasks CASCADE;
DROP TABLE IF EXISTS forge_users CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- Create Organizations Table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Teams Table
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Users Table (extends Supabase Auth)
CREATE TABLE forge_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Super_User', 'Admin', 'HR', 'Executive', 'IT_Tech', 'User')),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  hourly_rate NUMERIC DEFAULT 0,
  work_status TEXT DEFAULT 'Offline' CHECK (work_status IN ('Online', 'Offline')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create IT Assets Table
CREATE TABLE it_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Staff Laptops', 'Student Laptops', 'Tech/Printers', 'Monitors/TVs', 'Security', 'Networking', 'Furniture')),
  serial_number TEXT NOT NULL,
  assigned_to TEXT,
  status TEXT NOT NULL CHECK (status IN ('Active', 'In Storage', 'Decommissioned')),
  purchase_price NUMERIC DEFAULT 0,
  notes TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create HR Timesheets Table
CREATE TABLE hr_timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES forge_users(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  clock_in TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  clock_out TIMESTAMP WITH TIME ZONE,
  is_wfh BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Tasks Table
CREATE TABLE forge_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('To Do', 'In Progress', 'Review', 'Done')),
  priority TEXT NOT NULL CHECK (priority IN ('Low', 'Normal', 'High', 'Critical')),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES forge_users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES forge_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create IT Support Tickets Table
CREATE TABLE help_desk_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('Pending', 'Open', 'In Progress', 'Resolved')),
  priority TEXT NOT NULL CHECK (priority IN ('Low', 'Normal', 'High', 'Critical')),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES forge_users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES forge_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE forge_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE it_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE forge_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_desk_tickets ENABLE ROW LEVEL SECURITY;

-- Create Policies (Simplified for this example, assuming backend handles most logic)
CREATE POLICY "Allow all access to authenticated users" ON organizations FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all access to authenticated users" ON teams FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all access to authenticated users" ON forge_users FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all access to authenticated users" ON it_assets FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all access to authenticated users" ON hr_timesheets FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all access to authenticated users" ON forge_tasks FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all access to authenticated users" ON help_desk_tickets FOR ALL USING (auth.role() = 'authenticated');
`;

async function applySchema() {
  const client = new Client({
    connectionString,
  });

  try {
    await client.connect();
    console.log('Connected to database');
    await client.query(schema);
    console.log('Schema applied successfully');
  } catch (err) {
    console.error('Error applying schema', err);
  } finally {
    await client.end();
  }
}

applySchema();
