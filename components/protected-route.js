'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authUtils } from '@/lib/auth-utils';
import { Loader2 } from 'lucide-react';

// Define public routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password'];

// Check if a route is public
function isPublicRoute(pathname) {
  return PUBLIC_ROUTES.includes(pathname) || pathname.startsWith('/forms/');
}

export default function ProtectedRoute({ children }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Check authentication status
  const checkAuth = useCallback(() => {
    try {
      // Public routes don't need auth check
      if (isPublicRoute(pathname)) {
        setIsAuthenticated(true);
        setIsLoading(false);
        return;
      }

      // Check if user has valid tokens
      if (authUtils.isAuthenticated()) {
        setIsAuthenticated(true);
      } else {
        // Clear any stale tokens
        authUtils.clearTokens();
        router.push('/login');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      authUtils.clearTokens();
      router.push('/login');
    } finally {
      setIsLoading(false);
    }
  }, [pathname, router]);

  // Initial auth check
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Listen for storage events (handles logout in other tabs)
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === 'accessToken' && !event.newValue) {
        // Token was removed (logout in another tab)
        setIsAuthenticated(false);
        router.push('/login');
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, [router]);


  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  // Not authenticated - show nothing while redirecting
  if (!isAuthenticated && !isPublicRoute(pathname)) {
    return null;
  }

  return children;
}
