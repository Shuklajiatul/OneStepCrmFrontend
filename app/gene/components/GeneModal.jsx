'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  X, Plus, Trash2, Users, Loader2, Search, Layers, 
  CheckCircle2, AlertCircle, Network 
} from 'lucide-react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

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

// API Constants placeholder
const API_CONSTANTS = {
  BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || '',
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

  // Fetch users when modal opens in edit mode
  useEffect(() => {
    if (showModal && editingGene) {
      fetchUsers();
    }
  }, [showModal, editingGene]);

  // Initialize selected users when geneData changes
  useEffect(() => {
    if (editingGene && geneData.users) {
      const userIds = geneData.users.split(',').filter(id => id.trim() !== '');
     
      if (users.length > 0) {
        const userObjects = users.filter(user => userIds.includes(user.id.toString()));
        setSelectedUsers(userObjects);
      } else {
        setSelectedUsers(userIds.map(id => ({ id: id.toString() })));
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
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const baseUrl = API_CONSTANTS.BASE_URL;
      const response = await axios.post(
        `${baseUrl}/auth/allUser`,
        {},
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      console.log('Users Response:', response.data);
      if (response.data.success || response.data.data) {
        const usersData = response.data.data || response.data.users || [];
        setUsers(Array.isArray(usersData) ? usersData : []);
       
        if (selectedUsers.length > 0 && selectedUsers[0].username === undefined) {
          const updatedSelectedUsers = usersData.filter(user =>
            selectedUsers.some(selected => selected.id === user.id.toString())
          );
          setSelectedUsers(updatedSelectedUsers);
        }
      } else {
        setError('Failed to fetch users');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
      } else {
        setError(err.message || 'Failed to fetch users');
      }
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleUserSelect = (user) => {
    if (!selectedUsers.some(selected => selected.id === user.id)) {
      setSelectedUsers(prev => [...prev, user]);
    }
    setSearchTerm('');
  };

  const removeUser = (userId) => {
    setSelectedUsers(prev => prev.filter(user => user.id !== userId));
  };

  const clearAllUsers = () => {
    setSelectedUsers([]);
  };

  const filteredUsers = users.filter(user =>
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.name?.toLowerCase().includes(searchTerm.toLowerCase())
  ).filter(user => !selectedUsers.some(selected => selected.id === user.id));

  // Check if form is valid
  const isFormValid = geneData.name &&
                     geneData.name.trim() !== '' &&
                     geneData.levels.length > 0 &&
                     !geneData.levels.some(level => !level.title || level.title.trim() === '');

  return (
    <Dialog open={showModal} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Network className="h-5 w-5" />
            {editingGene ? 'Edit Gene' : 'Create New Gene'}
          </DialogTitle>
          <DialogDescription>
            {editingGene ? 'Update your gene structure' : 'Build your gene hierarchy'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
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

            {/* Users Multi-Select Dropdown - Only show in edit mode */}
            {editingGene && (
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
                      className="w-full justify-between min-h-[52px] h-auto py-2"
                    >
                      {selectedUsers.length === 0 ? (
                        <span className="text-muted-foreground text-sm">Select users...</span>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {selectedUsers.map((user) => (
                            <Badge
                              key={user.id}
                              variant="secondary"
                              className="flex items-center gap-1"
                            >
                              {user.username || user.name || `User ${user.id}`}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeUser(user.id);
                                }}
                                className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                      <Users className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput 
                        placeholder="Search users..." 
                        value={searchTerm}
                        onValueChange={setSearchTerm}
                      />
                      <CommandList>
                        {loadingUsers ? (
                          <div className="flex items-center justify-center py-6">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            <span className="ml-2 text-sm text-muted-foreground">Loading users...</span>
                          </div>
                        ) : error ? (
                          <div className="p-3 text-center">
                            <Alert variant="destructive">
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
                          <CommandEmpty>
                            {searchTerm ? 'No users found' : 'No users available'}
                          </CommandEmpty>
                        ) : (
                          <CommandGroup>
                            {filteredUsers.map((user) => (
                              <CommandItem
                                key={user.id}
                                value={`${user.username || user.name || user.id}`}
                                onSelect={() => handleUserSelect(user)}
                                className="cursor-pointer"
                              >
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    <span className="font-medium">
                                      {user.username || user.name || `User ${user.id}`}
                                    </span>
                                    {user.email && (
                                      <span className="text-xs text-muted-foreground">
                                        ({user.email})
                                      </span>
                                    )}
                                  </div>
                                  <div className={cn(
                                    "w-2 h-2 rounded-full",
                                    user.is_active ? 'bg-green-500' : 'bg-gray-300'
                                  )} />
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}

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

        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between">
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

