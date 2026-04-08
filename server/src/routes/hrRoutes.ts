import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import archiver from 'archiver';
import { Parser } from 'json2csv';

dayjs.extend(utc);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://hfaouzlfcmjbfxuuktim.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmYW91emxmY21qYmZ4dXVrdGltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzkwNzg2NywiZXhwIjoyMDg5NDgzODY3fQ.l7aeeJfVcLR_DBmFJCNlQvHoeXQBlx6nHGZp8N_1BdI";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const router = express.Router();

// Middleware to verify HR or Admin role
const requireHRAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
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
    
    const { data: userData, error: userError } = await supabaseAdmin
      .from('forge_users')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();
      
    if (userError || !userData) {
      console.error('HR Auth Error: User not found in forge_users', user.id);
      res.status(403).json({ error: 'Forbidden: User profile not found' });
      return;
    }
      
    if (userData.role !== 'HR' && userData.role !== 'Admin' && userData.role !== 'Executive' && userData.role !== 'Super_User') {
      console.error('HR Auth Error: Insufficient role', userData.role);
      res.status(403).json({ error: 'Forbidden: Requires HR or Admin role' });
      return;
    }
    
    (req as any).user = { ...user, organization_id: userData.organization_id, role: userData.role };
    next();
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const calculateDateRange = (month: number, year: number) => {
  console.log(`[HR] Calculating ledger range for Month: ${month}, Year: ${year}`);
  
  // End: 20th of target month at 23:59:59.999 UTC
  const endDate = dayjs.utc()
    .year(year)
    .month(month - 1)
    .date(20)
    .endOf('day');
  
  // Start: 20th of previous month at 00:00:00.000 UTC
  const startDate = endDate.subtract(1, 'month').startOf('day');
  
  console.log(`[HR] Ledger Range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
  
  return { startDate, endDate };
};

const generateLedgerCSV = (startDate: dayjs.Dayjs, endDate: dayjs.Dayjs, records: any[]) => {
  const fields = ['Date', 'Day', 'Clock In', 'Clock Out', 'Hours Worked', 'Status', 'Location'];
  const json2csvParser = new Parser({ fields });
  
  const ledger = [];
  let current = startDate.clone();
  
  // Group records by date
  const recordsByDate: Record<string, any[]> = {};
  records.forEach(r => {
    const dateKey = dayjs(r.clock_in).format('YYYY-MM-DD');
    if (!recordsByDate[dateKey]) {
      recordsByDate[dateKey] = [];
    }
    recordsByDate[dateKey].push(r);
  });

  while (current.isBefore(endDate) || current.isSame(endDate, 'day')) {
    const dateKey = current.format('YYYY-MM-DD');
    const dayRecords = recordsByDate[dateKey] || [];
    
    let clockInStr = '-';
    let clockOutStr = '-';
    let totalHours = 0;
    let status = 'No Record';
    let location = '-';

    if (dayRecords.length > 0) {
      // Sort records by clock_in
      const sorted = [...dayRecords].sort((a, b) => dayjs(a.clock_in).diff(dayjs(b.clock_in)));
      
      const firstPunch = sorted[0];
      const lastPunch = sorted[sorted.length - 1];
      
      clockInStr = dayjs(firstPunch.clock_in).format('hh:mm A');
      location = firstPunch.is_wfh ? 'WFH' : 'Office';

      if (lastPunch.clock_out) {
        // All records closed (or at least the last one is, which we treat as the day's end)
        clockOutStr = dayjs(lastPunch.clock_out).format('hh:mm A');
        status = 'Complete';
        
        // Calculate total decimal hours for all records in the day
        sorted.forEach(r => {
          if (r.clock_out) {
            const start = dayjs(r.clock_in);
            const end = dayjs(r.clock_out);
            totalHours += end.diff(start, 'hour', true);
          }
        });
      } else {
        // Last punch is null (Active or Incomplete)
        clockOutStr = '-';
        totalHours = 0; // Per directive: Set "Hours Worked" to "0.00"
        
        const hoursOpen = (new Date().getTime() - new Date(lastPunch.clock_in).getTime()) / (1000 * 60 * 60);
        if (hoursOpen > 12) {
          status = 'Incomplete';
        } else {
          status = 'Active Shift';
        }
      }
    }

    ledger.push({
      'Date': dateKey,
      'Day': current.format('dddd'),
      'Clock In': clockInStr,
      'Clock Out': clockOutStr,
      'Hours Worked': totalHours.toFixed(2),
      'Status': status,
      'Location': location
    });

    current = current.add(1, 'day');
  }

  return json2csvParser.parse(ledger);
};

// GET /api/hr/timesheets/bulk
router.get('/timesheets/bulk', requireHRAdmin, async (req, res) => {
  const { month, year } = req.query;
  const hrUser = (req as any).user;

  if (!month || !year) {
    res.status(400).json({ error: 'Month and year are required' });
    return;
  }

  try {
    const { startDate, endDate } = calculateDateRange(Number(month), Number(year));

    // Fetch all users in the organization
    const { data: users, error: usersError } = await supabaseAdmin
      .from('forge_users')
      .select('id, full_name')
      .eq('organization_id', hrUser.organization_id);

    if (usersError) throw usersError;

    const archive = archiver('zip', { zlib: { level: 9 } });
    const fileName = `Timesheets_Bulk_${month}_${year}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    archive.pipe(res);

    let addedFiles = 0;
    for (const user of users || []) {
      const { data: records, error: attError } = await supabaseAdmin
        .from('hr_timesheets')
        .select('*')
        .eq('user_id', user.id)
        .gte('clock_in', startDate.toISOString())
        .lte('clock_in', endDate.toISOString())
        .order('clock_in', { ascending: true });

      if (attError) {
        console.error(`[HR] Bulk Timesheet Fetch Error for user ${user.id}:`, attError);
        continue;
      }

      // For bulk, we generate a ledger for every user, even if they have no records
      const csv = generateLedgerCSV(startDate, endDate, records || []);
      const csvFileName = `Timesheet_${user.full_name.replace(/\s+/g, '_')}_${month}_${year}.csv`;
      archive.append(csv, { name: csvFileName });
      addedFiles++;
    }

    await archive.finalize();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/hr/timesheets/:userId
router.get('/timesheets/:userId', requireHRAdmin, async (req, res) => {
  const { userId } = req.params;
  const { month, year } = req.query;
  const hrUser = (req as any).user;

  console.log(`[HR] Individual Ledger Request - UserID: ${userId}, Month: ${month}, Year: ${year}`);

  if (!month || !year) {
    res.status(400).json({ error: 'Month and year are required' });
    return;
  }

  try {
    const { startDate, endDate } = calculateDateRange(Number(month), Number(year));

    // Fetch user details to verify organization and get name
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('forge_users')
      .select('full_name, organization_id')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('[HR] Fetch User Error:', userError);
      throw new Error(`User not found: ${userError.message}`);
    }
    if (!targetUser) {
      console.error('[HR] Fetch User Error: No user data returned for ID', userId);
      throw new Error('User not found');
    }
    if (targetUser.organization_id !== hrUser.organization_id && hrUser.role !== 'Super_User') {
      res.status(403).json({ error: 'Forbidden: User not in your organization' });
      return;
    }

    const { data: records, error: attError } = await supabaseAdmin
      .from('hr_timesheets')
      .select('*')
      .eq('user_id', userId)
      .gte('clock_in', startDate.toISOString())
      .lte('clock_in', endDate.toISOString())
      .order('clock_in', { ascending: true });

    if (attError) {
      console.error('[HR] Timesheet Fetch Error:', attError);
      throw new Error(`Failed to fetch timesheets: ${attError.message}`);
    }

    console.log(`[HR] DB Records found for user ${userId}:`, records?.length || 0);

    // Generate the full ledger CSV (will include "No Record" rows for missing days)
    const csv = generateLedgerCSV(startDate, endDate, records || []);
    const fileName = `Timesheet_${targetUser.full_name.replace(/\s+/g, '_')}_${month}_${year}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.status(200).send(csv);
  } catch (error: any) {
    console.error('[HR] Timesheet Generation Error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
