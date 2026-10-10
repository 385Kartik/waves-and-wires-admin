import { apiClient } from '../api/client';

export const authService = {
  login: (data) => apiClient.post('/auth/login', data),
  register: (data) => apiClient.post('/auth/register', data),
  session: () => apiClient.get('/auth/session'),
  logout: () => apiClient.post('/auth/logout'),
  updateProfile: (data) => apiClient.put('/user/profile', data)
};
