"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ArrowLeft, Loader2, Users, CheckCircle2, XCircle, Shield, Download, Eye, UserMinus } from "lucide-react"
import axios from "axios"
import { authUtils } from "@/lib/auth-utils"
import { toast } from "sonner"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://10.10.15.194:3001'

export function PolicyMappedUsersTab({ policy, onBack }) {
  const [mappedUsers, setMappedUsers] = useState([])
  const [availableUsers, setAvailableUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("mapped")

  useEffect(() => {
    const loadData = async () => {
      await fetchRoles()
      await fetchMappedUsers()
      await fetchAvailableUsers()
    }
    loadData()
  }, [policy])

  const fetchRoles = async () => {
    try {
      const token = authUtils.getAuthHeader()
      if (!token) return

      const response = await axios.get(`${API_BASE_URL}/api/roles`, {
        headers: { Authorization: token, "Content-Type": "application/json" },
      })

      const roleData = Array.isArray(response.data)
        ? response.data
        : response.data?.data || response.data?.roles || []

      setRoles(roleData)
    } catch (error) {
      console.error("Error fetching roles:", error)
      setRoles([])
    }
  }

  const fetchMappedUsers = async () => {
    try {
      setLoading(true)
      const token = authUtils.getAuthHeader()
      if (!token) return

      const policyId = policy.p_id || policy.policy_id || policy.id
      const response = await axios.get(`${API_BASE_URL}/api/policies/${policyId}/users`, {
        headers: { Authorization: token, "Content-Type": "application/json" },
      })

      const userData = Array.isArray(response.data)
        ? response.data
        : response.data?.data || response.data?.users || []

      setMappedUsers(userData)
      return userData
    } catch (error) {
      console.error("Error fetching mapped users:", error)
      setMappedUsers([])
      return []
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableUsers = async () => {
    try {
      const token = authUtils.getAuthHeader()
      if (!token) return

      const response = await axios.get(`${API_BASE_URL}/api/users`, {
        headers: { Authorization: token, "Content-Type": "application/json" },
      })

      const userData = Array.isArray(response.data)
        ? response.data
        : response.data?.data || response.data?.users || []

      // Get current mapped users to filter them out
      const mappedUserData = mappedUsers.length > 0 
        ? mappedUsers 
        : await fetchMappedUsers()
      
      const mappedUserIds = mappedUserData.map(u => u.user_id || u.id)
      const available = userData.filter(u => !mappedUserIds.includes(u.user_id || u.id))
      
      setAvailableUsers(available)
    } catch (error) {
      console.error("Error fetching available users:", error)
      setAvailableUsers([])
    }
  }

  const policyName = policy.p_name || policy.policy_name || policy.name || "Unknown Policy"
  const policyType = policy.type || policy.policy_type || "internal"
  const isActive = policy.is_active !== false

  const activeUsers = mappedUsers.filter(u => u.is_active !== false).length
  const inactiveUsers = mappedUsers.filter(u => u.is_active === false).length

  const filteredMappedUsers = mappedUsers.filter((user) => {
    const name = user.first_name && user.last_name
      ? `${user.first_name} ${user.last_name}`
      : user.username || user.name || ""
    const email = user.email || ""
    const search = searchTerm.toLowerCase()
    return name.toLowerCase().includes(search) || email.toLowerCase().includes(search)
  })

  const handleRemoveUser = async (user) => {
    try {
      const token = authUtils.getAuthHeader()
      if (!token) return

      const policyId = policy.p_id || policy.policy_id || policy.id
      const userId = user.user_id || user.id

      // API call to remove user from policy
      await axios.delete(`${API_BASE_URL}/api/policies/${policyId}/users/${userId}`, {
        headers: { Authorization: token, "Content-Type": "application/json" },
      })

      toast.success("User removed from policy successfully")
      await fetchMappedUsers()
      await fetchAvailableUsers()
    } catch (error) {
      console.error("Error removing user:", error)
      toast.error(error.response?.data?.message || "Failed to remove user from policy")
    }
  }

  const handleExportUsers = () => {
    // Export functionality
    const csvContent = [
      ["Name", "Email", "Contact", "Status", "Total Policies", "User ID"],
      ...filteredMappedUsers.map(user => [
        user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username || user.name || "",
        user.email || "",
        user.phone || user.contact || "",
        user.is_active !== false ? "Active" : "Inactive",
        user.total_policies || "0",
        user.user_id || user.id || ""
      ])
    ].map(row => row.join(",")).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${policyName}_mapped_users.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success("Users exported successfully")
  }

  const getUserInitials = (user) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    }
    if (user.username) {
      return user.username.substring(0, 2).toUpperCase()
    }
    if (user.name) {
      return user.name.substring(0, 2).toUpperCase()
    }
    if (user.email) {
      return user.email.substring(0, 2).toUpperCase()
    }
    return "U"
  }

  const getUserDisplayName = (user) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`
    }
    return user.username || user.name || user.email || "Unknown User"
  }

  const getUserRole = (user) => {
    // If user has role_id, look up the role name from roles array
    if (user.role_id) {
      const role = roles.find(r => (r.role_id || r.id) === user.role_id)
      if (role) {
        return role.role_name || role.name || "-"
      }
    }
    
    // Check for direct role fields
    if (user.role_name) {
      return user.role_name
    }
    if (user.role) {
      return user.role
    }
    if (user.roles) {
      // If roles is an object, extract the name
      if (typeof user.roles === 'object' && user.roles.role_name) {
        return user.roles.role_name
      }
      if (typeof user.roles === 'object' && user.roles.name) {
        return user.roles.name
      }
      // If roles is a string
      if (typeof user.roles === 'string') {
        return user.roles
      }
    }
    
    return "-"
  }

  return (
    <div className="space-y-6">
      {/* Policy Header */}
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onBack} className="flex items-center gap-2 -ml-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <CardTitle className="text-xl">{policyName} - User Management</CardTitle>
                <Badge variant={isActive ? "default" : "secondary"}>
                  Active
                </Badge>
              </div>
              <CardDescription className="mt-1">Policy Type: {policyType}</CardDescription>
            </div>
        </div>
      </CardHeader>
      <CardContent>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Mapped Users</p>
                    <p className="text-2xl font-bold">{mappedUsers.length}</p>
                  </div>
                  <Users className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Users</p>
                    <p className="text-2xl font-bold">{activeUsers}</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Inactive Users</p>
                    <p className="text-2xl font-bold">{inactiveUsers}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Policy Type</p>
                    <p className="text-2xl font-bold capitalize">{policyType}</p>
                  </div>
                  <Shield className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="mapped">Mapped Users</TabsTrigger>
              <TabsTrigger value="available">Available Users</TabsTrigger>
            </TabsList>

            <TabsContent value="mapped" className="space-y-4 mt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Mapped Users ({filteredMappedUsers.length})</h3>
                  <p className="text-sm text-muted-foreground">Users currently mapped to this policy</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Input
                  placeholder="Search mapped users by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
              </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Loading users...</p>
          </div>
              ) : filteredMappedUsers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No users mapped to this policy</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="font-semibold">User Details</TableHead>
                        <TableHead className="font-semibold">Contact Info</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">Total Policies</TableHead>
                        <TableHead className="font-semibold">User ID</TableHead>
                        <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                      {filteredMappedUsers.map((user) => (
                    <TableRow key={user.user_id || user.id} className="hover:bg-muted/30">
                      <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{getUserDisplayName(user)}</p>
                                <p className="text-sm text-muted-foreground">{user.email || "-"}</p>
                              </div>
                            </div>
                      </TableCell>
                          <TableCell>{user.phone || user.contact || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={user.is_active !== false ? "default" : "secondary"}>
                          {user.is_active !== false ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                          <TableCell>{user.total_policies || "0"}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {String(user.user_id || user.id || "").substring(0, 8)}...
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {/* View user details */}}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemoveUser(user)}
                                className="text-destructive hover:text-destructive"
                              >
                                <UserMinus className="h-4 w-4 mr-2" />
                                Remove
                              </Button>
                            </div>
                          </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
              )}
            </TabsContent>

            <TabsContent value="available" className="space-y-4 mt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Available Users ({availableUsers.length})</h3>
                  <p className="text-sm text-muted-foreground">Users available to map to this policy</p>
                </div>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-3 text-muted-foreground">Loading users...</p>
                </div>
              ) : availableUsers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No available users found</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden w-full">
                  <div className="overflow-x-auto w-full">
                    <div className="w-full [&_[data-slot=table-container]]:w-full [&_[data-slot=table]]:w-full">
                      <Table className="w-full table-auto">
                        <TableHeader>
                          <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead className="font-semibold text-foreground">User Details</TableHead>
                            <TableHead className="font-semibold text-foreground">Role</TableHead>
                            <TableHead className="font-semibold text-foreground">Status</TableHead>
                            <TableHead className="font-semibold text-foreground">Total Policies</TableHead>
                            <TableHead className="w-[120px] whitespace-nowrap text-center font-semibold text-foreground">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {availableUsers.map((user) => (
                            <TableRow 
                              key={user.user_id || user.id}
                              className="hover:bg-muted/30 transition-colors border-b last:border-b-0"
                            >
                              <TableCell className="py-4">
                                <div className="flex items-center space-x-3">
                                  <Avatar className="h-10 w-10">
                                    <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <p className="font-medium text-primary truncate text-sm md:text-base transition-colors">
                                      {getUserDisplayName(user)}
                                    </p>
                                    <p className="text-sm text-muted-foreground truncate">{user.email || "-"}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                <span className="text-sm text-muted-foreground">{getUserRole(user)}</span>
                              </TableCell>
                              <TableCell className="py-4">
                                <Badge variant={user.is_active !== false ? "default" : "secondary"}>
                                  {user.is_active !== false ? "Active" : "Inactive"}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-4">
                                <span className="text-sm">{user.total_policies || "0"}</span>
                              </TableCell>
                              <TableCell className="w-[120px] whitespace-nowrap text-center py-4">
                                <div className="flex items-center justify-center space-x-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                      try {
                                        const token = authUtils.getAuthHeader()
                                        if (!token) return

                                        const policyId = policy.p_id || policy.policy_id || policy.id
                                        const userId = user.user_id || user.id

                                        await axios.post(
                                          `${API_BASE_URL}/api/policies/${policyId}/users`,
                                          { user_id: userId },
                                          { headers: { Authorization: token, "Content-Type": "application/json" } }
                                        )

                                        toast.success("User added to policy successfully")
                                        await fetchMappedUsers()
                                        await fetchAvailableUsers()
                                      } catch (error) {
                                        console.error("Error adding user:", error)
                                        toast.error(error.response?.data?.message || "Failed to add user to policy")
                                      }
                                    }}
                                  >
                                    Add User
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
      </CardContent>
    </Card>
    </div>
  )
}

