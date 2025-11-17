"use client"

import { useState, useMemo } from "react"
import { Users, Link as LinkIcon, FileText, CheckCircle2, AlertTriangle, BarChart3, Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import axios from "axios"
import { authUtils } from "@/lib/auth-utils"
import { toast } from "sonner"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://10.10.15.194:3001'

export function PolicyOverview({ policies, policyFeatureMappings, allFeatures, userCounts, onModuleClick, onViewMappedUsers, onMappingClick, onEditPolicy, onDeletePolicy, onPolicyUpdate }) {
  const [activeTab, setActiveTab] = useState("all-policies")
  const [currentPageAllPolicies, setCurrentPageAllPolicies] = useState(1)
  const [currentPageFeatureMappings, setCurrentPageFeatureMappings] = useState(1)
  const [pageSize] = useState(5)

  const activePolicies = policies.filter(p => p.is_active !== false)
  const inactivePolicies = policies.filter(p => p.is_active === false)

  // Group features by module
  const moduleGroups = allFeatures.reduce((acc, feature) => {
    const module = feature.module || "Uncategorized"
    if (!acc[module]) {
      acc[module] = { total: 0, active: 0, inactive: 0 }
    }
    acc[module].total++
    if (feature.is_active !== false) {
      acc[module].active++
    } else {
      acc[module].inactive++
    }
    return acc
  }, {})

  const totalMappings = policyFeatureMappings.length

  // Convert module groups to array for carousel
  const moduleGroupsArray = Object.entries(moduleGroups).map(([module, stats]) => ({
    module,
    ...stats
  }))

  // Pagination for All Policies
  const allPoliciesStartIndex = (currentPageAllPolicies - 1) * pageSize
  const allPoliciesEndIndex = allPoliciesStartIndex + pageSize
  const paginatedAllPolicies = useMemo(() => {
    return policies.slice(allPoliciesStartIndex, allPoliciesEndIndex)
  }, [policies, allPoliciesStartIndex, allPoliciesEndIndex])
  const totalPagesAllPolicies = Math.ceil(policies.length / pageSize)

  // Pagination for Policy Feature Mappings
  const featureMappingsStartIndex = (currentPageFeatureMappings - 1) * pageSize
  const featureMappingsEndIndex = featureMappingsStartIndex + pageSize
  const paginatedFeatureMappings = useMemo(() => {
    return policies.slice(featureMappingsStartIndex, featureMappingsEndIndex)
  }, [policies, featureMappingsStartIndex, featureMappingsEndIndex])
  const totalPagesFeatureMappings = Math.ceil(policies.length / pageSize)

  // Reset to page 1 when switching tabs
  const handleTabChange = (value) => {
    setActiveTab(value)
    setCurrentPageAllPolicies(1)
    setCurrentPageFeatureMappings(1)
  }

  const handleToggleStatus = async (policy, newStatus) => {
    try {
      const token = authUtils.getAuthHeader()
      if (!token) {
        toast.error("Authentication required")
        return
      }

      const policyId = policy.p_id || policy.policy_id || policy.id
      if (!policyId) {
        toast.error("Policy ID is required")
        return
      }

      await axios.put(
        `${API_BASE_URL}/api/policies/${policyId}`,
        { is_active: newStatus },
        {
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        }
      )

      toast.success(`Policy ${newStatus ? "activated" : "deactivated"} successfully`)

      // Call update callback to refresh data
      if (onPolicyUpdate) {
        onPolicyUpdate()
      }
    } catch (error) {
      console.error("Error updating policy status:", error)
      toast.error(error.response?.data?.message || "Failed to update policy status")
      // Revert the switch state on error
    }
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Policies</p>
                <p className="text-2xl font-bold">{policies.length}</p>
                <p className="text-xs text-muted-foreground mt-1">{activePolicies.length} active</p>
              </div>
              <FileText className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Policies</p>
                <p className="text-2xl font-bold">{activePolicies.length}</p>
                <p className="text-xs text-muted-foreground mt-1">{inactivePolicies.length} inactive</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inactive Policies</p>
                <p className="text-2xl font-bold">{inactivePolicies.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Require attention</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Policy Mappings</p>
                <p className="text-2xl font-bold">{totalMappings}</p>
                <p className="text-xs text-muted-foreground mt-1">Active configurations</p>
              </div>
              <LinkIcon className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* // Feature Modules Section with Carousel */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Modules</CardTitle>
          <CardDescription>
            Total {Object.keys(moduleGroups).length} modules, {allFeatures.length} features
          </CardDescription>
        </CardHeader>
        <CardContent>
          {moduleGroupsArray.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No feature modules found</p>
            </div>
          ) : (
            <div className="relative">
              <Carousel 
                className="w-full"
                opts={{
                  align: "start",
                  slidesToScroll: 4 // Move 4 modules at a time
                }}
              >
                <CarouselContent>
                  {moduleGroupsArray.map(({ module, total, active, inactive }, index) => (
                    <CarouselItem key={module} className="md:basis-1/2 lg:basis-1/4">
                      <div className="p-1">
                        <Card
                          className="cursor-pointer hover:bg-muted/50 transition-colors h-full"
                          onClick={() => onModuleClick(module)}
                        >
                          <CardContent className="p-4 flex flex-col justify-between h-full">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-base mb-2">{module}</p>
                                <div className="space-y-1">
                                  <p className="text-sm text-muted-foreground">
                                    <span className="font-semibold text-foreground">{total}</span> total features
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    <span className="font-medium text-green-600">{active}</span> active,{" "}
                                    <span className="font-medium text-orange-600">{inactive}</span> inactive
                                  </p>
                                </div>
                              </div>
                              <BarChart3 className="h-6 w-6 text-primary ml-2 flex-shrink-0" />
                            </div>
                            <div className="mt-3 pt-2 border-t border-border">
                              <p className="text-xs text-muted-foreground text-center">
                                Click to view details
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                
                {/* Navigation arrows inside Carousel */}
                <div className="absolute top-1/2 left-0 right-0 flex justify-between -translate-y-1/2 pointer-events-none z-10">
                  <div className="pointer-events-auto">
                    <CarouselPrevious className="relative static transform-none -translate-y-0 bg-background/80 hover:bg-background" />
                  </div>
                  <div className="pointer-events-auto">
                    <CarouselNext className="relative static transform-none -translate-y-0 bg-background/80 hover:bg-background" />
                  </div>
                </div>
              </Carousel>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Policies Section with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Policies</CardTitle>
          <CardDescription>Manage policies and their feature mappings</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList>
              <TabsTrigger value="all-policies">All Policies</TabsTrigger>
              <TabsTrigger value="feature-mappings">Policy Feature Mappings</TabsTrigger>
            </TabsList>

            <TabsContent value="all-policies" className="mt-6">
              {policies.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No policies found</p>
                </div>
              ) : (
                <>
                  <div className="rounded-md border overflow-hidden w-full">
                    <div className="overflow-x-auto w-full">
                      <div className="w-full [&_[data-slot=table-container]]:w-full [&_[data-slot=table]]:w-full">
                        <Table className="w-full table-auto">
                          <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                              <TableHead className="font-semibold text-foreground">Policy Name</TableHead>
                              <TableHead className="font-semibold text-foreground">Type</TableHead>
                              <TableHead className="font-semibold text-foreground">Mapped Users</TableHead>
                              <TableHead className="font-semibold text-foreground">Status</TableHead>
                              <TableHead className="hidden md:table-cell font-semibold text-foreground">Created</TableHead>
                              <TableHead className="hidden md:table-cell font-semibold text-foreground">Updated</TableHead>
                              <TableHead className="whitespace-nowrap text-center font-semibold text-foreground">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedAllPolicies.map((policy) => {
                              const policyId = policy.p_id || policy.policy_id || policy.id
                              const userCount = userCounts[policyId] || 0
                              const policyName = policy.p_name || policy.policy_name || policy.name || "Unnamed Policy"
                              return (
                                <TableRow
                                  key={policyId}
                                  className="hover:bg-muted/30 transition-colors border-b last:border-b-0"
                                >
                                  <TableCell className="py-4">
                                    <div className="flex items-center space-x-3">
                                      <div className="min-w-0">
                                        <span className="font-medium text-primary truncate text-sm md:text-base">
                                          {policyName}
                                        </span>
                                        {policyId && (
                                          <div className="text-xs text-muted-foreground mt-1">{String(policyId).substring(0, 8)}...</div>
                                        )}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-4">
                                    <Badge variant={(policy.type || policy.policy_type) === "shared" ? "default" : "secondary"}>
                                      {policy.type || policy.policy_type || "internal"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="py-4">
                                    <div className="flex items-center gap-2">
                                      <Users className="h-4 w-4 text-muted-foreground" />
                                      <span>{userCount} users</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-4">
                                    <div className="flex items-center gap-2">
                                      <Switch
                                        checked={policy.is_active !== false}
                                        onCheckedChange={(checked) => handleToggleStatus(policy, checked)}
                                      />
                                      <span className="text-sm text-muted-foreground">
                                        {policy.is_active !== false ? "Active" : "Inactive"}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell py-4">
                                    <span className="text-sm text-muted-foreground">
                                      {policy.created_at ? new Date(policy.created_at).toLocaleDateString() : "-"}
                                    </span>
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell py-4">
                                    <span className="text-sm text-muted-foreground">
                                      {policy.updated_at ? new Date(policy.updated_at).toLocaleDateString() : "-"}
                                    </span>
                                  </TableCell>
                                  <TableCell
                                    className="whitespace-nowrap text-center py-4"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="flex items-center justify-center gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onViewMappedUsers(policy)}
                                        className="flex items-center gap-2"
                                      >
                                        View Mapped Users
                                      </Button>
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

                  {/* Pagination for All Policies */}
                  {policies.length > pageSize && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">
                        Showing {allPoliciesStartIndex + 1} to {Math.min(allPoliciesEndIndex, policies.length)} of {policies.length} results
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPageAllPolicies(prev => Math.max(1, prev - 1))}
                          disabled={currentPageAllPolicies === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPageAllPolicies(prev => Math.min(totalPagesAllPolicies, prev + 1))}
                          disabled={currentPageAllPolicies === totalPagesAllPolicies}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="feature-mappings" className="mt-6">
              {policies.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <LinkIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No policies found</p>
                </div>
              ) : (
                <>
                  <div className="rounded-md border overflow-hidden w-full">
                    <div className="overflow-x-auto w-full">
                      <div className="w-full [&_[data-slot=table-container]]:w-full [&_[data-slot=table]]:w-full">
                        <Table className="w-full table-auto">
                          <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                              <TableHead className="font-semibold text-foreground">Policy Name</TableHead>
                              <TableHead className="font-semibold text-foreground">Policy Type</TableHead>
                              <TableHead className="font-semibold text-foreground">Mapped Features</TableHead>
                              <TableHead className="font-semibold text-foreground">Mapped Users</TableHead>
                              <TableHead className="font-semibold text-foreground">Status</TableHead>
                              <TableHead className="hidden md:table-cell font-semibold text-foreground">Last Modified</TableHead>
                              <TableHead className="whitespace-nowrap text-center font-semibold text-foreground">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedFeatureMappings.map((policy) => {
                              const policyId = policy.p_id || policy.policy_id || policy.id
                              const userCount = userCounts[policyId] || 0
                              const policyName = policy.p_name || policy.policy_name || policy.name || "Unnamed Policy"
                              const policyType = policy.type || policy.policy_type || "internal"

                              // Find the mapping for this policy
                              const policyMapping = policyFeatureMappings.find(mapping => {
                                const mappingPolicyId = mapping.p_id || mapping.policy_id || mapping.policy?.p_id || mapping.policy?.policy_id || mapping.policy?.id
                                return mappingPolicyId === policyId
                              })

                              // Count features mapped to this policy
                              let featureCount = 0
                              if (policyMapping) {
                                if (policyMapping.features && Array.isArray(policyMapping.features)) {
                                  featureCount = policyMapping.features.length
                                } else if (policyMapping.featuresObject && typeof policyMapping.featuresObject === 'object') {
                                  featureCount = Object.keys(policyMapping.featuresObject).length
                                }
                              }

                              // Get features for this policy if available
                              const policyFeatures = policyMapping?.features || (policyMapping?.featuresObject ? Object.values(policyMapping.featuresObject) : [])

                              return (
                                <TableRow
                                  key={policyId}
                                  className="hover:bg-muted/30 transition-colors border-b last:border-b-0"
                                >
                                  <TableCell
                                    className="py-4 cursor-pointer"
                                    onClick={() => onViewPolicyDetails && onViewPolicyDetails(policy)}
                                  >
                                    <div className="flex items-center space-x-3">
                                      <div className="min-w-0">
                                        <span className="font-medium text-primary truncate text-sm md:text-base transition-colors hover:underline">
                                          {policyName}
                                        </span>
                                        {policyId && (
                                          <div className="text-xs text-muted-foreground mt-1">ID: {String(policyId).substring(0, 8)}...</div>
                                        )}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-4">
                                    <Badge variant={policyType === "shared" ? "default" : "secondary"}>
                                      {policyType}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="py-4">
                                    <div className="flex items-center gap-2">
                                      <LinkIcon className="h-4 w-4 text-muted-foreground" />
                                      <span className="font-medium">{featureCount}</span>
                                      <span className="text-sm text-muted-foreground">feature{featureCount !== 1 ? 's' : ''}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-4">
                                    <div className="flex items-center gap-2">
                                      <Users className="h-4 w-4 text-muted-foreground" />
                                      <span>{userCount} user{userCount !== 1 ? 's' : ''}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-4">
                                    <Badge variant={policy.is_active !== false ? "default" : "secondary"}>
                                      {policy.is_active !== false ? "Active" : "Inactive"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell py-4">
                                    <span className="text-sm text-muted-foreground">
                                      {policy.updated_at ? new Date(policy.updated_at).toLocaleDateString() : policy.created_at ? new Date(policy.created_at).toLocaleDateString() : "-"}
                                    </span>
                                  </TableCell>
                                  <TableCell
                                    className="whitespace-nowrap text-center py-4"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="flex items-center justify-center gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          // Find the mapping for this policy
                                          const policyMapping = policyFeatureMappings.find(mapping => {
                                            const mappingPolicyId = mapping.p_id || mapping.policy_id || mapping.policy?.p_id || mapping.policy?.policy_id || mapping.policy?.id
                                            return mappingPolicyId === policyId
                                          })

                                          // If mapping exists, use it; otherwise create a mapping object from policy
                                          const mappingData = policyMapping || {
                                            p_id: policy.p_id || policy.policy_id || policy.id,
                                            p_name: policy.p_name || policy.policy_name || policy.name,
                                            type: policy.type || policy.policy_type,
                                            is_active: policy.is_active,
                                            created_at: policy.created_at,
                                            updated_at: policy.updated_at,
                                            features: [],
                                            featuresObject: {},
                                            policy: policy
                                          }

                                          onMappingClick && onMappingClick(mappingData)
                                        }}
                                        className="flex items-center gap-2"
                                      >
                                        View Features
                                      </Button>
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

                  {/* Pagination for Policy Feature Mappings */}
                  {policies.length > pageSize && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">
                        Showing {featureMappingsStartIndex + 1} to {Math.min(featureMappingsEndIndex, policies.length)} of {policies.length} results
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPageFeatureMappings(prev => Math.max(1, prev - 1))}
                          disabled={currentPageFeatureMappings === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPageFeatureMappings(prev => Math.min(totalPagesFeatureMappings, prev + 1))}
                          disabled={currentPageFeatureMappings === totalPagesFeatureMappings}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}