"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { authUtils } from "@/lib/auth-utils"
import { Loader2, X } from "lucide-react"
import { policiesApi } from "@/lib/api-endpoint"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://10.10.15.194:3001'

export function CreatePolicyTab({ allFeatures = [], onPolicyCreated }) {
  const [formData, setFormData] = useState({
    policy_name: "",
    policy_type: "shared",
    module: "",
    is_active: true,
  })
  const [selectedFeatures, setSelectedFeatures] = useState([])
  const [selectedModules, setSelectedModules] = useState([]) // For multiple modules
  const [submitting, setSubmitting] = useState(false)

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

  // Get features for selected module(s)
  const moduleFeatures = useMemo(() => {
    if (formData.policy_type === "shared") {
      if (selectedModules.length === 0) return []
      return allFeatures.filter(f => selectedModules.includes(f.module))
    }
    // Internal policy - single module
    if (!formData.module) return []
    return allFeatures.filter(f => f.module === formData.module)
  }, [allFeatures, formData.module, formData.policy_type, selectedModules])

  const handleFeatureToggle = (featureId) => {
    setSelectedFeatures(prev =>
      prev.includes(featureId)
        ? prev.filter(id => id !== featureId)
        : [...prev, featureId]
    )
  }

  const handleModuleChange = (value) => {
    // Check for "Select All" action
    if (value === "select_all_modules") {
      if (selectedModules.length === uniqueModules.length) {
        // Deselect all
        setSelectedModules([])
      } else {
        // Select all
        setSelectedModules([...uniqueModules])
      }
      return
    }

    const module = value
    if (formData.policy_type === "shared") {
      if (!selectedModules.includes(module)) {
        setSelectedModules(prev => [...prev, module])
        // We don't clear selected features when adding a module in shared mode
        // unless you want to force re-selection, but usually you want to keep them.
        // However, existing logic cleared them. Let's keep them for multi-select.
      }
    } else {
      setFormData({ ...formData, module })
      // Clear selected features when module changes for Internal type
      setSelectedFeatures([])
    }
  }

  const handleRemoveModule = (moduleToRemove) => {
    setSelectedModules(prev => prev.filter(m => m !== moduleToRemove))
    // Optionally remove features associated with this module
    const featuresToRemove = allFeatures
      .filter(f => f.module === moduleToRemove)
      .map(f => f.feature_id || f.id)

    setSelectedFeatures(prev => prev.filter(id => !featuresToRemove.includes(id)))
  }

  // Select All Logic
  const areAllSelected = moduleFeatures.length > 0 && moduleFeatures.every(f => selectedFeatures.includes(f.feature_id || f.id))

  const handleSelectAll = () => {
    const moduleFeatureIds = moduleFeatures.map(f => f.feature_id || f.id)

    if (areAllSelected) {
      // Deselect all visible features
      setSelectedFeatures(prev => prev.filter(id => !moduleFeatureIds.includes(id)))
    } else {
      // Select all visible features
      const newIds = moduleFeatureIds.filter(id => !selectedFeatures.includes(id))
      setSelectedFeatures(prev => [...prev, ...newIds])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validation
    if (!formData.policy_name.trim()) {
      toast.error("Policy name is required")
      return
    }

    if (selectedFeatures.length === 0) {
      toast.error("At least one feature must be selected")
      return
    }

    setSubmitting(true)

    try {
      const token = authUtils.getAuthHeader()
      if (!token) {
        toast.error("Authentication required")
        return
      }

      // Create policy with features in the payload
      const policyPayload = {
        p_name: formData.policy_name,
        type: formData.policy_type,
        is_active: formData.is_active,
        features: selectedFeatures, // Array of feature IDs
      }

      const policyResponse = await policiesApi.create(policyPayload)

      if (policyResponse.data) {
        toast.success("Policy created successfully")
      } else {
        toast.error("Failed to create policy")
        return
      }
      setFormData({
        policy_name: "",
        policy_type: "shared",
        module: "",
        is_active: true,
      })
      setSelectedFeatures([])
      setSelectedModules([])
      onPolicyCreated()
    } catch (error) {
      console.error("Error creating policy:", error)
      toast.error(error.response?.data?.message || "Failed to create policy. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = () => {
    setFormData({
      policy_name: "",
      policy_type: "shared",
      module: "",
      is_active: true,
    })
    setSelectedFeatures([])
    setSelectedModules([])
  }

  const selectedCount = selectedFeatures.length
  const featuresCount = moduleFeatures.length

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Policy</CardTitle>
        <CardDescription>
          Enter the policy details below to create a new permission policy
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Policy Name */}
          <div className="space-y-2">
            <Label htmlFor="policy_name">Policy Name *</Label>
            <Input
              id="policy_name"
              value={formData.policy_name}
              onChange={(e) => setFormData({ ...formData, policy_name: e.target.value })}
              required
              placeholder="Enter policy name"
            />
          </div>

          {/* Policy Type */}
          <div className="space-y-2">
            <Label htmlFor="policy_type">Policy Type *</Label>
            <Select
              value={formData.policy_type}
              onValueChange={(value) => {
                setFormData({ ...formData, policy_type: value, module: "" })
                setSelectedModules([])
                setSelectedFeatures([])
              }}
            >
              <SelectTrigger id="policy_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="internal">Internal</SelectItem>
                <SelectItem value="shared">Shared</SelectItem>
              </SelectContent>
            </Select>
          </div>


          {/* Select Module */}
          <div className="space-y-2">
            <Label htmlFor="module">Select Module{formData.policy_type === "shared" ? "s" : ""} *</Label>

            {formData.policy_type === "shared" && selectedModules.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2 p-2 border rounded-md bg-muted/20">
                {selectedModules.map(module => (
                  <Badge key={module} variant="secondary" className="flex items-center gap-1 pr-1">
                    {module}
                    <button
                      type="button"
                      onClick={() => handleRemoveModule(module)}
                      className="hover:bg-destructive/10 rounded-full p-0.5 transition-colors"
                    >
                      <X className="h-3 w-3" />
                      <span className="sr-only">Remove</span>
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <Select
              value={formData.policy_type === "shared" ? "" : formData.module}
              onValueChange={handleModuleChange}
            >
              <SelectTrigger id="module">
                <SelectValue placeholder={formData.policy_type === "shared" ? "Add modules..." : "Choose a module"} />
              </SelectTrigger>
              <SelectContent>
                {formData.policy_type === "shared" && (
                  <SelectItem value="select_all_modules" className="font-bold border-b mb-1">
                    {selectedModules.length === uniqueModules.length ? "Deselect All" : "Select All"}
                  </SelectItem>
                )}
                {uniqueModules.map((module) => (
                  <SelectItem
                    key={module}
                    value={module}
                    disabled={formData.policy_type === "shared" && selectedModules.includes(module)}
                  >
                    {module}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Select Features Section */}
          {(formData.module || (formData.policy_type === "shared" && selectedModules.length > 0)) && (
            <div className="space-y-4 border-t pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">
                    Select Features {formData.policy_type === "shared" ? "" : `from ${formData.module}`}
                  </h3>
                  <div className="mt-1">
                    <span className="text-sm text-muted-foreground">
                      {selectedCount} feature{selectedCount !== 1 ? 's' : ''} selected{" "}
                      {selectedCount === 0 && (
                        <span className="text-destructive">(Minimum 1 feature required)</span>
                      )}
                    </span>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-4">
                  <span>{featuresCount} feature{featuresCount !== 1 ? 's' : ''} available</span>
                  {featuresCount > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAll}
                      className="h-6 px-2 text-xs"
                    >
                      {areAllSelected ? "Deselect All" : "Select All"}
                    </Button>
                  )}
                </div>
              </div>

              {moduleFeatures.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No features available for this module</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {moduleFeatures.map((feature) => {
                    const featureId = feature.feature_id || feature.id
                    const isSelected = selectedFeatures.includes(featureId)
                    const featureName = feature.feature_name || feature.name || ""
                    const description = feature.description || ""
                    const action = feature.action || ""
                    const isActive = feature.is_active !== false

                    return (
                      <div
                        key={featureId}
                        className="flex items-start space-x-3 p-4 border rounded-md hover:bg-muted/50 transition-colors"
                      >
                        <Checkbox
                          id={`feature-${featureId}`}
                          checked={isSelected}
                          onCheckedChange={() => handleFeatureToggle(featureId)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Label
                              htmlFor={`feature-${featureId}`}
                              className="font-medium cursor-pointer"
                            >
                              {featureName}
                            </Label>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{description}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {action && (
                              <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300">
                                {action}
                              </Badge>
                            )}
                            <Badge variant={isActive ? "default" : "secondary"} className={isActive ? "bg-green-600" : ""}>
                              {isActive ? "Active" : "Inactive"}
                            </Badge>
                            <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300 font-mono text-xs">
                              {String(featureId).substring(0, 8)}...
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Requirements Box */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <h4 className="font-semibold text-sm mb-2">Requirements:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Policy name is required</li>
              {selectedCount === 0 && (
                <li className="text-destructive">At least one feature must be selected</li>
              )}
              <li>Policy will be created as active by default</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={submitting}
            >
              Reset
            </Button>
            <Button
              type="submit"
              disabled={submitting || !formData.policy_name.trim() || selectedFeatures.length === 0}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Policy"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
