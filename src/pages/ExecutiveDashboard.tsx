import { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, Users, Clock, CheckCircle, ChevronDown, ChevronRight, 
  RefreshCw, Download, Filter, Calendar
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import dayjs from 'dayjs';

export default function ExecutiveDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const response = await fetch('/api/exec/analytics', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to fetch analytics');
      }

      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err: any) {
      console.error('Analytics Fetch Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) return <div>Loading Analytics...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data) return <div>No data available</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Executive Analytics (Debug Mode)</h1>
      <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-[500px]">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
