import { apiClient } from '../api/client';

export const reviewService = {
  getReviews: (productId) => apiClient.get(`/products/${productId}/reviews`),
  createReview: (productId, data) => apiClient.post(`/products/${productId}/reviews`, data)
};
