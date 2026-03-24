import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import hrRoutes from './server/src/routes/hrRoutes.js';

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
        .select('organization_id')
        .eq('id', user.id)
        .single();
        
      (req as any).user = { ...user, organization_id: userData?.organization_id };
      next();
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };

  app.get('/api/attendance/status', requireAuth, async (req, res) => {
    const user = (req as any).user;

    try {
      const { data: activeRecord, error } = await supabaseAdmin
        .from('attendance')
        .select('id, clock_in, is_wfh')
        .eq('user_id', user.id)
        .is('clock_out', null)
        .order('clock_in', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (activeRecord) {
        res.json({
          isClockedIn: true,
          recordId: activeRecord.id,
          clockInTime: activeRecord.clock_in,
          isWfh: activeRecord.is_wfh
        });
      } else {
        res.json({ isClockedIn: false });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/attendance/clock-in', requireAuth, async (req, res) => {
    const { is_wfh } = req.body;
    const user = (req as any).user;

    try {
      if (!user.organization_id) {
         res.status(400).json({ error: 'User does not belong to an organization' });
         return;
      }

      // Check for existing open record
      const { data: existing, error: checkError } = await supabaseAdmin
        .from('attendance')
        .select('id')
        .eq('user_id', user.id)
        .is('clock_out', null)
        .limit(1);

      if (checkError) throw checkError;
      if (existing && existing.length > 0) {
        res.status(400).json({ error: 'User is already clocked in' });
        return;
      }

      const { data: attendance, error: attError } = await supabaseAdmin
        .from('attendance')
        .insert({
          user_id: user.id,
          organization_id: user.organization_id,
          is_wfh: is_wfh || false,
          clock_in: new Date().toISOString()
        })
        .select()
        .single();

      if (attError) throw attError;

      const { error: userError } = await supabaseAdmin
        .from('forge_users')
        .update({ work_status: 'Online' })
        .eq('id', user.id);

      if (userError) throw userError;

      res.json({ message: 'Clocked in successfully', attendance });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // --- TICKETS API ROUTES ---
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
        .from('attendance')
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
        .from('attendance')
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
