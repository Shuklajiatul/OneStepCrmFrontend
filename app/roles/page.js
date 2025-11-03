"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import axios from "axios"
import Sidebar from "../component/sidebar"
import Topbar from "../component/topbar"
import { cn } from "@/lib/utils"
import {
  Shield,
  ShieldPlus,
  Edit,
  Trash2,
  RefreshCw,
  Search,
  Eye,
  Loader2,
} from "lucide-react"

// Shadcn UI Components
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://10.10.15.194:3001'

export default function RolesPage() {
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRole, setSelectedRole] = useState(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    role_name: "",
    priority: 1,
  })
  const [submitting, setSubmitting] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState("dashboard")

  useEffect(() => {
    fetchRoles()
  }, [])

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
  }

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed)
  }

  const getAuthToken = () => {
    if (typeof window === "undefined") return null
    return localStorage.getItem("token") || localStorage.getItem("accessToken")
  }

  const getAuthHeaders = () => {
    const token = getAuthToken()
    return {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  const fetchRoles = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_BASE_URL}/api/roles`, {
        headers: getAuthHeaders(),
        timeout: 30000,
      })

      if (response.data) {
        const roleData = Array.isArray(response.data)
          ? response.data
          : response.data.data || response.data.roles || []
        setRoles(roleData)
        console.log("Roles fetched:", roleData)
      }
    } catch (error) {
      console.error("Error fetching roles:", error)
      // If API doesn't exist yet, show empty state instead of error
      if (error.response?.status === 404) {
        toast.info("Roles API endpoint not found. Using demo mode.")
        setRoles([])
      } else {
        toast.error("Failed to fetch roles. Please check your connection and authentication.")
      }
      if (error.response?.status === 401) {
        toast.error("Session expired. Please login again.")
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchRoleDetails = async (roleId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/roles/${roleId}`, {
        headers: getAuthHeaders(),
        timeout: 30000,
      })

      if (response.data) {
        const roleData = response.data.data || response.data
        setSelectedRole(roleData)
        setFormData({
          role_name: roleData.role_name || roleData.name || "",
          priority: roleData.priority || 1,
        })
        return roleData
      }
    } catch (error) {
      console.error("Error fetching role details:", error)
      toast.error("Failed to fetch role details")
      return null
    }
  }

  const handleCreateRole = async () => {
    if (!formData.role_name || formData.role_name.trim() === "") {
      toast.error("Role name is required")
      return
    }

    if (!formData.priority || formData.priority < 1) {
      toast.error("Priority must be a positive number")
      return
    }

    try {
      setSubmitting(true)
      const payload = {
        role_name: formData.role_name.trim(),
        priority: parseInt(formData.priority) || 1,
      }

      const response = await axios.post(`${API_BASE_URL}/api/roles`, payload, {
        headers: getAuthHeaders(),
        timeout: 30000,
      })

      if (response.data) {
        toast.success("Role created successfully")
        setIsCreateDialogOpen(false)
        resetForm()
        fetchRoles()
      }
    } catch (error) {
      console.error("Error creating role:", error)
      const errorMessage =
        error.response?.data?.message || error.response?.data?.error || "Failed to create role"
      toast.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateRole = async () => {
    if (!selectedRole?.role_id && !selectedRole?.id) return

    if (!formData.role_name || formData.role_name.trim() === "") {
      toast.error("Role name is required")
      return
    }

    if (!formData.priority || formData.priority < 1) {
      toast.error("Priority must be a positive number")
      return
    }

    try {
      setSubmitting(true)
      const roleId = selectedRole.role_id || selectedRole.id
      
      // Get original values for comparison
      const originalRoleName = (selectedRole.role_name || selectedRole.name || "").trim()
      const originalPriority = selectedRole.priority || 1
      const newRoleName = formData.role_name.trim()
      const newPriority = parseInt(formData.priority) || 1
      
      // Build payload only with changed fields
      const payload = {}
      
      // Only include role_name if it has changed
      if (newRoleName !== originalRoleName) {
        payload.role_name = newRoleName
      }
      
      // Only include priority if it has changed
      if (newPriority !== originalPriority) {
        payload.priority = newPriority
      }

      // If nothing changed, show message and return
      if (Object.keys(payload).length === 0) {
        toast.info("No changes to update")
        setIsEditDialogOpen(false)
        resetForm()
        return
      }

      // If only priority changed, send only priority
      // If role_name changed (with or without priority), send both
      // This handles the case where backend might need both fields when name changes
      if (payload.role_name && !payload.priority) {
        // If name changed but priority didn't, still send current priority
        payload.priority = newPriority
      } else if (!payload.role_name && payload.priority) {
        // If only priority changed, send only priority
        // Don't include role_name to avoid duplicate check
      } else {
        // Both changed, payload already has both
      }

      const response = await axios.put(
        `${API_BASE_URL}/api/roles/${roleId}`,
        payload,
        {
          headers: getAuthHeaders(),
          timeout: 30000,
        }
      )

      if (response.data) {
        toast.success("Role updated successfully")
        setIsEditDialogOpen(false)
        resetForm()
        fetchRoles()
      }
    } catch (error) {
      console.error("Error updating role:", error)
      const errorMessage =
        error.response?.data?.message || error.response?.data?.error || "Failed to update role"
      toast.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }


  const handleDeleteRole = async (roleId) => {
    if (!roleId) {
      toast.error("Role ID is missing. Cannot delete role.")
      return
    }

    try {
      setSubmitting(true)
      
      const response = await axios.delete(`${API_BASE_URL}/api/roles/${roleId}`, {
        headers: getAuthHeaders(),
        timeout: 30000,
      })

      if (response.status === 200 || response.status === 204 || response.data) {
        toast.success("Role deleted successfully")
        fetchRoles()
      } else {
        toast.error("Unexpected response from server")
      }
    } catch (error) {
      console.error("Error deleting role:", error)
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Failed to delete role"
      toast.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      role_name: "",
      priority: 1,
    })
    setSelectedRole(null)
  }

  const openEditDialog = async (role) => {
    setSelectedRole(role)
    const roleDetails = await fetchRoleDetails(role.role_id || role.id)
    if (roleDetails) {
      setIsEditDialogOpen(true)
    }
  }

  const openViewDialog = async (role) => {
    setSelectedRole(role)
    await fetchRoleDetails(role.role_id || role.id)
    setIsViewDialogOpen(true)
  }

  const filteredRoles = roles.filter((role) => {
    // Search filter
    const roleName = role.role_name || role.name || ""
    const priority = role.priority?.toString() || ""
    const matchesSearch =
      !searchTerm ||
      roleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      priority.includes(searchTerm)

    return matchesSearch
  })

  return (
    <main className="min-h-screen bg-background">
      {!isCollapsed && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsCollapsed(true)}
        />
      )}
      
      <div className="flex min-h-screen">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
        />
        <section className={cn(
          "flex-1 transition-all duration-300 flex flex-col min-h-screen",
          isCollapsed ? "md:ml-0" : "md:ml-0"
        )}>
          <div className="p-4 border-b border-border bg-card/50">
            <Topbar 
              darkMode={darkMode} 
              toggleDarkMode={toggleDarkMode}
              toggleSidebar={toggleSidebar}
            />
          </div>
          <div className="flex-1 p-4 md:p-6 bg-background">
            <div className="container mx-auto py-6 space-y-6">
              {/* Header */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-2xl">
                        <Shield className="h-6 w-6" />
                        Role Management
                      </CardTitle>
                      <CardDescription>
                        Create, manage, and configure roles for your organization
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={fetchRoles} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                      </Button>
                      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                        <DialogTrigger asChild>
                          <Button onClick={resetForm}>
                            <ShieldPlus className="h-4 w-4 mr-2" />
                            Create Role
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                          <DialogHeader>
                            <DialogTitle>Create New Role</DialogTitle>
                            <DialogDescription>
                              Enter the role details below. Role name and priority are required.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="create-role-name">Role Name *</Label>
                              <Input
                                id="create-role-name"
                                placeholder="e.g., Admin, Manager, User"
                                value={formData.role_name}
                                onChange={(e) =>
                                  setFormData({ ...formData, role_name: e.target.value })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="create-priority">Priority *</Label>
                              <Input
                                id="create-priority"
                                type="number"
                                min="1"
                                placeholder="Enter priority (e.g., 1, 2, 3...)"
                                value={formData.priority}
                                onChange={(e) =>
                                  setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })
                                }
                              />
                              <p className="text-xs text-muted-foreground">
                                Lower numbers indicate higher priority
                              </p>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setIsCreateDialogOpen(false)}
                              disabled={submitting}
                            >
                              Cancel
                            </Button>
                            <Button onClick={handleCreateRole} disabled={submitting}>
                              {submitting ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Creating...
                                </>
                              ) : (
                                "Create Role"
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Search and Filters */}
                  <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    {/* Search */}
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name or priority..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    
                    {/* Clear Filters Button */}
                    {searchTerm && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSearchTerm("")
                        }}
                        className="whitespace-nowrap"
                      >
                        Clear Filters
                      </Button>
                    )}
                  </div>

                  {/* Roles Table */}
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : filteredRoles.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No roles found</p>
                      {roles.length === 0 && (
                        <p className="text-sm mt-2">Create your first role to get started</p>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-md border overflow-hidden w-full">
                      <div className="overflow-x-auto w-full">
                        <div className="w-full [&_[data-slot=table-container]]:w-full [&_[data-slot=table]]:w-full">
                          <Table className="w-full table-auto">
                            <TableHeader>
                              <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead className="font-semibold text-foreground">Role Name</TableHead>
                                <TableHead className="font-semibold text-foreground">Priority</TableHead>
                                <TableHead className="w-[120px] whitespace-nowrap text-center font-semibold text-foreground">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredRoles.map((role) => {
                                const roleId = role.role_id || role.id
                                const roleName = role.role_name || role.name || "N/A"
                                return (
                                  <TableRow 
                                    key={roleId}
                                    className="hover:bg-muted/30 transition-colors border-b last:border-b-0"
                                  >
                                    <TableCell className="py-4">
                                      <div className="flex items-center space-x-3">
                                        <div className="min-w-0">
                                          <span className="font-medium text-primary truncate text-sm md:text-base transition-colors">
                                            {roleName}
                                          </span>
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell className="py-4">
                                      <Badge variant="secondary">
                                        {role.priority || "N/A"}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="w-[120px] whitespace-nowrap text-right py-4">
                                      <div className="flex items-center justify-end space-x-1">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => openViewDialog(role)}
                                          title="View"
                                          className="h-8 w-8"
                                        >
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => openEditDialog(role)}
                                          title="Edit"
                                          className="h-8 w-8"
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              title="Delete"
                                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Delete Role</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                Are you sure you want to delete the role{" "}
                                                <strong>{roleName}</strong>?
                                                <br />
                                                <br />
                                                This action cannot be undone. Users assigned to this role may lose access.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                                              <AlertDialogAction
                                                onClick={() => handleDeleteRole(roleId)}
                                                className="bg-destructive text-white hover:bg-destructive/90 hover:text-white"
                                                disabled={submitting}
                                              >
                                                {submitting ? (
                                                  <>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    Deleting...
                                                  </>
                                                ) : (
                                                  "Delete"
                                                )}
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* View Role Dialog */}
              <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Role Details</DialogTitle>
                    <DialogDescription>View detailed information about this role</DialogDescription>
                  </DialogHeader>
                  {selectedRole && (
                    <div className="space-y-4 py-4">
                      <div>
                        <Label className="text-muted-foreground">Role Name</Label>
                        <p className="text-sm font-medium">{selectedRole.role_name || selectedRole.name || "N/A"}</p>
                      </div>
                      <Separator />
                      <div>
                        <Label className="text-muted-foreground">Priority</Label>
                        <div className="mt-2">
                          <Badge variant="secondary" className="text-lg">
                            {selectedRole.priority || "N/A"}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            Lower numbers indicate higher priority
                          </p>
                        </div>
                      </div>
                      {(selectedRole.role_id || selectedRole.id) && (
                        <div>
                          <Label className="text-muted-foreground">Role ID</Label>
                          <p className="text-sm font-medium font-mono">{selectedRole.role_id || selectedRole.id}</p>
                        </div>
                      )}
                    </div>
                  )}
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                      Close
                    </Button>
                    <Button onClick={() => {
                      setIsViewDialogOpen(false)
                      openEditDialog(selectedRole)
                    }}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Role
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Edit Role Dialog */}
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Edit Role</DialogTitle>
                    <DialogDescription>
                      Update role information. Role name and priority are required.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-role-name">Role Name *</Label>
                      <Input
                        id="edit-role-name"
                        placeholder="e.g., Admin, Manager, User"
                        value={formData.role_name}
                        onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-priority">Priority *</Label>
                      <Input
                        id="edit-priority"
                        type="number"
                        min="1"
                        placeholder="Enter priority (e.g., 1, 2, 3...)"
                        value={formData.priority}
                        onChange={(e) =>
                          setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Lower numbers indicate higher priority
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={submitting}>
                      Cancel
                    </Button>
                    <Button onClick={handleUpdateRole} disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        "Update Role"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

