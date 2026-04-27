export const authUtils = {
  // ─── LocalStorage key for user data ───────────────────────────
  USER_STORAGE_KEY: 'user',

  // ─── Cookie helpers ────────────────────────────────────────────

  _setCookie(name, value, days = 7) {
    if (typeof document === 'undefined') return;
    const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
    const domain = window.location.hostname;
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; domain=${domain}; SameSite=Lax`;
  },

  _getCookie(name) {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return decodeURIComponent(parts.pop().split(';')[0]);
    }
    return null;
  },

  _deleteCookie(name) {
    if (typeof document === 'undefined') return;
    const domain = window.location.hostname;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domain}`;
  },

  // ─── LocalStorage helpers for user ────────────────────────────

  _setUser(user) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.USER_STORAGE_KEY, JSON.stringify(user));
    } catch (e) {
      console.warn('Failed to save user to localStorage', e);
    }
  },

  _getUser() {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(this.USER_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('Failed to read user from localStorage', e);
      return null;
    }
  },

  _removeUser() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(this.USER_STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to remove user from localStorage', e);
    }
  },

  // ─── Public API ────────────────────────────────────────────────

  /**
   * Persist auth data after login / token refresh.
   * - accessToken  → cookie (1 day)
   * - refreshToken → cookie (7 days)
   * - user         → localStorage
   * - organization_id → small cookie so server-side pages can still read it
   */
  setTokens(data) {
    if (typeof window === 'undefined') return;

    if (data.accessToken) {
      this._setCookie('accessToken', data.accessToken, 1); // 1 day
    }
    if (data.refreshToken) {
      this._setCookie('refreshToken', data.refreshToken, 7); // 7 days
    }
    if (data.user) {
      // Full user object in localStorage
      this._setUser(data.user);
      // organization_id in cookie for SSR (server components / middleware)
      if (data.user.organization_id) {
        this._setCookie('organization_id', data.user.organization_id, 7);
      }
    }
  },

  /**
   * Retrieve stored auth data.
   * - Tokens from cookies
   * - User from localStorage
   */
  getTokens() {
    if (typeof window === 'undefined') return null;

    const accessToken = this._getCookie('accessToken');
    const refreshToken = this._getCookie('refreshToken');
    const user = this._getUser();

    return {
      accessToken,
      refreshToken,
      user,
    };
  },

  /**
   * Get the stored user object directly from localStorage.
   */
  getUser() {
    return this._getUser();
  },

  /**
   * Clear all auth data (logout).
   */
  clearTokens() {
    if (typeof window === 'undefined') return;

    this._deleteCookie('accessToken');
    this._deleteCookie('refreshToken');
    this._deleteCookie('organization_id');
    // Legacy – remove old user cookie if it existed
    this._deleteCookie('user');
    this._deleteCookie('organization');
    this._removeUser();
  },

  // ─── Derived helpers ───────────────────────────────────────────

  isAuthenticated() {
    const tokens = this.getTokens();
    return !!(tokens && tokens.accessToken);
  },

  getAuthHeader() {
    const tokens = this.getTokens();
    return tokens?.accessToken ? `Bearer ${tokens.accessToken}` : null;
  },

  getOrganizationId() {
    const user = this._getUser();
    if (user?.organization_id) return user.organization_id;
    // Fallback: read the thin cookie (e.g. during SSR hydration race)
    return this._getCookie('organization_id') || null;
  },

  getGIds() {
    const user = this._getUser();
    return user?.g_ids || [];
  },

  getGId() {
    const gIds = this.getGIds();
    return Array.isArray(gIds) && gIds.length > 0
      ? gIds[0]
      : typeof gIds === 'string'
      ? gIds
      : null;
  },

  getPIds() {
    const user = this._getUser();
    return user?.p_id || [];
  },

  // ─── Token refresh ─────────────────────────────────────────────

  async refreshToken() {
    const tokens = this.getTokens();
    if (!tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Refresh failed');

      const data = await response.json();
      this.setTokens(data);
      return { accessToken: data.accessToken, user: data.user };
    } catch (error) {
      this.clearTokens();
      throw error;
    }
  },

  // ─── Server-side helpers (SSR / Server Components) ─────────────

  /**
   * Build Authorization headers from the cookie store (server-side only).
   */
  getServerHeaders(cookieStore) {
    const accessToken =
      cookieStore.get('accessToken')?.value || cookieStore.get('token')?.value;
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    };
  },

  /**
   * Read organization_id from the thin cookie (server-side only).
   * Falls back to the legacy 'organization' and 'user' cookies so old
   * sessions don't break immediately.
   */
  getServerOrganizationId(cookieStore) {
    // Primary: thin organization_id cookie
    const orgId = cookieStore.get('organization_id')?.value;
    if (orgId) return orgId;

    // Legacy fallback: old 'organization' JSON cookie
    const orgCookie = cookieStore.get('organization')?.value;
    if (orgCookie) {
      try {
        const org = JSON.parse(decodeURIComponent(orgCookie));
        if (org?.organization_id) return org.organization_id;
      } catch (_) {}
    }

    // Legacy fallback: old 'user' JSON cookie
    const userCookie = cookieStore.get('user')?.value;
    if (userCookie) {
      try {
        const user = JSON.parse(decodeURIComponent(userCookie));
        if (user?.organization_id) return user.organization_id;
      } catch (_) {}
    }

    return null;
  },

  // ─── Logout ────────────────────────────────────────────────────

  async logout() {
    try {
      const authHeader = this.getAuthHeader();
      if (authHeader) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: authHeader },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearTokens();
    }
  },

  // ─── Server-side token refresh ─────────────────────────────────

  async serverRefresh(refreshToken) {
    if (!refreshToken) throw new Error('No refresh token provided');

    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL || 'http://10.10.15.194:3001';

    try {
      const response = await fetch(`${backendUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error(`Server-side refresh failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Server-side refresh error:', error);
      throw error;
    }
  },

  /**
   * Execute a fetch callback, automatically retrying once after a 401
   * by refreshing the access token server-side.
   */
  async executeWithRefresh(cookieStore, fetchCallback) {
    let headers = this.getServerHeaders(cookieStore);
    let newAccessToken = null;

    let result = await fetchCallback(headers);

    const has401 = (res) => {
      if (!res) return false;
      if (res.status === 401) return true;
      if (Array.isArray(res)) return res.some(has401);
      return false;
    };

    if (has401(result)) {
      console.log('401 Unauthorized detected, attempting server-side token refresh...');
      const refreshToken = cookieStore.get('refreshToken')?.value;
      if (refreshToken) {
        try {
          const refreshData = await this.serverRefresh(refreshToken);
          if (refreshData?.accessToken) {
            newAccessToken = refreshData.accessToken;
            console.log('Token refreshed successfully, retrying fetches...');
            headers = { ...headers, Authorization: `Bearer ${newAccessToken}` };
            result = await fetchCallback(headers);
          }
        } catch (error) {
          console.error('Server-side token refresh failed:', error);
        }
      }
    }

    return { result, newAccessToken };
  },
};