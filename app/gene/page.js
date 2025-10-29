"use client"

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
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
import { cn } from "@/lib/utils";
import UserGeneMappingModal from "./components/UserGeneMappingModal";
import GeneModal from "./components/GeneModal";
import GeneCsvModal from "./components/GeneCsvModal";

// API Constants placeholder - Replace with actual constants if available
const API_CONSTANTS = {
  BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || '',
  geneView: '/api/genes/view',
  geneCreate: '/api/genes/create',
  geneUpdate: '/api/genes/update',
  geneDelete: '/api/genes/delete',
};

// Dummy data for demonstration
const DUMMY_GENES = [
  {
    id: 1,
    g_id: 1,
    g_name: 'Sales Hierarchy',
    type: 'Gene',
    totalMembers: 45,
    hierarchyLevels: 4,
    users: 12,
    lastUpdated: 'Jan 15, 2024',
    completion: 100,
    createdBy: 'admin',
    levels: [
      { id: 1, title: 'Regional Director', members: 5 },
      { id: 2, title: 'Area Manager', members: 15 },
      { id: 3, title: 'Team Lead', members: 25 },
      { id: 4, title: 'Sales Executive', members: 45 }
    ],
    createdAt: '2024-01-01',
    hierarchy_level: { '1': 'Regional Director', '2': 'Area Manager', '3': 'Team Lead', '4': 'Sales Executive' },
    level_depth: 4,
    organizations: Array(45).fill({}),
    is_active: true
  },
  {
    id: 2,
    g_id: 2,
    g_name: 'Engineering Teams',
    type: 'Gene',
    totalMembers: 78,
    hierarchyLevels: 3,
    users: 24,
    lastUpdated: 'Feb 3, 2024',
    completion: 85,
    createdBy: 'tech_lead',
    levels: [
      { id: 1, title: 'Engineering Manager', members: 8 },
      { id: 2, title: 'Senior Engineer', members: 25 },
      { id: 3, title: 'Software Engineer', members: 78 }
    ],
    createdAt: '2024-01-15',
    hierarchy_level: { '1': 'Engineering Manager', '2': 'Senior Engineer', '3': 'Software Engineer' },
    level_depth: 3,
    organizations: Array(78).fill({}),
    is_active: true
  },
  {
    id: 3,
    g_id: 3,
    g_name: 'Marketing Structure',
    type: 'Gene',
    totalMembers: 32,
    hierarchyLevels: 3,
    users: 8,
    lastUpdated: 'Mar 10, 2024',
    completion: 92,
    createdBy: 'marketing_head',
    levels: [
      { id: 1, title: 'Marketing Director', members: 3 },
      { id: 2, title: 'Campaign Manager', members: 12 },
      { id: 3, title: 'Marketing Specialist', members: 32 }
    ],
    createdAt: '2024-02-01',
    hierarchy_level: { '1': 'Marketing Director', '2': 'Campaign Manager', '3': 'Marketing Specialist' },
    level_depth: 3,
    organizations: Array(32).fill({}),
    is_active: false
  },
  {
    id: 4,
    g_id: 4,
    g_name: 'Customer Support',
    type: 'Gene',
    totalMembers: 56,
    hierarchyLevels: 4,
    users: 18,
    lastUpdated: 'Apr 22, 2024',
    completion: 78,
    createdBy: 'support_manager',
    levels: [
      { id: 1, title: 'Support Manager', members: 4 },
      { id: 2, title: 'Team Lead', members: 12 },
      { id: 3, title: 'Senior Agent', members: 25 },
      { id: 4, title: 'Support Agent', members: 56 }
    ],
    createdAt: '2024-03-05',
    hierarchy_level: { '1': 'Support Manager', '2': 'Team Lead', '3': 'Senior Agent', '4': 'Support Agent' },
    level_depth: 4,
    organizations: Array(56).fill({}),
    is_active: true
  },
  {
    id: 5,
    g_id: 5,
    g_name: 'Operations Team',
    type: 'Gene',
    totalMembers: 23,
    hierarchyLevels: 2,
    users: 6,
    lastUpdated: 'May 5, 2024',
    completion: 100,
    createdBy: 'operations_head',
    levels: [
      { id: 1, title: 'Operations Manager', members: 5 },
      { id: 2, title: 'Operations Staff', members: 23 }
    ],
    createdAt: '2024-04-10',
    hierarchy_level: { '1': 'Operations Manager', '2': 'Operations Staff' },
    level_depth: 2,
    organizations: Array(23).fill({}),
    is_active: true
  }
];

export default function GeneDashboard() {
  const router = useRouter();
  const [view, setView] = useState('table');
  const [showArchived, setShowArchived] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);
  const [myHierarchiesOnly, setMyHierarchiesOnly] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedGene, setSelectedGene] = useState(null);
  const [editingGene, setEditingGene] = useState(null);
  const [genes, setGenes] = useState([]);
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
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [showCsvGeneUserModal, setShowCsvGeneUserModal] = useState(false);
  const [searches, setSearhes] = useState(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [useDummyData, setUseDummyData] = useState(false);

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
     
      // Use dummy data if enabled
      if (useDummyData) {
        console.log('Using dummy data for genes');
        setTimeout(() => {
          setGenes(DUMMY_GENES);
          setLoading(false);
        }, 1000);
        return;
      }

      console.log('Fetching Genes from API...');
     
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required. Please login again.');
        return;
      }
     
      const baseUrl = API_CONSTANTS.BASE_URL;
      const endPoint = API_CONSTANTS.geneView;
      const fullUrl = baseUrl + endPoint;
     
      console.log("Making API call to:", fullUrl);
     
      const response = await axios.post(fullUrl, {search : debouncedSearch }, {  
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        timeout: 30000
      });

      console.log('Full API Response:', response.data);
     
      if (response.data.success) {
        const apiGenes = response.data.message || [];
        console.log('API Genes:', apiGenes);
       
        // Transform API data to match your component structure
        const transformedGenes = apiGenes.map(gene => {
          console.log('Processing gene:', gene);
         
          const levels = [];
          if (gene.hierarchy_level && typeof gene.hierarchy_level === 'object') {
            Object.entries(gene.hierarchy_level).forEach(([key, value]) => {
              levels.push({
                id: parseInt(key),
                title: value,
                members: 0
              });
            });
            levels.sort((a, b) => a.id - b.id);
          }
         
          // Safe handling for potentially null/undefined arrays
          const usersCount = gene.users ? gene.users.length : 0;
          const organizationsCount = gene.organizations ? gene.organizations.length : 0;
         
          return {
            id: gene.g_id,
            name: gene.g_name || 'Unnamed Gene',
            type: 'Gene',
            totalMembers: organizationsCount,
            hierarchyLevels: gene.level_depth || levels.length,
            users: usersCount,
            lastUpdated: new Date(gene.updated_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            }),
            completion: 100,
            createdBy: gene.created_by_details?.user_data?.username || 'Unknown',
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
      } else {
        console.error('API returned success: false');
        setError('Failed to fetch genes: ' + (response.data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Fetch error:', err);
      console.error('Error response:', err.response?.data);
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
        localStorage.removeItem('token');
        router.push('/login');
      } else {
        setError(err.message || 'Failed to fetch genes');
        // Fallback to dummy data on error
        console.log('Falling back to dummy data due to error');
        setUseDummyData(true);
        setGenes(DUMMY_GENES);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGenes();
  }, [debouncedSearch, useDummyData]);

  const getStatusBadge = (is_active) => {
    return (
      <Badge variant={is_active ? "default" : "secondary"}>
        {is_active ? 'Active' : 'Inactive'}
      </Badge>
    );
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

  const openEditModal = (gene) => {
    setEditingGene(gene);
    setGeneData({
      name: gene.g_name || gene.name,
      levels: gene.levels || [],
      g_id: gene.g_id,
      is_active: gene.is_active
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingGene(null);
    setGeneData({ name: '', levels: [], is_active: true });
  };

  const convertLevelsToHierarchy = (levels) => {
    const hierarchy_level = {};
    levels.forEach((level, index) => {
      hierarchy_level[(index + 1).toString()] = level.title;
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
      if (useDummyData) {
        setTimeout(() => {
          if (editingGene) {
            setGenes(prev => prev.map(gene =>
              gene.id === editingGene.id
                ? {
                    ...gene,
                    g_name: geneData.name,
                    name: geneData.name,
                    levels: geneData.levels,
                    hierarchy_level: convertLevelsToHierarchy(geneData.levels),
                    level_depth: geneData.levels.length,
                    is_active: geneData.is_active,
                    lastUpdated: new Date().toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })
                  }
                : gene
            ));
            toast.success(`Gene "${geneData.name}" updated successfully!`, {
              id: loadingToast,
            });
          } else {
            const newGene = {
              id: Date.now(),
              g_id: Date.now(),
              g_name: geneData.name,
              name: geneData.name,
              type: 'Gene',
              totalMembers: 0,
              hierarchyLevels: geneData.levels.length,
              users: 0,
              lastUpdated: new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              }),
              completion: 100,
              createdBy: 'Current User',
              levels: geneData.levels,
              createdAt: new Date().toISOString(),
              hierarchy_level: convertLevelsToHierarchy(geneData.levels),
              level_depth: geneData.levels.length,
              organizations: [],
              is_active: geneData.is_active
            };
            setGenes(prev => [...prev, newGene]);
            toast.success(`Gene "${geneData.name}" created successfully with ${geneData.levels.length} levels!`, {
              id: loadingToast,
            });
          }
          closeModal();
        }, 1000);
        return;
      }

      const token = localStorage.getItem('token');
      const hierarchy_level = convertLevelsToHierarchy(geneData.levels);
     
      if (editingGene) {
        const payload = {
          g_id: geneData.g_id,
          g_name: geneData.name,
          hierarchy_level: hierarchy_level,
          is_active: geneData.is_active,
          users: selectedUsers ? selectedUsers.map(user => user.id) : []
        };

        console.log('Update Gene Payload:', payload);

        const response = await axios.put(
          `${API_CONSTANTS.BASE_URL}/${API_CONSTANTS.geneUpdate}`,
          payload,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          }
        );

        if (response.data.success) {
          toast.success(`Gene "${geneData.name}" updated successfully!`, {
            id: loadingToast,
          });
          fetchGenes();
          closeModal();
        } else {
          throw new Error(response.data.message || 'Failed to update gene');
        }
      } else {
        const payload = {
          g_name: geneData.name,
          hierarchy_level: hierarchy_level,
          is_active: geneData.is_active
        };

        console.log('Create Gene Payload:', payload);

        const response = await axios.post(
          `${API_CONSTANTS.BASE_URL}${API_CONSTANTS.geneCreate}`,
          payload,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          }
        );

        if (response.data.success) {
          toast.success(`Gene "${geneData.name}" created successfully with ${geneData.levels.length} levels!`, {
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
      toast.error(`Failed to ${editingGene ? 'update' : 'create'} gene: ${error.response?.data?.message || error.message}`, {
        id: loadingToast,
      });
    }
  };

  const openViewModal = (gene) => {
    setSelectedGene(gene);
    setShowViewModal(true);
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setSelectedGene(null);
  };

  const handleDeleteGene = async (geneId) => {
    setGeneToDelete(geneId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    const loadingToast = toast.loading('Deleting gene...');
   
    try {
      if (useDummyData) {
        setTimeout(() => {
          setGenes(prev => prev.filter(gene => gene.id !== geneToDelete));
          toast.success('Gene deleted successfully!', {
            id: loadingToast,
          });
          setShowDeleteModal(false);
          setGeneToDelete(null);
        }, 1000);
        return;
      }

      const token = localStorage.getItem('token');
      const payload = {
        id: geneToDelete
      };

      console.log('Delete Gene Payload:', payload);

      const response = await axios.delete(
        `${API_CONSTANTS.BASE_URL}/${API_CONSTANTS.geneDelete}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          data: payload
        }
      );

      if (response.data.success) {
        setGenes(prev => prev.filter(gene => gene.id !== geneToDelete));
        toast.success('Gene deleted successfully!', {
          id: loadingToast,
        });
        setShowDeleteModal(false);
        setGeneToDelete(null);
      } else {
        throw new Error(response.data.message || 'Failed to delete gene');
      }
    } catch (error) {
      console.error('Error deleting gene:', error);
      toast.error(`Failed to delete gene: ${error.response?.data?.message || error.message}`, {
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

  const toggleDataMode = () => {
    setUseDummyData(!useDummyData);
    toast.info(useDummyData ? 'Switching to real API data' : 'Using demo data');
  };

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
    try {
      if (useDummyData) {
        setTimeout(() => {
          toast.success('Genes imported successfully from CSV!');
          setShowCsvModal(false);
          fetchGenes();
        }, 1500);
        return;
      }

      const token = localStorage.getItem('token');
      const baseUrl = API_CONSTANTS.BASE_URL;

      const response = await axios.post(
        `${baseUrl}/uploadCSV`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.message) {
        setShowCsvModal(false);
        fetchGenes();
      } else {
        throw new Error(response.data.message || 'Failed to import genes');
      }
    } catch (err) {
      console.error('CSV import error:', err);
      toast.error('Failed to import genes from CSV');
    }
  };

  const handleCsvUserGeneSubmit = async (formData) => {
    try {
      if (useDummyData) {
        setTimeout(() => {
          toast.success('User mappings imported successfully from CSV!');
          setShowCsvGeneUserModal(false);
          fetchGenes();
        }, 1500);
        return;
      }

      const token = localStorage.getItem('token');
      const baseUrl = API_CONSTANTS.BASE_URL;

      const response = await axios.post(
        `${baseUrl}/uploadCSV`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.message) {
        setShowCsvGeneUserModal(false);
        fetchGenes();
      } else {
        throw new Error(response.data.message || 'Failed to import users mapping');
      }
    } catch (err) {
      console.error('CSV import error:', err);
      toast.error('Failed to import user mappings from CSV');
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
                  <CardTitle className="text-base truncate">{geneName}</CardTitle>
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openViewModal(gene)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditModal(gene)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteGene(gene.g_id || gene.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
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
                    <CardTitle className="text-base truncate">{geneName}</CardTitle>
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
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openViewModal(gene)}
                    title="View"
                  >
                    <Eye className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditModal(gene)}
                    title="Edit"
                  >
                    <Edit className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteGene(gene.g_id || gene.id)}
                    title="Delete"
                  >
                    <Trash2 className="h-5 w-5 text-destructive" />
                  </Button>
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
    <div className="rounded-md border overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
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
                      <div className="min-w-0 max-w-[240px]">
                        <Link
                          href={`/geneManagement/geanUser/${gene.id}`}
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
                  <TableCell className="hidden lg:table-cell max-w-[160px] truncate py-4">
                    <span className="text-sm text-foreground">{gene.createdBy}</span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell py-4">
                    {getStatusBadge(gene.is_active)}
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openViewModal(gene)}
                        title="View"
                        className="h-8 w-8"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditModal(gene)}
                        title="Edit"
                        className="h-8 w-8"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteGene(gene.g_id || gene.id)}
                        title="Delete"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
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

    if (error && !useDummyData) {
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
              <Button variant="outline" onClick={toggleDataMode}>
                Use Demo Data
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

    switch(view) {
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
    <div className="min-h-screen bg-background">      
      {/* Header */}
      <header className="bg-card border-b">
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
              <Button
                variant={useDummyData ? "secondary" : "default"}
                onClick={toggleDataMode}
                size="sm"
              >
                {useDummyData ? 'Demo Mode' : 'Live Mode'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 md:py-8">
        {/* Demo Data Notice */}
        {useDummyData && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Demo Mode</AlertTitle>
            <AlertDescription>
              Using sample data. Switch to Live Mode for real API data.
            </AlertDescription>
          </Alert>
        )}

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
              <Input
                type="text"
                placeholder="Search genes..."
                value={searches || ''}
                onChange={handleSearchChange}
              />
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
         
          <Card>
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
          </Card>
         
          <Card>
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
          </Card>
         
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
        <Card>
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
                <Select defaultValue="12">
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12 per page</SelectItem>
                    <SelectItem value="24">24 per page</SelectItem>
                    <SelectItem value="48">48 per page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {renderGeneView()}
          </CardContent>
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
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
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
                              <div className="w-0.5 h-6 bg-primary/20 rounded-full"></div>
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
                      <p className="text-xs mt-1">The gene structure hasn't been configured yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
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
              This action cannot be undone. This will permanently delete the gene and remove all associated data including:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Gene structure and hierarchy</li>
                <li>All associated levels</li>
                <li>Organization mappings</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteModal(false);
              setGeneToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
  );
}
