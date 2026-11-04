import { useEffect, useState, useMemo } from 'react';
import {
  Users, UserCheck, ShieldCheck, Plus, Search, Edit3, Trash2, Key,
  RefreshCw, CheckCircle2, XCircle, AlertCircle, Sparkles, Filter,
  Phone, Mail, Check, X, Shield, Clock, ArrowRight, Settings2, RotateCw
} from 'lucide-react';
import { toast } from 'sonner';
import { staffService, StaffItem, RoundRobinConfig } from '@/services/staff.service';
import { useAuth } from '@/contexts/AuthContext';
import {
  ALL_PERMISSIONS,
  PERMISSION_GROUPS,
  ROLE_PRESETS,
  PermissionItem
} from '@/constants/permissions';

export default function AdminStaff() {
  const { user: currentUser, hasPermission } = useAuth();
  const [staffList, setStaffList] = useState<StaffItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffItem | null>(null);
  const [isRoundRobinModalOpen, setIsRoundRobinModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedStaffForPassword, setSelectedStaffForPassword] = useState<StaffItem | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // Round Robin State
  const [rrConfig, setRrConfig] = useState<RoundRobinConfig>({
    is_enabled: true,
    target_roles: ['executive'],
    order_target_roles: ['manager', 'executive'],
    whatsapp_enabled: true,
    cart_enabled: true,
    signup_enabled: true,
    order_enabled: true,
  });
  const [rrParticipants, setRrParticipants] = useState<any[]>([]);
  const [savingRr, setSavingRr] = useState(false);
  const [reshuffling, setReshuffling] = useState(false);

  // Form State for Add / Edit Staff
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    designation: '',
    role: 'executive' as string,
    permissions: [] as string[],
    is_active: true,
    can_receive_leads: true,
  });
  const [activeTab, setActiveTab] = useState<'info' | 'permissions'>('info');
  const [savingStaff, setSavingStaff] = useState(false);

  // Load Staff List & RR Config
  const loadData = async () => {
    setLoading(true);
    try {
      const [staffRes, rrRes]: any = await Promise.all([
        staffService.getStaff(),
        staffService.getRoundRobinConfig(),
      ]);

      if (staffRes?.data) setStaffList(staffRes.data);
      if (rrRes?.data?.config) setRrConfig(rrRes.data.config);
      if (rrRes?.data?.participants) setRrParticipants(rrRes.data.participants);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load staff list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered staff
  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      const matchesSearch =
        !search.trim() ||
        s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase()) ||
        s.phone?.includes(search) ||
        s.designation?.toLowerCase().includes(search.toLowerCase());

      const matchesRole = roleFilter === 'all' || s.role === roleFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && s.is_active) ||
        (statusFilter === 'inactive' && !s.is_active);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [staffList, search, roleFilter, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = staffList.length;
    const activeExecutives = staffList.filter((s) => s.is_active && s.can_receive_leads && (s.role === 'executive' || s.role === 'manager')).length;
    const managers = staffList.filter((s) => s.role === 'manager' || s.role === 'super_admin' || s.role === 'admin').length;
    const totalLeads = staffList.reduce((acc, s) => acc + (s.lead_count || 0), 0);
    return { total, activeExecutives, managers, totalLeads };
  }, [staffList]);

  // Open Add Modal
  const openAddModal = () => {
    setEditingStaff(null);
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      password: '',
      designation: 'Sales Executive',
      role: 'executive',
      permissions: [...ROLE_PRESETS.executive.permissions],
      is_active: true,
      can_receive_leads: true,
    });
    setActiveTab('info');
    setIsStaffModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (staff: StaffItem) => {
    setEditingStaff(staff);
    setFormData({
      full_name: staff.full_name || '',
      email: staff.email || '',
      phone: staff.phone || '',
      password: '',
      designation: staff.designation || '',
      role: staff.role || 'executive',
      permissions: staff.permissions || [],
      is_active: staff.is_active,
      can_receive_leads: staff.can_receive_leads,
    });
    setActiveTab('info');
    setIsStaffModalOpen(true);
  };

  // Apply Role Preset
  const applyRolePreset = (roleKey: string) => {
    const preset = ROLE_PRESETS[roleKey];
    if (!preset) return;
    setFormData((prev) => ({
      ...prev,
      role: roleKey,
      designation: prev.designation || (roleKey === 'manager' ? 'Store Manager' : roleKey === 'executive' ? 'Sales Executive' : 'Operations Staff'),
      permissions: [...preset.permissions],
      can_receive_leads: roleKey === 'executive' || roleKey === 'manager',
    }));
    toast.info(`Applied ${preset.label} permissions preset`);
  };

  // Toggle single permission
  const togglePermission = (permId: string) => {
    setFormData((prev) => {
      let nextPerms = [...prev.permissions];
      if (nextPerms.includes('*')) {
        // Unpack all except permId
        nextPerms = ALL_PERMISSIONS.map((p) => p.id).filter((id) => id !== permId);
      } else if (nextPerms.includes(permId)) {
        nextPerms = nextPerms.filter((id) => id !== permId);
      } else {
        nextPerms.push(permId);
      }
      return { ...prev, permissions: nextPerms, role: 'custom' };
    });
  };

  // Toggle full group
  const toggleGroup = (groupPerms: PermissionItem[]) => {
    const groupIds = groupPerms.map((p) => p.id);
    const hasAll = groupIds.every((id) => formData.permissions.includes(id) || formData.permissions.includes('*'));

    setFormData((prev) => {
      let nextPerms = prev.permissions.includes('*') ? ALL_PERMISSIONS.map((p) => p.id) : [...prev.permissions];
      if (hasAll) {
        nextPerms = nextPerms.filter((id) => !groupIds.includes(id));
      } else {
        groupIds.forEach((id) => {
          if (!nextPerms.includes(id)) nextPerms.push(id);
        });
      }
      return { ...prev, permissions: nextPerms, role: 'custom' };
    });
  };

  // Save Staff (Create or Update)
  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email.trim()) {
      toast.error('Email address is required');
      return;
    }
    if (!editingStaff && (!formData.password || formData.password.length < 6)) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setSavingStaff(true);
    try {
      if (editingStaff) {
        const payload: any = {
          full_name: formData.full_name,
          phone: formData.phone,
          role: formData.role,
          designation: formData.designation,
          permissions: formData.permissions,
          is_active: formData.is_active,
          can_receive_leads: formData.can_receive_leads,
        };
        if (formData.password?.trim()) payload.password = formData.password.trim();

        await staffService.updateStaff(editingStaff._id, payload);
        toast.success(`Updated ${formData.full_name || formData.email} successfully`);
      } else {
        await staffService.createStaff(formData);
        toast.success(`Account created for ${formData.email}`);
      }
      setIsStaffModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Operation failed');
    } finally {
      setSavingStaff(false);
    }
  };

  // Quick Toggle Active Status
  const handleToggleActive = async (staff: StaffItem) => {
    try {
      const nextStatus = !staff.is_active;
      await staffService.updateStaff(staff._id, { is_active: nextStatus });
      setStaffList((prev) =>
        prev.map((s) => (s._id === staff._id ? { ...s, is_active: nextStatus } : s))
      );
      toast.success(`${staff.full_name} is now ${nextStatus ? 'Active' : 'Deactivated'}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  // Quick Toggle Can Receive Leads
  const handleToggleCanReceiveLeads = async (staff: StaffItem) => {
    try {
      const nextVal = !staff.can_receive_leads;
      await staffService.updateStaff(staff._id, { can_receive_leads: nextVal });
      setStaffList((prev) =>
        prev.map((s) => (s._id === staff._id ? { ...s, can_receive_leads: nextVal } : s))
      );
      toast.success(`Lead distribution ${nextVal ? 'enabled' : 'paused'} for ${staff.full_name}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update lead settings');
    }
  };

  // Delete Staff
  const handleDeleteStaff = async (staff: StaffItem) => {
    if (staff.email === 'admin@wavesandwires.in' || staff.email === 'admin@wavesandwires.com') {
      toast.error('Cannot delete the primary administrator');
      return;
    }
    if (!window.confirm(`Are you sure you want to remove ${staff.full_name} (${staff.email})?`)) return;

    try {
      await staffService.deleteStaff(staff._id);
      setStaffList((prev) => prev.filter((s) => s._id !== staff._id));
      toast.success(`Staff member ${staff.full_name} removed`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete staff member');
    }
  };

  // Change Password
  const handleChangePassword = async () => {
    if (!selectedStaffForPassword || !newPassword || newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    try {
      await staffService.updateStaff(selectedStaffForPassword._id, { password: newPassword });
      toast.success(`Password updated for ${selectedStaffForPassword.email}`);
      setIsPasswordModalOpen(false);
      setNewPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password');
    }
  };

  // Save Round Robin Config
  const handleSaveRrConfig = async () => {
    setSavingRr(true);
    try {
      await staffService.updateRoundRobinConfig(rrConfig);
      toast.success('Lead Round Robin settings saved successfully');
      setIsRoundRobinModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save Round Robin configuration');
    } finally {
      setSavingRr(false);
    }
  };

  // Run Reshuffle
  const handleReshuffleNow = async () => {
    setReshuffling(true);
    try {
      const res: any = await staffService.reshuffleUnassigned();
      toast.success(res?.message || 'Unassigned leads distributed via Round Robin');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Reshuffle failed');
    } finally {
      setReshuffling(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* ── Top Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-foreground">
                Staff & Roles Management
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage employees, granular module access permissions, and automated lead round-robin distribution
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsRoundRobinModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-accent text-xs font-bold text-foreground transition-all shadow-xs"
          >
            <RotateCw className="h-3.5 w-3.5 text-amber-500" />
            Lead Round Robin
            <span className={`inline-block h-2 w-2 rounded-full ${rrConfig.is_enabled ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
          </button>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-xl border border-border bg-card hover:bg-accent text-muted-foreground transition-all shadow-xs"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-amber-500' : ''}`} />
          </button>

          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-stone-950 font-black text-xs shadow-sm active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            Add New Employee
          </button>
        </div>
      </div>

      {/* ── KPI Stat Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Total Staff</span>
            <Users className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-foreground">{stats.total}</p>
          <p className="text-[11px] text-muted-foreground">Registered company accounts</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Round Robin Pool</span>
            <RotateCw className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600">{stats.activeExecutives}</p>
          <p className="text-[11px] text-muted-foreground">Active executives receiving leads</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Managers & Admins</span>
            <Shield className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-foreground">{stats.managers}</p>
          <p className="text-[11px] text-muted-foreground">With elevated permissions</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Assigned Leads</span>
            <UserCheck className="h-4 w-4 text-purple-500" />
          </div>
          <p className="text-2xl font-black text-purple-600">{stats.totalLeads}</p>
          <p className="text-[11px] text-muted-foreground">Distributed to staff members</p>
        </div>
      </div>

      {/* ── Search & Filter Bar ──────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border rounded-2xl p-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone, or designation..."
            className="w-full pl-9 pr-4 py-2 bg-secondary/50 border border-border rounded-xl text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-secondary/50 border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none cursor-pointer"
          >
            <option value="all">All Roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="manager">Manager</option>
            <option value="executive">Executive</option>
            <option value="backend">Backend / Operations</option>
            <option value="support">Customer Support</option>
            <option value="custom">Custom Role</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-secondary/50 border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Deactivated Only</option>
          </select>
        </div>
      </div>

      {/* ── Staff Table ───────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/40 border-b border-border text-muted-foreground uppercase font-black tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Role & Designation</th>
                <th className="py-3 px-4">Permissions</th>
                <th className="py-3 px-4 text-center">Lead Round Robin</th>
                <th className="py-3 px-4 text-center">Account Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    No staff members match the filters.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => {
                  const rolePreset = ROLE_PRESETS[staff.role] || ROLE_PRESETS.custom;
                  const isSuper = staff.role === 'super_admin' || staff.email === 'admin@wavesandwires.in' || staff.permissions?.includes('*');
                  const permCount = isSuper ? 'Full Access (*)' : `${staff.permissions?.length || 0} permissions`;

                  return (
                    <tr key={staff._id} className="hover:bg-secondary/20 transition-colors">
                      {/* Name & Contact */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 font-black text-xs flex items-center justify-center shrink-0">
                            {(staff.full_name || staff.email).slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-foreground truncate">{staff.full_name}</p>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                              <span className="truncate flex items-center gap-1"><Mail className="h-3 w-3" /> {staff.email}</span>
                              {staff.phone && (
                                <span className="truncate flex items-center gap-1"><Phone className="h-3 w-3" /> {staff.phone}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role & Designation */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            staff.role === 'super_admin' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                            staff.role === 'manager'     ? 'bg-purple-100 text-purple-900 border border-purple-200' :
                            staff.role === 'executive'   ? 'bg-blue-100 text-blue-900 border border-blue-200' :
                            staff.role === 'backend'     ? 'bg-zinc-100 text-zinc-900 border border-zinc-300' :
                            'bg-stone-100 text-stone-800 border border-stone-200'
                          }`}>
                            {rolePreset.badge}
                          </span>
                          <p className="text-[11px] text-muted-foreground truncate">{staff.designation || 'Staff Member'}</p>
                        </div>
                      </td>

                      {/* Permissions Summary */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${
                            isSuper
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-secondary text-foreground border border-border'
                          }`}>
                            {permCount}
                          </span>
                        </div>
                      </td>

                      {/* Lead Round Robin Toggle */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex flex-col items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleCanReceiveLeads(staff)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              staff.can_receive_leads ? 'bg-emerald-500' : 'bg-zinc-300'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                staff.can_receive_leads ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                          <span className="text-[10px] font-bold text-muted-foreground">
                            {staff.lead_count || 0} leads assigned
                          </span>
                        </div>
                      </td>

                      {/* Account Status Toggle */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex flex-col items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(staff)}
                            disabled={staff.email === 'admin@wavesandwires.in'}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                              staff.is_active ? 'bg-emerald-500' : 'bg-zinc-300'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                staff.is_active ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                          <span className={`text-[10px] font-bold ${staff.is_active ? 'text-emerald-600' : 'text-zinc-400'}`}>
                            {staff.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(staff)}
                            title="Edit Permissions & Details"
                            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => { setSelectedStaffForPassword(staff); setNewPassword(''); setIsPasswordModalOpen(true); }}
                            title="Reset Password"
                            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Key className="h-4 w-4" />
                          </button>
                          {staff.email !== 'admin@wavesandwires.in' && (
                            <button
                              onClick={() => handleDeleteStaff(staff)}
                              title="Delete Account"
                              className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL: Add / Edit Staff & Granular Permissions ───── */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-4xl bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-foreground">
                    {editingStaff ? `Edit Employee: ${editingStaff.full_name}` : 'Create New Employee Account'}
                  </h2>
                  <p className="text-xs text-muted-foreground">Configure details and role-based page permissions</p>
                </div>
              </div>
              <button
                onClick={() => setIsStaffModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border bg-secondary/30 px-5 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('info')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                  activeTab === 'info'
                    ? 'border-amber-500 text-amber-600'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Users className="h-4 w-4" /> 1. Account Details & Role
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('permissions')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                  activeTab === 'permissions'
                    ? 'border-amber-500 text-amber-600'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Shield className="h-4 w-4" /> 2. Granular Module Permissions
                <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800">
                  {formData.permissions.includes('*') ? 'All' : formData.permissions.length}
                </span>
              </button>
            </div>

            {/* Content Body */}
            <form onSubmit={handleSaveStaff} className="flex-1 overflow-y-auto p-5 space-y-6">
              {activeTab === 'info' ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-foreground mb-1.5">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        placeholder="e.g. Rahul Sharma"
                        className="w-full px-3.5 py-2.5 bg-secondary/40 border border-border rounded-xl text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-foreground mb-1.5">Email Address *</label>
                      <input
                        type="email"
                        required
                        disabled={!!editingStaff}
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="e.g. rahul@wavesandwires.in"
                        className="w-full px-3.5 py-2.5 bg-secondary/40 border border-border rounded-xl text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-foreground mb-1.5">Phone Number</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+919876543210"
                        className="w-full px-3.5 py-2.5 bg-secondary/40 border border-border rounded-xl text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-foreground mb-1.5">
                        {editingStaff ? 'New Password (leave blank to keep unchanged)' : 'Password *'}
                      </label>
                      <input
                        type="password"
                        required={!editingStaff}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder={editingStaff ? '••••••••' : 'Min 6 characters'}
                        className="w-full px-3.5 py-2.5 bg-secondary/40 border border-border rounded-xl text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-foreground mb-1.5">Designation / Title</label>
                      <input
                        type="text"
                        value={formData.designation}
                        onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                        placeholder="e.g. Senior Calling Executive"
                        className="w-full px-3.5 py-2.5 bg-secondary/40 border border-border rounded-xl text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-foreground mb-1.5">Base Role & Responsibility</label>
                      <select
                        value={formData.role}
                        onChange={(e) => applyRolePreset(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-secondary/40 border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none cursor-pointer"
                      >
                        <option value="executive">👤 Executive (Sales & Leads)</option>
                        <option value="manager">👔 Manager (Operations & Store)</option>
                        <option value="backend">🔧 Backend / Fulfillment</option>
                        <option value="support">🎧 Support Specialist</option>
                        <option value="super_admin">🛡️ Super Admin (Full Control)</option>
                        <option value="custom">⚙️ Custom Role</option>
                      </select>
                    </div>
                  </div>

                  {/* Lead Round Robin Setting Card */}
                  <div className="rounded-xl border border-amber-500/20 bg-amber-50/50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                          <RotateCw className="h-3.5 w-3.5 text-amber-600" />
                          Include in Lead Round Robin Distribution
                        </p>
                        <p className="text-[11px] text-amber-800/80 mt-0.5">
                          When checked, new incoming customer inquiries (WhatsApp, Add-to-cart, Signups) will automatically rotate to this employee.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, can_receive_leads: !formData.can_receive_leads })}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          formData.can_receive_leads ? 'bg-amber-500' : 'bg-zinc-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            formData.can_receive_leads ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Account Status Card */}
                  <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-foreground">Active Account</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Deactivating prevents this employee from logging into the Waves & Wires admin panel.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        formData.is_active ? 'bg-emerald-500' : 'bg-zinc-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          formData.is_active ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              ) : (
                /* Tab 2: Granular Permissions Checklist */
                <div className="space-y-6">
                  {/* Preset quick actions */}
                  <div className="flex items-center gap-2 flex-wrap bg-secondary/30 p-3 rounded-xl border border-border">
                    <span className="text-[11px] font-bold text-muted-foreground mr-1">Quick Presets:</span>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, permissions: ['*'], role: 'super_admin' })}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 transition-colors"
                    >
                      🛡️ Super Admin (All)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyRolePreset('manager')}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-100 text-purple-900 border border-purple-200 hover:bg-purple-200 transition-colors"
                    >
                      👔 Manager Preset
                    </button>
                    <button
                      type="button"
                      onClick={() => applyRolePreset('executive')}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-200 hover:bg-blue-200 transition-colors"
                    >
                      👤 Executive Preset
                    </button>
                    <button
                      type="button"
                      onClick={() => applyRolePreset('backend')}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-zinc-200 text-zinc-900 border border-zinc-300 hover:bg-zinc-300 transition-colors"
                    >
                      🔧 Backend Preset
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, permissions: [], role: 'custom' })}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors ml-auto"
                    >
                      Clear All
                    </button>
                  </div>

                  {/* Grouped Permissions */}
                  <div className="space-y-4">
                    {PERMISSION_GROUPS.map((group) => {
                      const groupIds = group.permissions.map((p) => p.id);
                      const hasAll = groupIds.every((id) => formData.permissions.includes(id) || formData.permissions.includes('*'));
                      const hasSome = groupIds.some((id) => formData.permissions.includes(id) || formData.permissions.includes('*'));

                      return (
                        <div key={group.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                          <div className="flex items-center justify-between border-b border-border pb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-foreground">{group.title}</span>
                              <span className="text-[10px] text-muted-foreground">({group.permissions.length} actions)</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleGroup(group.permissions)}
                              className="text-[11px] font-bold text-amber-600 hover:text-amber-700 transition-colors"
                            >
                              {hasAll ? 'Deselect Group' : 'Select All in Group'}
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {group.permissions.map((perm) => {
                              const isChecked = formData.permissions.includes('*') || formData.permissions.includes(perm.id);

                              return (
                                <label
                                  key={perm.id}
                                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                                    isChecked
                                      ? 'border-amber-500/40 bg-amber-500/5 shadow-2xs'
                                      : 'border-border/60 hover:border-border'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => togglePermission(perm.id)}
                                    className="mt-0.5 rounded border-border text-amber-600 focus:ring-amber-500"
                                  />
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-foreground leading-tight">{perm.label}</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{perm.description}</p>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border shrink-0">
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-foreground hover:bg-secondary transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingStaff}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-stone-950 font-black text-xs shadow-sm active:scale-95 disabled:opacity-50 transition-all"
                >
                  {savingStaff ? 'Saving...' : editingStaff ? 'Save Changes' : 'Create Account'}
                  <Check className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Lead Round Robin Settings ─────────────────── */}
      {isRoundRobinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center">
                  <RotateCw className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-foreground">Lead Round Robin Settings</h2>
                  <p className="text-xs text-muted-foreground">Automated leads rotation across executives and managers</p>
                </div>
              </div>
              <button
                onClick={() => setIsRoundRobinModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Master Switch */}
              <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-foreground">Automated Round Robin Engine</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Automatically assign incoming leads from WhatsApp chats, Add-to-Cart events, and signups to active executives
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRrConfig({ ...rrConfig, is_enabled: !rrConfig.is_enabled })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    rrConfig.is_enabled ? 'bg-emerald-500' : 'bg-zinc-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      rrConfig.is_enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Sources Enabled */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <p className="text-xs font-bold text-foreground">Eligible Lead Trigger Sources</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { key: 'whatsapp_enabled', label: 'WhatsApp Inquiries' },
                    { key: 'cart_enabled', label: 'Add to Cart Clicks' },
                    { key: 'signup_enabled', label: 'Customer Signups' },
                    { key: 'order_enabled', label: 'Checkout Orders' },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean((rrConfig as any)[key])}
                        onChange={(e) => setRrConfig({ ...rrConfig, [key]: e.target.checked })}
                        className="rounded border-border text-amber-600 focus:ring-amber-500"
                      />
                      <span className="font-semibold text-foreground">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Participating Staff List */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-foreground">Current Rotation Pool ({rrParticipants.length} Staff)</p>
                  <button
                    type="button"
                    onClick={handleReshuffleNow}
                    disabled={reshuffling}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 hover:bg-amber-500/20 text-[11px] font-bold transition-all"
                  >
                    <RotateCw className={`h-3 w-3 ${reshuffling ? 'animate-spin' : ''}`} />
                    {reshuffling ? 'Reshuffling...' : 'Reshuffle Unassigned Now'}
                  </button>
                </div>

                <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                  {rrParticipants.map((p) => (
                    <div key={p._id} className="p-2.5 flex items-center justify-between text-xs bg-card hover:bg-secondary/20">
                      <div>
                        <p className="font-bold text-foreground">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {p.role} • {p.lead_count} total leads • Last assigned: {p.last_lead_assigned ? new Date(p.last_lead_assigned).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        p.can_receive_leads ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-600'
                      }`}>
                        {p.can_receive_leads ? 'In Pool' : 'Paused'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-border shrink-0">
              <button
                type="button"
                onClick={() => setIsRoundRobinModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-foreground hover:bg-secondary transition-all"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSaveRrConfig}
                disabled={savingRr}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-stone-950 font-black text-xs shadow-sm active:scale-95 disabled:opacity-50 transition-all"
              >
                {savingRr ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Reset Password ────────────────────────────── */}
      {isPasswordModalOpen && selectedStaffForPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-foreground">Change Password</h3>
              <button onClick={() => setIsPasswordModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter new password for <span className="font-bold text-foreground">{selectedStaffForPassword.email}</span>
            </p>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter at least 6 characters"
              className="w-full px-3.5 py-2.5 bg-secondary/40 border border-border rounded-xl text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                className="px-3.5 py-2 rounded-xl border border-border text-xs font-bold text-foreground hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs shadow-xs"
              >
                Update Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
