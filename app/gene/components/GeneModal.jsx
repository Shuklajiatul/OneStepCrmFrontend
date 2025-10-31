'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  X, Plus, Trash2, Users, Loader2, Search, Layers, 
  CheckCircle2, AlertCircle, Network 
} from 'lucide-react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { authUtils } from '@/lib/auth-utils';

// Shadcn UI Components
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// API Constants
const API_CONSTANTS = {
  BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://10.10.15.194:3001',
};

export default function GeneModal({
  showModal,
  onClose,
  onSubmit,
  editingGene,
  geneData,
  setGeneData,
  addLevel,
  removeLevel,
  updateLevel
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [openUserPopover, setOpenUserPopover] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [touchedFields, setTouchedFields] = useState({ name: false, levels: false });
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Fetch users when modal opens (both create and edit mode)
  useEffect(() => {
    if (showModal) {
      fetchUsers();
    }
  }, [showModal]);

  // Initialize selected users when geneData changes
  useEffect(() => {
    if (editingGene && geneData.users) {
      const userIds = geneData.users.split(',').filter(id => id.trim() !== '').map(id => id.trim());
     
      if (users.length > 0 && userIds.length > 0) {
        // Match users by comparing both string and number representations
        const userObjects = users.filter(user => {
          const userId = user.id || user.user_id;
          return userIds.some(id => 
            userId.toString() === id || 
            userId.toString() === id.toString() ||
            String(userId) === String(id)
          );
        });
        setSelectedUsers(userObjects);
      } else if (userIds.length > 0) {
        // If users haven't loaded yet, store the IDs temporarily
        setSelectedUsers(userIds.map(id => ({ id: id.toString() })));
      } else {
        setSelectedUsers([]);
      }
    } else {
      setSelectedUsers([]);
    }
  }, [geneData.users, editingGene, users]);

  const handleSubmit = async () => {
    // Mark that user attempted to submit
    setSubmitAttempted(true);
    
    // Check if form is valid
    const isValid = geneData.name &&
                   geneData.name.trim() !== '' &&
                   geneData.levels.length > 0 &&
                   !geneData.levels.some(level => !level.title || level.title.trim() === '');
    
    if (!isValid) {
      // Mark all fields as touched to show errors
      setTouchedFields({ name: true, levels: true });
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSubmit({
        geneData: geneData,
        selectedUsers: selectedUsers,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setGeneData({ name: '', levels: [], is_active: true, users: ''});
    setSelectedUsers([]);
    setSearchTerm('');
    setOpenUserPopover(false);
    setError(null);
    setTouchedFields({ name: false, levels: false });
    setSubmitAttempted(false);
    onClose();
  };

  const handleIsActiveChange = (checked) => {
    setGeneData(prev => ({
      ...prev,
      is_active: checked
    }));
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      setError(null);
      // Try to get token from auth utils, localStorage, or sessionStorage
      const tokens = authUtils.getTokens();
      const token = tokens?.accessToken || 
                   localStorage.getItem('token') || 
                   localStorage.getItem('accessToken') ||
                   sessionStorage.getItem('token') ||
                   sessionStorage.getItem('accessToken');
      
      if (!token) {
        setError('Authentication token not found. Please ensure you are logged in.');
        setLoadingUsers(false);
        return;
      }

      const baseUrl = API_CONSTANTS.BASE_URL;
      const response = await axios.get(
        `${baseUrl}/api/users`,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      console.log('Users Response:', response.data);
      
      // Handle different response formats
      let usersData = [];
      if (Array.isArray(response.data)) {
        // Direct array response
        usersData = response.data;
      } else if (response.data.success && response.data.data) {
        // Wrapped in success/data
        usersData = response.data.data;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        usersData = response.data.data;
      } else if (response.data.users && Array.isArray(response.data.users)) {
        usersData = response.data.users;
      }
      
      // Normalize user objects - map user_id to id if needed
      const normalizedUsers = usersData.map(user => ({
        ...user,
        id: user.id || user.user_id, // Use id if exists, otherwise use user_id
        username: user.username || user.email || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        name: user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim()
      }));
      
      setUsers(normalizedUsers);
       
      if (selectedUsers.length > 0 && selectedUsers[0].username === undefined) {
        const updatedSelectedUsers = normalizedUsers.filter(user =>
          selectedUsers.some(selected => selected.id === user.id || selected.id === user.user_id)
        );
        setSelectedUsers(updatedSelectedUsers);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      if (err.response?.status === 401) {
        // Clear tokens from all storage
        localStorage.removeItem('token');
        localStorage.removeItem('accessToken');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('accessToken');
        authUtils.clearTokens();
        setError('Session expired. Please login again.');
        // Don't redirect automatically - let user continue working if they don't need users
      } else {
        setError(err.message || 'Failed to fetch users');
      }
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleUserSelect = (user) => {
    const userId = user.id || user.user_id;
    if (!selectedUsers.some(selected => (selected.id || selected.user_id) === userId)) {
      setSelectedUsers(prev => [...prev, user]);
    }
    setSearchTerm('');
  };

  const removeUser = (userId) => {
    setSelectedUsers(prev => prev.filter(user => (user.id || user.user_id) !== userId));
  };

  const clearAllUsers = () => {
    setSelectedUsers([]);
  };

  const filteredUsers = users.filter(user => {
    const userId = user.id || user.user_id;
    
    // Only show active users
    const isActive = user.is_active !== false;
    if (!isActive) {
      return false;
    }
    
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      user.username?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.name?.toLowerCase().includes(searchLower) ||
      user.first_name?.toLowerCase().includes(searchLower) ||
      user.last_name?.toLowerCase().includes(searchLower) ||
      `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase().includes(searchLower);
    
    const isSelected = selectedUsers.some(selected => {
      const selectedId = selected.id || selected.user_id;
      return selectedId === userId;
    });
    return matchesSearch && !isSelected;
  });

  // Check if form is valid
  const isFormValid = geneData.name &&
                     geneData.name.trim() !== '' &&
                     geneData.levels.length > 0 &&
                     !geneData.levels.some(level => !level.title || level.title.trim() === '');

  return (
    <Dialog open={showModal} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Network className="h-5 w-5" />
            {editingGene ? 'Edit Gene' : 'Create New Gene'}
          </DialogTitle>
          <DialogDescription>
            {editingGene ? 'Update your gene structure' : 'Build your gene hierarchy'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Gene Name Input */}
            <div className="space-y-2">
              <Label htmlFor="gene-name" className="text-sm font-semibold">
                Gene Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="gene-name"
                type="text"
                value={geneData.name || ''}
                onChange={(e) => {
                  setGeneData({...geneData, name: e.target.value});
                  setTouchedFields(prev => ({ ...prev, name: true }));
                }}
                onBlur={() => setTouchedFields(prev => ({ ...prev, name: true }))}
                placeholder="Enter gene name (e.g., test-2)"
                className={cn(
                  "w-full",
                  (touchedFields.name || submitAttempted) && !geneData.name && "border-destructive focus-visible:ring-destructive"
                )}
              />
              {(touchedFields.name || submitAttempted) && !geneData.name && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Gene name is required
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Users Multi-Select Dropdown - Show in both create and edit mode */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Assign Users</Label>
                  {selectedUsers.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearAllUsers}
                    >
                      Clear All
                    </Button>
                  )}
                </div>
               
                {/* Selected Users Display */}
                <Popover open={openUserPopover} onOpenChange={setOpenUserPopover}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between min-h-[52px] h-auto py-2 px-3"
                    >
                      <div className="flex-1 flex items-center min-w-0">
                        {selectedUsers.length === 0 ? (
                          <span className="text-muted-foreground text-sm">Select users...</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 w-full">
                            {selectedUsers.map((user) => {
                              const userId = user.id || user.user_id;
                              const displayName = user.username || user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || `User ${userId}`;
                              return (
                                <Badge
                                  key={userId}
                                  variant="secondary"
                                  className="flex items-center gap-1 text-xs"
                                >
                                  {displayName}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeUser(userId);
                                    }}
                                    className="ml-1 hover:bg-destructive/20 rounded-full p-0.5 -mr-1"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <Users className="ml-2 h-4 w-4 shrink-0 opacity-50 flex-shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-[var(--radix-popover-trigger-width)] p-0" 
                    align="start"
                    sideOffset={4}
                  >
                    <div 
                      className="max-h-[300px] overflow-y-auto cursor-pointer scrollbar-area"
                      onClick={(e) => {
                        // Force focus on the scrollable area when clicked
                        e.currentTarget.focus();
                        e.stopPropagation();
                      }}
                      onWheel={(e) => e.stopPropagation()}
                      tabIndex={0}
                      style={{ 
                        scrollbarWidth: 'thin',
                        scrollbarColor: 'hsl(var(--muted-foreground)) hsl(var(--muted))'
                      }}
                    >
                      <Command>
                        <CommandInput 
                          placeholder="Search users..." 
                          value={searchTerm}
                          onValueChange={setSearchTerm}
                          className="h-9 border-b sticky top-0 bg-background z-10"
                        />
                        <CommandList className="max-h-[250px]">
                          {loadingUsers ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="h-4 w-4 animate-spin text-primary mr-2" />
                              <span className="text-sm text-muted-foreground">Loading users...</span>
                            </div>
                          ) : error ? (
                            <div className="p-4 text-center">
                              <Alert variant="destructive" className="py-2">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription className="text-xs">
                                  {error}
                                </AlertDescription>
                              </Alert>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={fetchUsers}
                                className="mt-2"
                              >
                                Retry
                              </Button>
                            </div>
                          ) : filteredUsers.length === 0 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                              <CommandEmpty>
                                {searchTerm ? 'No active users found' : users.length === 0 ? 'No users available' : 'All active users are selected'}
                              </CommandEmpty>
                            </div>
                          ) : (
                            <CommandGroup>
                              {filteredUsers.map((user) => {
                                const userId = user.id || user.user_id;
                                // Use same logic as eye modal: name -> username -> first_name+last_name -> email -> fallback
                                // Handle empty strings by checking if value exists and is not empty
                                const fullName = user.first_name && user.last_name 
                                  ? `${user.first_name} ${user.last_name}`.trim()
                                  : null;
                                const displayName = (user.name && user.name.trim()) || 
                                                  (user.username && user.username.trim()) ||
                                                  fullName ||
                                                  (user.email && user.email.trim()) ||
                                                  `User ${userId}`;
                                // Show email if it exists and is different from displayName
                                const showEmail = user.email && user.email.trim() && user.email !== displayName;
                                return (
                                  <CommandItem
                                    key={userId}
                                    value={`${displayName} ${user.email || ''}`}
                                    onSelect={() => {
                                      handleUserSelect(user);
                                      // Keep dropdown open for multi-select
                                    }}
                                    className="cursor-pointer py-2 px-3 flex items-center justify-between gap-2 hover:bg-accent transition-colors"
                                  >
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                                        <Users className="h-4 w-4 text-primary" />
                                      </div>
                                      <div className="flex flex-col min-w-0 flex-1">
                                        <span className="font-medium truncate text-sm" title={displayName}>
                                          {displayName}
                                        </span>
                                        {showEmail && (
                                          <span className="text-xs text-muted-foreground truncate" title={user.email}>
                                            {user.email}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className={cn(
                                      "w-2 h-2 rounded-full shrink-0",
                                      user.is_active !== false ? 'bg-green-500' : 'bg-gray-300'
                                    )} />
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          )}
                        </CommandList>
                      </Command>
                    </div>
                  </PopoverContent>
                </Popover>
            </div>

            <Separator />

            {/* Status Switch */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="gene-status" className="text-sm font-semibold">Active Gene</Label>
                <p className="text-xs text-muted-foreground">
                  {geneData.is_active === true
                    ? 'Gene is active and visible'
                    : 'Gene is inactive and hidden'}
                </p>
              </div>
              <Switch
                id="gene-status"
                checked={geneData.is_active === true}
                onCheckedChange={handleIsActiveChange}
              />
            </div>

            <Separator />

            {/* Hierarchy Levels */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-bold">
                  Hierarchy Levels <span className="text-destructive">*</span>
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Define your gene hierarchy levels (Level 1, Level 2, Level 3, etc.)
                </p>
              </div>

              {geneData.levels.length === 0 ? (
                <Card className={cn(
                  "border-dashed transition-colors",
                  (touchedFields.levels || submitAttempted) && "border-destructive"
                )}>
                  <CardContent className="pt-12 pb-12">
                    <div className="text-center">
                      <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                      <p className="text-muted-foreground mb-2 font-medium">No hierarchy levels added yet</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Click "Add Level" to start building your gene hierarchy
                      </p>
                      {(touchedFields.levels || submitAttempted) && geneData.levels.length === 0 && (
                        <Alert variant="destructive" className="mt-4">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            At least one level is required
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {geneData.levels.map((level, index) => (
                    <Card key={level.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                                <span className="text-primary-foreground text-sm font-bold">
                                  {index + 1}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-semibold">Level {index + 1}</p>
                                <p className="text-xs text-muted-foreground">Level {index + 1} value</p>
                              </div>
                            </div>
                            {geneData.levels.length > 1 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeLevel(level.id)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-5 w-5" />
                              </Button>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`level-${level.id}`}>
                              Level Value <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              id={`level-${level.id}`}
                              type="text"
                              value={level.title || ''}
                              onChange={(e) => {
                                updateLevel(level.id, 'title', e.target.value);
                                setTouchedFields(prev => ({ ...prev, levels: true }));
                              }}
                              onBlur={() => setTouchedFields(prev => ({ ...prev, levels: true }))}
                              placeholder={`Enter level ${index + 1} value (e.g., "india", "maharashtra", "pune")`}
                              className={cn(
                                "w-full",
                                (touchedFields.levels || submitAttempted) && (!level.title || level.title.trim() === '') && "border-destructive focus-visible:ring-destructive"
                              )}
                            />
                            {(touchedFields.levels || submitAttempted) && (!level.title || level.title.trim() === '') && (
                              <Alert variant="destructive" className="py-2">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription className="text-xs">
                                  Level value is required
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <Button
                type="button"
                onClick={() => {
                  addLevel();
                  setTouchedFields(prev => ({ ...prev, levels: true }));
                }}
                variant="default"
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Level
              </Button>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between px-6 pb-6 pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {geneData.levels.length > 0
              ? `${geneData.levels.length} level${geneData.levels.length > 1 ? 's' : ''} configured • Status: ${geneData.is_active === true ? 'Active' : 'Inactive'}`
              : 'Add at least one level to create gene'}
            {editingGene && selectedUsers.length > 0 && (
              <span className="ml-2 text-primary">
                • {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isFormValid || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editingGene ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                editingGene ? 'Update Gene' : 'Create Gene'
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

