import { apiClient } from '../api/client';

export interface LeadItem {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  source: 'whatsapp' | 'add_to_cart' | 'signup' | 'manual' | 'other';
  quantity: number;
  product_name: string;
  status: 'new_lead' | 'contacted' | 'interested' | 'in_cart' | 'closed_won' | 'closed_lost' | 'refund';
  notes?: string;
  user_id?: string;
  assigned_to?: {
    _id: string;
    id?: string;
    full_name: string;
    email: string;
    phone?: string;
    role?: string;
    designation?: string;
    avatar_url?: string;
  } | null;
  assigned_at?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export const leadService = {
  getLeads: (params?: { search?: string; status?: string; source?: string; assigned_to?: string; page?: number; limit?: number }) =>
    apiClient.get('/leads', { params }),

  getLeadStats: () =>
    apiClient.get('/leads/stats'),

  createLead: (data: Partial<LeadItem>) =>
    apiClient.post('/leads', data),

  updateLead: (id: string, data: Partial<LeadItem>) =>
    apiClient.patch(`/leads/${id}`, data),

  assignLead: (id: string, assigned_to: string | null) =>
    apiClient.put(`/leads/${id}/assign`, { assigned_to }),

  bulkAssignLeads: (lead_ids: string[], assigned_to: string | null) =>
    apiClient.post('/leads/bulk-assign', { lead_ids, assigned_to }),

  reshuffleUnassigned: () =>
    apiClient.post('/leads/reshuffle-unassigned'),

  deleteLead: (id: string) =>
    apiClient.delete(`/leads/${id}`),
};
