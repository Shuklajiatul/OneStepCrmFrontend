"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import axios from "axios"
import Sidebar from "../component/sidebar"
import Topbar from "../component/topbar"
import { cn } from "@/lib/utils"
import {
  Building,
  Building2,
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

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://10.10.15.194:3001'

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [tierFilter, setTierFilter] = useState("all")
  const [selectedOrganization, setSelectedOrganization] = useState(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    subscription_tier: "free",
    settings: null,
  })
  const [submitting, setSubmitting] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState("dashboard")

  useEffect(() => {
    fetchOrganizations()
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

  const fetchOrganizations = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_BASE_URL}/api/organizations`, {
        headers: getAuthHeaders(),
        timeout: 30000,
      })

      if (response.data) {
        const orgData = Array.isArray(response.data)
          ? response.data
          : response.data.data || response.data.organizations || []
        setOrganizations(orgData)
        console.log("Organizations fetched:", orgData)
      }
    } catch (error) {
      console.error("Error fetching organizations:", error)
      if (error.response?.status === 404) {
        toast.info("Organizations API endpoint not found. Using demo mode.")
        setOrganizations([])
      } else {
        toast.error("Failed to fetch organizations. Please check your connection and authentication.")
      }
      if (error.response?.status === 401) {
        toast.error("Session expired. Please login again.")
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchOrganizationDetails = async (organizationId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/organizations/${organizationId}`, {
        headers: getAuthHeaders(),
        timeout: 30000,
      })

      if (response.data) {
        const orgData = response.data.data || response.data
        setSelectedOrganization(orgData)
        setFormData({
          name: orgData.name || "",
          subscription_tier: orgData.subscription_tier || "free",
          settings: orgData.settings || null,
        })
        return orgData
      }
    } catch (error) {
      console.error("Error fetching organization details:", error)
      toast.error("Failed to fetch organization details")
      return null
    }
  }

  const handleCreateOrganization = async () => {
    if (!formData.name || formData.name.trim() === "") {
      toast.error("Organization name is required")
      return
    }

    try {
      setSubmitting(true)
      const payload = {
        name: formData.name.trim(),
        subscription_tier: formData.subscription_tier || "free",
      }

      // Only include settings if they are provided
      if (formData.settings) {
        payload.settings = formData.settings
      }

      const response = await axios.post(`${API_BASE_URL}/api/organizations`, payload, {
        headers: getAuthHeaders(),
        timeout: 30000,
      })

      if (response.data) {
        toast.success("Organization created successfully")
        setIsCreateDialogOpen(false)
        resetForm()
        fetchOrganizations()
      }
    } catch (error) {
      console.error("Error creating organization:", error)
      const errorMessage =
        error.response?.data?.message || error.response?.data?.error || "Failed to create organization"
      toast.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateOrganization = async () => {
    if (!selectedOrganization?.organization_id) return

    if (!formData.name || formData.name.trim() === "") {
      toast.error("Organization name is required")
      return
    }

    try {
      setSubmitting(true)
      const organizationId = selectedOrganization.organization_id
      
      // PUT requires full payload with all fields
      const payload = {
        name: formData.name.trim(),
        subscription_tier: formData.subscription_tier || "free",
        settings: formData.settings || null,
      }

      const response = await axios.put(
        `${API_BASE_URL}/api/organizations/${organizationId}`,
        payload,
        {
          headers: getAuthHeaders(),
          timeout: 30000,
        }
      )

      if (response.data) {
        toast.success("Organization updated successfully")
        setIsEditDialogOpen(false)
        resetForm()
        fetchOrganizations()
      }
    } catch (error) {
      console.error("Error updating organization:", error)
      const errorMessage =
        error.response?.data?.message || error.response?.data?.error || "Failed to update organization"
      toast.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }


  const handleDeleteOrganization = async (organizationId) => {
    if (!organizationId) {
      toast.error("Organization ID is missing. Cannot delete organization.")
      return
    }

    try {
      setSubmitting(true)
      
      const response = await axios.delete(`${API_BASE_URL}/api/organizations/${organizationId}`, {
        headers: getAuthHeaders(),
        timeout: 30000,
      })

      if (response.status === 200 || response.status === 204 || response.data) {
        toast.success("Organization deleted successfully")
        fetchOrganizations()
      } else {
        toast.error("Unexpected response from server")
      }
    } catch (error) {
      console.error("Error deleting organization:", error)
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Failed to delete organization"
      toast.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      subscription_tier: "free",
      settings: null,
    })
    setSelectedOrganization(null)
  }

  const openEditDialog = async (organization) => {
    setSelectedOrganization(organization)
    const orgDetails = await fetchOrganizationDetails(organization.organization_id)
    if (orgDetails) {
      setIsEditDialogOpen(true)
    }
  }

  const openViewDialog = async (organization) => {
    setSelectedOrganization(organization)
    await fetchOrganizationDetails(organization.organization_id)
    setIsViewDialogOpen(true)
  }

  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch (error) {
      return dateString
    }
  }

  const filteredOrganizations = organizations.filter((org) => {
    // Search filter
    const orgName = org.name || ""
    const subscriptionTier = org.subscription_tier || ""
    const matchesSearch =
      !searchTerm ||
      orgName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subscriptionTier.toLowerCase().includes(searchTerm.toLowerCase())

    // Subscription tier filter
    const matchesTier =
      tierFilter === "all" ||
      (org.subscription_tier || "").toLowerCase() === tierFilter.toLowerCase()

    return matchesSearch && matchesTier
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
                        <Building className="h-6 w-6" />
                        Organization Management
                      </CardTitle>
                      <CardDescription>
                        Create, manage, and configure organizations for your system
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={fetchOrganizations} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                      </Button>
                      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                        <DialogTrigger asChild>
                          <Button onClick={resetForm}>
                            <Building2 className="h-4 w-4 mr-2" />
                            Create Organization
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Create New Organization</DialogTitle>
                            <DialogDescription>
                              Enter the organization details below. Organization name is required.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="create-name">Organization Name *</Label>
                              <Input
                                id="create-name"
                                placeholder="e.g., Acme Corporation"
                                value={formData.name}
                                onChange={(e) =>
                                  setFormData({ ...formData, name: e.target.value })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="create-subscription-tier">Subscription Tier</Label>
                              <Select
                                value={formData.subscription_tier}
                                onValueChange={(value) =>
                                  setFormData({ ...formData, subscription_tier: value })
                                }
                              >
                                <SelectTrigger id="create-subscription-tier">
                                  <SelectValue placeholder="Select subscription tier" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="free">Free</SelectItem>
                                  <SelectItem value="basic">Basic</SelectItem>
                                  <SelectItem value="pro">Pro</SelectItem>
                                  <SelectItem value="enterprise">Enterprise</SelectItem>
                                </SelectContent>
                              </Select>
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
                            <Button onClick={handleCreateOrganization} disabled={submitting}>
                              {submitting ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Creating...
                                </>
                              ) : (
                                "Create Organization"
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
                        placeholder="Search by name or subscription tier..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    
                    {/* Subscription Tier Filter */}
                    <Select value={tierFilter} onValueChange={setTierFilter}>
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Filter by tier" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Tiers</SelectItem>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="basic">Basic</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Clear Filters Button */}
                    {(tierFilter !== "all" || searchTerm) && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSearchTerm("")
                          setTierFilter("all")
                        }}
                        className="whitespace-nowrap"
                      >
                        Clear Filters
                      </Button>
                    )}
                  </div>

                  {/* Organizations Table */}
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : filteredOrganizations.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No organizations found</p>
                      {organizations.length === 0 && (
                        <p className="text-sm mt-2">Create your first organization to get started</p>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-md border overflow-hidden w-full">
                      <div className="overflow-x-auto w-full">
                        <div className="w-full [&_[data-slot=table-container]]:w-full [&_[data-slot=table]]:w-full">
                          <Table className="w-full table-auto">
                            <TableHeader>
                              <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead className="font-semibold text-foreground">Organization Name</TableHead>
                                <TableHead className="font-semibold text-foreground">Subscription Tier</TableHead>
                                <TableHead className="hidden md:table-cell font-semibold text-foreground">Created At</TableHead>
                                <TableHead className="w-[120px] whitespace-nowrap text-center font-semibold text-foreground">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredOrganizations.map((org) => {
                                const orgId = org.organization_id
                                const orgName = org.name || "N/A"
                                const subscriptionTier = org.subscription_tier || "free"
                                return (
                                  <TableRow 
                                    key={orgId}
                                    className="hover:bg-muted/30 transition-colors border-b last:border-b-0"
                                  >
                                    <TableCell className="py-4">
                                      <div className="flex items-center space-x-3">
                                        <div className="min-w-0">
                                          <span className="font-medium text-primary truncate text-sm md:text-base transition-colors">
                                            {orgName}
                                          </span>
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell className="py-4">
                                      <Badge 
                                        variant={
                                          subscriptionTier === "enterprise" ? "default" :
                                          subscriptionTier === "pro" ? "secondary" :
                                          subscriptionTier === "basic" ? "outline" :
                                          "outline"
                                        }
                                      >
                                        {subscriptionTier.charAt(0).toUpperCase() + subscriptionTier.slice(1)}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell py-4">
                                      <span className="text-sm text-muted-foreground">
                                        {formatDate(org.created_at)}
                                      </span>
                                    </TableCell>
                                    <TableCell className="w-[120px] whitespace-nowrap text-right py-4">
                                      <div className="flex items-center justify-end space-x-1">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => openViewDialog(org)}
                                          title="View"
                                          className="h-8 w-8"
                                        >
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => openEditDialog(org)}
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
                                              <AlertDialogTitle>Delete Organization</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                Are you sure you want to delete the organization{" "}
                                                <strong>{orgName}</strong>?
                                                <br />
                                                <br />
                                                This action cannot be undone.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                                              <AlertDialogAction
                                                onClick={() => handleDeleteOrganization(orgId)}
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

              {/* View Organization Dialog */}
              <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Organization Details</DialogTitle>
                    <DialogDescription>View detailed information about this organization</DialogDescription>
                  </DialogHeader>
                  {selectedOrganization && (
                    <div className="space-y-4 py-4">
                      <div>
                        <Label className="text-muted-foreground">Organization Name</Label>
                        <p className="text-sm font-medium">{selectedOrganization.name || "N/A"}</p>
                      </div>
                      <Separator />
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">Subscription Tier</Label>
                          <div className="mt-2">
                            <Badge 
                              variant={
                                selectedOrganization.subscription_tier === "enterprise" ? "default" :
                                selectedOrganization.subscription_tier === "pro" ? "secondary" :
                                selectedOrganization.subscription_tier === "basic" ? "outline" :
                                "outline"
                              }
                            >
                              {selectedOrganization.subscription_tier 
                                ? selectedOrganization.subscription_tier.charAt(0).toUpperCase() + selectedOrganization.subscription_tier.slice(1)
                                : "Free"}
                            </Badge>
                          </div>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Created At</Label>
                          <p className="text-sm font-medium">{formatDate(selectedOrganization.created_at)}</p>
                        </div>
                      </div>
                      {selectedOrganization.settings && (
                        <>
                          <Separator />
                          <div>
                            <Label className="text-muted-foreground">Settings</Label>
                            <div className="mt-2 p-3 bg-muted rounded-md">
                              <pre className="text-xs overflow-auto">
                                {JSON.stringify(selectedOrganization.settings, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </>
                      )}
                      {selectedOrganization.organization_id && (
                        <>
                          <Separator />
                          <div>
                            <Label className="text-muted-foreground">Organization ID</Label>
                            <p className="text-sm font-medium font-mono">{selectedOrganization.organization_id}</p>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                      Close
                    </Button>
                    <Button onClick={() => {
                      setIsViewDialogOpen(false)
                      openEditDialog(selectedOrganization)
                    }}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Organization
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Edit Organization Dialog */}
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Edit Organization</DialogTitle>
                    <DialogDescription>
                      Update organization information. Organization name is required.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">Organization Name *</Label>
                      <Input
                        id="edit-name"
                        placeholder="e.g., Acme Corporation"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-subscription-tier">Subscription Tier</Label>
                      <Select
                        value={formData.subscription_tier}
                        onValueChange={(value) =>
                          setFormData({ ...formData, subscription_tier: value })
                        }
                      >
                        <SelectTrigger id="edit-subscription-tier">
                          <SelectValue placeholder="Select subscription tier" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="basic">Basic</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={submitting}>
                      Cancel
                    </Button>
                    <Button onClick={handleUpdateOrganization} disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        "Update Organization"
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

