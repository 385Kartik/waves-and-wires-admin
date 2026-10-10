import { apiClient } from '../api/client';

export const wishlistService = {
  getWishlist: () => apiClient.get('/user/wishlist'),
  add: (product_id) => apiClient.post('/user/wishlist', { product_id }),
  remove: (product_id) => apiClient.delete(`/user/wishlist/${product_id}`)
};
