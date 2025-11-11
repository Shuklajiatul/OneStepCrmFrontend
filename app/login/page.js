'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { authUtils } from '@/lib/auth-utils';

export default function LoginPage() {
  const [step, setStep] = useState(1); // 1: Credentials, 2: OTP
  const [formData, setFormData] = useState({
    organization_id: '',
    email: '',
    password: '',
    otp: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loginData, setLoginData] = useState(null);
  const router = useRouter();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmitCredentials = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organization_id: formData.organization_id,
          email: formData.email,
          password: formData.password
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Store temporary login data
      setLoginData(data);
      setSuccess('OTP has been sent to your email and phone number');
      setStep(2); // Move to OTP step
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setIsVerifying(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organization_id: formData.organization_id,
          email: formData.email,
          otp: formData.otp,
          session_id: loginData?.session_id // Your backend should return this
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'OTP verification failed');
      }

      // Store tokens using auth utils
      authUtils.setTokens(data);

      // Redirect to dashboard or home page
      router.push('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleBackToCredentials = () => {
    setStep(1);
    setError('');
    setSuccess('');
    setFormData(prev => ({ ...prev, otp: '' }));
  };

  const handleResendOTP = async () => {
    setError('');
    try {
      const response = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organization_id: formData.organization_id,
          email: formData.email,
          session_id: loginData?.session_id
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to resend OTP');
      }

      setSuccess('OTP has been resent to your email and phone number');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {step === 1 ? 'Sign in to your account' : 'Verify OTP'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {step === 1 ? (
              <>
                Or{' '}
                <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
                  create a new account
                </Link>
              </>
            ) : (
              'Enter the OTP sent to your email and phone'
            )}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {step === 1 ? 'Login' : 'OTP Verification'}
            </CardTitle>
            <CardDescription>
              {step === 1 
                ? 'Enter your organization ID, email, and password to sign in.'
                : 'Enter the 6-digit OTP sent to your registered email and phone number.'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 1 ? (
              <form onSubmit={handleSubmitCredentials} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="organization_id">Organization ID</Label>
                  <Input
                    id="organization_id"
                    name="organization_id"
                    type="text"
                    required
                    value={formData.organization_id}
                    onChange={handleInputChange}
                    placeholder="Enter your organization ID"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Enter your password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign in'
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="bg-green-50 text-green-800 border-green-200">
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="otp">6-digit OTP</Label>
                  <Input
                    id="otp"
                    name="otp"
                    type="text"
                    required
                    maxLength={6}
                    pattern="[0-9]{6}"
                    value={formData.otp}
                    onChange={handleInputChange}
                    placeholder="Enter 6-digit OTP"
                    className="text-center text-lg tracking-widest"
                  />
                  <p className="text-xs text-gray-500 text-center">
                    Enter the 6-digit code sent to your email and phone
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={handleBackToCredentials}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1" 
                    disabled={isVerifying || formData.otp.length !== 6}
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify OTP'
                    )}
                  </Button>
                </div>

                <div className="text-center">
                  <Button
                    type="button"
                    variant="link"
                    onClick={handleResendOTP}
                    className="text-sm"
                  >
                    Didn't receive OTP? Resend
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}