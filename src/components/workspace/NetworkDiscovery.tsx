import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Globe, ShieldCheck, AlertTriangle, Clock, Plus, Monitor, Server, Smartphone, Cpu, ExternalLink, Activity } from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface NetworkDevice {
  id: string;
  mac_address: string;
  ip_address: string;
  hostname: string;
  vendor: string;
  last_seen: string;
  status: 'Managed' | 'Unmanaged';
  organization_id: string;
}

export default function NetworkDiscovery() {
  const [devices, setDevices] = useState<NetworkDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<NetworkDevice | null>(null);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    fetchDevices();
    const subscription = supabase
      .channel('network_discovery_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'network_devices' }, () => {
        fetchDevices();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchDevices = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('forge_users')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!userData?.organization_id) return;

      const { data, error } = await supabase
        .from('network_devices')
        .select('*')
        .eq('organization_id', userData.organization_id)
        .order('last_seen', { ascending: false });

      if (error) throw error;
      setDevices(data || []);
    } catch (err) {
      console.error('Error fetching network devices:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDevice) return;
    setConverting(true);

    try {
      const formData = new FormData(e.currentTarget as HTMLFormElement);
      const assetData = {
        name: formData.get('name') as string,
        type: formData.get('type') as string,
        serial_number: formData.get('serial_number') as string || 'N/A',
        status: 'Active',
        mac_address: selectedDevice.mac_address,
        ip_address: selectedDevice.ip_address,
        organization_id: selectedDevice.organization_id,
        last_seen: selectedDevice.last_seen
      };

      // 1. Insert into it_assets
      const { error: assetError } = await supabase
        .from('it_assets')
        .insert([assetData]);

      if (assetError) throw assetError;

      // 2. Update network_devices status
      const { error: deviceError } = await supabase
        .from('network_devices')
        .update({ status: 'Managed' })
        .eq('id', selectedDevice.id);

      if (deviceError) throw deviceError;

      setShowConvertModal(false);
      setSelectedDevice(null);
      fetchDevices();
    } catch (err) {
      console.error('Error converting device:', err);
      alert('Failed to convert device to managed asset.');
    } finally {
      setConverting(false);
    }
  };

  const filteredDevices = devices.filter(d => 
    d.hostname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.ip_address.includes(searchTerm) ||
    d.mac_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.vendor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDeviceIcon = (vendor: string) => {
    const v = vendor.toLowerCase();
    if (v.includes('apple') || v.includes('samsung')) return <Smartphone className="w-4 h-4" />;
    if (v.includes('cisco') || v.includes('ubiquiti') || v.includes('mikrotik')) return <Globe className="w-4 h-4" />;
    if (v.includes('dell') || v.includes('hp') || v.includes('lenovo')) return <Monitor className="w-4 h-4" />;
    if (v.includes('vmware') || v.includes('proxmox')) return <Server className="w-4 h-4" />;
    return <Cpu className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Globe className="text-blue-600 w-5 h-5" />
            Network Discovery
          </h3>
          <p className="text-sm text-slate-500 mt-1 font-medium">Automated probe-based asset detection</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search devices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all w-64"
            />
          </div>
          <button 
            onClick={fetchDevices}
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all border border-transparent hover:border-blue-100"
            title="Refresh scan results"
          >
            <Activity className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Discovered</span>
            <Globe className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{devices.length}</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Managed Assets</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">{devices.filter(d => d.status === 'Managed').length}</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unmanaged Devices</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600">{devices.filter(d => d.status === 'Unmanaged').length}</div>
        </div>
      </div>

      {/* Device Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                <th className="px-6 py-4">Device Info</th>
                <th className="px-6 py-4">Network Details</th>
                <th className="px-6 py-4">Vendor</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Last Seen</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm text-slate-400">Scanning network registry...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
                    No devices discovered on the network.
                  </td>
                </tr>
              ) : filteredDevices.map((device) => (
                <tr key={device.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                        {getDeviceIcon(device.vendor)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{device.hostname}</div>
                        <div className="text-[10px] font-mono text-slate-400 uppercase tracking-tight">{device.mac_address}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-600">{device.ip_address}</div>
                    <div className="text-[10px] text-slate-400">IPv4 Address</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-600">{device.vendor}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      device.status === 'Managed' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                        : 'bg-amber-50 text-amber-700 border-amber-100'
                    }`}>
                      {device.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock className="w-3 h-3" />
                      {dayjs(device.last_seen).fromNow()}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {device.status === 'Unmanaged' ? (
                      <button 
                        onClick={() => {
                          setSelectedDevice(device);
                          setShowConvertModal(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Manage
                      </button>
                    ) : (
                      <button className="p-2 text-slate-300 hover:text-slate-500 transition-colors">
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Convert Modal */}
      {showConvertModal && selectedDevice && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900">Convert to Managed Asset</h3>
              <p className="text-xs text-slate-500 mt-1">Registering discovered device into inventory</p>
            </div>
            <form onSubmit={handleConvert} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Asset Name</label>
                <input
                  name="name"
                  required
                  defaultValue={selectedDevice.hostname !== 'Unknown' ? selectedDevice.hostname : ''}
                  placeholder="e.g. Marketing-MacBook-Pro"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Asset Type</label>
                  <select
                    name="type"
                    required
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  >
                    <option value="Laptop">Laptop</option>
                    <option value="Desktop">Desktop</option>
                    <option value="Server">Server</option>
                    <option value="Mobile">Mobile</option>
                    <option value="Network">Network Device</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Serial Number</label>
                  <input
                    name="serial_number"
                    placeholder="Optional"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">MAC Address</span>
                  <span className="text-slate-600 font-mono">{selectedDevice.mac_address}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">IP Address</span>
                  <span className="text-slate-600 font-mono">{selectedDevice.ip_address}</span>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowConvertModal(false)}
                  className="flex-1 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={converting}
                  className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {converting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Confirm Asset
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
