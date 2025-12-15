'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { authUtils } from '@/lib/auth-utils';
import { authApi } from '@/lib/api-endpoint';

export default function ProxyPage() {
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState('Initializing connection...');
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);
    const searchParams = useSearchParams();

    useEffect(() => {
        const handleOAuthCallback = async () => {
            try {
                setLoading(true);
                setProgress(10);
                setStatus('Validating authentication data...');

                const code = searchParams.get("code");
                const state = searchParams.get("state");

                if (!code || !state) {
                    setError("Missing OAuth parameters. Please try again.");
                    setLoading(false);
                    return;
                }

                setProgress(30);
                setStatus('Contacting authentication server...');

                // Simulate a small delay
                await new Promise(r => setTimeout(r, 500));

                setProgress(50);
                setStatus("Processing authentication...");

                // Use axios with credentials to handle cookies
                // Use authApi to handle the request
                const response = await authApi.proxyBackend({ code, state });

                console.log("OAuth Response:", response.data);

                if (response.data.success) {
                    // Map backend response to your auth utils format
                    const tokensData = {
                        accessToken: response.data.access_token,
                        refreshToken: response.data.refresh_token,
                        user: response.data.user,
                        organization: response.data.organization
                    };

                    console.log("Mapped tokens data:", tokensData);

                    // Store tokens using authUtils
                    if (tokensData.accessToken) {
                        authUtils.setTokens(tokensData);
                    }

                    setProgress(80);
                    setStatus("Finalizing authentication...");

                    // Wait a bit for cookies to be set
                    await new Promise(r => setTimeout(r, 500));

                    // Verify authentication
                    // const isAuthenticated = authUtils.isAuthenticated();
                    // console.log("Final authentication check:", isAuthenticated);

                    // if (isAuthenticated) {
                    setProgress(100);
                    setStatus("Success! Redirecting to dashboard...");

                    setTimeout(() => {
                        window.location.href = response.data.redirectUrl || "/";
                    }, 1000);
                    // } else {
                    // setError("Authentication failed. Please try again.");
                    //     setTimeout(() => {
                    //         window.location.href = "/login?error=auth_failed";
                    //     }, 2000);
                    // }
                } else {
                    setError("Authentication rejected. Please login again.");
                    setTimeout(() => {
                        window.location.href = "/login?error=sso_failed";
                    }, 2000);
                }

            } catch (err) {
                console.error('OAuth callback error:', err);
                if (err.response) {
                    setError(err.response.data.error || `Server error: ${err.response.status}`);
                } else if (err.request) {
                    setError("Network error: Unable to connect to authentication server.");
                } else {
                    setError(err.message || "Unknown error occurred during authentication.");
                }

                setTimeout(() => {
                    window.location.href = "/login?error=auth_failed";
                }, 3000);
            } finally {
                setLoading(false);
            }
        };

        handleOAuthCallback();
    }, [searchParams]);

    const handleRetry = () => {
        setError(null);
        setLoading(true);
        setProgress(0);
        window.location.reload();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center space-y-4">
                    <div className="flex justify-center">
                        {loading ? (
                            <RefreshCw className="h-12 w-12 text-blue-600 animate-spin" />
                        ) : error ? (
                            <AlertCircle className="h-12 w-12 text-red-500" />
                        ) : (
                            <CheckCircle2 className="h-12 w-12 text-green-500" />
                        )}
                    </div>

                    <CardTitle className="text-2xl font-bold">
                        {loading ? 'Please Wait' : error ? 'Authentication Failed' : 'Success!'}
                    </CardTitle>

                    <CardDescription className="text-lg">
                        {error ? 'We encountered an issue' : 'Authenticating your account'}
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    <div className="text-center">
                        <p className="text-sm text-muted-foreground">
                            {error ? error : status}
                        </p>
                    </div>

                    {loading && (
                        <div className="space-y-2">
                            <Progress value={progress} className="h-2" />
                            <p className="text-xs text-center text-muted-foreground">
                                {progress}% complete
                            </p>
                        </div>
                    )}

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {/* <div className="flex flex-col space-y-3">
                        {error ? (
                            <Button onClick={handleRetry} className="w-full">
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Try Again
                            </Button>
                        ) : !loading ? (
                            <Button
                                onClick={() => window.location.href = '/'}
                                variant="outline"
                                className="w-full"
                            >
                                Go Home
                            </Button>
                        ) : null}

                        {!loading && (
                            <Button
                                onClick={() => window.history.back()}
                                variant="ghost"
                                className="w-full"
                            >
                                Go Back
                            </Button>
                        )}
                    </div> */}

                    <div className="text-center">
                        <p className="text-xs text-muted-foreground">
                            {loading ? 'This may take a few moments...' : 'Thank you for your patience'}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}