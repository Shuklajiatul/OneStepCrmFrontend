// Axios instance with interceptors for global error handling
import axios from 'axios'
import { authUtils } from './auth-utils'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://10.10.15.194:3001'

// Create axios instance
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
})

// Request interceptor - adds auth token to all requests
apiClient.interceptors.request.use(
    async (config) => {
        // Skip auth checks for auth endpoints (though most use fetch, this is a safety net)
        if (config.url?.includes('/api/auth/') && !config.url?.includes('/proxy-backend')) {
            return config;
        }

        // Get tokens directly
        let tokens = authUtils.getTokens();
        let accessToken = tokens?.accessToken;

        // If no access token, check for refresh token
        if (!accessToken) {
            if (tokens?.refreshToken) {
                try {
                    // console.log("Access token missing in interceptor, attempting refresh...");
                    accessToken = await authUtils.refreshToken();
                } catch (refreshError) {
                    console.error("Pre-request refresh failed:", refreshError);
                    authUtils.clearTokens();
                    if (typeof window !== 'undefined') {
                        window.location.href = '/login?error=session_expired';
                    }
                    // Cancel request by rejecting
                    return Promise.reject(new Error("Session expired, please login again"));
                }
            } else {
                // No access token and no refresh token
                // Check if the request is for a public endpoint? 
                // Assuming all apiClient requests require auth based on user request "before hitting any api check token... then ask for login"

                // Allow some specific public paths if needed, but strict mode requested:
                console.warn("No tokens found, redirecting to login");
                if (typeof window !== 'undefined') {
                    // Avoid redirect loop if already on login
                    if (!window.location.pathname.startsWith('/login')) {
                        window.location.href = '/login?error=session_required';
                    }
                }
                return Promise.reject(new Error("No authentication tokens found"));
            }
        }

        // Add Authorization header
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error)
    }
)

// Response interceptor - handles 401 errors globally
apiClient.interceptors.response.use(
    (response) => {
        return response
    },
    async (error) => {
        const originalRequest = error.config

        // Handle 401 Unauthorized errors
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true

            // Try to refresh token
            try {
                const newAccessToken = await authUtils.refreshToken()

                // Retry the original request with new token
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
                return apiClient(originalRequest)
            } catch (refreshError) {
                // Refresh failed - clear tokens and redirect to login
                console.error('Token refresh failed:', refreshError)
                authUtils.clearTokens()

                // Redirect to login page (only on client side)
                if (typeof window !== 'undefined') {
                    // Add a small delay to ensure the message is visible
                    window.location.href = '/login?error=session_expired'
                }

                return Promise.reject(refreshError)
            }
        }

        // Handle 403 Forbidden errors
        if (error.response?.status === 403) {
            console.error('Access forbidden:', error.response?.data?.message || 'You do not have permission to access this resource')
        }

        return Promise.reject(error)
    }
)

// Export the configured client
export default apiClient

// Helper function to check if on client side and redirect to login
export function redirectToLogin(message = 'session_expired') {
    if (typeof window !== 'undefined') {
        authUtils.clearTokens()
        window.location.href = `/login?error=${message}`
    }
}

// Export a function to handle auth errors in catch blocks
export function handleAuthError(error) {
    if (error.response?.status === 401) {
        redirectToLogin('session_expired')
        return true
    }
    return false
}