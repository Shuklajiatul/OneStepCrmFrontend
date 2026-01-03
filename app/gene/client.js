"use client"

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { authUtils } from '@/lib/auth-utils';
import { genesApi, usersApi, organizationsApi } from '@/lib/api-endpoint';
import {
  Eye, Edit, Trash2, Plus, Search, Upload, Table2, List, LayoutGrid,
  Loader2, AlertCircle, RefreshCw, X, CheckCircle2, Building,
  Layers, Users as UsersIcon, Calendar, BarChart3, Filter, Network
} from 'lucide-react';

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
import { cn } from "@/lib/utils";
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



export default function GeneClient({ initialGenes = [], initialPagination = null }) {
  const router = useRouter();
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState(initialPagination || {
    page: 1,
    limit: 10,
    total: 0
  });
  const [organizations, setOrganizations] = useState([]);
  const [loadingOrganizations, setLoadingOrganizations] = useState(false);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Track initial render to avoid double fetch
  const isFirstRender = useRef(true);

  // Debounce function
  const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
  };

  // Debounced search function
  const debouncedSearchHandler = useCallback(
    debounce((query) => {
      console.log('Debounced search query:', query);
      setDebouncedSearch(query);
    }, 500),
    []
  );

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearhes(value);
    setSearchTerm(value);
    console.log('Search query:', value);
    debouncedSearchHandler(value);
  };

  const fetchGenes = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get token from auth utils, localStorage, or sessionStorage
      const tokens = authUtils.getTokens();
      const token = tokens?.accessToken;

      if (!tokens) {
        setError('Authentication required. Please login again.');
        toast.error('Authentication required. Please login again.');
        router.push('/login');
        return;
      }

      console.log("Making API call to get all genes");

      const response = await genesApi.getAll();

      console.log('Full API Response:', response.data);

      if (response.data.success && response.data.data) {
        const apiGenes = response.data.data || [];
        console.log('API Genes:', apiGenes);
        console.log('Sample gene structure:', apiGenes[0]); // Log first gene to see structure

        // Try to fetch users if created_by is just IDs, to create a user ID to name mapping
        let userMap = {};
        try {
          const uniqueUserIds = [...new Set(apiGenes.map(g => g.created_by).filter(Boolean))];
          if (uniqueUserIds.length > 0) {
            // Try to fetch users if we have user IDs
            const tokens = authUtils.getTokens();
            const token = tokens?.accessToken ||
              localStorage.getItem('token') ||
              localStorage.getItem('accessToken') ||
              sessionStorage.getItem('token') ||
              sessionStorage.getItem('accessToken');
            if (token) {
              const usersResponse = await usersApi.getAll();
              if (usersResponse.data && Array.isArray(usersResponse.data)) {
                usersResponse.data.forEach(user => {
                  userMap[user.user_id || user.id] = user.first_name && user.last_name
                    ? `${user.first_name} ${user.last_name}`.trim()
                    : user.username || user.email || user.name || user.user_id || user.id;
                });
              }
            }
          }
        } catch (userFetchError) {
          console.warn('Could not fetch users for name mapping:', userFetchError);
        }

        // Transform API data to match your component structure
        const transformedGenes = apiGenes.map(gene => {
          const levels = [];
          if (gene.hierarchy_level && typeof gene.hierarchy_level === 'object') {
            Object.entries(gene.hierarchy_level).forEach(([key, value]) => {
              // Handle numeric keys like "1", "2" or string keys like "level1", "level2"
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

          // Safe handling for potentially null/undefined arrays
          const usersCount = gene.users ? (Array.isArray(gene.users) ? gene.users.length : 0) : 0;
          const organizationsCount = gene.organizations ? (Array.isArray(gene.organizations) ? gene.organizations.length : 0) : 0;

          // Extract created by name from various possible API response formats
          let createdByName = 'Unknown';
          if (gene.created_by_details) {
            // If API provides user details object
            createdByName = gene.created_by_details.user_data?.username ||
              gene.created_by_details.user_data?.name ||
              gene.created_by_details.user_data?.email ||
              gene.created_by_details.name ||
              gene.created_by_details.username ||
              'Unknown';
          } else if (gene.created_by_name) {
            // If API directly provides created_by_name field
            createdByName = gene.created_by_name;
          } else if (gene.created_by && typeof gene.created_by === 'object') {
            // If created_by is an object with name/username
            createdByName = gene.created_by.name || gene.created_by.username || gene.created_by.email || 'Unknown';
          } else if (gene.created_by) {
            // If created_by is just an ID, try to look it up in userMap
            if (userMap[gene.created_by]) {
              createdByName = userMap[gene.created_by];
            } else {
              // Fallback to ID if we couldn't find the user
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
            usersArray: gene.users || [], // Preserve original users array for editing
            lastUpdated: new Date(gene.updated_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            }),
            completion: 100,
            createdBy: createdByName,
            createdById: gene.created_by, // Keep the ID for reference if needed
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
        // Clear all tokens using auth utils
        authUtils.clearTokens();
        localStorage.removeItem('token'); // Also remove legacy token if exists
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
      // Don't show error to user, just log it
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
      const normalizedUsers = usersData.map(user => ({
        ...user,
        id: user.id || user.user_id,
        username: user.username || user.email || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        name: user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim()
      }));

      setUsers(normalizedUsers);
    } catch (err) {
      console.error('Error fetching users:', err);
      // Don't show error to user, just log it
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isFirstRender.current && initialGenes.length > 0) {
      isFirstRender.current = false;
      fetchOrganizations();
      fetchUsers();
      return;
    }
    fetchGenes();
    fetchOrganizations();
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize]);

  // Handle search separately - reset to page 1 when search changes
  useEffect(() => {
    if (debouncedSearch !== undefined && debouncedSearch !== null) {
      setCurrentPage(1);
      // Note: fetchGenes will be called when currentPage changes
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }
  }, [debouncedSearch]);

  const getStatusBadge = (is_active) => {
    return (
      <Badge variant={is_active ? "default" : "secondary"}>
        {is_active ? 'Active' : 'Inactive'}
      </Badge>
    );
  };

  const handleToggleStatus = async (geneId, currentStatus) => {
    const loadingToast = toast.loading('Updating status...');

    try {
      // Optimistically update the UI
      setGenes(prevGenes =>
        prevGenes.map(gene =>
          gene.g_id === geneId || gene.id === geneId
            ? { ...gene, is_active: !currentStatus }
            : gene
        )
      );

      console.log('Toggling status for gene with ID:', geneId);

      console.log('Toggling status for gene with ID:', geneId);

      // Call the toggle API endpoint
      // Call the toggle API endpoint
      const response = await genesApi.toggleActive(geneId);

      if (response.data.success) {
        const newStatus = !currentStatus;
        toast.success(`Gene status updated to ${newStatus ? 'Active' : 'Inactive'}!`, {
          id: loadingToast,
        });
        // No need to call fetchGenes() since we've already updated optimistically
      } else {
        // Revert optimistic update on error
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
      // Revert optimistic update on error
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
    setEditingGene(gene);

    try {
      // Fetch the specific gene details to get the users
      const response = await genesApi.getById(gene.g_id || gene.id);

      if (response.data.success && response.data.data) {
        const geneDetails = response.data.data;

        // Extract user IDs from the API response
        let usersString = '';
        if (Array.isArray(geneDetails)) {
          // This is the structure from your API response
          const userIds = geneDetails.map(user => user.user_id).filter(Boolean);
          usersString = userIds.join(',');
        }

        setGeneData({
          name: gene.g_name || gene.name,
          levels: gene.levels || [],
          g_id: gene.g_id,
          is_active: gene.is_active,
          users: usersString
        });
        setShowModal(true);
      } else {
        throw new Error('Failed to fetch gene details');
      }
    } catch (error) {
      console.error('Error fetching gene details:', error);
      // Fallback to existing logic if API call fails
      let usersString = '';
      const usersArray = gene.usersArray || gene.users;

      if (usersArray && Array.isArray(usersArray)) {
        const userIds = usersArray.map(user => {
          if (typeof user === 'object' && user !== null) {
            return user.id || user.user_id || user;
          }
          return user;
        }).filter(Boolean);
        usersString = userIds.join(',');
      } else if (usersArray && typeof usersArray === 'string') {
        usersString = usersArray;
      }

      setGeneData({
        name: gene.g_name || gene.name,
        levels: gene.levels || [],
        g_id: gene.g_id,
        is_active: gene.is_active,
        users: usersString
      });
      setShowModal(true);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingGene(null);
    setGeneData({ name: '', levels: [], is_active: true });
  };

  const convertLevelsToHierarchy = (levels) => {
    const hierarchy_level = {};
    levels.forEach((level, index) => {
      // Use L1, L2 format as per API requirements
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
      // Get token from auth utils, localStorage, or sessionStorage
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

      // Get organization_id from localStorage user data
      let organization_id = null;
      try {
        const userData = localStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          organization_id = user.organization_id;
        }
      } catch (parseError) {
        console.warn('Could not parse user data from localStorage:', parseError);
      }

      // If organization_id is still null, try to get it from other sources
      if (!organization_id) {
        // You might need to adjust this based on where your organization_id is stored
        organization_id = localStorage.getItem('organization_id') ||
          sessionStorage.getItem('organization_id');
      }

      if (!organization_id) {
        toast.error('Organization ID not found. Please login again.', { id: loadingToast });
        return;
      }

      const hierarchy_level = convertLevelsToHierarchy(geneData.levels);
      const level_depth = geneData.levels.length;

      if (editingGene) {
        // Build payload for updating gene - include organization_id
        const payload = {
          g_name: geneData.name,
          is_active: geneData.is_active,
          level_depth: level_depth,
          organization_id: organization_id // Add organization_id here
        };

        // Add hierarchy_level if provided
        if (hierarchy_level && Object.keys(hierarchy_level).length > 0) {
          payload.hierarchy_level = hierarchy_level;
        }

        // Add users if selected
        if (selectedUsers && Array.isArray(selectedUsers) && selectedUsers.length > 0) {
          payload.users = selectedUsers.map(user => {
            // Handle both object with id and direct id value
            return user.id || user.user_id || user;
          });
        }

        // Add organizations if provided (though organization_id should be sufficient)
        if (geneData.organizations && Array.isArray(geneData.organizations) && geneData.organizations.length > 0) {
          payload.organizations = geneData.organizations;
        }

        console.log('Update Gene Payload:', payload);

        // Update endpoint uses PUT with g_id in the URL path
        // Update endpoint uses PUT with g_id in the URL path
        const response = await genesApi.update(geneData.g_id, payload);

        if (response.data.success) {
          toast.success(response.data.message || `Gene "${geneData.name}" updated successfully!`, {
            id: loadingToast,
          });
          fetchGenes();
          closeModal();
        } else {
          throw new Error(response.data.message || 'Failed to update gene');
        }
      } else {
        // Build payload for creating new gene - include organization_id
        const payload = {
          g_name: geneData.name,
          hierarchy_level: hierarchy_level,
          is_active: geneData.is_active,
          level_depth: level_depth,
          organization_id: organization_id // Add organization_id here for creation too
        };

        // Add organizations if provided
        if (geneData.organizations && Array.isArray(geneData.organizations) && geneData.organizations.length > 0) {
          payload.organizations = geneData.organizations;
        }

        // Add users if selected
        if (selectedUsers && Array.isArray(selectedUsers) && selectedUsers.length > 0) {
          payload.users = selectedUsers.map(user => {
            // Handle both object with id and direct id value
            return user.id || user.user_id || user;
          });
        }

        console.log('Create Gene Payload:', payload);

        const response = await genesApi.create(payload);

        if (response.data.success) {
          toast.success(response.data.message || `Gene "${geneData.name}" created successfully with ${level_depth} levels!`, {
            id: loadingToast,
          });
          fetchGenes();
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

  // const openViewModal = (gene) => {
  //   setSelectedGene(gene);
  //   setShowViewModal(true);
  // };

  const [loadingGeneDetails, setLoadingGeneDetails] = useState(false);

  const openViewModal = async (gene) => {
    setSelectedGene(gene);
    setShowViewModal(true);
    setLoadingGeneDetails(true);
    try {
      // Fetch detailed gene information with users and organizations
      const response = await axios.get(
        `${API_CONSTANTS.BASE_URL}/api/genes/by-geneId/${gene.g_id || gene.id}`,
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );

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
            username: user.email, // Using email as username fallback
            name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
            is_active: user.is_active
          })),
          // Update users count
          users: response.data.data.length,
          // Extract organizations (unique organization_ids from the response)
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
      // Keep the original gene data if detailed fetch fails
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
    // Prevent any form submission or default behavior
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const loadingToast = toast.loading('Deleting gene...');

    try {
      console.log('Deleting gene with ID:', geneToDelete);

      // Delete endpoint uses DELETE with g_id in the URL path
      const response = await genesApi.delete(geneToDelete);

      if (response.data.success) {
        toast.success(response.data.message || 'Gene deleted successfully!', {
          id: loadingToast,
        });

        // Update local state instead of refetching to avoid page refresh
        setGenes(prevGenes => prevGenes.filter(gene => (gene.g_id || gene.id) !== geneToDelete));

        // Update pagination if needed
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

    const matchesSearch = !search || geneName.includes(search) || createdBy.includes(search);
    return matchesSearch;
  });

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
      const baseUrl = API_CONSTANTS.BASE_URL;

      const response = await axios.post(
        `${baseUrl}/api/genes/uploadCSV`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success || response.data.message) {
        toast.success(response.data.message || 'Genes imported successfully from CSV!', {
          id: loadingToast,
        });
        setShowCsvModal(false);
        fetchGenes();
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
      // Get token from auth utils, localStorage, or sessionStorage
      const tokens = authUtils.getTokens();
      const token = tokens?.accessToken ||
        localStorage.getItem('token') ||
        localStorage.getItem('accessToken');

      if (!token) {
        toast.error('Authentication required. Please login again.', { id: loadingToast });
        router.push('/login');
        return;
      }

      const baseUrl = API_CONSTANTS.BASE_URL;

      const response = await axios.post(
        `${baseUrl}/api/genes/assign-users-csv`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      // Check if response contains error data (could be CSV string or object)
      let errorCsvData = null;

      if (response.data) {
        // Check if response.data is a CSV string (starts with "row,error,data")
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
        }
      } else if (response.data.success || response.data.message) {
        toast.success(response.data.message || 'User mappings imported successfully from CSV!', {
          id: loadingToast,
        });
        setShowCsvGeneUserModal(false);
        fetchGenes();
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

  // Render Cards View
  const renderCardsView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
      {filteredGenes.map((gene) => {
        const geneName = gene.g_name || gene.name || 'Unnamed Gene';
        return (
          <Card key={gene.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/geneManagement/geanUser/${gene.g_id || gene.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    <CardTitle className="text-base truncate">{geneName}</CardTitle>
                  </Link>
                  <CardDescription className="text-xs truncate">{gene.type}</CardDescription>
                </div>
                {getStatusBadge(gene.is_active)}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Organizations</span>
                <span className="font-semibold">{gene.totalMembers}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Levels</span>
                <span className="font-semibold">{gene.hierarchyLevels}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Users</span>
                <span className="font-semibold">{gene.users}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Updated</span>
                <span className="font-semibold text-xs">{gene.lastUpdated}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openViewModal(gene)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>View</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(gene)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteGene(gene.g_id || gene.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete</TooltipContent>
                </Tooltip>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  // Render List View
  const renderListView = () => (
    <div className="space-y-3 md:space-y-4">
      {filteredGenes.map((gene) => {
        const geneName = gene.g_name || gene.name || 'Unnamed Gene';
        return (
          <Card key={gene.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-bold text-sm">G</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/geneManagement/geanUser/${gene.g_id || gene.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      <CardTitle className="text-base truncate">{geneName}</CardTitle>
                    </Link>
                    <CardDescription className="text-sm truncate">
                      {gene.type} • {gene.hierarchyLevels} levels • Created by {gene.createdBy}
                    </CardDescription>
                  </div>
                </div>

                <div className="flex items-center space-x-6 text-sm flex-1 justify-end min-w-0">
                  <div className="text-center hidden sm:block">
                    <div className="font-semibold">{gene.totalMembers}</div>
                    <div className="text-muted-foreground text-xs">Organizations</div>
                  </div>
                  <div className="text-center hidden sm:block">
                    <div className="font-semibold">{gene.users}</div>
                    <div className="text-muted-foreground text-xs">Users</div>
                  </div>
                  <div className="hidden lg:block">
                    {getStatusBadge(gene.is_active)}
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-6">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openViewModal(gene)}
                      >
                        <Eye className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>View</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditModal(gene)}
                      >
                        <Edit className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteGene(gene.g_id || gene.id)}
                      >
                        <Trash2 className="h-5 w-5 text-destructive" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* Mobile only stats */}
              <div className="flex items-center justify-between mt-2 sm:hidden pt-2 border-t">
                <div className="flex items-center space-x-4 text-sm">
                  <span className="text-muted-foreground">{gene.totalMembers} orgs</span>
                  <span className="text-muted-foreground">{gene.completion}% complete</span>
                </div>
                {getStatusBadge(gene.is_active)}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  // Render Table View
  const renderTableView = () => (
    <div className="rounded-md border overflow-hidden w-full">
      <div className="overflow-x-auto w-full">
        <div className="w-full [&_[data-slot=table-container]]:w-full [&_[data-slot=table]]:w-full">
          <Table className="w-full table-auto">
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold text-foreground">Gene Name</TableHead>
                <TableHead className="hidden lg:table-cell font-semibold text-foreground">Created By</TableHead>
                <TableHead className="hidden sm:table-cell font-semibold text-foreground">Status</TableHead>
                <TableHead className="hidden md:table-cell text-center font-semibold text-foreground">Levels</TableHead>
                <TableHead className="hidden md:table-cell text-center font-semibold text-foreground">Users</TableHead>
                <TableHead className="text-center font-semibold text-foreground">Organizations</TableHead>
                <TableHead className="hidden xl:table-cell whitespace-nowrap font-semibold text-foreground">Last Updated</TableHead>
                <TableHead className="w-[120px] whitespace-nowrap text-center font-semibold text-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGenes.map((gene, index) => {
                const geneName = gene.g_name || gene.name || 'Unnamed Gene';
                return (
                  <TableRow
                    key={gene.id}
                    className="hover:bg-muted/30 transition-colors border-b last:border-b-0"
                  >
                    <TableCell className="py-4">
                      <div className="flex items-center space-x-3">
                        <div className="min-w-0">
                          <Link
                            href={`/geneManagement/geanUser/${gene.g_id || gene.id}`}
                            className="font-medium text-primary hover:underline truncate text-sm md:text-base transition-colors"
                          >
                            {geneName}
                          </Link>
                          <div className="text-xs text-muted-foreground truncate lg:hidden mt-0.5">
                            By {gene.createdBy}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell truncate py-4">
                      <span className="text-sm text-foreground">{gene.createdBy}</span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell py-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={gene.is_active}
                          onCheckedChange={() => handleToggleStatus(gene.g_id || gene.id, gene.is_active)}
                        />
                        <span className={`text-sm ${gene.is_active ? 'text-muted-foreground' : 'text-red-500 font-medium'}`}>
                          {gene.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-center py-4">
                      <span className="font-medium text-foreground">{gene.hierarchyLevels}</span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-center py-4">
                      <span className="font-medium text-foreground">{gene.users}</span>
                    </TableCell>
                    <TableCell className="text-center py-4">
                      <span className="font-medium text-foreground">{gene.totalMembers}</span>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell whitespace-nowrap py-4">
                      <span className="text-sm text-muted-foreground">{gene.lastUpdated}</span>
                    </TableCell>
                    <TableCell className="w-[120px] whitespace-nowrap text-right py-4">
                      <div className="flex items-center justify-end space-x-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openViewModal(gene)}
                              className="h-8 w-8"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>View</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditModal(gene)}
                              className="h-8 w-8"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteGene(gene.g_id || gene.id)}
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );

  const renderGeneView = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      );
    }

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

    if (filteredGenes.length === 0) {
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
        return renderListView();
      case 'table':
        return renderTableView();
      case 'cards':
      default:
        return renderCardsView();
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-screen bg-background">
        <div className="px-4 pt-4">
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
        <div className="w-full px-4 sm:px-2 py-4 md:py-2">
          {/* Dashboard Header */}
          <div className="mb-6 md:mb-8">
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
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
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
            </div>
          </div>

          {/* Filters */}
          <Card className="mb-6">
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
                  }}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reset All Filters
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-4">
                <div className="relative">
                  <Input
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
                        handleSearchChange({ target: { value: '' } });
                      }}
                    />
                  )}
                </div>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="gene">Gene</SelectItem>
                    <SelectItem value="department">Department</SelectItem>
                  </SelectContent>
                </Select>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
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

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Genes</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{genes.length}</div>
                <p className="text-xs text-muted-foreground">All genes</p>
              </CardContent>
            </Card>

            {/* <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Levels</CardTitle>
              <Layers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {genes.reduce((sum, h) => sum + h.level_depth, 0)}
              </div>
              <p className="text-xs text-muted-foreground">Across all genes</p>
            </CardContent>
          </Card> */}

            {/* <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Depth</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {genes.length > 0 ? (genes.reduce((sum, h) => sum + h.level_depth, 0) / genes.length).toFixed(1) : 0}
              </div>
              <p className="text-xs text-muted-foreground">Average levels</p>
            </CardContent>
          </Card> */}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Genes</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {genes.filter(g => g.is_active).length}
                </div>
                <p className="text-xs text-muted-foreground">Currently active</p>
              </CardContent>
            </Card>
          </div>

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
                  <Select value={pageSize.toString()} onValueChange={(value) => {
                    setPageSize(parseInt(value));
                    setCurrentPage(1);
                  }}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 per page</SelectItem>
                      <SelectItem value="20">20 per page</SelectItem>
                      <SelectItem value="50">50 per page</SelectItem>
                      <SelectItem value="100">100 per page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="w-full">
              {renderGeneView()}
            </CardContent>
            {pagination.total > 0 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <div className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, pagination.total)} of {pagination.total} genes
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    {Array.from({ length: Math.min(5, Math.ceil(pagination.total / pageSize)) }, (_, i) => {
                      const pageNum = i + 1;
                      const totalPages = Math.ceil(pagination.total / pageSize);
                      let displayPage;

                      if (totalPages <= 5) {
                        displayPage = pageNum;
                      } else if (currentPage <= 3) {
                        displayPage = pageNum;
                      } else if (currentPage >= totalPages - 2) {
                        displayPage = totalPages - 4 + pageNum;
                      } else {
                        displayPage = currentPage - 2 + pageNum;
                      }

                      return (
                        <PaginationItem key={displayPage}>
                          <PaginationLink
                            onClick={() => setCurrentPage(displayPage)}
                            isActive={currentPage === displayPage}
                            className="cursor-pointer"
                          >
                            {displayPage}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage(prev => Math.min(Math.ceil(pagination.total / pageSize), prev + 1))}
                        className={currentPage >= Math.ceil(pagination.total / pageSize) ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
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
