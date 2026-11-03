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
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export const leadService = {
  getLeads: (params?: { search?: string; status?: string; source?: string; page?: number; limit?: number }) =>
    apiClient.get('/leads', { params }),

  getLeadStats: () =>
    apiClient.get('/leads/stats'),

  createLead: (data: Partial<LeadItem>) =>
    apiClient.post('/leads', data),

  updateLead: (id: string, data: Partial<LeadItem>) =>
    apiClient.patch(`/leads/${id}`, data),

  deleteLead: (id: string) =>
    apiClient.delete(`/leads/${id}`),
};
