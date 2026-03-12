// Axios instance with interceptors for global error handling
import axios from 'axios'
import { toast } from 'sonner'
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
        // Skip auth checks for auth endpoints
        if (config.url?.includes('/api/auth/') && !config.url?.includes('/proxy-backend')) {
            return config;
        }

        // Check if a refresh is already in progress
        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            })
                .then((token) => {
                    config.headers.Authorization = `Bearer ${token}`;
                    return config;
                })
                .catch((err) => {
                    return Promise.reject(err);
                });
        }

        // Get tokens directly
        let tokens = authUtils.getTokens();
        let accessToken = tokens?.accessToken;

        // If no access token, check for refresh token
        if (!accessToken) {
            if (tokens?.refreshToken) {
                isRefreshing = true;
                try {
                    console.log('[api-client] No access token, attempting proactive refresh...');
                    const result = await authUtils.refreshToken();
                    accessToken = result?.accessToken;

                    if (!accessToken) {
                        throw new Error("No access token returned from refresh");
                    }

                    // Process wait queue
                    processQueue(null, accessToken);
                } catch (refreshError) {
                    console.error("Proactive refresh failed:", refreshError);
                    processQueue(refreshError, null);
                    redirectToLogin('session_expired');
                    return Promise.reject(new Error("Session expired, please login again"));
                } finally {
                    isRefreshing = false;
                }
            } else {
                console.warn("No tokens found, checking for public path");
                if (typeof window !== 'undefined') {
                    const pathname = window.location.pathname;
                    const isPublicPath =
                        pathname.startsWith('/login') ||
                        pathname.startsWith('/forms') ||
                        pathname.startsWith('/register');

                    if (isPublicPath) {
                        console.log("[api-client] On public path, allowing request without authentication");
                        return config;
                    } else {
                        redirectToLogin('session_required');
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

// Queue for requests while token is being refreshed
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error)
        } else {
            prom.resolve(token)
        }
    })

    failedQueue = []
}

// Response interceptor - handles 401 errors globally
apiClient.interceptors.response.use(
    (response) => {
        return response
    },
    async (error) => {
        const originalRequest = error.config

        // Handle 401 Unauthorized errors
        if (error.response?.status === 401 && !originalRequest._retry) {

            if (isRefreshing) {
                // If we are already refreshing, queue this request
                return new Promise(function (resolve, reject) {
                    failedQueue.push({ resolve, reject })
                })
                    .then((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`
                        return apiClient(originalRequest)
                    })
                    .catch((err) => {
                        return Promise.reject(err)
                    })
            }

            originalRequest._retry = true
            isRefreshing = true

            // Try to refresh token
            try {
                console.log('[api-client] Token expired (401), attempting reactive refresh...');
                const result = await authUtils.refreshToken()
                const newAccessToken = result?.accessToken;

                if (!newAccessToken) {
                    throw new Error("No access token returned from refresh");
                }

                // Process the queue with new token
                processQueue(null, newAccessToken)

                // Retry the original request with new token
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
                return apiClient(originalRequest)
            } catch (refreshError) {
                // Refresh failed - clear tokens and redirect to login
                console.error('[api-client] Token refresh failed:', refreshError)

                // Process the queue with error
                processQueue(refreshError, null)

                // Redirect to login page (only on client side)
                redirectToLogin('session_expired');

                return Promise.reject(refreshError)
            } finally {
                isRefreshing = false
            }
        }

        // Handle 403 Forbidden errors
        if (error.response?.status === 403) {
            if (typeof window !== 'undefined' && originalRequest?.skipToast !== true) {
                const message =
                    error.response?.data?.error ||
                    error.response?.data?.message ||
                    'You do not have permission to access this resource'
                console.error('Access forbidden:', message)
                toast.error(message)
            }
        } else if (error.response?.status !== 401) {
            if (typeof window !== 'undefined' && originalRequest?.skipToast !== true) {
                const message =
                    error.response?.data?.error ||
                    error.response?.data?.message ||
                    error.message ||
                    'Something went wrong'
                toast.error(message)
            }
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