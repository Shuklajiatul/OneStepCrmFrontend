"use client"

import { useState, useEffect } from "react"
import { Plus, Lock, Loader2 } from "lucide-react"
import axios from "axios"
import Sidebar from "../component/sidebar"
import Topbar from "../component/topbar"
import { cn } from "@/lib/utils"
import { authUtils } from "@/lib/auth-utils"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { CreatePolicyTab } from "./components/CreatePolicyTab"
import { ModuleDetailTab } from "./components/ModuleDetailTab"
import { PolicyMappingDetailTab } from "./components/PolicyMappingDetailTab"
import { PolicyMappedUsersTab } from "./components/PolicyMappedUsersTab"
import { PolicyOverview } from "./components/PolicyOverview"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://10.10.15.194:3001'

// Dummy data for testing
const dummyPolicies = [
  {
    policy_id: "dummy-1",
    policy_name: "Admin Access Policy",
    policy_type: "shared",
    description: "Full administrative access to all system features",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    policy_id: "dummy-2",
    policy_name: "User Read-Only Policy",
    policy_type: "internal",
    description: "Limited read-only access for regular users",
    is_active: true,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

// API utility functions
const fetchAllData = async () => {
  const token = authUtils.getAuthHeader()
  if (!token) {
    throw new Error("Authentication required")
  }

  try {
    const [featuresRes, policiesRes, mappingsRes] = await Promise.all([
      axios.get(`${API_BASE_URL}/api/features`, {
        headers: { Authorization: token, "Content-Type": "application/json" },
      }),
      axios.get(`${API_BASE_URL}/api/policies`, {
        headers: { Authorization: token, "Content-Type": "application/json" },
      }),
      axios.get(`${API_BASE_URL}/api/policy-feature-mappings`, {
        headers: { Authorization: token, "Content-Type": "application/json" },
      }),
    ])

    return {
      features: Array.isArray(featuresRes.data) ? featuresRes.data : featuresRes.data?.data || featuresRes.data?.features || [],
      policies: Array.isArray(policiesRes.data) ? policiesRes.data : policiesRes.data?.data || policiesRes.data?.policies || [],
      mappings: Array.isArray(mappingsRes.data) ? mappingsRes.data : mappingsRes.data?.data || mappingsRes.data?.mappings || [],
    }
  } catch (error) {
    console.error("Error fetching data:", error)
    // Return empty arrays if endpoints don't exist yet
    return { features: [], policies: [], mappings: [] }
  }
}

const fetchUserCountsForPolicies = async (policies) => {
  const token = authUtils.getAuthHeader()
  if (!token) {
    return {}
  }

  const counts = {}
  for (const policy of policies) {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/policies/${policy.policy_id || policy.id}/users/count`, {
        headers: { Authorization: token, "Content-Type": "application/json" },
      })
      counts[policy.policy_id || policy.id] = response.data?.count || response.data?.data?.count || 0
    } catch (error) {
      counts[policy.policy_id || policy.id] = 0
    }
  }
  return counts
}

export default function PermissionManagement() {
  const [activeTab, setActiveTab] = useState("overview")
  const [selectedModule, setSelectedModule] = useState(null)
  const [selectedPolicy, setSelectedPolicy] = useState(null)
  const [selectedMapping, setSelectedMapping] = useState(null)
  const [darkMode, setDarkMode] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const [policies, setPolicies] = useState([])
  const [policyFeatureMappings, setPolicyFeatureMappings] = useState([])
  const [allFeatures, setAllFeatures] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [userCounts, setUserCounts] = useState({})

  useEffect(() => {
    loadAllData()
  }, [])

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  const loadAllData = async () => {
    try {
      setLoading(true)
      const data = await fetchAllData()

      // Use dummy data if API returns empty arrays
      const finalPolicies = data.policies.length > 0 ? data.policies : dummyPolicies
      const finalFeatures = data.features.length > 0 ? data.features : []
      const finalMappings = data.mappings.length > 0 ? data.mappings : []

      setAllFeatures(finalFeatures)
      setPolicies(finalPolicies)
      setPolicyFeatureMappings(finalMappings)

      // Set dummy user counts for dummy policies
      const userCountsMap = await fetchUserCountsForPolicies(finalPolicies)
      // Add dummy user counts if API fails
      if (Object.keys(userCountsMap).length === 0 && finalPolicies === dummyPolicies) {
        setUserCounts({
          "dummy-1": 5,
          "dummy-2": 12,
        })
      } else {
        setUserCounts(userCountsMap)
      }
    } catch (err) {
      console.error("Error fetching data:", err)
      // Use dummy data on error
      setAllFeatures([])
      setPolicies(dummyPolicies)
      setPolicyFeatureMappings([])
      setUserCounts({
        "dummy-1": 5,
        "dummy-2": 12,
      })
      setError(null) // Don't show error if we have dummy data
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

  const handleBackToOverview = () => {
    setActiveTab("overview")
    setSelectedModule(null)
    setSelectedPolicy(null)
    setSelectedMapping(null)
  }

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
              toggleDarkMode={() => setDarkMode(!darkMode)}
              toggleSidebar={() => setIsCollapsed(!isCollapsed)}
            />
          </div>
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
                        />
                      </TabsContent>

                      <TabsContent value="create-policy" className="mt-6">
                        <CreatePolicyTab
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
                          <PolicyMappedUsersTab policy={selectedPolicy} onBack={handleBackToOverview} />
                        )}
                      </TabsContent>

                      <TabsContent value="mapping-detail" className="mt-6">
                        {selectedMapping && (
                          <PolicyMappingDetailTab mapping={selectedMapping} onBack={handleBackToOverview} onUpdate={loadAllData} />
                        )}
                      </TabsContent>
                    </Tabs>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

