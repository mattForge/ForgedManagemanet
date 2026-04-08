import { useState, useEffect, FormEvent } from 'react';
import { Plus, Search, Filter, MoreVertical, Edit2, Trash2, X, Laptop, Monitor, Printer, Shield, Network, Sofa, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';

interface Asset {
  id: string;
  model_name: string;
  category: string;
  serial_number: string;
  assigned_to: string;
  status: 'Active' | 'In Storage' | 'Decommissioned';
  purchase_price: number;
  notes: string;
  created_at: string;
}

const CATEGORIES = [
  'Staff Laptops',
  'Student Laptops',
  'Tech/Printers',
  'Monitors/TVs',
  'Security',
  'Networking',
  'Furniture'
];

const STATUS_OPTIONS = ['Active', 'In Storage', 'Decommissioned'];

export default function ITAssetManager() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [formData, setFormData] = useState<Partial<Asset>>({
    model_name: '',
    category: 'Staff Laptops',
    serial_number: '',
    assigned_to: '',
    status: 'In Storage',
    purchase_price: 0,
    notes: ''
  });

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/assets', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setAssets(data);
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const method = editingAsset ? 'PUT' : 'POST';
      const url = editingAsset ? `/api/assets/${editingAsset.id}` : '/api/assets';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        fetchAssets();
        setIsModalOpen(false);
        setEditingAsset(null);
        resetForm();
      }
    } catch (error) {
      console.error('Error saving asset:', error);
    }
  };

  const handleDelete = async () => {
    if (!editingAsset) return;
    if (!confirm('Are you sure you want to delete this asset? This action cannot be undone.')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/assets/${editingAsset.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      if (response.ok) {
        fetchAssets();
        setIsModalOpen(false);
        setEditingAsset(null);
        resetForm();
      }
    } catch (error) {
      console.error('Error deleting asset:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      model_name: '',
      category: 'Staff Laptops',
      serial_number: '',
      assigned_to: '',
      status: 'In Storage',
      purchase_price: 0,
      notes: ''
    });
  };

  const openEditModal = (asset: Asset) => {
    setEditingAsset(asset);
    setFormData(asset);
    setIsModalOpen(true);
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = 
      asset.model_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.serial_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || asset.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getDynamicLabels = (category: string) => {
    if (category === 'Furniture') {
      return {
        showSerial: false,
        assignedLabel: 'Location / Room',
        assignedPlaceholder: 'e.g. Office 204 or Main Lobby',
        notesLabel: 'Google Drive / Image Link',
        notesPlaceholder: 'Paste link to documentation or photo...'
      };
    }
    if (category === 'Security' || category === 'Networking') {
      return {
        showSerial: true,
        assignedLabel: 'Installation Location',
        assignedPlaceholder: 'e.g. Front Gate or Server Rack A',
        notesLabel: 'IP Address / Config Notes',
        notesPlaceholder: 'Enter IP address, VLAN info, or config details...'
      };
    }
    return {
      showSerial: true,
      assignedLabel: 'Assigned User',
      assignedPlaceholder: 'Employee Name or Department',
      notesLabel: 'Additional Notes',
      notesPlaceholder: 'Additional details, warranty info, etc.'
    };
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Staff Laptops':
      case 'Student Laptops': return <Laptop className="w-4 h-4" />;
      case 'Monitors/TVs': return <Monitor className="w-4 h-4" />;
      case 'Tech/Printers': return <Printer className="w-4 h-4" />;
      case 'Security': return <Shield className="w-4 h-4" />;
      case 'Networking': return <Network className="w-4 h-4" />;
      case 'Furniture': return <Sofa className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const labels = getDynamicLabels(formData.category || 'Staff Laptops');

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by model or serial number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-white border border-gray-200 rounded-md text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
        </div>
        <button
          onClick={() => {
            setEditingAsset(null);
            resetForm();
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold shadow-sm transition-all whitespace-nowrap"
        >
          <Plus className="w-4 h-4" /> Add New Asset
        </button>
      </div>

      {/* Data Grid */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200">
                <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Model Name</th>
                <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Serial Number</th>
                <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Assigned To</th>
                <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Price</th>
                <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-xs text-gray-400 font-medium">Loading assets...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400 text-sm">
                    No assets found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => (
                  <tr 
                    key={asset.id} 
                    onClick={() => openEditModal(asset)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-gray-900">{asset.model_name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {getCategoryIcon(asset.category)}
                        {asset.category}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-[11px] bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-600">
                        {asset.serial_number}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-gray-600">{asset.assigned_to || 'Unassigned'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                        asset.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                        asset.status === 'In Storage' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                        'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {asset.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-xs font-mono text-gray-600">
                        ${asset.purchase_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-1 hover:bg-white rounded border border-transparent hover:border-gray-200 text-gray-400 hover:text-blue-600 transition-all">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal / Side Panel */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {editingAsset ? 'Edit Asset' : 'Add New Asset'}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-bold">
                    {editingAsset ? `ID: ${editingAsset.id.slice(0, 8)}` : 'Create Inventory Entry'}
                  </p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-white rounded-full text-gray-400 hover:text-gray-600 transition-all border border-transparent hover:border-gray-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Model Name</label>
                    <input
                      required
                      type="text"
                      value={formData.model_name}
                      onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      placeholder="e.g. MacBook Pro M3 14-inch"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Category</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      >
                        {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                        className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      >
                        {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                  </div>

                  {labels.showSerial && (
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Serial Number</label>
                      <input
                        required
                        type="text"
                        value={formData.serial_number}
                        onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        placeholder="e.g. C02XG123L4M5"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{labels.assignedLabel}</label>
                    <input
                      type="text"
                      value={formData.assigned_to}
                      onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      placeholder={labels.assignedPlaceholder}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Purchase Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={isNaN(formData.purchase_price as number) ? '' : formData.purchase_price}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                        setFormData({ ...formData, purchase_price: val });
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{labels.notesLabel}</label>
                    <textarea
                      rows={4}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                      placeholder={labels.notesPlaceholder}
                    />
                  </div>
                </div>
              </form>

              <div className="p-6 border-t border-gray-100 bg-slate-50/50 flex flex-col gap-3">
                <button
                  onClick={handleSave}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  {editingAsset ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {editingAsset ? 'Update Asset Details' : 'Register Asset'}
                </button>
                
                {editingAsset && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="w-full py-2.5 bg-white hover:bg-red-50 text-red-600 border border-red-100 rounded-md text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Delete Asset Record
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
