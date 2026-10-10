import { apiClient } from '../api/client';

export const orderService = {
  getOrders: () => apiClient.get('/orders'),
  getOrder: (id) => apiClient.get(`/orders/${id}`),
  placeOrder: (data) => apiClient.post('/orders/place', data),
  updateOrder: (id, data) => apiClient.put(`/orders/${id}`, data)
};
