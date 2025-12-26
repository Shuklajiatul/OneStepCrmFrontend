"use client"

import { useState, useEffect } from "react"
import {
    Plus,
    Calendar,
    User,
    ListTodo,
    Phone,
    Mail,
    CalendarCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { activitiesApi, usersApi, datatablesApi, recordsApi } from "@/lib/api-endpoint"
import { authUtils } from "@/lib/auth-utils"
import { toast } from "sonner"

export default function CreateActivityDialog({
    open,
    onOpenChange,
    initialData = {},
    onSuccess,
    currentUser
}) {
    const [loading, setLoading] = useState(false)
    const [users, setUsers] = useState([])
    const [tables, setTables] = useState([])

    // Related Records State
    const [relatedRecords, setRelatedRecords] = useState([])
    const [recordColumns, setRecordColumns] = useState([])
    const [loadingRecords, setLoadingRecords] = useState(false)

    // Form state
    const [formData, setFormData] = useState({
        related_table_id: "",
        related_record_id: "",
        activity_type: "task",
        title: "",
        description: "",
        due_date: "",
        assigned_to: "",
    })

    // Initialize/Reset form when dialog opens or initialData changes
    useEffect(() => {
        if (open) {
            const tokens = authUtils.getTokens()
            const user = currentUser || (tokens?.user)

            setFormData({
                related_table_id: initialData.related_table_id || "",
                related_record_id: initialData.related_record_id || "",
                activity_type: initialData.activity_type || "task",
                title: initialData.title || "",
                description: initialData.description || "",
                due_date: initialData.due_date || "",
                assigned_to: initialData.assigned_to || user?.user_id || user?.id || "",
            })

            fetchData()
        }
    }, [open, initialData, currentUser])

    const fetchData = async () => {
        try {
            // we might already have users/tables from parent, but for standalone safety we can fetch or pass as props.
            // For now let's fetch here to ensure independence, or ideally these should be passed as props/context.
            // But to keep refactor simple, I'll fetch if empty.
            if (users.length === 0 || tables.length === 0) {
                const [usersRes, tablesRes] = await Promise.all([
                    usersApi.getAll(),
                    datatablesApi.getAll()
                ])

                const usersDataRaw = usersRes.data
                const usersData = Array.isArray(usersDataRaw) ? usersDataRaw : (usersDataRaw?.data || [])
                const tablesData = tablesRes.data?.data || []

                setUsers(usersData)
                setTables(tablesData)
            }
        } catch (error) {
            console.error("Failed to fetch dependencies:", error)
        }
    }

    // Fetch related records when table changes
    useEffect(() => {
        const fetchRelatedRecords = async () => {
            const tableId = formData.related_table_id

            if (!tableId || tableId === "_none") {
                setRelatedRecords([])
                return
            }

            // If we have a specific record ID pre-filled (e.g. from lead page), we might not need to fetch ALL records?
            // But the select needs options. If list is huge, this is bad. 
            // For now keeping existing logic.

            setLoadingRecords(true)
            try {
                const [recordsRes, columnsRes] = await Promise.all([
                    recordsApi.getAll(tableId),
                    datatablesApi.getColumns(tableId)
                ])

                let recordsData = recordsRes.data
                if (recordsData?.data && Array.isArray(recordsData.data)) {
                    recordsData = recordsData.data
                } else if (recordsData?.records && Array.isArray(recordsData.records)) {
                    recordsData = recordsData.records
                } else if (!Array.isArray(recordsData)) {
                    recordsData = []
                }

                const columnsData = columnsRes.data?.data || columnsRes.data?.columns || columnsRes.data || []

                setRelatedRecords(recordsData)
                setRecordColumns(columnsData)
            } catch (error) {
                console.error("Failed to fetch related records:", error)
            } finally {
                setLoadingRecords(false)
            }
        }

        if (open) {
            fetchRelatedRecords()
        }
    }, [formData.related_table_id, open])

    const getUserName = (userId) => {
        const user = users.find(u => (u.user_id || u.id) === userId)
        if (!user) return "Unknown"
        return `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || "Unknown"
    }

    const handleCreateActivity = async () => {
        try {
            setLoading(true)
            if (!formData.title || !formData.due_date || !formData.assigned_to) {
                toast.error("Please fill in all required fields")
                return
            }

            if (formData.related_table_id && formData.related_table_id !== "_none" && !formData.related_record_id) {
                toast.error("Related Record ID is required when a table is selected")
                return
            }

            // Create payload and remove empty optional fields
            const payload = { ...formData }
            if (!payload.related_table_id || payload.related_table_id === "_none") delete payload.related_table_id
            if (!payload.related_record_id) delete payload.related_record_id

            await activitiesApi.create(payload)

            toast.success("Activity created successfully")

            if (onSuccess) {
                onSuccess()
            }
            onOpenChange(false)
        } catch (error) {
            console.error("Failed to create activity:", error)
            toast.error("Failed to create activity")
        } finally {
            setLoading(false)
        }
    }

    // Checking if fields should be disabled (locked)
    const isTableLocked = !!initialData.related_table_id
    const isRecordLocked = !!initialData.related_record_id

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create New Activity</DialogTitle>
                    <DialogDescription>Add a new activity to track your work</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="activity_type">Activity Type *</Label>
                        <Select value={formData.activity_type} onValueChange={(value) => setFormData({ ...formData, activity_type: value })}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="task">Task</SelectItem>
                                <SelectItem value="call">Call</SelectItem>
                                <SelectItem value="meeting">Meeting</SelectItem>
                                <SelectItem value="email">Email</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="title">Title *</Label>
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Enter activity title"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Enter activity description"
                            rows={3}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="due_date">Due Date *</Label>
                        <Input
                            id="due_date"
                            type="datetime-local"
                            value={formData.due_date}
                            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="assigned_to">Assign To *</Label>
                        <Select value={formData.assigned_to} onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select user" />
                            </SelectTrigger>
                            <SelectContent>
                                {users
                                    .filter(user => {
                                        // Priority filter logic copy-pasted
                                        const tokens = authUtils.getTokens()
                                        const currentUserId = tokens?.user?.user_id || tokens?.user?.id
                                        const loggedInUser = users.find(u => (u.user_id || u.id) === currentUserId)
                                        const loggedInPriority = loggedInUser?.role_info?.priority ?? 999
                                        const userPriority = user.role_info?.priority ?? 999
                                        return userPriority >= loggedInPriority
                                    })
                                    .map((user) => (
                                        <SelectItem key={user.user_id || user.id} value={user.user_id || user.id}>
                                            {getUserName(user.user_id || user.id)}
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="related_table">Related Table (Optional)</Label>
                        <Select
                            value={formData.related_table_id}
                            onValueChange={(value) => setFormData({ ...formData, related_table_id: value === "_none" ? "" : value })}
                            disabled={isTableLocked}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select table" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_none">None</SelectItem>
                                {tables.map((table) => (
                                    <SelectItem key={table.table_id} value={table.table_id}>
                                        {table.table_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="related_record_id">
                            Related Record {formData.related_table_id && formData.related_table_id !== "_none" ? "*" : "(Optional)"}
                        </Label>
                        {formData.related_table_id && formData.related_table_id !== "_none" && !isRecordLocked ? (
                            <Select
                                value={formData.related_record_id}
                                onValueChange={(value) => setFormData({ ...formData, related_record_id: value })}
                                disabled={loadingRecords}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={loadingRecords ? "Loading records..." : "Select record"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {relatedRecords.map((record) => {
                                        // Try to find a meaningful label
                                        let label = record.record_id
                                        if (recordColumns.length > 0 && record.field_values) {
                                            // Prioritize first text column or Name/Title
                                            const displayCol = recordColumns.find(c => ['name', 'title', 'subject'].includes(c.column_name.toLowerCase())) || recordColumns[0]
                                            if (displayCol) {
                                                const val = record.field_values[displayCol.column_id]
                                                if (val) label = String(val).substring(0, 50)
                                            }
                                        }
                                        return (
                                            <SelectItem key={record.record_id} value={record.record_id}>
                                                {label}
                                            </SelectItem>
                                        )
                                    })}
                                </SelectContent>
                            </Select>
                        ) : (
                            <Input
                                id="related_record_id"
                                value={formData.related_record_id}
                                onChange={(e) => setFormData({ ...formData, related_record_id: e.target.value })}
                                placeholder="Enter record ID"
                                disabled={isRecordLocked || !formData.related_table_id}
                            />
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleCreateActivity} disabled={loading}>
                        {loading ? "Creating..." : "Create Activity"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
