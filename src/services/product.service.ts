import { apiClient } from '../api/client';

export const productService = {
  getProducts: (params) => apiClient.get('/products', { params }),
  getProductBySlug: (slug) => apiClient.get(`/products/${slug}`),
  createProduct: (data) => apiClient.post('/products', data),
  updateProduct: (id, data) => apiClient.put(`/products/${id}`, data),
  deleteProduct: (id) => apiClient.delete(`/products/${id}`)
};
