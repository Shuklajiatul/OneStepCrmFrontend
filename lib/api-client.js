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
    (config) => {
        // Get auth header from authUtils
        const authHeader = authUtils.getAuthHeader()
        if (authHeader) {
            config.headers.Authorization = authHeader
        }
        return config
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