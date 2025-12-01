"use client"

import { useState, useEffect } from "react"
import { Plus, Lock, Loader2 } from "lucide-react"
import axios from "axios"
import { cn } from "@/lib/utils"
import { authUtils } from "@/lib/auth-utils"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { CreatePolicyTab } from "./components/CreatePolicyTab"
import { EditPolicyTab } from "./components/EditPolicyTab"
import { ModuleDetailTab } from "./components/ModuleDetailTab"
import { PolicyMappingDetailTab } from "./components/PolicyMappingDetailTab"
import { PolicyMappedUsersTab } from "./components/PolicyMappedUsersTab"
import { PolicyOverview } from "./components/PolicyOverview"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://10.10.15.194:3001'

// API utility functions
const fetchAllData = async () => {
  const token = authUtils.getAuthHeader()
  if (!token) {
    throw new Error("Authentication required")
  }

  try {
    const [featuresRes, policiesRes, mappingsRes] = await Promise.all([
      //Fetch all features
      axios.get(`${API_BASE_URL}/api/features`, {
        headers: { Authorization: token, "Content-Type": "application/json" },
      }),
      //Fetch all policies
      axios.get(`${API_BASE_URL}/api/policies`, {
        headers: { Authorization: token, "Content-Type": "application/json" },
      }),
      //Fetch policy feature mappings
      axios.post(`${API_BASE_URL}/api/policyMapping/list`, {}, {
        headers: { Authorization: token, "Content-Type": "application/json" },
      }),
    ])

    // Extract data from response, handling both direct array and wrapped structures
    const features = Array.isArray(featuresRes.data)
      ? featuresRes.data
      : featuresRes.data?.data || featuresRes.data?.features || []

    const policies = Array.isArray(policiesRes.data)
      ? policiesRes.data
      : policiesRes.data?.data || policiesRes.data?.policies || []

    // Handle policy mapping response structure
    let mappings = []
    if (mappingsRes?.data) {
      const mappingsData = Array.isArray(mappingsRes.data)
        ? mappingsRes.data
        : mappingsRes.data?.data || []

      // Convert features object to array for easier handling
      mappings = mappingsData.map(mapping => {
        // Convert features object to array
        const featuresArray = mapping.features
          ? Object.values(mapping.features)
          : []

        return {
          ...mapping,
          features: featuresArray,
          // Keeping the original features object for compatibility
          featuresObject: mapping.features || {}
        }
      })
    }

    return {
      features: features,
      policies: policies,
      mappings: mappings,
    }
  } catch (error) {
    console.error("Error fetching data:", error)
    if (error.response) {
      console.error("Response status:", error.response.status)
      console.error("Response data:", error.response.data)
    }
    // Returning empty arrays if endpoints don't exist yet
    return { features: [], policies: [], mappings: [] }
  }
}

const fetchSinglePolicy = async (policyId) => {
  const token = authUtils.getAuthHeader()
  if (!token) {
    throw new Error("Authentication required")
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/api/policies/${policyId}`, {
      headers: { Authorization: token, "Content-Type": "application/json" },
    })

    return response.data?.data || response.data || null
  } catch (error) {
    console.error(`Error fetching policy ${policyId}:`, error)
    if (error.response) {
      console.error("Response status:", error.response.status)
      console.error("Response data:", error.response.data)
    }
    throw error
  }
}

const fetchUserCountsForPolicies = async (policies) => {
  const token = authUtils.getAuthHeader()
  if (!token) {
    return {}
  }

  const counts = {}

  // Fetch all user counts in parallel for better performance
  const fetchPromises = policies.map(async (policy) => {
    const policyId = policy.p_id || policy.policy_id || policy.id
    if (!policyId) {
      return { policyId: null, count: 0 }
    }

    try {
      // Use the same endpoint that PolicyMappedUsersTab uses to get users
      const response = await axios.get(`${API_BASE_URL}/api/policies/userByPolicy/${policyId}`, {
        headers: { Authorization: token, "Content-Type": "application/json" },
      })

      // Extract user data from response
      const userData = Array.isArray(response.data)
        ? response.data
        : response.data?.data || response.data?.users || []

      return { policyId, count: userData.length }
    } catch (error) {
      console.error(`Error fetching user count for policy ${policyId}:`, error)
      return { policyId, count: 0 }
    }
  })

  const results = await Promise.all(fetchPromises)

  // Convert results array to counts object
  results.forEach(({ policyId, count }) => {
    if (policyId) {
      counts[policyId] = count
    }
  })

  return counts
}

export default function PermissionManagement() {
  const [activeTab, setActiveTab] = useState("overview")
  const [selectedModule, setSelectedModule] = useState(null)
  const [selectedPolicy, setSelectedPolicy] = useState(null)
  const [selectedMapping, setSelectedMapping] = useState(null)

  const [policies, setPolicies] = useState([])
  const [policyFeatureMappings, setPolicyFeatureMappings] = useState([])
  const [allFeatures, setAllFeatures] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [userCounts, setUserCounts] = useState({})
  const [editingPolicy, setEditingPolicy] = useState(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [policyToDelete, setPolicyToDelete] = useState(null)
  const [deletingPolicy, setDeletingPolicy] = useState(false)

  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchAllData()

      setAllFeatures(data.features || [])
      setPolicies(data.policies || [])
      setPolicyFeatureMappings(data.mappings || [])

      // Fetch user counts for all policies
      const userCountsMap = await fetchUserCountsForPolicies(data.policies || [])
      setUserCounts(userCountsMap)

      // Update selectedMapping if we're on mapping-detail tab to get fresh data
      if (activeTab === "mapping-detail" && selectedMapping) {
        const policyId = selectedMapping.p_id || selectedMapping.policy_id || selectedMapping.id || selectedMapping.policy?.p_id || selectedMapping.policy?.policy_id || selectedMapping.policy?.id
        if (policyId) {
          // Find the updated mapping from the fresh data
          const updatedMapping = data.mappings.find(m =>
            (m.p_id || m.policy_id || m.id) === policyId
          )
          if (updatedMapping) {
            setSelectedMapping(updatedMapping)
          } else {
            // If mapping not found in mappings list, try to find in policies and create mapping object
            const policy = data.policies.find(p =>
              (p.p_id || p.policy_id || p.id) === policyId
            )
            if (policy) {
              setSelectedMapping({
                ...selectedMapping,
                p_id: policy.p_id || policy.policy_id || policy.id,
                p_name: policy.p_name || policy.policy_name || policy.name,
                type: policy.type || policy.policy_type,
                is_active: policy.is_active,
                created_at: policy.created_at,
                updated_at: policy.updated_at,
                policy: policy,
                features: [], // Features will be fetched by the component
              })
            }
          }
        }
      }
    } catch (err) {
      console.error("Error fetching data:", err)
      setError(err.response?.data?.message || "Failed to load data. Please try again.")
      setAllFeatures([])
      setPolicies([])
      setPolicyFeatureMappings([])
      setUserCounts({})
    } finally {
      setLoading(false)
    }
  }

  const handleModuleClick = (moduleName) => {
    setSelectedModule(moduleName)
    setActiveTab("module-detail")
  }

  const handlePolicyMappedUsersClick = (policy) => {
    setSelectedPolicy(policy)
    setActiveTab("policy-mapped-users")
  }

  const handleMappingClick = (mapping) => {
    setSelectedMapping(mapping)
    setActiveTab("mapping-detail")
  }

  const handleViewPolicyFeatures = (policy) => {
    // Create a mapping object from policy for viewing features
    const mapping = {
      p_id: policy.p_id || policy.policy_id || policy.id,
      p_name: policy.p_name || policy.policy_name || policy.name,
      type: policy.type || policy.policy_type,
      is_active: policy.is_active,
      created_at: policy.created_at,
      updated_at: policy.updated_at,
      policy: policy
    }
    setSelectedMapping(mapping)
    setActiveTab("mapping-detail")
  }

  const handleBackToOverview = () => {
    setActiveTab("overview")
    setSelectedModule(null)
    setSelectedPolicy(null)
    setSelectedMapping(null)
  }

  const handleEditPolicy = (policy) => {
    setEditingPolicy(policy)
    setEditDialogOpen(true)
  }

  const handleUpdatePolicy = async () => {
    setEditDialogOpen(false)
    // Refresh all data to get updated policy
    await loadAllData()
    setEditingPolicy(null)
  }

  const handleDeletePolicy = (policy) => {
    setPolicyToDelete(policy)
    setDeleteDialogOpen(true)
  }

  const confirmDeletePolicy = async () => {
    if (!policyToDelete) return

    const policyId = policyToDelete.p_id || policyToDelete.policy_id || policyToDelete.id

    if (!policyId) {
      toast.error("Policy ID is required")
      return
    }

    setDeletingPolicy(true)
    try {
      const token = authUtils.getAuthHeader()
      if (!token) {
        toast.error("Authentication required")
        return
      }

      await axios.delete(`${API_BASE_URL}/api/policies/${policyId}`, {
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
      })

      toast.success("Policy deleted successfully")
      setDeleteDialogOpen(false)
      setPolicyToDelete(null)
      await loadAllData()
    } catch (error) {
      console.error("Error deleting policy:", error)
      toast.error(error.response?.data?.message || "Failed to delete policy. Please try again.")
    } finally {
      setDeletingPolicy(false)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="flex-1 p-4 md:p-6 bg-background">
        <div className="container mx-auto py-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Lock className="h-6 w-6" />
                    Permission Management System
                  </CardTitle>
                  <CardDescription>
                    Manage feature access, create policies, and control user permissions
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setActiveTab("create-policy")}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create Policy
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-3 text-muted-foreground">Loading permission data...</p>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <p className="text-destructive mb-4">{error}</p>
                  <Button onClick={loadAllData} variant="outline">
                    Retry
                  </Button>
                </div>
              ) : (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="create-policy">Create Policy</TabsTrigger>
                    {activeTab === "module-detail" && (
                      <TabsTrigger value="module-detail">Module Details</TabsTrigger>
                    )}
                    {activeTab === "policy-mapped-users" && (
                      <TabsTrigger value="policy-mapped-users">Mapped Users</TabsTrigger>
                    )}
                    {activeTab === "mapping-detail" && (
                      <TabsTrigger value="mapping-detail">Mapping Details</TabsTrigger>
                    )}
                  </TabsList>

                  <TabsContent value="overview" className="mt-6">
                    <PolicyOverview
                      policies={policies}
                      policyFeatureMappings={policyFeatureMappings}
                      allFeatures={allFeatures}
                      userCounts={userCounts}
                      onModuleClick={handleModuleClick}
                      onViewMappedUsers={handlePolicyMappedUsersClick}
                      onMappingClick={handleMappingClick}
                      onEditPolicy={handleEditPolicy}
                      onDeletePolicy={handleDeletePolicy}
                      onPolicyUpdate={loadAllData}
                    />
                  </TabsContent>

                  <TabsContent value="create-policy" className="mt-6">
                    <CreatePolicyTab
                      allFeatures={allFeatures}
                      onPolicyCreated={() => {
                        setActiveTab("overview")
                        loadAllData()
                      }}
                    />
                  </TabsContent>

                  <TabsContent value="module-detail" className="mt-6">
                    {selectedModule && (
                      <ModuleDetailTab moduleName={selectedModule} onBack={handleBackToOverview} />
                    )}
                  </TabsContent>

                  <TabsContent value="policy-mapped-users" className="mt-6">
                    {selectedPolicy && (
                      <PolicyMappedUsersTab
                        policy={selectedPolicy}
                        onBack={handleBackToOverview}
                        onUserUpdate={async () => {
                          // Refresh user counts when users are added/removed
                          // Use current policies state to get updated counts
                          const updatedCounts = await fetchUserCountsForPolicies(policies)
                          setUserCounts(updatedCounts)
                        }}
                      />
                    )}
                  </TabsContent>

                  <TabsContent value="mapping-detail" className="mt-6">
                    {selectedMapping && (
                      <PolicyMappingDetailTab
                        mapping={selectedMapping}
                        onBack={handleBackToOverview}
                        onUpdate={loadAllData}
                        allFeatures={allFeatures}
                      />
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      </div>


      {/* Edit Policy Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Policy</DialogTitle>
          </DialogHeader>
          {editingPolicy && (
            <EditPolicyTab
              policy={editingPolicy}
              onPolicyUpdated={handleUpdatePolicy}
              onCancel={() => {
                setEditDialogOpen(false)
                setEditingPolicy(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this policy?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the policy &quot;
              <span className="font-semibold">
                {policyToDelete?.policy_name || policyToDelete?.name || policyToDelete?.p_name || "Unknown"}
              </span>&quot; and all of its data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingPolicy}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeletePolicy}
              disabled={deletingPolicy}
              className="bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deletingPolicy ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Policy"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent >
      </AlertDialog >
    </main >
  )
}