"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination"
import {
  ArrowLeft,
  Loader2,
  Copy,
  Edit,
  Plus,
  Search,
  X,
  Layers,
  Hash,
  Calendar,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Shield,
} from "lucide-react"
import { authUtils } from "@/lib/auth-utils"
import { toast } from "sonner"
import { policiesApi, policyMappingApi } from "@/lib/api-endpoint"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://10.10.15.194:3001'

const SortIcon = ({ config, sortKey }) => {
  if (config.key !== sortKey) return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/30" />
  if (config.direction === 'asc') return <ChevronUp className="ml-2 h-4 w-4 text-primary" />
  if (config.direction === 'desc') return <ChevronDown className="ml-2 h-4 w-4 text-primary" />
  return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/30" />
}

export function PolicyMappingDetailTab({ mapping, onBack, onUpdate, allFeatures = [] }) {
  const [features, setFeatures] = useState([])
  const [mappingDetails, setMappingDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showUpdateSection, setShowUpdateSection] = useState(false)
  const [featuresToRemove, setFeaturesToRemove] = useState([])
  const [featuresToAdd, setFeaturesToAdd] = useState([])
  const [selectedModule, setSelectedModule] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [sortConfig, setSortConfig] = useState({ key: 'feature_name', direction: 'asc' })
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [removeSearchTerm, setRemoveSearchTerm] = useState("")
  const [addSearchTerm, setAddSearchTerm] = useState("")

  useEffect(() => {
    fetchMappingFeatures()
    fetchMappingDetails()
  }, [mapping])

  const fetchMappingDetails = async () => {
    try {
      const token = authUtils.getAuthHeader()
      if (!token) return

      const policyId = mapping.p_id || mapping.policy_id || mapping.id || mapping.policy?.p_id || mapping.policy?.policy_id || mapping.policy?.id

      // Try to fetch mapping details - might need to use policy ID to get mapping
      // For now, use the mapping object directly
      setMappingDetails(mapping)
    } catch (error) {
      console.error("Error fetching mapping details:", error)
      setMappingDetails(mapping)
    }
  }

  const fetchMappingFeatures = async (forceRefresh = false) => {
    try {
      setLoading(true)

      const policyId = mapping.p_id || mapping.policy_id || mapping.id || mapping.policy?.p_id || mapping.policy?.policy_id || mapping.policy?.id
      const token = authUtils.getAuthHeader()
      // IMPORTANT: On "View Feature" we should not hit any API.
      // Only fetch from API when we explicitly need a refresh (e.g. after updating mapping).
      if (forceRefresh && token && policyId) {
        try {
          const response = await policiesApi.getById(policyId, { skipToast: true })

          const featureData = Array.isArray(response.data)
            ? response.data
            : response.data?.data || response.data?.features || []

          setFeatures(featureData)
          return
        } catch (apiError) {
          const status = apiError?.response?.status

          // 404 is expected when endpoint is missing; silently fall back to mapping prop data
          if (status && status !== 404) {
            toast.error(apiError.response?.data?.message || "Failed to refresh mapped features")
          }

          // Fall through to use mapping prop as fallback
        }
      }

      // Use features from mapping object (already transformed from API) as fallback
      // Features can be in features array or featuresObject
      if (mapping.features && Array.isArray(mapping.features)) {
        // Features are already an array
        setFeatures(mapping.features)
      } else if (mapping.featuresObject && typeof mapping.featuresObject === 'object') {
        // Features are in object format, convert to array
        setFeatures(Object.values(mapping.featuresObject))
      } else {
        setFeatures([])
      }
    } catch (error) {
      console.error("Error fetching mapping features:", error)
      setFeatures([])
    } finally {
      setLoading(false)
    }
  }

  const policyName = mapping.p_name || mapping.policy_name || mapping.policy?.p_name || mapping.policy?.policy_name || "Unknown Policy"
  const mappingId = mapping.mapping_id || mapping.id || mapping.p_id || mapping.policy_id || ""
  const createdDate = mapping.created_at || mapping.created_date || mapping.created || ""
  const updatedDate = mapping.updated_at || mapping.updated_date || mapping.updated || ""
  const isActive = mapping.is_active !== false

  const handleClonePolicy = async () => {
    try {
      const token = authUtils.getAuthHeader()
      if (!token) {
        toast.error("Authentication required")
        return
      }

      const policyId = mapping.p_id || mapping.policy_id || mapping.id || mapping.policy?.p_id || mapping.policy?.policy_id || mapping.policy?.id

      if (!policyId) {
        toast.error("Policy ID is required")
        return
      }

      const cloneName = `${policyName}_clone`

      const response = await policyMappingApi.cloneMapping({
        id: policyId,
        clone_policy_name: cloneName,
      })

      if (response.data) {
        toast.success("Policy mapping cloned successfully")
        if (onUpdate) {
          onUpdate()
        }
        if (onBack) {
          onBack()
        }
      } else {
        toast.error("Failed to clone policy mapping")
      }
    } catch (error) {
      console.error("Error cloning policy mapping:", error)
      toast.error(error.response?.data?.message || "Failed to clone policy mapping")
    }
  }

  // Get unique modules from allFeatures
  const uniqueModules = useMemo(() => {
    const modules = new Set()
    allFeatures.forEach(f => {
      if (f.module) {
        modules.add(f.module)
      }
    })
    return Array.from(modules).sort()
  }, [allFeatures])

  // Get features available to add (not already mapped, filtered by selected module)
  const availableFeaturesToAdd = useMemo(() => {
    const mappedFeatureIds = features.map(f => f.feature_id || f.id)
    let available = allFeatures.filter(f =>
      !mappedFeatureIds.includes(f.feature_id || f.id)
    )

    if (selectedModule) {
      available = available.filter(f => f.module === selectedModule)
    }

    return available
  }, [allFeatures, features, selectedModule])

  // Filtered features based on search
  const filteredFeatures = useMemo(() => {
    if (!searchTerm) return features
    const term = searchTerm.toLowerCase()
    return features.filter(f => {
      const name = (f.feature_name || f.name || "").toLowerCase()
      const desc = (f.description || "").toLowerCase()
      const mod = (f.module || "").toLowerCase()
      const action = (f.action || "").toLowerCase()
      return name.includes(term) || desc.includes(term) || mod.includes(term) || action.includes(term)
    })
  }, [features, searchTerm])

  // Sorted features
  const sortedFeatures = useMemo(() => {
    if (!sortConfig.key || sortConfig.direction === 'none') return filteredFeatures
    return [...filteredFeatures].sort((a, b) => {
      let valA, valB
      switch (sortConfig.key) {
        case 'feature_name':
          valA = (a.feature_name || a.name || "").toLowerCase()
          valB = (b.feature_name || b.name || "").toLowerCase()
          break
        case 'description':
          valA = (a.description || "").toLowerCase()
          valB = (b.description || "").toLowerCase()
          break
        case 'module':
          valA = (a.module || "").toLowerCase()
          valB = (b.module || "").toLowerCase()
          break
        case 'action':
          valA = (a.action || "").toLowerCase()
          valB = (b.action || "").toLowerCase()
          break
        case 'is_active':
          valA = (a.is_active !== false) ? 1 : 0
          valB = (b.is_active !== false) ? 1 : 0
          break
        default:
          valA = a[sortConfig.key]
          valB = b[sortConfig.key]
      }
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredFeatures, sortConfig])

  // Pagination
  const totalPages = Math.ceil(sortedFeatures.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const paginatedFeatures = useMemo(() => sortedFeatures.slice(startIndex, startIndex + pageSize), [sortedFeatures, startIndex, pageSize])

  const handleSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc'
    else if (sortConfig.key === key && sortConfig.direction === 'desc') direction = 'none'
    setSortConfig({ key, direction })
    setCurrentPage(1)
  }

  const handleUpdateFeatures = () => {
    setShowUpdateSection(true)
    setFeaturesToRemove([])
    setFeaturesToAdd([])
    setSelectedModule("")
    setRemoveSearchTerm("")
    setAddSearchTerm("")
  }

  const handleCancelUpdate = () => {
    setShowUpdateSection(false)
    setFeaturesToRemove([])
    setFeaturesToAdd([])
    setSelectedModule("")
    setRemoveSearchTerm("")
    setAddSearchTerm("")
  }

  // Filtered features for remove list search
  const filteredRemoveFeatures = useMemo(() => {
    if (!removeSearchTerm) return features
    const term = removeSearchTerm.toLowerCase()
    return features.filter(f => {
      const name = (f.feature_name || f.name || "").toLowerCase()
      const desc = (f.description || "").toLowerCase()
      const mod = (f.module || "").toLowerCase()
      const action = (f.action || "").toLowerCase()
      return name.includes(term) || desc.includes(term) || mod.includes(term) || action.includes(term)
    })
  }, [features, removeSearchTerm])

  // Filtered features for add list search
  const filteredAddFeatures = useMemo(() => {
    if (!addSearchTerm) return availableFeaturesToAdd
    const term = addSearchTerm.toLowerCase()
    return availableFeaturesToAdd.filter(f => {
      const name = (f.feature_name || f.name || "").toLowerCase()
      const desc = (f.description || "").toLowerCase()
      const mod = (f.module || "").toLowerCase()
      const action = (f.action || "").toLowerCase()
      return name.includes(term) || desc.includes(term) || mod.includes(term) || action.includes(term)
    })
  }, [availableFeaturesToAdd, addSearchTerm])

  const handleToggleRemoveFeature = (featureId) => {
    setFeaturesToRemove(prev =>
      prev.includes(featureId)
        ? prev.filter(id => id !== featureId)
        : [...prev, featureId]
    )
  }

  const handleToggleAddFeature = (featureId) => {
    setFeaturesToAdd(prev =>
      prev.includes(featureId)
        ? prev.filter(id => id !== featureId)
        : [...prev, featureId]
    )
  }

  const handleUpdateMapping = async () => {
    try {
      const token = authUtils.getAuthHeader()
      if (!token) {
        toast.error("Authentication required")
        return
      }

      const policyId = mapping.p_id || mapping.policy_id || mapping.id || mapping.policy?.p_id || mapping.policy?.policy_id || mapping.policy?.id

      if (!policyId) {
        toast.error("Policy ID is required")
        return
      }

      const response = await policyMappingApi.updateFeatures(policyId, {
        updateData: {
          features_to_add: featuresToAdd,
          features_to_remove: featuresToRemove,
        },
      })

      if (response.data) {
        toast.success("Policy mapping updated successfully")
        setShowUpdateSection(false)
        setFeaturesToRemove([])
        setFeaturesToAdd([])
        setSelectedModule("")
        setRemoveSearchTerm("")
        setAddSearchTerm("")

        await fetchMappingFeatures(true)

        if (onUpdate) {
          onUpdate()
        }
      } else {
        toast.error("Failed to update policy mapping")
      }
    } catch (error) {
      console.error("Error updating mapping:", error)
      toast.error(error.response?.data?.message || "Failed to update policy mapping")
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onBack} className="flex items-center gap-2 -ml-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <CardTitle className="text-xl">{policyName}</CardTitle>
                <Badge variant={isActive ? "default" : "secondary"}>
                  Active Mapping
                </Badge>
              </div>
              <CardDescription className="mt-1">Policy Feature Mapping Details</CardDescription>
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
                    <p className="text-sm text-muted-foreground">Total Features</p>
                    <p className="text-2xl font-bold">{features.length}</p>
                  </div>
                  <Layers className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Mapping ID</p>
                    <p className="text-lg font-mono truncate">
                      {String(mappingId).substring(0, 12)}...
                    </p>
                  </div>
                  <Hash className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="text-lg font-bold">
                      {createdDate ? new Date(createdDate).toLocaleDateString() : "-"}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Updated</p>
                    <p className="text-lg font-bold">
                      {updatedDate ? new Date(updatedDate).toLocaleDateString() : createdDate ? new Date(createdDate).toLocaleDateString() : "-"}
                    </p>
                  </div>
                  <RefreshCw className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 mb-6">
            <Button
              variant="outline"
              onClick={handleClonePolicy}
              className="flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              Clone Policy
            </Button>
            <Button
              variant="outline"
              onClick={handleUpdateFeatures}
              className="flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              Update Features
            </Button>
          </div>

          {/* Update Policy Features Modal */}
          <Dialog open={showUpdateSection} onOpenChange={(open) => { if (!open) handleCancelUpdate() }}>
            <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Update Policy Features</DialogTitle>
                <DialogDescription>
                  Select features to add or remove from <strong>{policyName}</strong>
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                {/* Remove Features Column */}
                <div className="flex flex-col">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    Remove Features
                    <Badge variant="secondary" className="text-xs">{featuresToRemove.length} selected</Badge>
                  </h4>
                  <div className="relative mb-3">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search mapped features..."
                      value={removeSearchTerm}
                      onChange={(e) => setRemoveSearchTerm(e.target.value)}
                      className={`pl-9${removeSearchTerm ? ' pr-8' : ''}`}
                    />
                    {removeSearchTerm && (
                      <button
                        type="button"
                        onClick={() => setRemoveSearchTerm("")}
                        className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {filteredRemoveFeatures.length > 0 && (
                    <div className="flex items-center space-x-3 p-2 border rounded-md bg-muted/30 mb-2">
                      <Checkbox
                        checked={filteredRemoveFeatures.length > 0 && filteredRemoveFeatures.every(f => featuresToRemove.includes(f.feature_id || f.id))}
                        onCheckedChange={(checked) => {
                          const visibleIds = filteredRemoveFeatures.map(f => f.feature_id || f.id)
                          if (checked) {
                            setFeaturesToRemove(prev => [...new Set([...prev, ...visibleIds])])
                          } else {
                            setFeaturesToRemove(prev => prev.filter(id => !visibleIds.includes(id)))
                          }
                        }}
                      />
                      <span className="text-sm font-medium">Select All ({filteredRemoveFeatures.length})</span>
                    </div>
                  )}
                  <div className="space-y-2 max-h-[400px] overflow-y-auto flex-1 pr-1">
                    {features.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">No features to remove</p>
                    ) : filteredRemoveFeatures.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">No features match your search</p>
                    ) : (
                      filteredRemoveFeatures.map((feature) => {
                        const featureId = feature.feature_id || feature.id
                        return (
                          <div key={featureId} className="flex items-start space-x-3 p-3 border rounded-md hover:bg-muted/50">
                            <Checkbox
                              checked={featuresToRemove.includes(featureId)}
                              onCheckedChange={() => handleToggleRemoveFeature(featureId)}
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{feature.feature_name || feature.name || "-"}</p>
                              <p className="text-xs text-muted-foreground mt-1">{feature.description || "-"}</p>
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                {feature.action && (
                                  <Badge variant="outline" className="text-xs">
                                    {feature.action}
                                  </Badge>
                                )}
                                {feature.module && (
                                  <Badge variant="outline" className="text-xs">
                                    {feature.module}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>

                {/* Add Features Column */}
                <div className="flex flex-col">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    Add Features
                    <Badge variant="secondary" className="text-xs">{featuresToAdd.length} selected</Badge>
                  </h4>
                  <div className="flex gap-2 mb-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search available features..."
                        value={addSearchTerm}
                        onChange={(e) => setAddSearchTerm(e.target.value)}
                        className={`pl-9${addSearchTerm ? ' pr-8' : ''}`}
                      />
                      {addSearchTerm && (
                        <button
                          type="button"
                          onClick={() => setAddSearchTerm("")}
                          className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <Select value={selectedModule || "all"} onValueChange={(value) => setSelectedModule(value === "all" ? "" : value)}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Module" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Modules</SelectItem>
                        {uniqueModules.map((module) => (
                          <SelectItem key={module} value={module}>
                            {module}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {filteredAddFeatures.length > 0 && (
                    <div className="flex items-center space-x-3 p-2 border rounded-md bg-muted/30 mb-2">
                      <Checkbox
                        checked={filteredAddFeatures.length > 0 && filteredAddFeatures.every(f => featuresToAdd.includes(f.feature_id || f.id))}
                        onCheckedChange={(checked) => {
                          const visibleIds = filteredAddFeatures.map(f => f.feature_id || f.id)
                          if (checked) {
                            setFeaturesToAdd(prev => [...new Set([...prev, ...visibleIds])])
                          } else {
                            setFeaturesToAdd(prev => prev.filter(id => !visibleIds.includes(id)))
                          }
                        }}
                      />
                      <span className="text-sm font-medium">Select All ({filteredAddFeatures.length})</span>
                    </div>
                  )}
                  <div className="space-y-2 max-h-[400px] overflow-y-auto flex-1 pr-1">
                    {availableFeaturesToAdd.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        {selectedModule ? `No features available in ${selectedModule} module` : "No features available to add"}
                      </p>
                    ) : filteredAddFeatures.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">No features match your search</p>
                    ) : (
                      filteredAddFeatures.map((feature) => {
                        const featureId = feature.feature_id || feature.id
                        return (
                          <div key={featureId} className="flex items-start space-x-3 p-3 border rounded-md hover:bg-muted/50">
                            <Checkbox
                              checked={featuresToAdd.includes(featureId)}
                              onCheckedChange={() => handleToggleAddFeature(featureId)}
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{feature.feature_name || feature.name || "-"}</p>
                              <p className="text-xs text-muted-foreground mt-1">{feature.description || "-"}</p>
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                {feature.action && (
                                  <Badge variant="outline" className="text-xs">
                                    {feature.action}
                                  </Badge>
                                )}
                                {feature.module && (
                                  <Badge variant="outline" className="text-xs">
                                    {feature.module}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-3">
                {/* Changes Summary */}
                <div className="flex-1 text-sm text-muted-foreground">
                  Changes: <span className="font-medium text-foreground">{featuresToRemove.length} to remove</span>,{" "}
                  <span className="font-medium text-foreground">{featuresToAdd.length} to add</span>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" onClick={handleCancelUpdate}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpdateMapping}
                    className="flex items-center gap-2"
                    disabled={featuresToRemove.length === 0 && featuresToAdd.length === 0}
                  >
                    <Plus className="h-4 w-4" />
                    Update Mapping
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Mapped Features Table */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h3 className="text-lg font-semibold">Mapped Features ({filteredFeatures.length})</h3>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search features..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  className={`pl-9 bg-background${searchTerm ? ' pr-8' : ''}`}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm("")
                      setCurrentPage(1)
                    }}
                    className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">Loading features...</p>
              </div>
            ) : features.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No features mapped to this policy</p>
              </div>
            ) : filteredFeatures.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No features match your search</p>
              </div>
            ) : (
              <>
                <div className="rounded-md border overflow-hidden w-full">
                  <div className="overflow-x-auto w-full">
                    <div className="w-full [&_[data-slot=table-container]]:w-full [&_[data-slot=table]]:w-full">
                      <Table className="w-full table-auto">
                        <TableHeader>
                          <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead className="font-semibold text-foreground cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSort('feature_name')}>
                              <div className="flex items-center">
                                Feature Name
                                <SortIcon config={sortConfig} sortKey="feature_name" />
                              </div>
                            </TableHead>
                            <TableHead className="font-semibold text-foreground cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSort('description')}>
                              <div className="flex items-center">
                                Description
                                <SortIcon config={sortConfig} sortKey="description" />
                              </div>
                            </TableHead>
                            <TableHead className="font-semibold text-foreground cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSort('module')}>
                              <div className="flex items-center">
                                Module
                                <SortIcon config={sortConfig} sortKey="module" />
                              </div>
                            </TableHead>
                            <TableHead className="font-semibold text-foreground cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSort('action')}>
                              <div className="flex items-center">
                                Action
                                <SortIcon config={sortConfig} sortKey="action" />
                              </div>
                            </TableHead>
                            <TableHead className="font-semibold text-foreground cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSort('is_active')}>
                              <div className="flex items-center">
                                Status
                                <SortIcon config={sortConfig} sortKey="is_active" />
                              </div>
                            </TableHead>
                            <TableHead className="font-semibold text-foreground">Feature ID</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedFeatures.map((feature) => (
                            <TableRow
                              key={feature.feature_id || feature.id}
                              className="hover:bg-muted/30 transition-colors border-b last:border-b-0"
                            >
                              <TableCell className="py-4">
                                <span className="font-medium text-primary">{feature.feature_name || feature.name || "-"}</span>
                              </TableCell>
                              <TableCell className="py-4">
                                <span className="text-sm text-muted-foreground">{feature.description || "-"}</span>
                              </TableCell>
                              <TableCell className="py-4">
                                {feature.module ? (
                                  <Badge variant="outline">
                                    {feature.module}
                                  </Badge>
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                              <TableCell className="py-4">
                                {feature.action ? (
                                  <Badge variant="outline">
                                    {feature.action}
                                  </Badge>
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                              <TableCell className="py-4">
                                <Badge variant={feature.is_active !== false ? "default" : "secondary"}>
                                  {feature.is_active !== false ? "Active" : "Inactive"}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-4">
                                <span className="font-mono text-xs text-muted-foreground">
                                  {String(feature.feature_id || feature.id || "").substring(0, 8)}...
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>

                {/* Pagination */}
                {filteredFeatures.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-4 border-t bg-muted/5 mt-3">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Select
                          value={pageSize.toString()}
                          onValueChange={(value) => {
                            setPageSize(parseInt(value))
                            setCurrentPage(1)
                          }}
                        >
                          <SelectTrigger className="w-[80px] h-9 rounded-xl shadow-none">
                            <SelectValue placeholder="Size" />
                          </SelectTrigger>
                          <SelectContent>
                            {[5, 10, 15, 20].map((size) => (
                              <SelectItem key={size} value={size.toString()}>
                                {size}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-sm text-muted-foreground">per page</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Showing {Math.min(startIndex + 1, filteredFeatures.length)} to {Math.min(startIndex + pageSize, filteredFeatures.length)} of {filteredFeatures.length} features
                      </div>
                    </div>

                    <Pagination className="w-auto mx-0">
                      <PaginationContent>
                        <PaginationItem>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            className="gap-1 rounded-lg h-9"
                          >
                            <ChevronLeft className="h-4 w-4" />
                            <span>Previous</span>
                          </Button>
                        </PaginationItem>

                        <div className="flex items-center gap-1 mx-2">
                          {totalPages <= 5 ? (
                            Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  isActive={currentPage === page}
                                  onClick={() => setCurrentPage(page)}
                                  className="cursor-pointer h-9 w-9 text-xs rounded-lg"
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            ))
                          ) : (
                            <>
                              <PaginationItem>
                                <PaginationLink
                                  isActive={currentPage === 1}
                                  onClick={() => setCurrentPage(1)}
                                  className="cursor-pointer h-9 w-9 text-xs rounded-lg"
                                >
                                  1
                                </PaginationLink>
                              </PaginationItem>
                              {currentPage > 3 && <PaginationEllipsis />}
                              {Array.from({ length: 3 }, (_, i) => {
                                let page
                                if (currentPage <= 2) page = 2 + i
                                else if (currentPage >= totalPages - 1) page = totalPages - 3 + i
                                else page = currentPage - 1 + i
                                if (page <= 1 || page >= totalPages) return null
                                return (
                                  <PaginationItem key={page}>
                                    <PaginationLink
                                      isActive={currentPage === page}
                                      onClick={() => setCurrentPage(page)}
                                      className="cursor-pointer h-9 w-9 text-xs rounded-lg"
                                    >
                                      {page}
                                    </PaginationLink>
                                  </PaginationItem>
                                )
                              })}
                              {currentPage < totalPages - 2 && <PaginationEllipsis />}
                              <PaginationItem>
                                <PaginationLink
                                  isActive={currentPage === totalPages}
                                  onClick={() => setCurrentPage(totalPages)}
                                  className="cursor-pointer h-9 w-9 text-xs rounded-lg"
                                >
                                  {totalPages}
                                </PaginationLink>
                              </PaginationItem>
                            </>
                          )}
                        </div>

                        <PaginationItem>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            className="gap-1 rounded-lg h-9"
                          >
                            <span>Next</span>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

