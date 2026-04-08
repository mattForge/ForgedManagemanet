import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import dayjs from 'dayjs';
import hrRoutes from './server/src/routes/hrRoutes.ts';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://hfaouzlfcmjbfxuuktim.supabase.co";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmYW91emxmY21qYmZ4dXVrdGltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MDc4NjcsImV4cCI6MjA4OTQ4Mzg2N30.AeJRTIfYYVqTzxx-6Mkp2UXlzDirghXZ9eKCXrxgrXY";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmYW91emxmY21qYmZ4dXVrdGltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzkwNzg2NywiZXhwIjoyMDg5NDgzODY3fQ.l7aeeJfVcLR_DBmFJCNlQvHoeXQBlx6nHGZp8N_1BdI";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());
  app.use(cors());

  // HR Routes
  app.use('/api/hr', hrRoutes);

  // Middleware for Super User routes
  const requireSuperUser = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        res.status(401).json({ error: 'Unauthorized: No token' });
        return;
      }
      
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !user) {
        res.status(401).json({ error: 'Unauthorized: Invalid token' });
        return;
      }
      
      const { data: userData } = await supabaseAdmin
        .from('forge_users')
        .select('role')
        .eq('id', user.id)
        .single();
        
      if (userData?.role !== 'Super_User') {
        res.status(403).json({ error: 'Forbidden: Requires Super_User role' });
        return;
      }
      
      next();
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };

  // Strict Server-Side Auth & Routing Bridge
  app.post('/api/auth/verify', async (req, res) => {
    const { access_token } = req.body;
    if (!access_token) {
      res.status(401).json({ error: 'No access token provided' });
      return;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${access_token}` } }
    });

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw authError;

      const { data: userData, error: userError } = await supabase
        .from('forge_users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;

      const role = userData?.role;
      let redirectPath = '/workspace';

      if (role === 'Super_User') {
        redirectPath = '/platform-admin';
      } else if (role === 'HR') {
        redirectPath = '/workspace';
      } else if (role === 'Admin' || role === 'Executive') {
        redirectPath = '/workspace-admin';
      }

      res.json({ redirectPath, role });
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  });

  // --- ADMIN API ROUTES ---
  
  // Create Admin User
  app.post('/api/admin/users', requireSuperUser, async (req, res) => {
    const { email, password, full_name, organization_id, role } = req.body;
    
    try {
      // 1. Create auth user via Admin API
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });
      
      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      // 2. Create forge_user record
      const { error: dbError } = await supabaseAdmin.from('forge_users').insert({
        id: authData.user.id,
        full_name,
        organization_id: organization_id || null,
        role: role || 'Admin'
      });
      
      if (dbError) {
        // Rollback auth user if db insert fails
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw dbError;
      }

      res.json({ message: 'User created successfully', user: authData.user });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete Admin User
  app.delete('/api/admin/users/:id', requireSuperUser, async (req, res) => {
    const { id } = req.params;
    try {
      // Deleting from auth.users will cascade to forge_users based on our schema
      const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
      if (error) throw error;
      res.json({ message: 'User deleted successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // --- WORKSPACE ADMIN API ROUTES ---
  
  const requireWorkspaceAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        res.status(401).json({ error: 'Unauthorized: No token' });
        return;
      }
      
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !user) {
        res.status(401).json({ error: 'Unauthorized: Invalid token' });
        return;
      }
      
      const { data: userData } = await supabaseAdmin
        .from('forge_users')
        .select('role, organization_id')
        .eq('id', user.id)
        .single();
        
      if (userData?.role !== 'Admin') {
        res.status(403).json({ error: 'Forbidden: Requires Admin role' });
        return;
      }
      
      (req as any).user = { ...user, organization_id: userData.organization_id };
      next();
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };

  app.post('/api/workspace/users', requireWorkspaceAdmin, async (req, res) => {
    const { email, password, full_name, role, team_id, hourly_rate } = req.body;
    const adminUser = (req as any).user;

    if (['Super_User', 'Admin'].includes(role)) {
       res.status(403).json({ error: 'Cannot provision Super_User or Admin roles from this endpoint' });
       return;
    }

    try {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      const { error: dbError } = await supabaseAdmin
        .from('forge_users')
        .insert({
          id: authData.user.id,
          full_name,
          role,
          organization_id: adminUser.organization_id,
          team_id: team_id || null,
          hourly_rate: hourly_rate || 0
        });

      if (dbError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw dbError;
      }

      res.json({ message: 'User provisioned successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/workspace/users/:id', requireWorkspaceAdmin, async (req, res) => {
    const { id } = req.params;
    const adminUser = (req as any).user;

    try {
      const { data: targetUser } = await supabaseAdmin
        .from('forge_users')
        .select('organization_id, role')
        .eq('id', id)
        .single();

      if (!targetUser || targetUser.organization_id !== adminUser.organization_id) {
        res.status(403).json({ error: 'Forbidden: User not in your organization' });
        return;
      }
      
      if (targetUser.role === 'Super_User' || targetUser.role === 'Admin') {
        res.status(403).json({ error: 'Forbidden: Cannot delete Super_User or Admin' });
        return;
      }

      const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
      if (error) throw error;

      res.json({ message: 'User terminated successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // --- ATTENDANCE API ROUTES ---
  const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        res.status(401).json({ error: 'Unauthorized: No token' });
        return;
      }
      
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !user) {
        res.status(401).json({ error: 'Unauthorized: Invalid token' });
        return;
      }
      
      const { data: userData } = await supabaseAdmin
        .from('forge_users')
        .select('organization_id, role')
        .eq('id', user.id)
        .single();
        
      (req as any).user = { ...user, organization_id: userData?.organization_id, role: userData?.role };
      next();
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };

  const requireITAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    await requireAuth(req, res, () => {
      const user = (req as any).user;
      if (!['IT_Tech', 'Executive', 'Admin'].includes(user.role)) {
        res.status(403).json({ error: 'Forbidden: Requires IT Tech, Executive, or Admin role' });
        return;
      }
      next();
    });
  };

  // --- IT ASSET API ROUTES ---
  app.get('/api/assets', requireITAdmin, async (req, res) => {
    const user = (req as any).user;
    try {
      const { data, error } = await supabaseAdmin
        .from('it_assets')
        .select('*')
        .eq('organization_id', user.organization_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // --- NETWORK DISCOVERY API ---
  app.post('/api/network/ingest', async (req, res) => {
    const apiKey = req.headers['x-api-key'];
    const PROBE_KEY = process.env.FORGE_PROBE_API_KEY || 'forge_discovery_secret_2026';

    if (apiKey !== PROBE_KEY) {
      console.warn("--> UNAUTHORIZED PROBE ATTEMPT");
      return res.status(401).json({ error: 'Unauthorized: Invalid Probe API Key' });
    }

    const { devices, organization_id } = req.body;
    if (!devices || !Array.isArray(devices) || !organization_id) {
      return res.status(400).json({ error: 'Invalid payload: devices array and organization_id required' });
    }

    console.log(`--> RECEIVED NETWORK SCAN FROM ORG: ${organization_id} (${devices.length} devices)`);

    try {
      for (const device of devices) {
        const { ip, mac, hostname, vendor } = device;
        if (!mac) continue;

        // 1. Check if it matches an existing IT Asset
        const { data: existingAsset } = await supabaseAdmin
          .from('it_assets')
          .select('id')
          .eq('mac_address', mac)
          .eq('organization_id', organization_id)
          .maybeSingle();

        if (existingAsset) {
          // Update last seen and IP on managed asset
          await supabaseAdmin
            .from('it_assets')
            .update({ 
              last_seen: new Date().toISOString(),
              ip_address: ip,
              hostname: hostname || undefined
            })
            .eq('id', existingAsset.id);
        }

        // 2. Upsert into network_devices table for discovery tracking
        const { error: upsertError } = await supabaseAdmin
          .from('network_devices')
          .upsert({
            mac_address: mac,
            organization_id,
            ip_address: ip,
            hostname: hostname || 'Unknown',
            vendor: vendor || 'Unknown',
            last_seen: new Date().toISOString(),
            status: existingAsset ? 'Managed' : 'Unmanaged'
          }, { onConflict: 'mac_address, organization_id' });

        if (upsertError) console.error("!!! NETWORK UPSERT ERROR !!!", upsertError);
      }

      res.json({ message: 'Ingest complete', count: devices.length });
    } catch (error: any) {
      console.error("!!! NETWORK INGEST EXCEPTION !!!", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/assets', requireITAdmin, async (req, res) => {
    const user = (req as any).user;
    const assetData = req.body;
    try {
      const { data, error } = await supabaseAdmin
        .from('it_assets')
        .insert([{ ...assetData, organization_id: user.organization_id }])
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put('/api/assets/:id', requireITAdmin, async (req, res) => {
    const { id } = req.params;
    const assetData = req.body;
    try {
      const { data, error } = await supabaseAdmin
        .from('it_assets')
        .update(assetData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/assets/:id', requireITAdmin, async (req, res) => {
    const { id } = req.params;
    try {
      const { error } = await supabaseAdmin
        .from('it_assets')
        .delete()
        .eq('id', id);

      if (error) throw error;
      res.json({ message: 'Asset deleted successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/attendance/status', requireAuth, async (req, res) => {
    const user = (req as any).user;
    console.log("--> STATUS CHECK BY USER:", user.id);

    try {
      const { data: activeRecord, error } = await supabaseAdmin
        .from('hr_timesheets')
        .select('clock_in')
        .eq('user_id', user.id)
        .is('clock_out', null)
        .order('clock_in', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("!!! STATUS FETCH ERROR !!!", error);
        throw error;
      }

      if (activeRecord) {
        console.log("--> ACTIVE SHIFT FOUND:", activeRecord.clock_in);
        res.json({
          isClockedIn: true,
          clockInTime: activeRecord.clock_in
        });
      } else {
        console.log("--> NO ACTIVE SHIFT FOUND");
        res.json({ isClockedIn: false, clockInTime: null });
      }
    } catch (error: any) {
      console.error("!!! STATUS ROUTE EXCEPTION !!!", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/attendance/clock-in', requireAuth, async (req, res) => {
    const { is_wfh } = req.body;
    const authUser = (req as any).user;
    console.log("--> CLOCK IN ATTEMPT BY USER:", authUser.id);

    try {
      // CRITICAL: Query forge_users to get organization_id
      const { data: userData, error: userError } = await supabaseAdmin
        .from('forge_users')
        .select('organization_id')
        .eq('id', authUser.id)
        .single();

      if (userError || !userData?.organization_id) {
        console.error("!!! ORG ID FETCH ERROR !!!", userError || "No org ID found");
        throw new Error('User organization profile not found. Please contact admin.');
      }

      console.log("--> ORG ID FOUND:", userData.organization_id);

      // Check for existing open record
      const { data: existing, error: checkError } = await supabaseAdmin
        .from('hr_timesheets')
        .select('id')
        .eq('user_id', authUser.id)
        .is('clock_out', null)
        .limit(1);

      if (checkError) {
        console.error("!!! DUPLICATE CHECK ERROR !!!", checkError);
        throw checkError;
      }
      
      if (existing && existing.length > 0) {
        console.warn("--> USER ALREADY CLOCKED IN");
        throw new Error('You are already clocked in.');
      }

      const clockInTime = new Date().toISOString();

      const { data: attendance, error: attError } = await supabaseAdmin
        .from('hr_timesheets')
        .insert({
          user_id: authUser.id,
          organization_id: userData.organization_id,
          is_wfh: is_wfh || false,
          clock_in: clockInTime
        })
        .select()
        .single();

      if (attError) {
        console.error("!!! SUPABASE INSERT ERROR !!!", attError);
        throw attError;
      }

      console.log("--> INSERT SUCCESSFUL:", attendance.id);

      const { error: userUpdateError } = await supabaseAdmin
        .from('forge_users')
        .update({ work_status: 'Online' })
        .eq('id', authUser.id);

      if (userUpdateError) {
        console.error("!!! USER STATUS UPDATE ERROR !!!", userUpdateError);
        throw userUpdateError;
      }

      res.json({ 
        message: 'Clocked in successfully', 
        clockInTime: attendance.clock_in 
      });
    } catch (error: any) {
      console.error("!!! CLOCK-IN ROUTE EXCEPTION !!!", error);
      res.status(400).json({ error: error.message });
    }
  });

  // --- TICKETS API ROUTES ---
  const requireExecAccess = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    await requireAuth(req, res, () => {
      const user = (req as any).user;
      if (!['Executive', 'Admin', 'Super_User'].includes(user.role)) {
        res.status(403).json({ error: 'Forbidden: Requires Executive, Admin, or Super_User role' });
        return;
      }
      next();
    });
  };

  // --- EXECUTIVE ANALYTICS API ---
  app.get('/api/exec/analytics', requireExecAccess, async (req, res) => {
    const user = (req as any).user;
    const orgId = user.organization_id;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    try {
      // 1. Fetch all required data in parallel
      const [
        { data: users },
        { data: teams },
        { data: timesheets },
        { data: tasks },
        { data: tickets }
      ] = await Promise.all([
        supabaseAdmin.from('forge_users').select('id, full_name, team_id, role').eq('organization_id', orgId),
        supabaseAdmin.from('teams').select('id, name').eq('organization_id', orgId),
        supabaseAdmin.from('hr_timesheets').select('*').eq('organization_id', orgId).gte('clock_in', thirtyDaysAgo.toISOString()),
        supabaseAdmin.from('forge_tasks').select('*').eq('organization_id', orgId).gte('created_at', thirtyDaysAgo.toISOString()),
        supabaseAdmin.from('help_desk_tickets').select('*').eq('organization_id', orgId).gte('created_at', thirtyDaysAgo.toISOString())
      ]);

      if (!users || !teams) throw new Error('Failed to fetch base data');

      // 2. Process Organizational Stats
      const totalHours = timesheets?.reduce((acc, ts) => {
        if (ts.clock_out) {
          const start = new Date(ts.clock_in).getTime();
          const end = new Date(ts.clock_out).getTime();
          return acc + (end - start) / (1000 * 60 * 60);
        }
        return acc;
      }, 0) || 0;

      const completedTasks = tasks?.filter(t => t.status === 'Done').length || 0;
      const resolvedTickets = tickets?.filter(t => t.status === 'Resolved').length || 0;
      const activeUsers = users.length;

      const orgStats = {
        totalHours: Math.round(totalHours),
        completedTasks,
        resolvedTickets,
        activeUsers,
        productivityTrend: 12 // Mock trend for now
      };

      // 3. Process Team Stats
      const teamStats = teams.map(team => {
        const teamUsers = users.filter(u => u.team_id === team.id);
        const teamUserIds = teamUsers.map(u => u.id);
        
        const teamTimesheets = timesheets?.filter(ts => teamUserIds.includes(ts.user_id)) || [];
        const teamTasks = tasks?.filter(t => teamUserIds.includes(t.assigned_to || '')) || [];
        
        const teamHours = teamTimesheets.reduce((acc, ts) => {
          if (ts.clock_out) {
            const start = new Date(ts.clock_in).getTime();
            const end = new Date(ts.clock_out).getTime();
            return acc + (end - start) / (1000 * 60 * 60);
          }
          return acc;
        }, 0);

        return {
          id: team.id,
          name: team.name,
          totalHours: Math.round(teamHours),
          tasksCompleted: teamTasks.filter(t => t.status === 'Done').length,
          memberCount: teamUsers.length
        };
      });

      // 4. Process Employee Stats
      const employeeStats = users.map(u => {
        const userTimesheets = timesheets?.filter(ts => ts.user_id === u.id) || [];
        const userTasks = tasks?.filter(t => t.assigned_to === u.id) || [];
        
        const userHours = userTimesheets.reduce((acc, ts) => {
          if (ts.clock_out) {
            const start = new Date(ts.clock_in).getTime();
            const end = new Date(ts.clock_out).getTime();
            return acc + (end - start) / (1000 * 60 * 60);
          }
          return acc;
        }, 0);

        const teamName = teams.find(t => t.id === u.team_id)?.name || 'Unassigned';

        return {
          id: u.id,
          name: u.full_name,
          team: teamName,
          teamId: u.team_id,
          hours: Math.round(userHours * 10) / 10,
          tasksDone: userTasks.filter(t => t.status === 'Done').length,
          role: u.role
        };
      });

      // 5. Daily Output (Last 7 Days)
      const dailyOutput = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayTasks = tasks?.filter(t => t.status === 'Done' && t.created_at.startsWith(dateStr)).length || 0;
        const dayTickets = tickets?.filter(t => t.status === 'Resolved' && t.created_at.startsWith(dateStr)).length || 0;
        
        dailyOutput.push({
          date: dayjs(dateStr).format('MMM DD'),
          output: dayTasks + dayTickets
        });
      }

      res.json({
        orgStats,
        teamStats,
        employeeStats,
        dailyOutput
      });
    } catch (error: any) {
      console.error("!!! EXEC ANALYTICS ERROR !!!", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/tickets', requireAuth, async (req, res) => {
    const user = (req as any).user;
    try {
      // 1. Query forge_users for role and organization_id
      const { data: userData, error: userError } = await supabaseAdmin
        .from('forge_users')
        .select('role, organization_id')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;

      const role = userData?.role;
      const orgId = userData?.organization_id;

      let query = supabaseAdmin
        .from('help_desk_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      // 2. Apply role-based filtering
      if (role === 'IT_Tech' || role === 'Admin' || role === 'Super_User') {
        // IT_Tech: Query Supabase for all tickets where organization_id matches
        query = query.eq('organization_id', orgId);
      } else {
        // Standard User: Query Supabase for tickets where created_by matches
        query = query.eq('created_by', user.id);
      }

      const { data: tickets, error } = await query;
      if (error) throw error;

      // 3. Fetch users for mapping names
      const { data: users } = await supabaseAdmin
        .from('forge_users')
        .select('id, full_name')
        .eq('organization_id', orgId);
        
      const userMap = users?.reduce((acc: any, u: any) => ({...acc, [u.id]: u.full_name}), {}) || {};
      
      const enrichedTickets = tickets.map(t => ({
        ...t,
        creator_name: userMap[t.created_by] || 'Unknown',
        assignee_name: t.assigned_to ? userMap[t.assigned_to] : 'Unassigned'
      }));

      // 4. Return JSON array
      res.json({ tickets: enrichedTickets });
    } catch (error: any) {
      console.error('Error fetching tickets:', error);
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/tickets', requireAuth, async (req, res) => {
    const user = (req as any).user;
    const { title, description, priority } = req.body;

    try {
      const { data: ticket, error } = await supabaseAdmin
        .from('help_desk_tickets')
        .insert({
          organization_id: user.organization_id,
          created_by: user.id,
          title,
          description,
          priority: priority || 'Normal',
          status: 'Pending'
        })
        .select()
        .single();

      if (error) throw error;
      res.json({ ticket });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch('/api/tickets/:id', requireAuth, async (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;
    const { status, assigned_to } = req.body;

    try {
      const { data: userData } = await supabaseAdmin
        .from('forge_users')
        .select('role')
        .eq('id', user.id)
        .single();

      const role = userData?.role;
      if (role !== 'IT_Tech' && role !== 'Admin' && role !== 'Super_User') {
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      }

      const updates: any = {};
      if (status) updates.status = status;
      if (assigned_to !== undefined) updates.assigned_to = assigned_to;

      const { data: ticket, error } = await supabaseAdmin
        .from('help_desk_tickets')
        .update(updates)
        .eq('id', id)
        .eq('organization_id', user.organization_id)
        .select()
        .single();

      if (error) throw error;
      res.json({ ticket });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/org/it-techs', requireAuth, async (req, res) => {
    const user = (req as any).user;
    try {
      if (!user.organization_id) {
        return res.status(400).json({ error: 'User does not belong to an organization' });
      }

      const { data: techs, error } = await supabaseAdmin
        .from('forge_users')
        .select('id, full_name')
        .eq('organization_id', user.organization_id)
        .in('role', ['IT_Tech', 'Admin', 'Super_User']);

      if (error) throw error;
      res.json({ techs });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/directory/search', requireAuth, async (req, res) => {
    const user = (req as any).user;
    const { q } = req.query;

    try {
      if (!user.organization_id) {
         res.status(400).json({ error: 'User does not belong to an organization' });
         return;
      }

      let query = supabaseAdmin
        .from('forge_users')
        .select('id, full_name, role, work_status')
        .eq('organization_id', user.organization_id)
        .neq('id', user.id); // Exclude self

      if (q && typeof q === 'string') {
        query = query.or(`full_name.ilike.%${q}%,role.ilike.%${q}%`);
      }

      const { data: users, error } = await query.order('full_name');

      if (error) throw error;

      res.json({ users });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/directory/active-chats', requireAuth, async (req, res) => {
    const user = (req as any).user;

    try {
      if (!user.organization_id) {
         res.status(400).json({ error: 'User does not belong to an organization' });
         return;
      }

      // 1. Find all distinct users the current user has interacted with
      const { data: messages, error: msgError } = await supabaseAdmin
        .from('direct_messages')
        .select('sender_id, receiver_id')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('organization_id', user.organization_id);

      if (msgError) throw msgError;

      const interactedUserIds = new Set<string>();
      messages?.forEach(msg => {
        if (msg.sender_id !== user.id) interactedUserIds.add(msg.sender_id);
        if (msg.receiver_id !== user.id) interactedUserIds.add(msg.receiver_id);
      });

      if (interactedUserIds.size === 0) {
        res.json({ users: [] });
        return;
      }

      // 2. Fetch user details for those IDs
      const { data: users, error: userError } = await supabaseAdmin
        .from('forge_users')
        .select('id, full_name, role, work_status')
        .in('id', Array.from(interactedUserIds))
        .eq('organization_id', user.organization_id);

      if (userError) throw userError;

      res.json({ users });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/attendance/clock-out', requireAuth, async (req, res) => {
    const user = (req as any).user;

    try {
      const { data: activeRecord, error: findError } = await supabaseAdmin
        .from('hr_timesheets')
        .select('id')
        .eq('user_id', user.id)
        .is('clock_out', null)
        .order('clock_in', { ascending: false })
        .limit(1)
        .single();

      if (findError) {
        if (findError.code === 'PGRST116') {
          res.status(400).json({ error: 'No active clock-in record found' });
          return;
        }
        throw findError;
      }

      const { error: attError } = await supabaseAdmin
        .from('hr_timesheets')
        .update({ clock_out: new Date().toISOString() })
        .eq('id', activeRecord.id);

      if (attError) throw attError;

      const { error: userError } = await supabaseAdmin
        .from('forge_users')
        .update({ work_status: 'Offline' })
        .eq('id', user.id);

      if (userError) throw userError;

      res.json({ message: 'Clocked out successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
