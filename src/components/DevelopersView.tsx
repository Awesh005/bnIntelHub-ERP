/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Cpu, 
  Mail, 
  BadgeDollarSign, 
  CheckCircle, 
  AlertCircle,
  Tag
} from 'lucide-react';
import { api } from '../lib/api';
import { Developer } from '../types';

export default function DevelopersView() {
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'busy'>('all');
  const [currency, setCurrency] = useState('USD');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingDev, setEditingDev] = useState<Developer | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    skills: '', // input as comma separated, processed on submit
    hourlyRate: 0,
    status: 'available' as 'available' | 'busy'
  });

  async function loadDevelopers() {
    try {
      setLoading(true);
      const [devs, settings] = await Promise.all([
        api.getDevelopers(),
        api.getSettings()
      ]);
      setDevelopers(devs);
      setCurrency(settings.currency || 'USD');
    } catch (err) {
      console.error('Failed to load developers directory', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDevelopers();
  }, []);

  const handleOpenAddModal = () => {
    setEditingDev(null);
    setFormData({
      name: '',
      email: '',
      role: 'Senior Full Stack Developer',
      skills: 'React, Node.js, PostgreSQL',
      hourlyRate: 60,
      status: 'available'
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (dev: Developer) => {
    setEditingDev(dev);
    setFormData({
      name: dev.name,
      email: dev.email,
      role: dev.role,
      skills: (dev.skills || []).join(', '),
      hourlyRate: dev.hourlyRate,
      status: dev.status
    });
    setShowModal(true);
  };

  const handleDeleteDev = async (id: string) => {
    if (!window.confirm('Wipe this developer from internal directories? This removes project associations.')) return;
    try {
      await api.deleteDeveloper(id);
      loadDevelopers();
    } catch (err) {
      console.error('Failed to remove developer profile', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.role) {
      alert('Developer Name, Email, and Role are required.');
      return;
    }
    try {
      // Split comma skills to arrays
      const skillsArray = formData.skills
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const payload = {
        ...formData,
        skills: skillsArray
      };

      if (editingDev) {
        await api.updateDeveloper(editingDev.id, payload);
      } else {
        await api.createDeveloper(payload);
      }
      setShowModal(false);
      loadDevelopers();
    } catch (err) {
      console.error('Failed to save developer blueprint', err);
    }
  };

  const filteredDevs = developers.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          d.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (d.skills || []).some(sk => sk.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Engineering Workforce</h1>
          <p className="text-slate-500 text-sm mt-1">Audit technical specialist records, manage project billing rates, and track active statuses.</p>
        </div>
        <button 
          id="btn-add-dev"
          onClick={handleOpenAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-4 py-2.5 rounded-lg flex items-center space-x-2 self-start shadow-md shadow-blue-600/10 hover:shadow-lg transition-all"
        >
          <Plus size={16} />
          <span>Add Developer</span>
        </button>
      </div>

      {/* Filters and Search directory */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 bg-white border border-slate-100 p-4 rounded-xl shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            id="search-devs-input"
            type="text" 
            placeholder="Search engineering directory by name, role, technology pills..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
          />
        </div>
        <div className="flex items-center space-x-3 self-start md:self-center">
          <span className="text-xs text-slate-500 font-medium font-sans">Availability:</span>
          <div className="flex bg-slate-100 rounded-lg p-1 border">
            {(['all', 'available', 'busy'] as const).map((st) => (
              <button
                id={`filter-devs-${st}`}
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider transition-colors ${
                  statusFilter === st 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid view of profiles */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 bg-slate-200 rounded-xl"></div>
          ))}
        </div>
      ) : filteredDevs.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-xl p-12 text-center shadow-sm">
          <Cpu className="mx-auto text-slate-300 mb-4" size={48} />
          <h3 className="font-bold text-slate-700 text-lg">No Developers Found</h3>
          <p className="text-slate-400 text-sm mt-1">Try adapting your engineering query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredDevs.map((dev) => (
            <div key={dev.id} className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden">
              <div className={`absolute top-0 left-0 right-0 h-1 ${dev.status === 'available' ? 'bg-emerald-500' : 'bg-amber-400'}`} />

              <div>
                {/* Profile Header */}
                <div className="flex items-start justify-between mb-4 mt-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 uppercase">
                      {dev.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm leading-tight">{dev.name}</h3>
                      <p className="text-slate-400 text-[11px] font-medium leading-none mt-1">{dev.role}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest rounded-full border flex items-center space-x-1 shrink-0 ${
                    dev.status === 'available' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                      : 'bg-amber-50 text-amber-700 border-amber-100'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${dev.status === 'available' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <span>{dev.status}</span>
                  </span>
                </div>

                {/* Info Fields */}
                <div className="space-y-2 pt-1 text-xs text-slate-600">
                  <div className="flex items-center space-x-2">
                    <Mail size={13} className="text-slate-400" />
                    <a href={`mailto:${dev.email}`} className="hover:underline hover:text-blue-500 font-medium">{dev.email}</a>
                  </div>
                  <div className="flex items-center space-x-2">
                    <BadgeDollarSign size={13} className="text-slate-400" />
                    <span className="font-semibold text-slate-800">Rate: {currency} {dev.hourlyRate}/hr</span>
                  </div>
                </div>

                {/* Technology pill tags */}
                <div className="mt-4 pt-3 border-t border-slate-50">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-2">Primary Skills Matrix</span>
                  <div className="flex flex-wrap gap-1">
                    {dev.skills.map((skill, i) => (
                      <span key={i} className="bg-slate-50 border text-slate-600 px-2 py-0.5 rounded text-[9px] font-bold">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Profile controls */}
              <div className="flex items-center justify-end space-x-2 border-t border-slate-50 mt-5 pt-3">
                <button 
                  id={`btn-edit-dev-${dev.id}`}
                  onClick={() => handleOpenEditModal(dev)}
                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors"
                  title="Modify Profile"
                >
                  <Edit3 size={14} />
                </button>
                <button 
                  id={`btn-delete-dev-${dev.id}`}
                  onClick={() => handleDeleteDev(dev.id)}
                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-50 rounded-lg transition-colors"
                  title="Delete Profile"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Profile Creation / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden animate-in fade-in-50 duration-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base tracking-wide">
                {editingDev ? 'Modify Workforce Profile' : 'Register New Specialist Resource'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white focus:outline-none"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Developer Full Name</label>
                  <input 
                    id="dev-form-name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white"
                    placeholder="e.g. Vikram Malhotra"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Professional Email Address</label>
                  <input 
                    id="dev-form-email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white"
                    placeholder="e.g. vikram@bnintelhub.com"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Corporate Role Title</label>
                    <input 
                      id="dev-form-role"
                      type="text"
                      required
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white"
                      placeholder="e.g. Backend Architect"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Hourly Billing Rate ({currency})</label>
                    <input 
                      id="dev-form-rate"
                      type="number"
                      required
                      value={formData.hourlyRate}
                      onChange={(e) => setFormData({ ...formData, hourlyRate: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white"
                      placeholder="70"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Skills Matrix (Comma Separated)</label>
                  <input 
                    id="dev-form-skills"
                    type="text"
                    value={formData.skills}
                    onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white"
                    placeholder="e.g. React, Node.js, Express, Go, Redis"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Resource Availability Status</label>
                  <select 
                    id="dev-form-status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'available' | 'busy' })}
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white"
                  >
                    <option value="available">Available for allocations</option>
                    <option value="busy">Assigned / Busy</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 mt-6">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm px-4 py-2.5 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  id="dev-form-submit"
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-5 py-2.5 rounded-lg font-medium shadow-md shadow-blue-600/10 transition-colors"
                >
                  {editingDev ? 'Apply Changes' : 'Register Specialist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
