import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Power, Home, Clock, MapPin, AlertCircle } from 'lucide-react';
import dayjs from 'dayjs';

export default function ClockInOutWidget() {
  const [isOnline, setIsOnline] = useState(false);
  const [isWfh, setIsWfh] = useState(false);
  const [clockInTime, setClockInTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      console.log("--> FETCHING ATTENDANCE STATUS...");
      const response = await fetch('/api/attendance/status', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();
      if (response.ok) {
        console.log("--> STATUS RECEIVED:", data);
        if (data.isClockedIn) {
          setIsOnline(true);
          setClockInTime(data.clockInTime);
        } else {
          setIsOnline(false);
          setClockInTime(null);
        }
      } else {
        console.error("--> STATUS API ERROR:", data);
      }
    } catch (err: any) {
      console.error('WIDGET STATUS FETCH ERROR:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const endpoint = isOnline ? '/api/attendance/clock-out' : '/api/attendance/clock-in';
      const body = isOnline ? {} : { is_wfh: isWfh };

      console.log(`--> ATTEMPTING ${isOnline ? 'CLOCK-OUT' : 'CLOCK-IN'}...`);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("WIDGET API ERROR:", data);
        throw new Error(data.error || data.message || 'Failed to update attendance');
      }
      
      console.log("--> ATTENDANCE UPDATE SUCCESS:", data);
      if (isOnline) {
        // Clocked out successfully
        setIsOnline(false);
        setClockInTime(null);
      } else {
        // Clocked in successfully
        setIsOnline(true);
        setClockInTime(data.clockInTime);
      }
    } catch (err: any) {
      console.error("WIDGET API EXCEPTION:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-slate-300'}`} />
          <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
            Attendance
          </h3>
        </div>
        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
          {isOnline ? 'Active Shift' : 'Not Working'}
        </span>
      </div>

      {/* Main Action Area */}
      <div className="flex flex-col items-center space-y-4">
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`
            w-full py-3 px-4 rounded flex items-center justify-center gap-2 font-medium transition-all
            ${isOnline 
              ? 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200' 
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
            }
            ${loading ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98]'}
          `}
        >
          <Power className="w-4 h-4" />
          {isOnline ? 'Clock Out' : 'Clock In'}
        </button>

        {error && (
          <div className="w-full text-xs text-red-600 bg-red-50 p-3 rounded border border-red-100 text-center flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isOnline && clockInTime && (
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1.5 text-slate-500">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-xs">Clocked in at {dayjs(clockInTime).format('h:mm A')}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <MapPin className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase tracking-wide">{isWfh ? 'Remote' : 'On-site'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Home className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-600">Work from home</span>
          </div>
          <button
            onClick={() => !isOnline && setIsWfh(!isWfh)}
            disabled={isOnline || loading}
            className={`
              w-10 h-5 rounded-full relative transition-colors
              ${isWfh ? 'bg-blue-600' : 'bg-slate-200'}
              ${isOnline ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className={`
              absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform
              ${isWfh ? 'translate-x-5' : 'translate-x-0'}
            `}></div>
          </button>
        </div>
      </div>
    </div>
  );
}
