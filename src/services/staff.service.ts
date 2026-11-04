import { apiClient } from '../api/client';

export interface StaffItem {
  _id: string;
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  role: 'super_admin' | 'admin' | 'manager' | 'executive' | 'backend' | 'support' | 'custom';
  designation?: string;
  permissions: string[];
  is_active: boolean;
  can_receive_leads: boolean;
  last_lead_assigned?: string | null;
  lead_count?: number;
  created_at: string;
}

export interface RoundRobinConfig {
  is_enabled: boolean;
  target_roles: string[];
  order_target_roles: string[];
  whatsapp_enabled: boolean;
  cart_enabled: boolean;
  signup_enabled: boolean;
  order_enabled: boolean;
}

export const staffService = {
  getStaff: () =>
    apiClient.get('/staff'),

  createStaff: (data: Partial<StaffItem> & { password?: string }) =>
    apiClient.post('/staff', data),

  updateStaff: (id: string, data: Partial<StaffItem> & { password?: string }) =>
    apiClient.put(`/staff/${id}`, data),

  deleteStaff: (id: string) =>
    apiClient.delete(`/staff/${id}`),

  getRoundRobinConfig: () =>
    apiClient.get('/staff/round-robin/config'),

  updateRoundRobinConfig: (config: Partial<RoundRobinConfig>) =>
    apiClient.put('/staff/round-robin/config', { config }),

  reshuffleUnassigned: () =>
    apiClient.post('/leads/reshuffle-unassigned'),
};
