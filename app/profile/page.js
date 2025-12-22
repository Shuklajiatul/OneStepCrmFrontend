"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Eye, EyeOff, User, Mail, Lock, CheckCircle2, AlertCircle, Shield } from "lucide-react"
import { authUtils } from "@/lib/auth-utils"
import { toast } from "sonner"
import { usersApi } from "@/lib/api-endpoint"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [updatingProfile, setUpdatingProfile] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [user, setUser] = useState(null)
  const [userId, setUserId] = useState(null)
  const [activeTab, setActiveTab] = useState("profile")

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
  })

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      setLoading(true)
      const tokens = authUtils.getTokens()

      if (!tokens?.user) {
        toast.error("Please login to view your profile")
        router.push("/login")
        return
      }

      const currentUser = tokens.user
      const currentUserId = currentUser.user_id || currentUser.id || currentUser.userId

      if (!currentUserId) {
        toast.error("User ID not found")
        router.push("/")
        return
      }

      setUserId(currentUserId)
      setProfileForm({
        first_name: currentUser.first_name || "",
        last_name: currentUser.last_name || "",
        email: currentUser.email || "",
      })

      // Fetch fresh user data from API
      const token = tokens.accessToken || localStorage.getItem("accessToken") || localStorage.getItem("token")
      const response = await usersApi.getById(currentUserId)

      if (response.data) {
        const userData = response.data.data || response.data
        setUser(userData)
        setProfileForm({
          first_name: userData.first_name || "",
          last_name: userData.last_name || "",
          email: userData.email || "",
        })
      }
    } catch (error) {
      console.error("Error loading user data:", error)
      if (error.response?.status === 401) {
        toast.error("Session expired. Please login again.")
        router.push("/login")
      } else {
        toast.error("Failed to load user data")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setErrors({})

    // Validation
    if (!profileForm.email.trim()) {
      setErrors({ email: "Email is required" })
      return
    }

    if (!profileForm.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setErrors({ email: "Please enter a valid email address" })
      return
    }

    try {
      setUpdatingProfile(true)
      const payload = {}

      if (profileForm.first_name !== (user?.first_name || "")) {
        payload.first_name = profileForm.first_name
      }
      if (profileForm.last_name !== (user?.last_name || "")) {
        payload.last_name = profileForm.last_name
      }
      if (profileForm.email !== (user?.email || "")) {
        payload.email = profileForm.email
      }

      if (Object.keys(payload).length === 0) {
        toast.info("No changes to update")
        return
      }

      const response = await usersApi.update(userId, payload)

      if (response.data) {
        toast.success("Profile updated successfully")
        // Update localStorage user data
        const tokens = authUtils.getTokens()
        if (tokens?.user) {
          const updatedUser = {
            ...tokens.user,
            ...payload,
          }
          authUtils.setTokens({
            ...tokens,
            user: updatedUser,
          })
        }
        // Reload user data
        await loadUserData()
      }
    } catch (error) {
      console.error("Error updating profile:", error)
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to update profile"
      toast.error(errorMessage)
      if (error.response?.status === 401) {
        router.push("/login")
      }
    } finally {
      setUpdatingProfile(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setErrors({})

    // Validation
    if (!passwordForm.currentPassword) {
      setErrors({ currentPassword: "Current password is required" })
      return
    }

    if (!passwordForm.newPassword) {
      setErrors({ newPassword: "New password is required" })
      return
    }

    if (passwordForm.newPassword.length < 6) {
      setErrors({ newPassword: "Password must be at least 6 characters long" })
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setErrors({ confirmPassword: "Passwords do not match" })
      return
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setErrors({ newPassword: "New password must be different from current password" })
      return
    }

    try {
      setChangingPassword(true)
      const payload = {
        password: passwordForm.newPassword,
      }

      const response = await usersApi.update(userId, payload)

      if (response.data) {
        toast.success("Password changed successfully")
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        })
      }
    } catch (error) {
      console.error("Error changing password:", error)
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to change password"
      toast.error(errorMessage)
      if (error.response?.status === 401) {
        router.push("/login")
      }
    } finally {
      setChangingPassword(false)
    }
  }

  const getUserInitials = () => {
    if (!user) return "U"
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    }
    if (user.name) {
      const parts = user.name.trim().split(" ")
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      }
      return parts[0][0].toUpperCase()
    }
    if (user.username) {
      return user.username.substring(0, 2).toUpperCase()
    }
    if (user.email) {
      return user.email.substring(0, 2).toUpperCase()
    }
    return "U"
  }

  const getUserDisplayName = () => {
    if (!user) return "User"
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`.trim()
    }
    return user.name || user.username || user.email || "User"
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Profile Settings</h1>
          <p className="text-muted-foreground">Manage your account information and security settings</p>
        </div>

        {/* User Information Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="size-16">
                <AvatarFallback className="text-lg">{getUserInitials()}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl">{getUserDisplayName()}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Mail className="size-4" />
                  {user?.email || "No email"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">User ID</Label>
                <p className="text-sm font-mono">{user?.user_id || user?.id || "N/A"}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Role</Label>
                <div>
                  <Badge variant="secondary">{user?.roles || user?.role || "User"}</Badge>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <div>
                  <Badge variant={user?.is_active !== false ? "default" : "secondary"}>
                    {user?.is_active !== false ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
              {user?.organization_name && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Organization</Label>
                  <p className="text-sm">{user.organization_name}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabbed Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="size-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="size-4" />
              Security
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="size-5" />
                  Update Profile
                </CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">First Name</Label>
                      <Input
                        id="first_name"
                        value={profileForm.first_name}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, first_name: e.target.value })
                        }
                        placeholder="Enter your first name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Last Name</Label>
                      <Input
                        id="last_name"
                        value={profileForm.last_name}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, last_name: e.target.value })
                        }
                        placeholder="Enter your last name"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => {
                        setProfileForm({ ...profileForm, email: e.target.value })
                        if (errors.email) setErrors({ ...errors, email: "" })
                      }}
                      placeholder="Enter your email"
                      className={errors.email ? "border-destructive" : ""}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="size-4" />
                        {errors.email}
                      </p>
                    )}
                  </div>
                  <Button type="submit" disabled={updatingProfile}>
                    {updatingProfile ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 size-4" />
                        Update Profile
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="size-5" />
                  Change Password
                </CardTitle>
                <CardDescription>Update your password to keep your account secure</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        value={passwordForm.currentPassword}
                        onChange={(e) => {
                          setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                          if (errors.currentPassword) setErrors({ ...errors, currentPassword: "" })
                        }}
                        placeholder="Enter your current password"
                        className={errors.currentPassword ? "border-destructive pr-10" : "pr-10"}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </Button>
                    </div>
                    {errors.currentPassword && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="size-4" />
                        {errors.currentPassword}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={passwordForm.newPassword}
                        onChange={(e) => {
                          setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                          if (errors.newPassword) setErrors({ ...errors, newPassword: "" })
                        }}
                        placeholder="Enter your new password"
                        className={errors.newPassword ? "border-destructive pr-10" : "pr-10"}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </Button>
                    </div>
                    {errors.newPassword && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="size-4" />
                        {errors.newPassword}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Password must be at least 6 characters long
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={passwordForm.confirmPassword}
                        onChange={(e) => {
                          setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                          if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: "" })
                        }}
                        placeholder="Confirm your new password"
                        className={errors.confirmPassword ? "border-destructive pr-10" : "pr-10"}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </Button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="size-4" />
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>
                  <Button type="submit" disabled={changingPassword} variant="default">
                    {changingPassword ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Changing Password...
                      </>
                    ) : (
                      <>
                        <Lock className="mr-2 size-4" />
                        Change Password
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}