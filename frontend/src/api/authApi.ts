import apiClient from './client';
import { AuthResponse } from '@/types';

export const authApi = {
  async register(username: string, email: string, password: string):Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', {
      username,
      email,
      password,
    });
    return response.data;
  },

  async login(username: string, password: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', {
      username,
      password,
    });
    return response.data;
  },
};
