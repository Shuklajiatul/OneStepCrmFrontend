"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Loader2, FileText, Copy, Edit, Plus } from "lucide-react"
import axios from "axios"
import { authUtils } from "@/lib/auth-utils"
import { toast } from "sonner"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://10.10.15.194:3001'

export function PolicyMappingDetailTab({ mapping, onBack, onUpdate, allFeatures = [] }) {
  const [features, setFeatures] = useState([])
  const [mappingDetails, setMappingDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showUpdateSection, setShowUpdateSection] = useState(false)
  const [featuresToRemove, setFeaturesToRemove] = useState([])
  const [featuresToAdd, setFeaturesToAdd] = useState([])
  const [selectedModule, setSelectedModule] = useState("")

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

  const fetchMappingFeatures = async () => {
    try {
      setLoading(true)
      
      // Use features from mapping object (already transformed from API)
      // Features can be in features array or featuresObject
      if (mapping.features && Array.isArray(mapping.features)) {
        // Features are already an array
        setFeatures(mapping.features)
      } else if (mapping.featuresObject && typeof mapping.featuresObject === 'object') {
        // Features are in object format, convert to array
        setFeatures(Object.values(mapping.featuresObject))
      } else {
        // Try to fetch from API as fallback
      const token = authUtils.getAuthHeader()
        if (!token) {
          setFeatures([])
          return
        }

        const policyId = mapping.p_id || mapping.policy_id || mapping.id || mapping.policy?.p_id || mapping.policy?.policy_id || mapping.policy?.id
        
        try {
          const response = await axios.get(`${API_BASE_URL}/api/policies/${policyId}/features`, {
        headers: { Authorization: token, "Content-Type": "application/json" },
      })

      const featureData = Array.isArray(response.data)
        ? response.data
        : response.data?.data || response.data?.features || []

      setFeatures(featureData)
        } catch (apiError) {
          console.error("Error fetching features from API:", apiError)
          setFeatures([])
        }
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

      const response = await axios.post(
        `${API_BASE_URL}/api/policyMapping/clonePolicyfeatureMapping`,
        {
          id: policyId,
          clone_policy_name: cloneName,
        },
        {
          headers: { Authorization: token, "Content-Type": "application/json" },
        }
      )

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

  const handleUpdateFeatures = () => {
    setShowUpdateSection(true)
    setFeaturesToRemove([])
    setFeaturesToAdd([])
    setSelectedModule("")
  }

  const handleCancelUpdate = () => {
    setShowUpdateSection(false)
    setFeaturesToRemove([])
    setFeaturesToAdd([])
    setSelectedModule("")
  }

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

      // Use PUT API to update policy feature mapping
      const response = await axios.put(
        `${API_BASE_URL}/api/policyMapping/update/${policyId}`,
        {
          updateData: {
            features_to_add: featuresToAdd,
            features_to_remove: featuresToRemove,
          },
        },
        {
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        }
      )

      if (response.data) {
        toast.success("Policy mapping updated successfully")
        setShowUpdateSection(false)
        setFeaturesToRemove([])
        setFeaturesToAdd([])
        setSelectedModule("")
        
        // Refresh features
        await fetchMappingFeatures()
        
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
                  <FileText className="h-8 w-8 text-primary" />
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
                  <FileText className="h-8 w-8 text-primary" />
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
                  <FileText className="h-8 w-8 text-primary" />
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
                  <FileText className="h-8 w-8 text-primary" />
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

          {/* Update Policy Features Section */}
          {showUpdateSection && (
            <div className="mb-6 p-6 border rounded-lg bg-muted/30">
              <h3 className="text-lg font-semibold mb-4">Update Policy Features</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Remove Features Column */}
                <div>
                  <h4 className="font-medium mb-3">Remove Features</h4>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {features.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No features to remove</p>
                    ) : (
                      features.map((feature) => {
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
                <div>
                  <h4 className="font-medium mb-3">Add Features</h4>
                  <div className="mb-4">
                    <Select value={selectedModule || "all"} onValueChange={(value) => setSelectedModule(value === "all" ? "" : value)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select module to add features" />
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
                  <div className="space-y-3 max-h-[200px] overflow-y-auto">
                    {availableFeaturesToAdd.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {selectedModule ? `No features available in ${selectedModule} module` : "No features available to add"}
                      </p>
                    ) : (
                      availableFeaturesToAdd.map((feature) => {
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

              {/* Changes Summary */}
              <div className="mb-4 p-3 bg-background rounded-md border">
                <p className="text-sm text-muted-foreground">
                  Changes: <span className="font-medium text-foreground">{featuresToRemove.length} to remove</span>,{" "}
                  <span className="font-medium text-foreground">{featuresToAdd.length} to add</span>
                </p>
              </div>

              {/* Action Buttons */}
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
            </div>
          )}

          {/* Mapped Features Table */}
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Mapped Features ({features.length})</h3>
            </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Loading features...</p>
          </div>
            ) : features.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No features mapped to this policy</p>
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden w-full">
                <div className="overflow-x-auto w-full">
                  <div className="w-full [&_[data-slot=table-container]]:w-full [&_[data-slot=table]]:w-full">
                    <Table className="w-full table-auto">
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="font-semibold text-foreground">Feature Name</TableHead>
                          <TableHead className="font-semibold text-foreground">Description</TableHead>
                          <TableHead className="font-semibold text-foreground">Module</TableHead>
                          <TableHead className="font-semibold text-foreground">Action</TableHead>
                          <TableHead className="font-semibold text-foreground">Status</TableHead>
                          <TableHead className="font-semibold text-foreground">Feature ID</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {features.map((feature) => (
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
            )}
          </div>
      </CardContent>
    </Card>
    </div>
  )
}

