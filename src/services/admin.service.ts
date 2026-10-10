import { apiClient } from '../api/client';

export const adminService = {
  getDashboardStats: () => apiClient.get('/admin/dashboard-stats'),
  getRevenueByDay: () => apiClient.get('/admin/revenue-by-day'),
  getTopProducts: () => apiClient.get('/admin/top-products'),
  getCoupons: () => apiClient.get('/admin/coupons'),
  createCoupon: (data) => apiClient.post('/admin/coupons', data),
  updateCoupon: (id, data) => apiClient.put(`/admin/coupons/${id}`, data),
  deleteCoupon: (id) => apiClient.delete(`/admin/coupons/${id}`),
  getSettings: () => apiClient.get('/admin/settings'),
  updateSettings: (data) => apiClient.put('/admin/settings', data)
};
