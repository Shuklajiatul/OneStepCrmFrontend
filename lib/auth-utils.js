// Auth utility functions
export const authUtils = {
  // Get stored tokens
  getTokens() {
    if (typeof window === 'undefined') return null;
    
    return {
      accessToken: localStorage.getItem('accessToken'),
      refreshToken: localStorage.getItem('refreshToken'),
      user: JSON.parse(localStorage.getItem('user') || 'null'),
      organization: JSON.parse(localStorage.getItem('organization') || 'null')
    };
  },

  // Set tokens
  setTokens(data) {
    if (typeof window === 'undefined') return;
    
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    if (data.user) {
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    if (data.organization) {
      localStorage.setItem('organization', JSON.stringify(data.organization));
    }
  },

  // Clear tokens
  clearTokens() {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('organization');
  },

  // Check if user is authenticated
  isAuthenticated() {
    const tokens = this.getTokens();
    return !!(tokens && tokens.accessToken);
  },

  // Get authorization header
  getAuthHeader() {
    const tokens = this.getTokens();
    return tokens?.accessToken ? `Bearer ${tokens.accessToken}` : null;
  },

  // Refresh token
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
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      this.setTokens(data);
      return data.accessToken;
    } catch (error) {
      this.clearTokens();
      throw error;
    }
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
