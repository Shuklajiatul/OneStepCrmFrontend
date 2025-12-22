"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { authUtils } from "@/lib/auth-utils"
import axios from "axios"

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://10.10.15.194:3001'

export default function LoginPage() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    organization_id: "",
    email: "",
    password: "",
    otp: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loginData, setLoginData] = useState(null)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isMicrosoftLoading, setIsMicrosoftLoading] = useState(false)
  const [otpTimer, setOtpTimer] = useState(0)
  const [canResend, setCanResend] = useState(true)

  const router = useRouter()
  const searchParams = useSearchParams()

  // Parse OTP timer from env (default 1 minute)
  const getOtpTimeInSeconds = () => {
    const otpTime = process.env.NEXT_PUBLIC_OTP_TIME || '1m'
    const match = otpTime.match(/^(\d+)([smh])$/)
    if (!match) return 60
    const [, value, unit] = match
    const multipliers = { s: 1, m: 60, h: 3600 }
    return parseInt(value) * multipliers[unit]
  }

  // Check for OAuth errors in URL
  useEffect(() => {
    const errorParam = searchParams?.get('error')
    if (errorParam) {
      const errorMessages = {
        oauth_cancelled: "Google sign-in was cancelled",
        no_code: "Authorization failed. Please try again",
        auth_failed: "Authentication failed. Please try again",
        session_failed: "Session creation failed. Please try again"
      }
      setError(errorMessages[errorParam] || "An error occurred during sign-in")
    }
  }, [searchParams])

  // OTP Timer effect
  useEffect(() => {
    let interval
    if (otpTimer > 0) {
      setCanResend(false)
      interval = setInterval(() => {
        setOtpTimer(prev => {
          if (prev <= 1) {
            setCanResend(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [otpTimer])

  // Check if user is already logged in
  // useEffect(() => {
  //   checkAuthStatus()
  // }, [])

  // const checkAuthStatus = async () => {
  //   try {
  //     const response = await apiClient.get(`/api/auth/check-session`)

  //     if (response.status === 200) {
  //       const data = response.data
  //       if (data.authenticated) {
  //         router.push('/dashboard')
  //       }
  //     }
  //   } catch (error) {
  //     console.error('Error checking auth status:', error)
  //   }
  // }

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    if (error) setError("")
  }, [error])

  const togglePassswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev)
  }, [])

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true)
    setError("")

    try {
      // Redirect to backend OAuth endpoint
      window.location.href = `${API_URL}/api/ssoAuth/google`
    } catch (err) {
      setError(err.message || "Failed to initiate Google login")
      setIsGoogleLoading(false)
    }
  }

  const handleMicrosoftLogin = () => {
    setIsMicrosoftLoading(true)
    setError("")

    try {
      // Redirect to backend OAuth endpoint
      window.location.href = `${API_URL}/api/ssoAuth/microsoft`
    } catch (err) {
      setError(err.message || "Failed to initiate Microsoft login")
      setIsMicrosoftLoading(false)
    }
  }

  const handleEmailLoginClick = () => {
    setStep(2)
  }

  const handleSubmitCredentials = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      // Forward to Next.js API route to handle HttpOnly cookies
      const response = await axios.post('/api/auth/login', {
        organization_id: formData.organization_id,
        email: formData.email,
        password: formData.password,
      })

      const data = response.data
      console.log('Login response:', data);

      if (response.status !== 200) {
        throw new Error(data.message || "Login failed")
      }

      setLoginData(data)
      setSuccess("OTP has been sent to your email and phone number")
      setOtpTimer(getOtpTimeInSeconds())
      setStep(3)
    } catch (err) {
      console.error('Login error:', err)
      setError(err.response?.data?.message || err.message || "Login failed")
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    if (formData.otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP")
      return
    }
    setIsVerifying(true)
    setError("")

    try {
      const response = await axios.post('/api/auth/verify-otp', {
        organization_id: formData.organization_id,
        email: formData.email,
        otp: formData.otp,
        session_id: loginData?.session_id,
      })

      const data = response.data

      if (response.status !== 200) {
        throw new Error(data.message || "OTP verification failed")
      }

      console.log('OTP verification response:', data);
      authUtils.setTokens(data)
      console.log('Cookies after verification:', document.cookie);
      router.push("/dashboard")
    } catch (err) {
      setError(err.response?.data?.message || err.message || "OTP verification failed")
    } finally {
      setIsVerifying(false)
    }
  }

  const handleBackToSocial = useCallback(() => {
    setStep(1)
    setError("")
    setSuccess("")
    setFormData({
      organization_id: "",
      email: "",
      password: "",
      otp: "",
    })
  }, [])

  const handleBackToCredentials = useCallback(() => {
    setStep(2)
    setError("")
    setSuccess("")
    setOtpTimer(0)
    setCanResend(true)
    setFormData((prev) => ({ ...prev, otp: "" }))
  }, [])

  const handleResendOTP = async () => {
    if (!canResend) return

    setError("")
    try {
      const response = await axios.post('/api/auth/resend-otp', {
        organization_id: formData.organization_id,
        email: formData.email,
        session_id: loginData?.session_id,
      })

      const data = response.data

      if (response.status !== 200) {
        throw new Error(data.message || "Failed to resend OTP")
      }

      setSuccess("OTP has been resent to your email and phone number")
      setOtpTimer(getOtpTimeInSeconds())
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to resend OTP")
    }
  }

  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
    setFormData(prev => ({ ...prev, otp: value }))
    if (error) setError("")
  }

  const isOtpValid = formData.otp.length === 6

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#f4effe' }}>
      {/* Left Panel - Image Section */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-purple-400 to-purple-600 items-center justify-center p-12">
        <div className="relative w-full max-w-md aspect-square">
          <Image
            src="/SlashLogo.png"
            alt="Slash CRM Logo"
            fill
            className="object-contain drop-shadow-2xl"
            priority
            sizes="(max-width: 768px) 100vw,50vw"
          />
        </div>
      </div>

      {/* Right Panel - Form Section */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12" style={{ backgroundColor: '#f4effe' }}>
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="relative w-16 h-16">
              <Image
                src="/SlashLogo.png"
                alt="Slash CRM Logo"
                fill
                className="object-contain"
                priority
                sizes="64px"
              />
            </div>
          </div>

          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-gray-900">
              {step === 1 ? "Welcome" : step === 2 ? "Sign in with Email" : "Verify OTP"}
            </h1>
            <p className="text-gray-600 text-base">
              {step === 1
                ? "Login to check for store updates and deliveries"
                : step === 2
                  ? "Enter your credentials to continue"
                  : "Enter the OTP sent to your email and phone"}
            </p>
          </div>

          {/* Form Section */}
          <div className="space-y-6">
            {step === 1 ? (
              // Social Login Step
              <div className="space-y-5">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 border-purple-200 bg-white hover:bg-purple-50 flex items-center justify-center gap-3"
                    onClick={handleGoogleLogin}
                    disabled={isGoogleLoading}
                  >
                    {isGoogleLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                    )}
                    {isGoogleLoading ? "Redirecting..." : "Continue with Google"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={isMicrosoftLoading}
                    className="w-full h-12 border-purple-200 bg-white hover:bg-purple-50 flex items-center justify-center gap-3"
                    onClick={handleMicrosoftLogin}
                  >
                    {isMicrosoftLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <svg className="w-5 h-5" viewBox="0 0 23 23">
                        <path fill="#f3f3f3" d="M0 0h23v23H0z" />
                        <path fill="#f35325" d="M1 1h10v10H1z" />
                        <path fill="#81bc06" d="M12 1h10v10H12z" />
                        <path fill="#05a6f0" d="M1 12h10v10H1z" />
                        <path fill="#ffba08" d="M12 12h10v10H12z" />
                      </svg>
                    )}
                    {isMicrosoftLoading ? "Redirecting..." : "Continue with Microsoft"}
                  </Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-purple-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-transparent text-gray-500" style={{ backgroundColor: '#f4effe' }}>Or</span>
                  </div>
                </div>

                <div className="text-center">
                  <Button
                    type="button"
                    variant="link"
                    onClick={handleEmailLoginClick}
                    className="text-purple-600 hover:text-purple-700 font-medium text-base"
                  >
                    Sign in with your email
                  </Button>
                </div>

                <div className="text-center">
                  <Link href="/register" className="text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors">
                    Don't have an account? Register here
                  </Link>
                </div>
              </div>
            ) : step === 2 ? (
              // Email Login Step
              <form onSubmit={handleSubmitCredentials} className="space-y-5">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleBackToSocial}
                  className="flex items-center gap-2 text-purple-600 hover:text-purple-700 p-0"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>

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
                    placeholder="Enter your organization ID"
                    value={formData.organization_id}
                    onChange={handleInputChange}
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={togglePassswordVisibility}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-purple-600 hover:bg-purple-700 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            ) : (
              // OTP Verification Step
              <form onSubmit={handleVerifyOTP} className="space-y-5">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleBackToCredentials}
                  className="flex items-center gap-2 text-purple-600 hover:text-purple-700 p-0"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="border-green-200 bg-green-50">
                    <AlertDescription className="text-green-800">{success}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="otp">Enter OTP</Label>
                  <Input
                    id="otp"
                    name="otp"
                    type="text"
                    inputMode="numeric"
                    placeholder="000000"
                    value={formData.otp}
                    onChange={handleOtpChange}
                    maxLength={6}
                    required
                    className="h-11 text-center text-2xl tracking-widest"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-purple-600 hover:bg-purple-700 text-white"
                  disabled={isVerifying || !isOtpValid}
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify OTP"
                  )}
                </Button>

                <div className="text-center space-y-2">
                  {otpTimer > 0 && (
                    <p className="text-sm text-gray-600">
                      Resend OTP in {Math.floor(otpTimer / 60)}:{(otpTimer % 60).toString().padStart(2, '0')}
                    </p>
                  )}
                  <Button
                    type="button"
                    variant="link"
                    onClick={handleResendOTP}
                    disabled={!canResend}
                    className={`${canResend ? 'text-purple-600 hover:text-purple-700' : 'text-gray-400 cursor-not-allowed'}`}
                  >
                    Resend OTP
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}