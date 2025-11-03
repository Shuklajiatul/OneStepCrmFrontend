"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Loader2 } from "lucide-react"
import axios from "axios"
import { authUtils } from "@/lib/auth-utils"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://10.10.15.194:3001'

export function PolicyMappedUsersTab({ policy, onBack }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMappedUsers()
  }, [policy])

  const fetchMappedUsers = async () => {
    try {
      setLoading(true)
      const token = authUtils.getAuthHeader()
      if (!token) return

      const policyId = policy.policy_id || policy.id
      const response = await axios.get(`${API_BASE_URL}/api/policies/${policyId}/users`, {
        headers: { Authorization: token, "Content-Type": "application/json" },
      })

      const userData = Array.isArray(response.data)
        ? response.data
        : response.data?.data || response.data?.users || []

      setUsers(userData)
    } catch (error) {
      console.error("Error fetching mapped users:", error)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const policyName = policy.policy_name || policy.name || "Unknown Policy"

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <CardTitle>Mapped Users: {policyName}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Loading users...</p>
          </div>
        ) : (
          users.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No users mapped to this policy</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="font-semibold">User Name</TableHead>
                    <TableHead className="font-semibold">Email</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.user_id || user.id} className="hover:bg-muted/30">
                      <TableCell>
                        {user.first_name && user.last_name
                          ? `${user.first_name} ${user.last_name}`
                          : user.username || user.name || "Unknown"}
                      </TableCell>
                      <TableCell>{user.email || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={user.is_active !== false ? "default" : "secondary"}>
                          {user.is_active !== false ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.role || user.role_name || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )
        )}
      </CardContent>
    </Card>
  )
}

