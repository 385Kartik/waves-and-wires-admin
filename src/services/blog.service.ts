import { apiClient } from '../api/client';

export interface BlogItem {
  _id: string;
  title: string;
  slug: string;
  category: string;
  excerpt?: string;
  content: string;
  markdown?: string;
  image_url?: string;
  image_alt?: string;
  tags: string[];
  reading_time: number;
  is_published: boolean;
  is_featured: boolean;
  author: string;
  faq_schema?: Array<{ question: string; answer: string }>;
  views: number;
  created_at: string;
  updated_at: string;
}

export const blogService = {
  getBlogs: (params?: { page?: number; limit?: number; category?: string; search?: string; all?: boolean }) =>
    apiClient.get('/blogs', { params: { all: 'true', ...params } }),

  getBlog: (idOrSlug: string) =>
    apiClient.get(`/blogs/${idOrSlug}`),

  createBlog: (data: Partial<BlogItem>) =>
    apiClient.post('/blogs', data),

  updateBlog: (id: string, data: Partial<BlogItem>) =>
    apiClient.patch(`/blogs/${id}`, data),

  deleteBlog: (id: string) =>
    apiClient.delete(`/blogs/${id}`),

  generateAiBlog: () =>
    apiClient.post('/blogs/generate'),
};
