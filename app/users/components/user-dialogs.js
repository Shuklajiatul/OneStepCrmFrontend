import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle2, XCircle, ShieldCheck, ShieldX, Edit, Plus, Trash2, ShieldRing, Checkbox } from "lucide-react"
import { MultiSelect } from "@/components/ui/multi-select"

export function UserDialogs({
    // States
    isCreateOpen, setIsCreateOpen,
    isEditOpen, setIsEditOpen,
    isViewOpen, setIsViewOpen,
    isRoleOpen, setIsRoleOpen,

    // Data
    formData, setFormData,
    roleFormData, setRoleFormData,
    selectedUser,
    roles = [],
    genes = [],
    policies = [],
    loading,
    submitting,

    // Handlers
    onCreate,
    onUpdate,
    onAssignRole,
    onRemoveRole,

    // Helpers
    getFilteredReportingUsers,
    getRoleName,
    getReportingManagerName,
    getUserRolePriority,
    getSelectedRolePriority
}) {

    const renderUserForm = (mode = "create") => {
        const isSuperuser = mode === "edit" && selectedUser && getUserRolePriority
            ? getUserRolePriority(selectedUser) === 1
            : false
        return (
        <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="role">Role & Permissions</TabsTrigger>
                <TabsTrigger value="status">Status</TabsTrigger>
            </TabsList>

            <div className="py-4 h-[400px] overflow-y-auto px-1">
                <TabsContent value="basic" className="space-y-4 mt-0">
                    <div className="space-y-2">
                        <Label>Email <span className="text-destructive">*</span></Label>
                        <Input
                            type="email"
                            placeholder="bob@acme.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>First Name <span className="text-destructive">*</span></Label>
                            <Input
                                placeholder="Bob"
                                value={formData.first_name}
                                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Last Name <span className="text-destructive">*</span></Label>
                            <Input
                                placeholder="Smith"
                                value={formData.last_name}
                                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Password {mode === "create" && <span className="text-destructive">*</span>}</Label>
                        <Input
                            type="password"
                            placeholder={mode === "edit" ? "Leave empty to keep current" : "Enter password"}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Phone <span className="text-destructive">*</span></Label>
                        <Input
                            type="tel"
                            placeholder="+1234567890"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                    </div>
                </TabsContent>

                <TabsContent value="role" className="space-y-4 mt-0">
                    <div className="space-y-2">
                        <Label className="flex items-center gap-1">
                            Role <span className="text-destructive">*</span>
                            {isSuperuser && <span className="text-xs text-muted-foreground ml-1">(Superuser – locked)</span>}
                        </Label>
                        <Select
                            value={formData.role_id}
                            disabled={isSuperuser}
                            onValueChange={(value) => {
                                const newRolePriority = getSelectedRolePriority(value)
                                let validReportingId = ""
                                if (newRolePriority === 1) {
                                    validReportingId = ""
                                } else if (formData.reporting_id) {
                                    validReportingId = formData.reporting_id
                                }
                                setFormData({ ...formData, role_id: value, reporting_id: validReportingId })
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                                {roles.map((role) => (
                                    <SelectItem key={role.role_id || role.id} value={role.role_id || role.id}>
                                        {role.role_name || role.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="max-h-60 overflow-y-auto"
                        onWheel={(e) => e.stopPropagation()}
                        >
                            <Label>Gene <span className="text-destructive">*</span></Label>
                            <MultiSelect
                                options={genes.map(g => ({ label: g.name || g.g_name, value: g.g_id || g.id }))}
                                selected={Array.isArray(formData["g_ids"]) ? formData["g_ids"] : []}
                                onChange={(values) => setFormData({ ...formData, "g_ids": values })}
                                placeholder="Select genes"
                            />
                        </div>
                        <div className="max-h-60 overflow-y-auto"
                        onWheel={(e) => e.stopPropagation()}
                        >
                            <Label>Policy</Label>
                            <MultiSelect
                                options={policies.map(p => ({ label: p.p_name || p.name, value: p.p_id || p.id }))}
                                selected={Array.isArray(formData["p_id"]) ? formData["p_id"] : []}
                                onChange={(values) => setFormData({ ...formData, "p_id": values })}
                                placeholder="Select policies"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Reporting To {isSuperuser && <span className="text-xs text-muted-foreground">(N/A for Superuser)</span>}</Label>
                        <Select
                            value={formData.reporting_id || undefined}
                            onValueChange={(value) => setFormData({ ...formData, reporting_id: value === "__clear__" ? "" : value })}
                            disabled={!formData.role_id || isSuperuser}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={!formData.role_id ? "Select role first" : "Select manager"} />
                            </SelectTrigger>
                            <SelectContent>
                                {formData.reporting_id && <SelectItem value="__clear__">Clear selection</SelectItem>}
                                {getFilteredReportingUsers(mode === "edit" ? selectedUser?.user_id : null).map((user) => (
                                    <SelectItem key={user.user_id || user.id} value={user.user_id || user.id}>
                                        {user.first_name} {user.last_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </TabsContent>

                <TabsContent value="status" className="space-y-4 mt-0">
                    <div className="flex items-center space-x-3 p-4 border rounded-md">
                        <Switch
                            checked={formData.is_active}
                            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                        />
                        <div className="space-y-1">
                            <Label>Active Account</Label>
                            <p className="text-sm text-muted-foreground">
                                Disable to prevent user from logging in
                            </p>
                        </div>
                    </div>
                </TabsContent>
            </div>
        </Tabs>
        )
    }

    return (
        <>
            {/* Create Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Create New User</DialogTitle>
                        <DialogDescription>Add a new user to the system.</DialogDescription>
                    </DialogHeader>
                    {renderUserForm("create")}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                        <Button onClick={onCreate} disabled={submitting}>
                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create User
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                        <DialogDescription>Update user details.</DialogDescription>
                    </DialogHeader>
                    {renderUserForm("edit")}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                        <Button onClick={onUpdate} disabled={submitting}>
                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View Dialog */}
            <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>User Details</DialogTitle>
                    </DialogHeader>
                    {selectedUser && (
                        <div className="space-y-6 py-4">
                            <div className="flex items-center gap-4">
                                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-2xl font-bold">
                                    {selectedUser.first_name?.[0]}{selectedUser.last_name?.[0]}
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold">{selectedUser.first_name} {selectedUser.last_name}</h3>
                                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                                    <div className="flex gap-2 mt-1">
                                        <Badge variant="outline">{getRoleName(selectedUser)}</Badge>
                                        <Badge variant={selectedUser.is_active ? "default" : "secondary"}>
                                            {selectedUser.is_active ? "Active" : "Inactive"}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-muted-foreground">Phone</Label>
                                    <p>{selectedUser.phone || "N/A"}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">User ID</Label>
                                    <p className="font-mono text-sm">{selectedUser.user_id}</p>
                                </div>
                            </div>

                            {(() => {
                                // Combine role_id and roles array into a single list
                                const userRolesList = Array.isArray(selectedUser.roles) ? [...selectedUser.roles] : [];
                                const primaryRoleId = selectedUser.role_id;
                                
                                if (primaryRoleId && !userRolesList.some(r => (r.id === primaryRoleId || r.role_id === primaryRoleId))) {
                                    const primaryRole = roles.find(r => (r.role_id === primaryRoleId || r.id === primaryRoleId));
                                    if (primaryRole) {
                                        userRolesList.push({
                                            id: primaryRoleId,
                                            name: primaryRole.role_name || primaryRole.name
                                        });
                                    }
                                }

                                return userRolesList.length > 0 && (
                                    <div>
                                        <Separator className="my-4" />
                                        <Label className="mb-2 block">Assigned Roles</Label>
                                        <div className="space-y-2">
                                            {userRolesList.map((role, i) => (
                                                <div key={i} className="flex items-center justify-between p-2 border rounded-md">
                                                    <div className="flex items-center gap-2">
                                                        <ShieldCheck className="h-4 w-4 text-primary" />
                                                        <span>{role.name || role.role_name}</span>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => onRemoveRole(selectedUser.user_id, role.id || role.role_id)}
                                                        disabled={true}
                                                    >
                                                        <ShieldX className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsViewOpen(false)}>Close</Button>
                        <Button onClick={() => { setIsViewOpen(false); setIsEditOpen(true); }}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Role Dialog */}
            <Dialog open={isRoleOpen} onOpenChange={setIsRoleOpen}>
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle>Manage User Roles</DialogTitle>
                        <DialogDescription>
                            Manage roles for <span className="font-semibold text-foreground">{selectedUser?.first_name} {selectedUser?.last_name}</span>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Summary Info Section */}
                        <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/10 rounded-lg">
                            <div>
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-primary/70 block mb-0.5">Reporting To</Label>
                                <p className="text-sm font-semibold">{getReportingManagerName(selectedUser)}</p>
                            </div>
                        </div>

                        {/* Current Roles Section */}
                        <div className="space-y-3">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Current Roles</Label>
                            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                {(() => {
                                    // Combine role_id and roles array into a single list for management
                                    const userRolesList = Array.isArray(selectedUser?.roles) ? [...selectedUser.roles] : [];
                                    const primaryRoleId = selectedUser?.role_id;
                                    
                                    // If we have a primary role_id and it's not already in the roles array, add it
                                    if (primaryRoleId && !userRolesList.some(r => (r.id === primaryRoleId || r.role_id === primaryRoleId))) {
                                        const primaryRole = roles.find(r => (r.role_id === primaryRoleId || r.id === primaryRoleId));
                                        if (primaryRole) {
                                            userRolesList.push({
                                                id: primaryRoleId,
                                                name: primaryRole.role_name || primaryRole.name
                                            });
                                        }
                                    }

                                    return userRolesList.length > 0 ? (
                                        userRolesList.map((role, i) => (
                                            <div key={i} className="flex items-center justify-between p-2.5 bg-muted/30 border rounded-lg transition-colors hover:bg-muted/50">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="p-1.5 bg-primary/10 rounded-md">
                                                        <ShieldCheck className="h-4 w-4 text-primary" />
                                                    </div>
                                                    <span className="text-sm font-medium">{role.name || role.role_name}</span>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => onRemoveRole(selectedUser.user_id, role.id || role.role_id)}
                                                    disabled={submitting}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-6 border border-dashed rounded-lg bg-muted/20 text-muted-foreground">
                                            <ShieldX className="h-8 w-8 mb-2 opacity-20" />
                                            <p className="text-xs">No roles assigned yet</p>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>

                        <Separator />

                        {/* Add Role Section */}
                        <div className="space-y-3">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Add New Role</Label>
                            <div className="flex flex-col gap-3">
                                <Select
                                    value={roleFormData.role_id}
                                    onValueChange={(value) => setRoleFormData({ role_id: value })}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select a role to add" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {roles.map((role) => {
                                            const roleId = role.role_id || role.id;
                                            const isAlreadyAssigned = 
                                                selectedUser?.role_id === roleId || 
                                                selectedUser?.roles?.some(r => (r.id === roleId || r.role_id === roleId));
                                            return (
                                                <SelectItem 
                                                    key={roleId} 
                                                    value={roleId}
                                                    disabled={isAlreadyAssigned}
                                                >
                                                    {role.role_name || role.name} {isAlreadyAssigned ? "(Already Assigned)" : ""}
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                                <Button 
                                    onClick={onAssignRole} 
                                    disabled={submitting || !roleFormData.role_id}
                                    className="w-full"
                                >
                                    {submitting ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Plus className="mr-2 h-4 w-4" />
                                    )}
                                    Assign Selected Role
                                </Button>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsRoleOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
