"use client"

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { authUtils } from '@/lib/auth-utils';
import { genesApi, usersApi, organizationsApi } from '@/lib/api-endpoint';
import {
  Eye, Edit, Trash2, Plus, Upload, Table2, List, LayoutGrid,
  Loader2, AlertCircle, RefreshCw, X, CheckCircle2, Building,
  Layers, Users as UsersIcon, Calendar, Network,
  ArrowUpDown, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";

// Shadcn UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";
import { cn, debounce, getStatusBadge } from "@/lib/utils";
import UserGeneMappingModal from "./components/UserGeneMappingModal";
import GeneModal from "./components/GeneModal";
import GeneCsvModal from "./components/GeneCsvModal";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import GeneCardView from "./components/GeneCardView";
import GeneTableView from "./components/GeneTableView";
import GeneListView from "./components/GeneListView";

const SortIcon = ({ config, sortKey }) => {
  if (config.key !== sortKey) return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/30" />;
  if (config.direction === 'asc') return <ChevronUp className="ml-2 h-4 w-4 text-primary" />;
  if (config.direction === 'desc') return <ChevronDown className="ml-2 h-4 w-4 text-primary" />;
  return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/30" />;
};

function DebouncedInput({ value: initialValue, onChange, debounceTime = 300, ...props }) {
  const [value, setValue] = useState(initialValue || '');
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    setValue(initialValue || '');
  }, [initialValue]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      // Only call onChange if value actually differs to avoid initial render triggers
      if (value !== (initialValue || '')) {
        onChangeRef.current(value);
      }
    }, debounceTime);

    return () => clearTimeout(timeout);
  }, [value, debounceTime, initialValue]);

  return (
    <Input
      {...props}
      value={value}
      onChange={e => setValue(e.target.value)}
    />
  );
}

export default function GeneClient({
  initialGenes = [],
  initialPagination = null,
  initialOrganizations = [],
  initialUsers = [],
  newAccessToken: propNewAccessToken = null
}) {
  const router = useRouter();

  useEffect(() => {
    if (propNewAccessToken) {
      console.log('Syncing new server-side token to cookies in genes page');
      authUtils.setTokens({ accessToken: propNewAccessToken });
    }
  }, [propNewAccessToken]);

  const [view, setView] = useState('table');
  const [showArchived, setShowArchived] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);
  const [myHierarchiesOnly, setMyHierarchiesOnly] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedGene, setSelectedGene] = useState(null);
  const [editingGene, setEditingGene] = useState(null);
  const [genes, setGenes] = useState(initialGenes);
  const [geneData, setGeneData] = useState({
    name: '',
    levels: [],
    is_active: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [geneToDelete, setGeneToDelete] = useState(null);
  const [geneToDeleteObj, setGeneToDeleteObj] = useState(null);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [showCsvGeneUserModal, setShowCsvGeneUserModal] = useState(false);
  const [searches, setSearhes] = useState(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(initialPagination?.page || 1);
  const [pageSize, setPageSize] = useState(initialPagination?.limit || 5);
  const [pagination, setPagination] = useState(initialPagination || {
    page: 1,
    limit: 5,
    total: 0
  });
  const [organizations, setOrganizations] = useState(initialOrganizations);
  const [loadingOrganizations, setLoadingOrganizations] = useState(false);
  const [users, setUsers] = useState(initialUsers);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'g_name', direction: 'asc' }); // 'asc', 'desc', 'none'

  // Track initialization and mounting to avoid double fetch
  const isInitialized = useRef(false);
  const mounted = useRef(false);

  // Debounced search function
  const debouncedSearchHandler = useCallback(
    debounce((query) => {
      console.log('Debounced search query:', query);
      setDebouncedSearch(query);
    }, 500),
    []
  );

  // Handle search input change
  const handleSearchChange = (val) => {
    const value = val?.target ? val.target.value : val;
    setSearhes(value);
    setSearchTerm(value);
    console.log('Search query:', value);
    debouncedSearchHandler(value);
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'none';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const fetchGenes = async () => {
    try {
      setLoading(true);
      setError(null);

      const tokens = authUtils.getTokens();

      if (!tokens) {
        setError('Authentication required. Please login again.');
        toast.error('Authentication required. Please login again.');
        router.push('/login');
        return;
      }

      const response = await genesApi.getAll();

      console.log('Full API Response:', response.data);

      if (response.data.success && response.data.data) {
        const apiGenes = response.data.data || [];
        console.log('API Genes:', apiGenes);

        const userMap = {};
        users.forEach(user => {
          const id = user.user_id || user.id;
          if (id) {
            const firstName = user.first_name || '';
            const lastName = user.last_name || '';
            const fullName = `${firstName} ${lastName}`.trim();
            userMap[String(id)] = fullName || user.username || user.email || user.name || id || 'Unknown';
          }
        });

        const transformedGenes = apiGenes.map(gene => {
          const levels = [];
          if (gene.hierarchy_level && typeof gene.hierarchy_level === 'object') {
            Object.entries(gene.hierarchy_level).forEach(([key, value]) => {
              const levelNum = key.replace(/[^0-9]/g, '');
              if (levelNum) {
                levels.push({
                  id: parseInt(levelNum),
                  title: value,
                  members: 0
                });
              }
            });
            levels.sort((a, b) => a.id - b.id);
          }

          const usersCount = gene.users ? (Array.isArray(gene.users) ? gene.users.length : 0) : 0;
          const organizationsCount = gene.organizations ? (Array.isArray(gene.organizations) ? gene.organizations.length : 0) : 0;

          let createdByName = 'Unknown';
          if (gene.created_by_details) {
            const userData = gene.created_by_details.user_data || gene.created_by_details;
            createdByName = userData.first_name && userData.last_name
              ? `${userData.first_name} ${userData.last_name}`.trim()
              : userData.name || userData.username || userData.email || 'Unknown';
          } else if (gene.created_by_name) {
            createdByName = gene.created_by_name;
          } else if (gene.created_by && typeof gene.created_by === 'object') {
            const u = gene.created_by;
            const fName = u.first_name || '';
            const lName = u.last_name || '';
            const fullName = `${fName} ${lName}`.trim();
            createdByName = fullName || u.name || u.username || u.email || 'Unknown';
          } else if (gene.created_by) {
            const idKey = String(gene.created_by);
            if (userMap[idKey]) {
              createdByName = userMap[idKey];
            } else {
              createdByName = gene.created_by;
            }
          }

          return {
            id: gene.g_id,
            name: gene.g_name || 'Unnamed Gene',
            type: 'Gene',
            totalMembers: organizationsCount,
            hierarchyLevels: gene.level_depth || levels.length,
            users: usersCount,
            usersArray: gene.users || [],
            lastUpdated: new Date(gene.updated_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            }),
            completion: 100,
            createdBy: createdByName,
            createdById: gene.created_by,
            levels: levels,
            createdAt: gene.created_at,
            hierarchy_level: gene.hierarchy_level,
            level_depth: gene.level_depth,
            g_id: gene.g_id,
            g_name: gene.g_name,
            organizations: gene.organizations || [],
            is_active: gene.is_active
          };
        });

        console.log('Transformed Genes:', transformedGenes);
        setGenes(transformedGenes);

        // Update pagination state
        if (response.data.pagination) {
          setPagination(response.data.pagination);
        }
      } else {
        console.error('API returned success: false');
        const errorMsg = response.data.message || 'Failed to fetch genes';
        setError(errorMsg);
        toast.error(errorMsg);
        setGenes([]);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      console.error('Error response:', err.response?.data);

      if (err.response?.status === 401) {
        const errorMsg = 'Session expired. Please login again.';
        setError(errorMsg);
        toast.error(errorMsg);
        authUtils.clearTokens();
        localStorage.removeItem('token');
        router.push('/login');
      } else {
        const errorMsg = err.response?.data?.message || err.message || 'Failed to fetch genes';
        setError(errorMsg);
        toast.error(errorMsg);
        setGenes([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      setLoadingOrganizations(true);
      const response = await organizationsApi.getAll();

      // Handle different response formats
      let orgsData = [];
      if (Array.isArray(response.data)) {
        orgsData = response.data;
      } else if (response.data.success && response.data.data) {
        orgsData = response.data.data;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        orgsData = response.data.data;
      } else if (response.data.organizations && Array.isArray(response.data.organizations)) {
        orgsData = response.data.organizations;
      }

      setOrganizations(orgsData);
    } catch (err) {
      console.error('Error fetching organizations:', err);
      setOrganizations([]);
    } finally {
      setLoadingOrganizations(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await usersApi.getAll();

      // Handle different response formats
      let usersData = [];
      if (Array.isArray(response.data)) {
        usersData = response.data;
      } else if (response.data.success && response.data.data) {
        usersData = response.data.data;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        usersData = response.data.data;
      } else if (response.data.users && Array.isArray(response.data.users)) {
        usersData = response.data.users;
      }

      // Normalize user objects - map user_id to id if needed
      const normalizedUsers = usersData.map(user => {
        const firstName = user.first_name || '';
        const lastName = user.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim();
        const displayName = fullName || user.username || user.email || user.id || user.user_id || 'Unknown';

        return {
          ...user,
          id: user.id || user.user_id,
          username: user.username || user.email || displayName,
          name: user.name || displayName
        };
      });

      setUsers(normalizedUsers);
    } catch (err) {
      console.error('Error fetching users:', err);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    if (initialOrganizations.length === 0) {
      fetchOrganizations();
    }

    if (initialUsers.length === 0) {
      fetchUsers();
    }

    return () => {
    };
  }, []);

  useEffect(() => {
    if (users.length > 0 && genes.length > 0) {
      const userMap = {};
      users.forEach(user => {
        const id = user.user_id || user.id;
        if (id) {
          const firstName = user.first_name || '';
          const lastName = user.last_name || '';
          const fullName = `${firstName} ${lastName}`.trim();
          userMap[String(id)] = fullName || user.username || user.email || user.name || id || 'Unknown';
        }
      });

      setGenes(prevGenes => prevGenes.map(gene => {
        const createdByUserId = gene.createdById || gene.created_by;
        const idKey = String(createdByUserId);
        if (createdByUserId && userMap[idKey]) {
          return { ...gene, createdBy: userMap[idKey] };
        }
        return gene;
      }));
    }
  }, [users]);

  // Sync state with props from server 
  useEffect(() => {
    if (initialGenes && initialGenes.length > 0) {
      setGenes(initialGenes);
    }
  }, [initialGenes]);

  useEffect(() => {
    if (initialPagination) {
      setPagination(initialPagination);
      setCurrentPage(initialPagination.page || 1);
    }
  }, [initialPagination]);

  useEffect(() => {
    if (initialOrganizations && initialOrganizations.length > 0) {
      setOrganizations(initialOrganizations);
    }
  }, [initialOrganizations]);

  useEffect(() => {
    if (initialUsers && initialUsers.length > 0) {
      setUsers(initialUsers);
    }
  }, [initialUsers]);

  useEffect(() => {
    if (isInitialized.current) return;

    if (initialGenes && initialGenes.length > 0) {
      console.log("Using SSR data for initial load");
      isInitialized.current = true;
      return;
    }

    isInitialized.current = true;
    fetchGenes();
  }, []);


  useEffect(() => {
    if (debouncedSearch !== undefined && debouncedSearch !== null) {
      setCurrentPage(1);
    }
  }, [debouncedSearch]);

  const handleToggleStatus = async (geneId, currentStatus) => {
    const loadingToast = toast.loading('Updating status...');

    try {
      setGenes(prevGenes =>
        prevGenes.map(gene =>
          gene.g_id === geneId || gene.id === geneId
            ? { ...gene, is_active: !currentStatus }
            : gene
        )
      );

      console.log('Toggling status for gene with ID:', geneId);

      const response = await genesApi.toggleActive(geneId);

      if (response.data.success) {
        const newStatus = !currentStatus;
        toast.success(`Gene status updated to ${newStatus ? 'Active' : 'Inactive'}!`, {
          id: loadingToast,
        });
      } else {
        setGenes(prevGenes =>
          prevGenes.map(gene =>
            gene.g_id === geneId || gene.id === geneId
              ? { ...gene, is_active: currentStatus }
              : gene
          )
        );
        throw new Error(response.data.message || 'Failed to toggle status');
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      setGenes(prevGenes =>
        prevGenes.map(gene =>
          gene.g_id === geneId || gene.id === geneId
            ? { ...gene, is_active: currentStatus }
            : gene
        )
      );
      const errorMsg = error.response?.data?.message || error.message || 'Failed to toggle status';
      toast.error(errorMsg, {
        id: loadingToast,
      });
    }
  };

  // Gene Data Management
  const addLevel = () => {
    setGeneData(prev => ({
      ...prev,
      levels: [...prev.levels, {
        id: Date.now(),
        title: '',
        members: 0
      }]
    }));
  };

  const removeLevel = (id) => {
    setGeneData(prev => ({
      ...prev,
      levels: prev.levels.filter(level => level.id !== id)
    }));
  };

  const updateLevel = (id, field, value) => {
    setGeneData(prev => ({
      ...prev,
      levels: prev.levels.map(level =>
        level.id === id ? { ...level, [field]: value } : level
      )
    }));
  };

  // Modal Functions
  const openCreateModal = () => {
    setEditingGene(null);
    setGeneData({ name: '', levels: [], is_active: true });
    setShowModal(true);
  };

  const openEditModal = async (gene) => {
    const loadingToast = toast.loading('Loading gene details...');
    try {
      const response = await genesApi.getById(gene.g_id || gene.id);

      if (response.data.success && response.data.data) {
        const fullGeneData = {
          ...gene,
          usersArray: response.data.data.map(user => ({
            user_id: user.user_id,
            organization_id: user.organization_id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            username: user.email,
            name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
            is_active: user.is_active
          })),
          users: response.data.data.length,
          organizations: [...new Set(response.data.data.map(user => user.organization_id))].map(orgId => ({
            organization_id: orgId,
            id: orgId
          })),
        };

        setEditingGene(fullGeneData);
        setGeneData({
          ...fullGeneData,
          name: fullGeneData.g_name || fullGeneData.name,
          levels: fullGeneData.levels || [],
          g_id: fullGeneData.g_id,
          is_active: fullGeneData.is_active,
        });
        toast.dismiss(loadingToast);
        setShowModal(true);
      } else {
        throw new Error('Failed to load full gene details');
      }
    } catch (error) {
      console.error('Error fetching gene details for edit:', error);
      toast.error('Failed to load gene details', { id: loadingToast });

      // Fallback
      setEditingGene(gene);
      setGeneData({
        ...gene,
        name: gene.g_name || gene.name,
        levels: gene.levels || [],
        g_id: gene.g_id,
        is_active: gene.is_active,
      });
      setShowModal(true);
    }
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const convertLevelsToHierarchy = (levels) => {
    const hierarchy_level = {};
    levels.forEach((level, index) => {
      hierarchy_level[`L${index + 1}`] = level.title;
    });
    return hierarchy_level;
  };

  const handleSubmit = async (modalData) => {
    const { geneData, selectedUsers } = modalData;

    if (!geneData.name || geneData.levels.length === 0) {
      toast.error('Please fill all required fields and add at least one level');
      return;
    }

    const hasEmptyTitle = geneData.levels.some(level => !level.title.trim());
    if (hasEmptyTitle) {
      toast.error('Please fill level names for all levels');
      return;
    }

    const loadingToast = toast.loading(editingGene ? 'Updating gene...' : 'Creating gene...');

    try {
      const tokens = authUtils.getTokens();
      const token = tokens?.accessToken ||
        localStorage.getItem('token') ||
        localStorage.getItem('accessToken') ||
        sessionStorage.getItem('token') ||
        sessionStorage.getItem('accessToken');

      if (!token) {
        toast.error('Authentication required. Please login again.', { id: loadingToast });
        router.push('/login');
        return;
      }

      let organization_id = authUtils.getOrganizationId();
      try {
        const userData = localStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          organization_id = user.organization_id;
        }
      } catch (parseError) {
        console.warn('Could not parse user data from localStorage:', parseError);
      }

      if (!organization_id) {
        organization_id = localStorage.getItem('organization_id') ||
          sessionStorage.getItem('organization_id');
      }

      if (!organization_id) {
        toast.error('Organization ID not found. Please login again.', { id: loadingToast });
        return;
      }

      const hierarchy_level = convertLevelsToHierarchy(geneData.levels);
      const level_depth = geneData.levels.length;

      const userIds = selectedUsers ? selectedUsers.map(u => u.id || u.user_id) : [];

      if (editingGene) {
        const payload = {
          geneId: geneData.g_id || geneData.id || editingGene.g_id || editingGene.id,
          g_name: geneData.name,
          is_active: geneData.is_active,
          level_depth: level_depth,
          organization_id: organization_id,
          users: userIds
        };

        if (hierarchy_level && Object.keys(hierarchy_level).length > 0) {
          payload.hierarchy_level = hierarchy_level;
        }

        // if (geneData.organizations && Array.isArray(geneData.organizations) && geneData.organizations.length > 0) {
        //   payload.organizations = geneData.organizations;
        // }

        console.log('Update Gene Payload:', payload);

        const response = await genesApi.update(geneData.g_id, payload);

        if (response.data.success) {
          toast.success(response.data.message || `Gene "${geneData.name}" updated successfully!`, {
            id: loadingToast,
          });
          fetchGenes();
          router.refresh();
          closeModal();
        } else {
          throw new Error(response.data.message || 'Failed to update gene');
        }
      } else {
        // Build payload for creating new gene
        const payload = {
          g_name: geneData.name,
          hierarchy_level: hierarchy_level,
          is_active: geneData.is_active,
          level_depth: level_depth,
          organization_id: organization_id,
          users: userIds
        };

        // Add organizations if provided
        if (geneData.organizations && Array.isArray(geneData.organizations) && geneData.organizations.length > 0) {
          payload.organizations = geneData.organizations;
        }
        console.log('Create Gene Payload:', payload);

        const response = await genesApi.create(payload);

        if (response.data.success) {
          toast.success(response.data.message || `Gene "${geneData.name}" created successfully with ${level_depth} levels!`, {
            id: loadingToast,
          });
          fetchGenes();
          router.refresh();
          closeModal();
        } else {
          throw new Error(response.data.message || 'Failed to create gene');
        }
      }
    } catch (error) {
      console.error('Error saving gene:', error);
      const errorMsg = error.response?.data?.message || error.message || `Failed to ${editingGene ? 'update' : 'create'} gene`;
      toast.error(errorMsg, {
        id: loadingToast,
      });
    }
  };

  const [loadingGeneDetails, setLoadingGeneDetails] = useState(false);

  const openViewModal = async (gene) => {
    setSelectedGene(gene);
    setShowViewModal(true);
    setLoadingGeneDetails(true);
    try {
      // Fetch detailed gene information with users and organizations
      const response = await genesApi.getById(gene.g_id || gene.id);

      if (response.data.success && response.data.data) {
        // Transform the API response to match your expected structure
        const detailedGene = {
          ...gene,
          // Extract users from the API response
          usersArray: response.data.data.map(user => ({
            user_id: user.user_id,
            id: user.user_id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            username: user.email,
            name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
            is_active: user.is_active
          })),

          // Shows user count
          users: response.data.data.length,

          // Extract organizations from the response
          organizations: [...new Set(response.data.data.map(user => user.organization_id))].map(orgId => ({
            organization_id: orgId,
            id: orgId
          })),

          // Update organizations count
          totalMembers: [...new Set(response.data.data.map(user => user.organization_id))].length
        };

        setSelectedGene(detailedGene);
      }
    } catch (error) {
      console.error('Error fetching gene details:', error);
      toast.error('Failed to load gene details');
    } finally {
      setLoadingGeneDetails(false);
    }
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setSelectedGene(null);
  };

  const handleDeleteGene = async (geneId) => {
    const geneObj = genes.find(g => (g.g_id || g.id) === geneId);
    setGeneToDelete(geneId);
    setGeneToDeleteObj(geneObj);
    setShowDeleteModal(true);
  };

  const confirmDelete = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const loadingToast = toast.loading('Deleting gene...');

    try {
      console.log('Deleting gene with ID:', geneToDelete);

      const response = await genesApi.delete(geneToDelete);

      if (response.data.success) {
        toast.success(response.data.message || 'Gene deleted successfully!', {
          id: loadingToast,
        });

        setGenes(prevGenes => prevGenes.filter(gene => (gene.g_id || gene.id) !== geneToDelete));

        setPagination(prev => ({
          ...prev,
          total: Math.max(0, prev.total - 1)
        }));

        setShowDeleteModal(false);
        setGeneToDelete(null);
        setGeneToDeleteObj(null);
      } else {
        throw new Error(response.data.message || 'Failed to delete gene');
      }
    } catch (error) {
      console.error('Error deleting gene:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to delete gene';
      toast.error(errorMsg, {
        id: loadingToast,
      });
    }
  };

  const filteredGenes = genes.filter(gene => {
    const geneName = (gene.g_name || gene.name || '').toLowerCase();
    const createdBy = (gene.createdBy || '').toLowerCase();
    const search = searchTerm.toLowerCase().trim();

    const tokens = authUtils.getTokens();
    const currentUser = tokens?.user;

    // Search filter
    const matchesSearch = !search || geneName.includes(search) || createdBy.includes(search);

    // Type filter
    const matchesType = typeFilter === 'all' || gene.type?.toLowerCase() === typeFilter.toLowerCase();

    // Status & Archived filter
    let matchesStatus = true;
    if (statusFilter === 'all') {
      if (!showArchived) {
        matchesStatus = gene.is_active === true;
      }
    } else if (statusFilter === 'active') {
      matchesStatus = gene.is_active === true;
    } else if (statusFilter === 'inactive') {
      matchesStatus = gene.is_active === false;
    }

    // My Hierarchies filter
    const matchesMyHierarchies = !myHierarchiesOnly || (currentUser && (gene.createdById === currentUser.id || gene.createdById === currentUser.user_id));

    // Show Empty filter
    const matchesEmpty = !showEmpty || (gene.totalMembers === 0 || gene.users === 0);

    return matchesSearch && matchesType && matchesStatus && matchesMyHierarchies && matchesEmpty;
  });

  // Apply Sorting
  if (sortConfig.key && sortConfig.direction !== 'none') {
    filteredGenes.sort((a, b) => {
      let valA, valB;

      switch (sortConfig.key) {
        case 'g_name':
        case 'name':
          valA = (a.g_name || a.name || "").toLowerCase();
          valB = (b.g_name || b.name || "").toLowerCase();
          break;
        case 'createdBy':
          valA = (a.createdBy || "").toLowerCase();
          valB = (b.createdBy || "").toLowerCase();
          break;
        case 'is_active':
          valA = a.is_active ? 1 : 0;
          valB = b.is_active ? 1 : 0;
          break;
        case 'hierarchyLevels':
          valA = a.hierarchyLevels || 0;
          valB = b.hierarchyLevels || 0;
          break;
        case 'users':
          valA = a.users || 0;
          valB = b.users || 0;
          break;
        case 'totalMembers':
          valA = a.totalMembers || 0;
          valB = b.totalMembers || 0;
          break;
        case 'lastUpdated':
          valA = new Date(a.createdAt || a.lastUpdated).getTime();
          valB = new Date(b.createdAt || b.lastUpdated).getTime();
          break;
        default:
          valA = a[sortConfig.key];
          valB = b[sortConfig.key];
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const paginatedGenes = filteredGenes.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleShowCsvModal = () => {
    setShowCsvModal(true);
  };

  const handleCloseCsvModal = () => {
    setShowCsvModal(false);
  };

  const handleShowUserGeneCsvModal = () => {
    setShowCsvGeneUserModal(true);
  };

  const handleCloseUserGeneCsvModal = () => {
    setShowCsvGeneUserModal(false);
  };

  const handleCsvSubmit = async (formData) => {
    const loadingToast = toast.loading('Importing genes from CSV...');

    try {
      const response = await genesApi.uploadCSV(formData);
      let errorCsvData = null;

      if (response.data) {
        if (typeof response.data === 'string' && response.data.trim().startsWith('row,error,data')) {
          errorCsvData = response.data;
        } else if (response.data.errors && typeof response.data.errors === 'string' && response.data.errors.trim().startsWith('row,error,data')) {
          errorCsvData = response.data.errors;
        } else if (response.data.errorData && typeof response.data.errorData === 'string' && response.data.errorData.trim().startsWith('row,error,data')) {
          errorCsvData = response.data.errorData;
        } else if (response.data.invalidData && typeof response.data.invalidData === 'string' && response.data.invalidData.trim().startsWith('row,error,data')) {
          errorCsvData = response.data.invalidData;
        }
      }

      if (errorCsvData) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        downloadCsv(errorCsvData, `invalid-genes-${timestamp}.csv`);
        toast.warning('Some rows had errors. Invalid data has been downloaded.', {
          id: loadingToast,
        });
        // Still close modal and refresh because some genes likely succeeded
        setShowCsvModal(false);
        fetchGenes();
        router.refresh();
      } else if (response.data.success || response.data.message) {
        toast.success(response.data.message || 'Genes imported successfully from CSV!', {
          id: loadingToast,
        });
        setShowCsvModal(false);
        fetchGenes();
        router.refresh();
      } else {
        throw new Error(response.data.message || 'Failed to import genes');
      }
    } catch (err) {
      console.error('CSV import error:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to import genes from CSV';
      toast.error(errorMsg, {
        id: loadingToast,
      });
    }
  };

  // Helper function to download CSV data
  const downloadCsv = (csvContent, filename = 'invalid-data.csv') => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCsvUserGeneSubmit = async (formData) => {
    const loadingToast = toast.loading('Importing user mappings from CSV...');

    try {
      const tokens = authUtils.getTokens();
      const token = tokens?.accessToken;

      if (!token) {
        toast.error('Authentication required. Please login again.', { id: loadingToast });
        router.push('/login');
        return;
      }

      const response = await genesApi.assignUsersCsv(formData);

      let errorCsvData = null;

      if (response.data) {
        if (typeof response.data === 'string' && response.data.trim().startsWith('row,error,data')) {
          errorCsvData = response.data;
        }
        // Check if response.data.errors is a CSV string
        else if (response.data.errors && typeof response.data.errors === 'string' && response.data.errors.trim().startsWith('row,error,data')) {
          errorCsvData = response.data.errors;
        }
        // Check if response.data.errorData is a CSV string
        else if (response.data.errorData && typeof response.data.errorData === 'string' && response.data.errorData.trim().startsWith('row,error,data')) {
          errorCsvData = response.data.errorData;
        }
        // Check if response.data.invalidData is a CSV string
        else if (response.data.invalidData && typeof response.data.invalidData === 'string' && response.data.invalidData.trim().startsWith('row,error,data')) {
          errorCsvData = response.data.invalidData;
        }
      }

      // If there are errors, download them as CSV
      if (errorCsvData) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        downloadCsv(errorCsvData, `invalid-user-mappings-${timestamp}.csv`);

        toast.warning('Some rows had errors. Invalid data has been downloaded.', {
          id: loadingToast,
        });

        // Still close modal and refresh if partial success
        if (response.data.success || response.data.message?.toLowerCase().includes('success')) {
          setShowCsvGeneUserModal(false);
          fetchGenes();
          router.refresh();
        }
      } else if (response.data.success || response.data.message) {
        toast.success(response.data.message || 'User mappings imported successfully from CSV!', {
          id: loadingToast,
        });
        setShowCsvGeneUserModal(false);
        fetchGenes();
        router.refresh();
      } else {
        throw new Error(response.data.message || 'Failed to import users mapping');
      }
    } catch (err) {
      console.error('CSV import error:', err);

      // Check if error response contains CSV error data
      let errorCsvData = null;
      if (err.response?.data) {
        const errorData = err.response.data;

        // Check various possible locations for error CSV data
        if (typeof errorData === 'string' && errorData.trim().startsWith('row,error,data')) {
          errorCsvData = errorData;
        } else if (errorData.errors && typeof errorData.errors === 'string' && errorData.errors.trim().startsWith('row,error,data')) {
          errorCsvData = errorData.errors;
        } else if (errorData.errorData && typeof errorData.errorData === 'string' && errorData.errorData.trim().startsWith('row,error,data')) {
          errorCsvData = errorData.errorData;
        } else if (errorData.invalidData && typeof errorData.invalidData === 'string' && errorData.invalidData.trim().startsWith('row,error,data')) {
          errorCsvData = errorData.invalidData;
        }
      }

      // Download error CSV if found
      if (errorCsvData) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        downloadCsv(errorCsvData, `invalid-user-mappings-${timestamp}.csv`);
        toast.error('Import failed with errors. Invalid data has been downloaded.', {
          id: loadingToast,
        });
      } else {
        const errorMsg = err.response?.data?.message || err.message || 'Failed to import user mappings from CSV';
        toast.error(errorMsg, {
          id: loadingToast,
        });
      }
    }
  };

  const renderGeneView = () => {
    // Remove early return for loading to show skeletons in the main layout

    if (error) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error Loading Genes</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="flex gap-2 justify-center">
              <Button onClick={fetchGenes}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (filteredGenes.length === 0 && !loading) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <p className="text-lg font-medium mb-2">No genes found</p>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'Try adjusting your search terms' : 'Create your first gene to get started'}
            </p>
            <Button onClick={openCreateModal}>
              <Plus className="mr-2 h-4 w-4" />
              Create Gene
            </Button>
          </div>
        </div>
      );
    }

    switch (view) {
      case 'list':
        // return renderListView();
        return <GeneListView
          loading={loading}
          paginatedGenes={paginatedGenes}
          pageSize={pageSize}
          openViewModal={openViewModal}
          openEditModal={openEditModal}
          handleDeleteGene={handleDeleteGene}
        />
      case 'table':
        // return renderTableView();
        return <GeneTableView
          loading={loading}
          paginatedGenes={paginatedGenes}
          pageSize={pageSize}
          sortConfig={sortConfig}
          handleSort={handleSort}
          handleToggleStatus={handleToggleStatus}
          openViewModal={openViewModal}
          openEditModal={openEditModal}
          handleDeleteGene={handleDeleteGene}
        />
      case 'cards':
      default:
        // return renderCardsView();
        return <GeneCardView
          loading={loading}
          paginatedGenes={paginatedGenes}
          pageSize={pageSize}
          openViewModal={openViewModal}
          openEditModal={openEditModal}
          handleDeleteGene={handleDeleteGene}
        />
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-screen bg-background">
        <div className="px-0 pt-0 mb-2">
          <PageBreadcrumb />
        </div>
        {/* Header */}
        {/* <header className="bg-card border-b">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center justify-between sm:justify-start">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-bold">Genes Dashboard</h1>
              </div>
            </div>
           
            <div className="flex items-center gap-4">
              <div className="relative flex-1 sm:flex-none sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search genes..."
                  value={searches || ''}
                  onChange={handleSearchChange}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </div>
      </header> */}

        {/* Main Content */}
        <div className="w-full px-4 sm:px-2 py-4 md:py-2 md:p-0">
          {/* Dashboard Header */}
          <div className="mb-6 md:mb-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <Network className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold">Gene Management</h2>
                </div>
                <p className="text-muted-foreground">Create, manage, and organize your gene structures with precision</p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Button onClick={openCreateModal}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Gene
                </Button>
                <Button variant="secondary" onClick={handleShowCsvModal}>
                  <Upload className="mr-2 h-4 w-4" />
                  Import
                </Button>
                <Button variant="secondary" onClick={handleShowUserGeneCsvModal}>
                  <Upload className="mr-2 h-4 w-4" />
                  Users Mapping
                </Button>
              </div>
            </div>
            {/* <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center">
                <span className="w-2 h-2 bg-primary rounded-full mr-2"></span>
                {filteredGenes.length} Active Genes
              </span>
              <span className="flex items-center">
                <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                {filteredGenes.reduce((sum, h) => sum + h.level_depth, 0)} Total Levels
              </span>
              <span className="flex items-center">
                <span className="w-2 h-2 bg-muted-foreground rounded-full mr-2"></span>
                Last updated {genes.length > 0 ? genes[0].lastUpdated : 'Never'}
              </span>
            </div> */}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">

            {/* Active Genes */}
            <Card className="hover:shadow-sm transition">
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="text-sm text-muted-foreground">Active Genes</p>
                  <p className="text-2xl font-bold">{filteredGenes.length}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Network className="h-5 w-5 text-primary" />
                </div>
              </CardContent>
            </Card>

            {/* Total Levels */}
            <Card className="hover:shadow-sm transition">
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Levels</p>
                  <p className="text-2xl font-bold">
                    {filteredGenes.reduce((sum, h) => sum + h.level_depth, 0)}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Layers className="h-5 w-5 text-green-600" />
                </div>
              </CardContent>
            </Card>

            {/* Last Updated */}
            <Card className="hover:shadow-sm transition">
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="text-sm font-medium">
                    {genes.length > 0 ? genes[0].lastUpdated : "Never"}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

          </div>
          {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2].map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  {loading ? (
                    <Skeleton className="h-4 w-24" />
                  ) : (
                    <CardTitle className="text-sm font-medium">
                      {i === 0 ? "Total Genes" : "Active Genes"}
                    </CardTitle>
                  )}
                  {loading ? (
                    <Skeleton className="h-4 w-4 rounded-full" />
                  ) : (
                    i === 0 ? <Network className="h-4 w-4 text-muted-foreground" /> : <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  )}
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <div className="text-2xl font-bold">
                      {i === 0 ? genes.length : genes.filter(g => g.is_active).length}
                    </div>
                  )}
                  {loading ? (
                    <Skeleton className="h-3 w-20 mt-1" />
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">
                      {i === 0 ? "Total genes in system" : "Currently active genes"}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div> */}

          {/* Filters */}
          <Card className="mb-4 gap-2">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle>Filter & Search</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setShowArchived(false);
                    setShowEmpty(false);
                    setMyHierarchiesOnly(false);
                    setTypeFilter('all');
                    setStatusFilter('all');
                  }}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reset All Filters
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                <div className="relative w-full lg:w-72">
                  <DebouncedInput
                    type="text"
                    placeholder="Search genes..."
                    value={searches || ''}
                    onChange={handleSearchChange}
                    className="pr-10"
                  />
                  {searches && (
                    <X
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer"
                      onClick={() => {
                        handleSearchChange('');
                      }}
                    />
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="gene">Gene</SelectItem>
                      <SelectItem value="department">Department</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showArchived"
                    checked={showArchived}
                    onCheckedChange={(checked) => setShowArchived(checked)}
                  />
                  <Label htmlFor="showArchived" className="cursor-pointer">Show Archived</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showEmpty"
                    checked={showEmpty}
                    onCheckedChange={(checked) => setShowEmpty(checked)}
                  />
                  <Label htmlFor="showEmpty" className="cursor-pointer">Show Empty</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="myHierarchiesOnly"
                    checked={myHierarchiesOnly}
                    onCheckedChange={(checked) => setMyHierarchiesOnly(checked)}
                  />
                  <Label htmlFor="myHierarchiesOnly" className="cursor-pointer">My Genes Only</Label>
                </div>
              </div>
            </CardContent>
          </Card>


          {/* Genes View */}
          <Card className="w-full">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>
                    {view === 'cards' && 'Genes Cards'}
                    {view === 'list' && 'Genes List'}
                    {view === 'table' && 'Genes Table'}
                  </CardTitle>
                  <CardDescription>
                    {view === 'cards' && 'Visual representation of your gene structures'}
                    {view === 'list' && 'Compact list view of all genes'}
                    {view === 'table' && 'Detailed table view with all gene information'}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground mr-2 hidden sm:inline">View:</span>
                  <Button
                    variant={view === 'table' ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setView('table')}
                    title="Table View"
                  >
                    <Table2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={view === 'list' ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setView('list')}
                    title="List View"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={view === 'cards' ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setView('cards')}
                    title="Cards View"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="w-full">
              {renderGeneView()}
            </CardContent>
            {filteredGenes.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between border-t px-4 py-4 gap-4 bg-muted/5">
                <div className="flex flex-wrap items-center gap-4 order-2 sm:order-1 justify-center sm:justify-start">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Show</span>
                    <Select value={pageSize.toString()} onValueChange={(value) => {
                      setPageSize(parseInt(value));
                      setCurrentPage(1);
                    }}>
                      <SelectTrigger className="w-[70px] h-8 border-muted-foreground/20 text-xs shadow-none rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent side="top">
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="15">15</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">per page</span>
                  </div>
                  <div className="text-sm font-medium border-l pl-4 text-muted-foreground">
                    Showing <span className="text-foreground">{((currentPage - 1) * pageSize) + 1}</span> to <span className="text-foreground">{Math.min(currentPage * pageSize, filteredGenes.length)}</span> of <span className="text-foreground">{filteredGenes.length}</span> entries
                  </div>
                </div>
                <div className="order-1 sm:order-2">
                  <Pagination className="justify-end w-auto mx-0">
                    <PaginationContent>
                      <PaginationItem>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentPage(prev => Math.max(1, prev - 1));
                          }}
                          disabled={currentPage === 1}
                          className="gap-1 pl-2.5 h-8 rounded-lg"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          <span>Previous</span>
                        </Button>
                      </PaginationItem>
                      {Array.from({ length: Math.ceil(filteredGenes.length / pageSize) }, (_, i) => i + 1)
                        .filter(pageNum => {
                          const totalPages = Math.ceil(filteredGenes.length / pageSize);
                          if (totalPages <= 5) return true;
                          if (pageNum === 1 || pageNum === totalPages) return true;
                          return Math.abs(pageNum - currentPage) <= 1;
                        })
                        .map((pageNum, index, array) => {
                          const elements = [];
                          const totalPages = Math.ceil(filteredGenes.length / pageSize);

                          if (index > 0 && pageNum - array[index - 1] > 1) {
                            elements.push(
                              <PaginationItem key={`ellipsis-${pageNum}`}>
                                <PaginationLink className="pointer-events-none">...</PaginationLink>
                              </PaginationItem>
                            );
                          }

                          elements.push(
                            <PaginationItem key={pageNum}>
                              <PaginationLink
                                onClick={(e) => {
                                  e.preventDefault();
                                  setCurrentPage(pageNum);
                                }}
                                isActive={currentPage === pageNum}
                                className="cursor-pointer h-8 w-8 rounded-lg"
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          );
                          return elements;
                        })}
                      <PaginationItem>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentPage(prev => Math.min(Math.ceil(filteredGenes.length / pageSize), prev + 1));
                          }}
                          disabled={currentPage >= Math.ceil(filteredGenes.length / pageSize)}
                          className="gap-1 pr-2.5 h-8 rounded-lg"
                        >
                          <span>Next</span>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* View Gene Modal */}
        <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <DialogTitle className="truncate">
                    {selectedGene?.g_name || selectedGene?.name}
                  </DialogTitle>
                  <DialogDescription className="flex items-center space-x-2 mt-2">
                    {getStatusBadge(selectedGene?.is_active || false)}
                    <span>•</span>
                    <span>{selectedGene?.hierarchyLevels} Levels</span>
                    <span>•</span>
                    <span>Users: {selectedGene?.users}</span>
                    <span>•</span>
                    <span>Organizations: {selectedGene?.organizations?.length || selectedGene?.totalMembers || 0}</span>
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              {loadingGeneDetails ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
                  <span className="text-sm text-muted-foreground">Loading gene details...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center space-x-2">
                          <Layers className="h-5 w-5 text-primary" />
                          <div>
                            <div className="text-xs text-muted-foreground font-medium">Total Levels</div>
                            <div className="text-lg font-bold">{selectedGene?.hierarchyLevels}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center space-x-2">
                          <UsersIcon className="h-5 w-5 text-primary" />
                          <div>
                            <div className="text-xs text-muted-foreground font-medium">Users</div>
                            <div className="text-lg font-bold">{selectedGene?.users}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center space-x-2">
                          <CheckCircle2 className={`h-5 w-5 ${selectedGene?.is_active ? 'text-green-600' : 'text-gray-400'}`} />
                          <div>
                            <div className="text-xs text-muted-foreground font-medium">Status</div>
                            <div className="text-lg font-bold">
                              {selectedGene?.is_active ? 'Active' : 'Inactive'}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Gene Structure */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Gene Structure</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedGene?.levels && selectedGene.levels.length > 0 ? (
                        <div className="space-y-4">
                          {selectedGene.levels.map((level, index) => (
                            <div key={level.id || index} className="relative">
                              {index > 0 && (
                                <div className="flex justify-center mb-3">
                                  <div className="w-0.5 h-6 bg-primary rounded-full"></div>
                                </div>
                              )}

                              <Card>
                                <CardContent className="pt-4">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-sm">
                                      {index + 1}
                                    </div>
                                    <div className="flex-1">
                                      <h4 className="font-bold">{level.title}</h4>
                                      <p className="text-xs text-muted-foreground">Level {index + 1}</p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Layers className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p className="text-sm font-medium">No gene structure available</p>
                          <p className="text-xs mt-1">The gene structure hasn&apos;t been configured yet</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Mapped Users */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <UsersIcon className="h-5 w-5" />
                          Mapped Users
                        </CardTitle>
                        <Badge variant="secondary">
                          {selectedGene?.usersArray?.length || selectedGene?.users || 0}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {selectedGene?.usersArray && selectedGene.usersArray.length > 0 ? (
                        <div className="space-y-3">
                          {selectedGene.usersArray.map((user, index) => (
                            <div key={user.user_id || user.id || index} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                                <UsersIcon className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm truncate flex-1">
                                    {user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || `User ${index + 1}`}
                                  </p>
                                  <div className={cn(
                                    "w-2 h-2 rounded-full shrink-0",
                                    user.is_active !== false ? 'bg-green-500' : 'bg-gray-300'
                                  )} />
                                </div>
                                {user.email && (
                                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                )}
                                {user.is_active === false && (
                                  <p className="text-xs text-muted-foreground mt-1">Inactive</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <UsersIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p className="text-sm font-medium">No users mapped</p>
                          <p className="text-xs mt-1">This gene doesn&apos;t have any users assigned yet</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Mapped Organizations */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Building className="h-5 w-5" />
                          Mapped Organizations
                        </CardTitle>
                        <Badge variant="secondary">
                          {selectedGene?.organizations?.length || selectedGene?.totalMembers || 0}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {selectedGene?.organizations && selectedGene.organizations.length > 0 ? (
                        <div className="space-y-3">
                          {selectedGene.organizations.map((org, index) => {
                            // Find the matching organization from fetched organizations
                            const matchedOrg = organizations.find(o =>
                              o.organization_id === org.organization_id ||
                              o.id === org.organization_id ||
                              String(o.organization_id) === String(org.organization_id) ||
                              String(o.id) === String(org.organization_id)
                            );

                            const orgName = matchedOrg?.name || `Organization ${org.organization_id?.substring(0, 8)}...`;

                            return (
                              <div key={org.organization_id || index} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <Building className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate" title={orgName}>{orgName}</p>
                                  {matchedOrg?.subscription_tier && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      <Badge variant="outline" className="text-xs">
                                        {matchedOrg.subscription_tier}
                                      </Badge>
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Building className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p className="text-sm font-medium">No organizations mapped</p>
                          <p className="text-xs mt-1">This gene doesn&apos;t have any organizations assigned yet</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={closeViewModal}>
                Close
              </Button>
              <Button
                onClick={() => {
                  closeViewModal();
                  openEditModal(selectedGene);
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Gene
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Gene</AlertDialogTitle>
              <AlertDialogDescription>
                {geneToDeleteObj ? (
                  <>
                    Are you sure you want to delete <strong className="font-semibold text-foreground">&quot;{geneToDeleteObj.g_name || geneToDeleteObj.name || 'Unknown'}&quot;</strong>?
                    <br /><br />
                    This action cannot be undone. This will permanently delete the gene and remove all associated data including:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Gene structure and hierarchy</li>
                      <li>All associated levels</li>
                      <li>Organization mappings</li>
                    </ul>
                  </>
                ) : (
                  <>
                    This action cannot be undone. This will permanently delete the gene and remove all associated data including:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Gene structure and hierarchy</li>
                      <li>All associated levels</li>
                      <li>Organization mappings</li>
                    </ul>
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setShowDeleteModal(false);
                setGeneToDelete(null);
                setGeneToDeleteObj(null);
              }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  confirmDelete(e);
                }}
                className="bg-destructive text-white hover:bg-destructive/90 focus:ring-destructive dark:bg-destructive dark:text-white"
                type="button"
              >
                Delete Gene
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Gene Modal */}
        <GeneModal
          showModal={showModal}
          onClose={closeModal}
          onSubmit={handleSubmit}
          editingGene={editingGene}
          geneData={geneData}
          setGeneData={setGeneData}
          addLevel={addLevel}
          removeLevel={removeLevel}
          updateLevel={updateLevel}
          allUsers={users}
        />

        {/* Gene CSV Import Modal */}
        <GeneCsvModal
          isOpen={showCsvModal}
          onClose={handleCloseCsvModal}
          onSubmit={handleCsvSubmit}
        />

        {/* User Gene Mapping Modal */}
        <UserGeneMappingModal
          isOpen={showCsvGeneUserModal}
          onClose={handleCloseUserGeneCsvModal}
          onSubmit={handleCsvUserGeneSubmit}
        />
      </div>
    </TooltipProvider>
  );
}
