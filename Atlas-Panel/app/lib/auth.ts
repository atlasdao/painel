import api from './api';
import { AuthResponse, User } from '@/app/types';
import Cookies from 'js-cookie';

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse | { requiresTwoFactor: boolean; sessionToken: string; user?: { email: string } }> {
    console.log('[Auth] Login attempt for:', email);

    const response = await api.post<any>('/auth/login', {
      emailOrUsername: email,
      password
    });

    // Check if 2FA is required
    if (response.data.requiresTwoFactor) {
      console.log('[Auth] 2FA required, returning session token');
      console.log('[Auth] Full 2FA response:', response.data);
      console.log('[Auth] User object in 2FA response:', response.data.user);
      console.log('[Auth] User email in 2FA response:', response.data.user?.email);
      return {
        requiresTwoFactor: true,
        sessionToken: response.data.sessionToken || '',
        user: response.data.user  // Include the user object with email
      };
    }

    // Handle both camelCase (backend) and snake_case field names
    const access_token = response.data.accessToken || response.data.access_token;
    const refresh_token = response.data.refreshToken || response.data.refresh_token || '';
    const user = response.data.user;

    if (!access_token) {
      throw new Error('Token não recebido do servidor');
    }

    // Ensure user object has the expected structure
    const userData = {
      id: user.id,
      username: user.username || user.name,
      email: user.email,
      role: user.role || user.roles?.[0] || 'USER',
      roles: user.roles || [user.role || 'USER'],
      isActive: user.isActive !== undefined ? user.isActive : true,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      commerceMode: user.commerceMode || false,
      paymentLinksEnabled: user.paymentLinksEnabled || false,
      commerceModeActivatedAt: user.commerceModeActivatedAt || null
    };

    Cookies.set('access_token', access_token, {
      path: '/',
      sameSite: 'lax',
      secure: false,
      expires: 7 // 7 days
    });
    Cookies.set('refresh_token', refresh_token || '', { path: '/' });
    Cookies.set('user', JSON.stringify(userData), {
      path: '/',
      sameSite: 'lax',
      secure: false,
      expires: 7 // 7 days
    });

    console.log('[Auth] Login successful, cookies set');

    return {
      access_token: access_token,
      refresh_token: refresh_token || '',
      user: userData
    };
  },

  async loginWith2FA(email: string, password: string, twoFactorToken: string): Promise<AuthResponse> {
    console.log('[Auth] Login with 2FA attempt');

    const response = await api.post<any>('/auth/login', {
      emailOrUsername: email,
      password,
      twoFactorToken
    });

    // Handle both camelCase (backend) and snake_case field names
    const accessToken = response.data.accessToken || response.data.access_token;
    const user = response.data.user;

    if (!accessToken) {
      throw new Error('Token não recebido do servidor');
    }

    // Ensure user object has the expected structure
    const userData = {
      id: user.id,
      username: user.username || user.name,
      email: user.email,
      role: user.role || user.roles?.[0] || 'USER',
      roles: user.roles || [user.role || 'USER'],
      isActive: user.isActive !== undefined ? user.isActive : true,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      commerceMode: user.commerceMode || false,
      paymentLinksEnabled: user.paymentLinksEnabled || false,
      commerceModeActivatedAt: user.commerceModeActivatedAt || null
    };

    Cookies.set('access_token', accessToken, {
      path: '/',
      sameSite: 'lax',
      secure: false,
      expires: 7 // 7 days
    });
    Cookies.set('refresh_token', '', { path: '/' });
    Cookies.set('user', JSON.stringify(userData), {
      path: '/',
      sameSite: 'lax',
      secure: false,
      expires: 7 // 7 days
    });

    console.log('[Auth] Login with 2FA successful, cookies set');

    return {
      access_token: accessToken,
      refresh_token: '',
      user: userData
    };
  },

  async verify2FA(email: string, code: string): Promise<AuthResponse> {
    console.log('[Auth] 2FA verification attempt for:', email);
    console.log('[Auth] 2FA code:', code);

    const requestBody = {
      email,
      twoFactorToken: code
    };
    console.log('[Auth] Sending request body:', requestBody);

    const response = await api.post<any>('/auth/verify-2fa', requestBody);

    // Handle response structure from backend
    const responseData = response.data.data || response.data;
    const access_token = responseData.access_token || responseData.accessToken;
    const refresh_token = responseData.refresh_token || responseData.refreshToken || '';
    const user = responseData.user;

    if (!access_token) {
      throw new Error('Token não recebido do servidor');
    }

    // Ensure user object has the expected structure
    const userData = {
      id: user.id,
      username: user.username || user.name,
      email: user.email,
      role: user.role || user.roles?.[0] || 'USER',
      roles: user.roles || [user.role || 'USER'],
      isActive: user.isActive !== undefined ? user.isActive : true,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      commerceMode: user.commerceMode || false,
      paymentLinksEnabled: user.paymentLinksEnabled || false,
      commerceModeActivatedAt: user.commerceModeActivatedAt || null
    };

    Cookies.set('access_token', access_token, {
      path: '/',
      sameSite: 'lax',
      secure: false,
      expires: 7 // 7 days
    });
    Cookies.set('refresh_token', refresh_token || '', { path: '/' });
    Cookies.set('user', JSON.stringify(userData), {
      path: '/',
      sameSite: 'lax',
      secure: false,
      expires: 7 // 7 days
    });

    console.log('[Auth] 2FA verification successful, cookies set');

    return {
      access_token: access_token,
      refresh_token: refresh_token || '',
      user: userData
    };
  },

  async register(username: string, email: string, password: string): Promise<AuthResponse> {
    console.log('[Auth] Register attempt for:', email);

    const response = await api.post<any>('/auth/register', {
      username,
      email,
      password,
    });
    // Handle both camelCase (backend) and snake_case field names
    const accessToken = response.data.accessToken || response.data.access_token;
    const user = response.data.user;

    if (!accessToken) {
      throw new Error('Token não recebido do servidor');
    }

    // Ensure user object has the expected structure
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role || user.roles?.[0] || 'USER',
      roles: user.roles || [user.role || 'USER'],
      isActive: user.isActive !== undefined ? user.isActive : true,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      commerceMode: user.commerceMode || false,
      paymentLinksEnabled: user.paymentLinksEnabled || false,
      commerceModeActivatedAt: user.commerceModeActivatedAt || null
    };

    Cookies.set('access_token', accessToken, {
      path: '/',
      sameSite: 'lax',
      secure: false,
      expires: 7 // 7 days
    });
    Cookies.set('refresh_token', '', { path: '/' }); // API não retorna refresh token no register
    Cookies.set('user', JSON.stringify(userData), {
      path: '/',
      sameSite: 'lax',
      secure: false,
      expires: 7 // 7 days
    });

    console.log('[Auth] Register successful, cookies set');

    return {
      access_token: accessToken,
      refresh_token: '',
      user: userData
    };
  },

  async logout(): Promise<void> {
    console.log('[Auth] Logout initiated');

    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('[Auth] Logout error:', error);
    } finally {
      Cookies.remove('access_token');
      Cookies.remove('refresh_token');
      Cookies.remove('user');
      window.location.href = '/login';
    }
  },

  async getCurrentUser(): Promise<User | null> {
    console.log('[Auth] getCurrentUser called at', new Date().toISOString());

    try {
      // Check if we have a token
      const token = Cookies.get('access_token');
      console.log('[Auth] Token exists:', !!token);

      if (!token) {
        console.log('[Auth] No token found, returning null');
        return null;
      }

      // First, try to get cached user data from cookie for faster loading
      const userCookie = Cookies.get('user');
      let cachedUser = null;
      if (userCookie) {
        try {
          cachedUser = JSON.parse(userCookie);
          console.log('[Auth] Found cached user, returning immediately');
        } catch {
          console.error('[Auth] Failed to parse cached user cookie');
        }
      }

      // Return cached user immediately and fetch fresh data in background
      if (cachedUser) {
        // Fetch fresh data in background without awaiting
        this.refreshUserDataInBackground();
        return cachedUser;
      }

      // If no cached user, fetch from server (first time)
      console.log('[Auth] No cached user, fetching from API...');
      const response = await api.get('/auth/profile');
      console.log('[Auth] Profile response:', response.data);

      const user = response.data;

      // Update cookie with fresh data
      if (user) {
        // Ensure user object has the expected structure
        const userData = {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role || user.roles?.[0] || 'USER',
          roles: user.roles || [user.role || 'USER'],
          isActive: user.isActive !== undefined ? user.isActive : true,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          profilePicture: user.profilePicture || null,
          defaultWalletAddress: user.defaultWalletAddress || null,
          defaultWalletType: user.defaultWalletType || null,
          pixKey: user.pixKey || null,
          commerceMode: user.commerceMode || false,
          paymentLinksEnabled: user.paymentLinksEnabled || false,
          commerceModeActivatedAt: user.commerceModeActivatedAt || null
        };

        console.log('[Auth] Updating user cookie with:', userData);
        Cookies.set('user', JSON.stringify(userData), {
          path: '/',
          sameSite: 'lax',
          secure: false,
          expires: 7 // 7 days
        });

        return userData;
      }

      return user;
    } catch (error: any) {
      console.error('[Auth] getCurrentUser error:', error.message);
      console.error('[Auth] Error details:', error.response?.data || error);

      // If server request fails, fall back to cookie
      const userCookie = Cookies.get('user');
      if (userCookie) {
        try {
          console.log('[Auth] Falling back to user cookie');
          return JSON.parse(userCookie);
        } catch {
          console.error('[Auth] Failed to parse user cookie');
          return null;
        }
      }
      return null;
    }
  },

  // Background refresh method to update user data without blocking UI
  async refreshUserDataInBackground(): Promise<void> {
    try {
      // Rate limit background refreshes to prevent excessive API calls
      const lastRefresh = localStorage.getItem('lastBackgroundRefresh');
      const now = Date.now();
      const oneMinute = 60 * 1000;

      if (lastRefresh && (now - parseInt(lastRefresh)) < oneMinute) {
        console.log('[Auth] Background refresh skipped (rate limited)');
        return;
      }

      console.log('[Auth] Refreshing user data in background...');
      localStorage.setItem('lastBackgroundRefresh', now.toString());

      const response = await api.get('/auth/profile');
      const user = response.data;

      if (user) {
        const userData = {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role || user.roles?.[0] || 'USER',
          roles: user.roles || [user.role || 'USER'],
          isActive: user.isActive !== undefined ? user.isActive : true,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          profilePicture: user.profilePicture || null,
          defaultWalletAddress: user.defaultWalletAddress || null,
          defaultWalletType: user.defaultWalletType || null,
          pixKey: user.pixKey || null,
          commerceMode: user.commerceMode || false,
          paymentLinksEnabled: user.paymentLinksEnabled || false,
          commerceModeActivatedAt: user.commerceModeActivatedAt || null
        };

        console.log('[Auth] Background refresh: updating user cookie');
        Cookies.set('user', JSON.stringify(userData), {
          path: '/',
          sameSite: 'lax',
          secure: false,
          expires: 7 // 7 days
        });
      }
    } catch (error) {
      console.log('[Auth] Background refresh failed (silent):', error instanceof Error ? error.message : error);
      // Silently fail - user still has cached data
    }
  },

  isAuthenticated(): boolean {
    const isAuth = !!Cookies.get('access_token');
    console.log('[Auth] isAuthenticated:', isAuth);
    return isAuth;
  },

  isAdmin(): boolean {
    const userCookie = Cookies.get('user');
    if (userCookie) {
      try {
        const user = JSON.parse(userCookie);
        const isAdmin = user.roles?.includes('ADMIN') || user.role === 'ADMIN';
        console.log('[Auth] isAdmin:', isAdmin);
        return isAdmin;
      } catch {
        return false;
      }
    }
    return false;
  },

  getRedirectDestination(user: User): string {
    console.log('[Auth] Determining redirect destination for user:', user.username);
    console.log('[Auth] Commerce mode status:', user.commerceMode);

    // If user has commerce mode enabled, redirect to commerce dashboard
    if (user.commerceMode === true) {
      console.log('[Auth] Redirecting to commerce dashboard');
      return '/commerce';
    }

    // Default redirect to regular dashboard
    console.log('[Auth] Redirecting to regular dashboard');
    return '/dashboard';
  },
};