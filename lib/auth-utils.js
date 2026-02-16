export const authUtils = {
  // Internal: set a cookie
  _setCookie(name, value, days = 7) {
    if (typeof document === 'undefined') return;
    const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
    const domain = window.location.hostname;
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; domain=${domain}; SameSite=Lax`;
  },

  // Internal: get a cookie
  _getCookie(name) {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return decodeURIComponent(parts.pop().split(';')[0]);
    }
    return null;
  },

  // Internal: delete a cookie
  _deleteCookie(name) {
    if (typeof document === 'undefined') return;
    const domain = window.location.hostname;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domain}`;
  },

  // Get all cookies for debugging
  _getAllCookies() {
    if (typeof document === 'undefined') return {};
    const cookies = {};
    document.cookie.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      cookies[name] = decodeURIComponent(value);
    });
    return cookies;
  },

  // Get stored tokens from cookies
  getTokens() {
    if (typeof window === 'undefined') return null;

    const accessToken = this._getCookie('accessToken');
    const refreshToken = this._getCookie('refreshToken');
    const userCookieRaw = this._getCookie('user');
    const organizationRaw = this._getCookie('organization');

    let user = null;
    let organization = null;

    try {
      if (userCookieRaw) {
        user = JSON.parse(userCookieRaw);
      }
    } catch (e) {
      console.warn('Failed to parse user cookie', e);
    }

    try {
      if (organizationRaw) {
        organization = JSON.parse(organizationRaw);
      }
    } catch (e) {
      console.warn('Failed to parse organization cookie', e);
    }

    return {
      accessToken,
      refreshToken,
      user,
      organization,
    };
  },

  // Set tokens in cookies
  setTokens(data) {
    if (typeof window === 'undefined') return;

    console.log('Setting tokens in cookies:', data);

    if (data.accessToken) {
      this._setCookie('accessToken', data.accessToken, 1); // 1 day
    }
    if (data.refreshToken) {
      this._setCookie('refreshToken', data.refreshToken, 7); // 7 days
    }
    if (data.user) {
      const userStr = JSON.stringify(data.user);
      this._setCookie('user', userStr, 7); // 7 day
    }
    if (data.organization) {
      this._setCookie('organization', JSON.stringify(data.organization), 1); // 1 day
    }

    // Verify cookies were set
    setTimeout(() => {
      console.log('Cookies after setting:', this._getAllCookies());
    }, 100);
  },

  // Clear tokens from cookies
  clearTokens() {
    if (typeof window === 'undefined') return;

    this._deleteCookie('accessToken');
    this._deleteCookie('refreshToken');
    this._deleteCookie('user');
    this._deleteCookie('organization');
  },

  // Check if user is authenticated
  isAuthenticated() {
    const tokens = this.getTokens();
    const isAuth = !!(tokens && tokens.accessToken);
    return isAuth;
  },

  // Get authorization header
  getAuthHeader() {
    const tokens = this.getTokens();
    return tokens?.accessToken ? `Bearer ${tokens.accessToken}` : null;
  },

  // Get organizationId from cookies
  getOrganizationId() {
    const tokens = this.getTokens();

    // Case 1: organization cookie exists
    if (tokens?.organization?.organization_id) {
      return tokens.organization.organization_id;
    }

    // Case 2: fallback to user cookie if organization not set separately
    if (tokens?.user?.organization_id) {
      return tokens.user.organization_id;
    }

    return null; // not found
  },

  // Get group IDs from user cookie
  getGIds() {
    const tokens = this.getTokens();
    return tokens?.user?.g_ids || [];
  },

  // Get primary group ID
  getGId() {
    const gIds = this.getGIds();
    return Array.isArray(gIds) && gIds.length > 0 ? gIds[0] : (typeof gIds === 'string' ? gIds : null);
  },

  // Get project/policy IDs from user cookie
  getPIds() {
    const tokens = this.getTokens();
    return tokens?.user?.p_id || [];
  },

  async refreshToken() {
    const tokens = this.getTokens();
    if (!tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Refresh failed');
      }

      const data = await response.json();

      // Update tokens with new ones from response
      this.setTokens(data);
      return {
        accessToken: data.accessToken,
        user: data.user
      };
    } catch (error) {
      this.clearTokens();
      throw error;
    }
  },

  // Get headers for server-side fetching
  getServerHeaders(cookieStore) {
    const accessToken = cookieStore.get('accessToken')?.value || cookieStore.get('token')?.value;
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
    };
  },

  // Logout 
  async logout() {
    try {
      const authHeader = this.getAuthHeader();
      if (authHeader) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearTokens();
    }
  }
};