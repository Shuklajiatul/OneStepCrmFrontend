"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
// authUtils removed as it was only used for manual headers
import { featuresApi } from "@/lib/api-endpoint"
import {
  Shield,
  ShieldPlus,
  Edit,
  Trash2,
  RefreshCw,
  Search,
  Eye,
  Loader2,
  ArrowLeft,
  Clock,
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
import { Switch } from "@/components/ui/switch"



export default function FeaturePage() {
  const [features, setFeatures] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [moduleFilter, setModuleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedFeature, setSelectedFeature] = useState(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    feature_name: "",
    action: "",
    description: "",
    module: "",
    is_active: true,
  })
  const [submitting, setSubmitting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(5)
  const [totalResults, setTotalResults] = useState(0)

  useEffect(() => {
    fetchFeatures()
  }, [])



  const fetchFeatures = async () => {
    try {
      setLoading(true)
      const response = await featuresApi.getAll()

      if (response.data) {
        const featureData = Array.isArray(response.data)
          ? response.data
          : response.data.data || response.data.features || []
        setFeatures(featureData)
        setTotalResults(featureData.length)
        console.log("Features fetched:", featureData)
      }
    } catch (error) {
      console.error("Error fetching features:", error)
      if (error.response?.status === 404) {
        toast.info("Features API endpoint not found. Using demo mode.")
        setFeatures([])
        setTotalResults(0)
      } else if (error.response?.status === 401) {
        toast.error("Session expired. Please login again.")
      } else {
        toast.error("Failed to fetch features. Please check your connection and authentication.")
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchFeatureDetails = async (featureId) => {
    try {
      const response = await featuresApi.getById(featureId)

      if (response.data) {
        const featureData = response.data.data || response.data
        setSelectedFeature(featureData)
        setFormData({
          feature_name: featureData.feature_name || featureData.name || "",
          action: featureData.action || "",
          description: featureData.description || "",
          module: featureData.module || "",
          is_active: featureData.is_active !== undefined ? featureData.is_active : true,
        })
        return featureData
      }
    } catch (error) {
      console.error("Error fetching feature details:", error)
      toast.error("Failed to fetch feature details")
      return null
    }
  }

  const handleCreateFeature = async () => {
    if (!formData.feature_name || formData.feature_name.trim() === "") {
      toast.error("Feature name is required")
      return
    }

    if (!formData.action || formData.action.trim() === "") {
      toast.error("Action is required")
      return
    }

    if (!formData.module || formData.module.trim() === "") {
      toast.error("Module is required")
      return
    }

    try {
      setSubmitting(true)
      const payload = {
        feature_name: formData.feature_name.trim(),
        action: formData.action.trim(),
        description: formData.description.trim() || "",
        module: formData.module.trim(),
        is_active: formData.is_active !== undefined ? formData.is_active : true,
      }

      const response = await featuresApi.create(payload)

      if (response.data) {
        toast.success("Feature created successfully")
        setIsCreateDialogOpen(false)
        resetForm()
        fetchFeatures()
      }
    } catch (error) {
      console.error("Error creating feature:", error)
      const errorMessage =
        error.response?.data?.message || error.response?.data?.error || "Failed to create feature"
      toast.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleStatus = async (featureId, currentStatus) => {
    if (!featureId) {
      toast.error("Feature ID is missing. Cannot update status.")
      return
    }

    try {
      const newStatus = !currentStatus
      const payload = {
        is_active: newStatus,
      }

      const response = await featuresApi.update(featureId, payload)

      if (response.data) {
        toast.success(`Feature ${newStatus ? "activated" : "deactivated"} successfully`)
        fetchFeatures()
      }
    } catch (error) {
      console.error("Error updating feature status:", error)
      const errorMessage =
        error.response?.data?.message || error.response?.data?.error || "Failed to update feature status"
      toast.error(errorMessage)
      fetchFeatures()
    }
  }

  const handleUpdateFeature = async () => {
    if (!selectedFeature?.feature_id && !selectedFeature?.id) return

    if (!formData.feature_name || formData.feature_name.trim() === "") {
      toast.error("Feature name is required")
      return
    }

    if (!formData.action || formData.action.trim() === "") {
      toast.error("Action is required")
      return
    }

    if (!formData.module || formData.module.trim() === "") {
      toast.error("Module is required")
      return
    }

    try {
      setSubmitting(true)
      const featureId = selectedFeature.feature_id || selectedFeature.id

      const payload = {
        feature_name: formData.feature_name.trim(),
        action: formData.action.trim(),
        description: formData.description.trim() || "",
        module: formData.module.trim(),
        is_active: formData.is_active !== undefined ? formData.is_active : true,
      }

      const response = await featuresApi.update(featureId, payload)

      if (response.data) {
        toast.success("Feature updated successfully")
        setIsEditDialogOpen(false)
        resetForm()
        fetchFeatures()
      }
    } catch (error) {
      console.error("Error updating feature:", error)
      const errorMessage =
        error.response?.data?.message || error.response?.data?.error || "Failed to update feature"
      toast.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteFeature = async (featureId) => {
    if (!featureId) {
      toast.error("Feature ID is missing. Cannot delete feature.")
      return
    }

    try {
      setSubmitting(true)

      const response = await featuresApi.delete(featureId)

      if (response.status === 200 || response.status === 204 || response.data) {
        toast.success("Feature deleted successfully")
        fetchFeatures()
      } else {
        toast.error("Unexpected response from server")
      }
    } catch (error) {
      console.error("Error deleting feature:", error)
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Failed to delete feature"
      toast.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      feature_name: "",
      action: "",
      description: "",
      module: "",
      is_active: true,
    })
    setSelectedFeature(null)
  }

  const openEditDialog = async (feature) => {
    setSelectedFeature(feature)
    const featureDetails = await fetchFeatureDetails(feature.feature_id || feature.id)
    if (featureDetails) {
      setIsEditDialogOpen(true)
    }
  }

  const openViewDialog = async (feature) => {
    setSelectedFeature(feature)
    await fetchFeatureDetails(feature.feature_id || feature.id)
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
      })
    } catch (error) {
      return dateString
    }
  }

  const filteredFeatures = features.filter((feature) => {
    const featureName = feature.feature_name || feature.name || ""
    const description = feature.description || ""
    const featureModule = feature.module || ""
    const matchesSearch =
      !searchTerm ||
      featureName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      featureModule.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesModule =
      moduleFilter === "all" ||
      (feature.featureModule || "").toLowerCase() === moduleFilter.toLowerCase()

    const featureStatus = feature.is_active !== undefined ? feature.is_active : true
    const statusString = featureStatus ? "active" : "inactive"
    const matchesStatus =
      statusFilter === "all" ||
      statusString === statusFilter.toLowerCase()

    return matchesSearch && matchesModule && matchesStatus
  })

  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedFeatures = filteredFeatures.slice(startIndex, endIndex)
  const totalPages = Math.ceil(filteredFeatures.length / pageSize)

  const uniqueModules = [...new Set(features.map(f => f.module).filter(Boolean))]

  return (
    <main className="min-h-screen bg-background">
      <div className="flex-1 p-4 md:p-6 bg-background">
        <div className="container mx-auto py-4 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.history.back()}
                      className="h-8 w-8">
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    Feature Management
                  </CardTitle>
                  <CardDescription>
                    Create, manage, and configure features for your system
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={fetchFeatures} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                  <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={resetForm}>
                        <ShieldPlus className="h-4 w-4 mr-2" />
                        Create New Feature
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Create New Feature</DialogTitle>
                        <DialogDescription>
                          Enter the feature details below. Feature name, action, and module are required.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="create-feature-name">Feature Name *</Label>
                          <Input
                            id="create-feature-name"
                            placeholder="e.g., ticket_Create, tasks_view"
                            value={formData.feature_name}
                            onChange={(e) =>
                              setFormData({ ...formData, feature_name: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="create-action">Action *</Label>
                          <Input
                            id="create-action"
                            placeholder="e.g., create, view, update, delete"
                            value={formData.action}
                            onChange={(e) =>
                              setFormData({ ...formData, action: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="create-description">Description</Label>
                          <Input
                            id="create-description"
                            placeholder="e.g., ticket creations"
                            value={formData.description}
                            onChange={(e) =>
                              setFormData({ ...formData, description: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="create-module">Module *</Label>
                          <Input
                            id="create-module"
                            placeholder="e.g., ticket, task, organization"
                            value={formData.module}
                            onChange={(e) =>
                              setFormData({ ...formData, module: e.target.value })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between space-x-2 py-2">
                          <Label htmlFor="create-is-active" className="flex-1">
                            Active Status
                          </Label>
                          <Switch
                            id="create-is-active"
                            checked={formData.is_active}
                            onCheckedChange={(checked) =>
                              setFormData({ ...formData, is_active: checked })
                            }
                          />
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
                        <Button onClick={handleCreateFeature} disabled={submitting}>
                          {submitting ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            "Create Feature"
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, description, or module..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={moduleFilter} onValueChange={setModuleFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by module" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modules</SelectItem>
                    {uniqueModules.map((module) => (
                      <SelectItem key={module} value={module.toLowerCase()}>
                        {module}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>

                {(moduleFilter !== "all" || statusFilter !== "all" || searchTerm) && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("")
                      setModuleFilter("all")
                      setStatusFilter("all")
                    }}
                    className="whitespace-nowrap"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredFeatures.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No features found</p>
                  {features.length === 0 && (
                    <p className="text-sm mt-2">Create your first feature to get started</p>
                  )}
                </div>
              ) : (
                <>
                  <div className="rounded-md border overflow-hidden w-full">
                    <div className="overflow-x-auto w-full">
                      <Table className="w-full table-auto">
                        <TableHeader>
                          <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead className="font-semibold text-foreground">FEATURE NAME</TableHead>
                            <TableHead className="font-semibold text-foreground">DESCRIPTION</TableHead>
                            <TableHead className="font-semibold text-foreground">MODULE</TableHead>
                            <TableHead className="font-semibold text-foreground">CREATED AT</TableHead>
                            <TableHead className="font-semibold text-foreground">STATUS</TableHead>
                            <TableHead className="w-[120px] whitespace-nowrap text-center font-semibold text-foreground">ACTION</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedFeatures.map((feature) => {
                            const featureId = feature.feature_id || feature.id
                            const featureName = feature.feature_name || feature.name || "N/A"
                            const isActive = feature.is_active !== undefined ? feature.is_active : true
                            const status = isActive ? "active" : "inactive"
                            return (
                              <TableRow
                                key={featureId}
                                className="hover:bg-muted/30 transition-colors border-b last:border-b-0"
                              >
                                <TableCell className="py-4">
                                  <span className="font-medium text-primary truncate text-sm md:text-base">
                                    {featureName}
                                  </span>
                                </TableCell>
                                <TableCell className="py-4">
                                  <span className="text-sm text-muted-foreground">
                                    {feature.description || "N/A"}
                                  </span>
                                </TableCell>
                                <TableCell className="py-4">
                                  <Badge variant="outline">
                                    {feature.module || "N/A"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-4">
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">
                                      {formatDate(feature.created_at)}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="py-4">
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={isActive}
                                      onCheckedChange={() => handleToggleStatus(featureId, isActive)}
                                      disabled={submitting}
                                    />
                                    <span className="text-sm text-muted-foreground">
                                      {status.charAt(0).toUpperCase() + status.slice(1)}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="w-[120px] whitespace-nowrap text-right py-4">
                                  <div className="flex items-center justify-end space-x-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => openViewDialog(feature)}
                                      title="View"
                                      className="h-8 w-8"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                                        >
                                          Delete
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Delete Feature</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Are you sure you want to delete the feature{" "}
                                            <strong>{featureName}</strong>?
                                            <br />
                                            <br />
                                            This action cannot be undone.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => handleDeleteFeature(featureId)}
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

                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {startIndex + 1} to {Math.min(endIndex, filteredFeatures.length)} of {filteredFeatures.length} results
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Feature Details</DialogTitle>
                <DialogDescription>View detailed information about this feature</DialogDescription>
              </DialogHeader>
              {selectedFeature && (
                <div className="space-y-4 py-4">
                  <div>
                    <Label className="text-muted-foreground">Feature Name</Label>
                    <p className="text-sm font-medium">{selectedFeature.feature_name || selectedFeature.name || "N/A"}</p>
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-muted-foreground">Action</Label>
                    <p className="text-sm font-medium">{selectedFeature.action || "N/A"}</p>
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-muted-foreground">Description</Label>
                    <p className="text-sm font-medium">{selectedFeature.description || "N/A"}</p>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Module</Label>
                      <div className="mt-2">
                        <Badge variant="outline">
                          {selectedFeature.module || "N/A"}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Status</Label>
                      <div className="mt-2">
                        <Badge
                          variant={(selectedFeature.is_active !== undefined ? selectedFeature.is_active : true) ? "default" : "secondary"}
                          className={(selectedFeature.is_active !== undefined ? selectedFeature.is_active : true) ? "bg-green-500 hover:bg-green-600" : ""}
                        >
                          {(selectedFeature.is_active !== undefined ? selectedFeature.is_active : true) ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-muted-foreground">Created At</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium">{formatDate(selectedFeature.created_at)}</p>
                    </div>
                  </div>
                  {(selectedFeature.feature_id || selectedFeature.id) && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-muted-foreground">Feature ID</Label>
                        <p className="text-sm font-medium font-mono">{selectedFeature.feature_id || selectedFeature.id}</p>
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
                  openEditDialog(selectedFeature)
                }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Feature
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Feature</DialogTitle>
                <DialogDescription>
                  Update feature information. Feature name, action, and module are required.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-feature-name">Feature Name *</Label>
                  <Input
                    id="edit-feature-name"
                    placeholder="e.g., ticket_Create, tasks_view"
                    value={formData.feature_name}
                    onChange={(e) => setFormData({ ...formData, feature_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-action">Action *</Label>
                  <Input
                    id="edit-action"
                    placeholder="e.g., create, view, update, delete"
                    value={formData.action}
                    onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Input
                    id="edit-description"
                    placeholder="e.g., ticket creations"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-module">Module *</Label>
                  <Input
                    id="edit-module"
                    placeholder="e.g., ticket, task, organization"
                    value={formData.module}
                    onChange={(e) => setFormData({ ...formData, module: e.target.value })}
                  />
                </div>
                <div className="flex items-center justify-between space-x-2 py-2">
                  <Label htmlFor="edit-is-active" className="flex-1">
                    Active Status
                  </Label>
                  <Switch
                    id="edit-is-active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_active: checked })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateFeature} disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Feature"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </main>
  )
}