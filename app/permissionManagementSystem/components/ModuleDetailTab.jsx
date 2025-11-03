"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Loader2 } from "lucide-react"
import axios from "axios"
import { authUtils } from "@/lib/auth-utils"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://10.10.15.194:3001'

export function ModuleDetailTab({ moduleName, onBack }) {
  const [features, setFeatures] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchModuleFeatures()
  }, [moduleName])

  const fetchModuleFeatures = async () => {
    try {
      setLoading(true)
      const token = authUtils.getAuthHeader()
      if (!token) return

      const response = await axios.get(`${API_BASE_URL}/api/features?module=${moduleName}`, {
        headers: { Authorization: token, "Content-Type": "application/json" },
      })

      const featureData = Array.isArray(response.data)
        ? response.data
        : response.data?.data || response.data?.features || []

      setFeatures(featureData.filter(f => (f.module || "Uncategorized") === moduleName))
    } catch (error) {
      console.error("Error fetching module features:", error)
      setFeatures([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <CardTitle>Module: {moduleName}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Loading features...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {features.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No features found for this module</p>
              </div>
            ) : (
              features.map((feature) => (
                <Card key={feature.feature_id || feature.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{feature.feature_name || feature.name}</h3>
                        <p className="text-sm text-muted-foreground">{feature.description || "No description"}</p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant={feature.is_active !== false ? "default" : "secondary"}>
                            {feature.is_active !== false ? "Active" : "Inactive"}
                          </Badge>
                          {feature.action && (
                            <Badge variant="outline">{feature.action}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

