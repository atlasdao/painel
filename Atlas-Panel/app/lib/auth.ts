import api from './api';
import { AuthResponse, User } from '@/app/types';
import Cookies from 'js-cookie';

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await api.post<any>('/auth/login', { 
      emailOrUsername: email, 
      password 
    });
    const { accessToken, user } = response.data;
    
    if (!accessToken) {
      throw new Error('Token não recebido do servidor');
    }
    
    Cookies.set('access_token', accessToken, { 
      path: '/', 
      sameSite: 'lax',
      secure: false 
    });
    Cookies.set('refresh_token', '', { path: '/' }); // API não retorna refresh token no login
    Cookies.set('user', JSON.stringify(user), { 
      path: '/', 
      sameSite: 'lax',
      secure: false 
    });
    
    return {
      access_token: accessToken,
      refresh_token: '',
      user
    };
  },

  async register(username: string, email: string, password: string): Promise<AuthResponse> {
    const response = await api.post<any>('/auth/register', {
      username,
      email,
      password,
    });
    const { accessToken, user } = response.data;
    
    if (!accessToken) {
      throw new Error('Token não recebido do servidor');
    }
    
    Cookies.set('access_token', accessToken, { 
      path: '/', 
      sameSite: 'lax',
      secure: false 
    });
    Cookies.set('refresh_token', '', { path: '/' }); // API não retorna refresh token no register
    Cookies.set('user', JSON.stringify(user), { 
      path: '/', 
      sameSite: 'lax',
      secure: false 
    });
    
    return {
      access_token: accessToken,
      refresh_token: '',
      user
    };
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      Cookies.remove('access_token');
      Cookies.remove('refresh_token');
      Cookies.remove('user');
      window.location.href = '/login';
    }
  },

  async getCurrentUser(): Promise<User | null> {
    const userCookie = Cookies.get('user');
    if (userCookie) {
      try {
        return JSON.parse(userCookie);
      } catch {
        return null;
      }
    }
    return null;
  },

  isAuthenticated(): boolean {
    return !!Cookies.get('access_token');
  },

  isAdmin(): boolean {
    const userCookie = Cookies.get('user');
    if (userCookie) {
      try {
        const user = JSON.parse(userCookie);
        return user.roles?.includes('ADMIN') || user.role === 'ADMIN';
      } catch {
        return false;
      }
    }
    return false;
  },
};