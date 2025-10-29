"use client"

import { useState, useEffect , useCallback } from 'react';
// import GeneModal from '@/components/models/geneModal';
// import { API_CONSTANTS } from '@/constants/apiCollection';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
// import GeneCsvModal from '@/components/models/geneCsvModal';
// import  UserGeneModal from  '@/components/models/userGeneMappingModal';
import Link from 'next/link';

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
  const  [showCsvGeneUserModal , setShowCsvGeneUserModal ] = useState(false);
  const [searches , setSearhes] = useState(null);
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
    }, 500), // 500ms delay
    []
  );

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearhes(value);
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
        // router.push('/login');
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

  const getStatusColor = (is_active) => {
    return is_active ? 'text-green-600 bg-green-50' : 'text-gray-600 bg-gray-50';
  };

  const getStatusText = (is_active) => {
    return is_active ? 'Active' : 'Inactive';
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
  // Destructure the data from modal
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
    // Use dummy data simulation if enabled
    if (useDummyData) {
      setTimeout(() => {
        if (editingGene) {
          // Update existing gene in dummy data
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
          // Create new gene in dummy data
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
        users: selectedUsers.map(user => user.id)
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
      // Use dummy data simulation if enabled
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

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setGeneToDelete(null);
  };

  const filteredGenes = genes.filter(gene => {
    const geneName = (gene.g_name || gene.name || '').toLowerCase();
    const createdBy = (gene.createdBy || '').toLowerCase();
    const search = searchTerm.toLowerCase().trim();
   
    const matchesSearch = !search || geneName.includes(search) || createdBy.includes(search);
     return matchesSearch;
  });

  const getGridCols = () => {
    if (view === 'cards') {
      return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
    }
    return 'grid-cols-1';
  };

   const handleShowCsvModal = () => {
    setShowCsvModal(true);
  };

  const handleCloseCsvModal = () =>{
    setShowCsvModal(false);
  }

  const handleShowUserGeneCsvModal = () => {
    setShowCsvGeneUserModal(true);
  };

  const handleCloseUserGeneCsvModal = () =>{
    setShowCsvGeneUserModal(false);
  }

  const handleCsvSubmit = async (formData) => {
  try {
    // Simulate CSV import for dummy data
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
    // Simulate CSV import for dummy data
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

  // Toggle between dummy data and real API
  const toggleDataMode = () => {
    setUseDummyData(!useDummyData);
    toast.info(useDummyData ? 'Switching to real API data' : 'Using demo data');
  };

  // Render Cards View
  const renderCardsView = () => (
    <div className={`grid ${getGridCols()} gap-4 md:gap-6`}>
      {filteredGenes.map((gene) => {
        const geneName = gene.g_name || gene.name || 'Unnamed Gene';
        return (
          <div key={gene.id} className="border border-gray-200 rounded-lg p-4 md:p-5 hover:shadow-lg transition-shadow bg-white">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 truncate">{geneName}</h4>
                <p className="text-xs text-gray-500 truncate">{gene.type}</p>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ml-2 ${getStatusColor(gene.is_active)}`}>
                {getStatusText(gene.is_active)}
              </span>
            </div>
           
            <div className="space-y-2 md:space-y-3 mb-3 md:mb-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Organizations</span>
                <span className="font-semibold text-gray-900">{gene.totalMembers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Levels</span>
                <span className="font-semibold text-gray-900">{gene.hierarchyLevels}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Users</span>
                <span className="font-semibold text-gray-900">{gene.users}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Updated</span>
                <span className="font-semibold text-gray-900 text-xs md:text-sm">{gene.lastUpdated}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 md:pt-4 border-t border-gray-200">
              <button
                onClick={() => openViewModal(gene)}
                className="text-blue-600 text-sm font-medium hover:text-blue-700 flex items-center"
              >
                <span className="mr-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </span>
              </button>
              <button
                onClick={() => openEditModal(gene)}
                className="text-gray-600 text-sm font-medium hover:text-gray-700 flex items-center"
              >
                <span className="mr-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </span>
              </button>
              <button
                onClick={() => handleDeleteGene(gene.g_id || gene.id)}
                className="text-red-600 text-sm font-medium hover:text-red-700 flex items-center"
              >
                <span className="mr-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </span>
              </button>
            </div>
          </div>
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
          <div key={gene.id} className="border border-gray-200 rounded-lg p-3 md:p-4 hover:shadow-md transition-shadow bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 md:space-x-4 flex-1 min-w-0">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-bold text-sm">G</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 truncate">{geneName}</h4>
                  <p className="text-sm text-gray-500 truncate">
                    {gene.type} • {gene.hierarchyLevels} levels • Created by {gene.createdBy}
                  </p>
                </div>
              </div>
             
              <div className="flex items-center space-x-3 md:space-x-6 text-sm flex-1 justify-end min-w-0">
                <div className="text-center hidden sm:block">
                  <div className="font-semibold text-gray-900">{gene.totalMembers}</div>
                  <div className="text-gray-500 text-xs">Organizations</div>
                </div>
                <div className="text-center hidden sm:block">
                  <div className="font-semibold text-gray-900">{gene.users}</div>
                  <div className="text-gray-500 text-xs">Users</div>
                </div>
             
                <div className="hidden lg:block">
                  <span className={`font-semibold text-gray-900 ${getStatusColor(gene.is_active)}`}>
                    {getStatusText(gene.is_active)}
                  </span>
                  <div className="text-gray-500 text-xs">Status</div>
                </div>
              </div>

              <div className="flex items-center space-x-1 md:space-x-2 ml-2 md:ml-6">
                <button
                  onClick={() => openViewModal(gene)}
                  className="p-1 md:p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  title="View"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
                <button
                  onClick={() => openEditModal(gene)}
                  className="p-1 md:p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  title="Edit"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDeleteGene(gene.g_id || gene.id)}
                  className="p-1 md:p-2 text-red-600 hover:bg-red-100 rounded-lg"
                  title="Delete"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
           
            {/* Mobile only stats */}
            <div className="flex items-center justify-between mt-2 sm:hidden">
              <div className="flex items-center space-x-4 text-sm">
                <span className="text-gray-600">{gene.totalMembers} orgs</span>
                <span className="text-gray-600">{gene.completion}% complete</span>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(gene.is_active)}`}>
                {getStatusText(gene.is_active)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );

  // Render Table View
  const renderTableView = () => (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-2 md:px-4 text-sm font-semibold text-gray-900">Gene Name</th>
            <th className="text-left py-3 px-2 md:px-4 text-sm font-semibold text-gray-900 hidden lg:table-cell">Created By</th>
            <th className="text-left py-3 px-2 md:px-4 text-sm font-semibold text-gray-900 hidden sm:table-cell">Status</th>
            <th className="text-left py-3 px-2 md:px-4 text-sm font-semibold text-gray-900 hidden md:table-cell">Levels</th>
            <th className="text-left py-3 px-2 md:px-4 text-sm font-semibold text-gray-900 hidden md:table-cell">Users</th>
            <th className="text-left py-3 px-2 md:px-4 text-sm font-semibold text-gray-900">Organizations</th>
            <th className="text-left py-3 px-2 md:px-4 text-sm font-semibold text-gray-900 hidden xl:table-cell whitespace-nowrap">Last Updated</th>
            <th className="text-left py-3 px-2 md:px-4 text-sm font-semibold text-gray-900 w-[120px] whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredGenes.map((gene) => {
            const geneName = gene.g_name || gene.name || 'Unnamed Gene';
            return (
              <tr key={gene.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-2 md:px-4">
                  <div className="flex items-center space-x-2 md:space-x-3">
                    <div className="min-w-0 max-w-[180px] md:max-w-[240px]">
                      <Link
                          href={`/geneManagement/geanUser/${gene.id}`}
                         className="font-medium text-blue-600 hover:text-blue-400 truncate text-sm md:text-base">{geneName}
                       </Link>
                      <div className="text-xs text-gray-500 truncate lg:hidden">By {gene.createdBy}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-2 md:px-4 text-sm text-center text-gray-900 hidden lg:table-cell max-w-[160px] truncate">{gene.createdBy}</td>
                <td className="py-3 px-2 md:px-4 hidden sm:table-cell">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(gene.is_active)}`}>
                    {getStatusText(gene.is_active)}
                  </span>
                </td>
                <td className="py-3 px-2 md:px-4 text-sm text-gray-900 hidden md:table-cell">{gene.hierarchyLevels}</td>
                <td className="py-3 px-2 md:px-4 text-sm text-gray-900 hidden md:table-cell">{gene.users}</td>
                <td className="py-3 px-2 md:px-4 text-sm text-gray-900">{gene.totalMembers}</td>
                <td className="py-3 px-2 md:px-4 text-sm text-gray-600 hidden xl:table-cell whitespace-nowrap">{gene.lastUpdated}</td>
                <td className="py-3 px-2 md:px-4 w-[120px] whitespace-nowrap">
                  <div className="flex items-center space-x-1 md:space-x-2">
                    <button
                      onClick={() => openViewModal(gene)}
                      className="p-1 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      title="View"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => openEditModal(gene)}
                      className="p-1 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      title="Edit"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteGene(gene.g_id || gene.id)}
                      className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                      title="Delete"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderGeneView = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (error && !useDummyData) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="text-red-600 text-lg mb-2">Error Loading Genes</div>
            <div className="text-gray-600 mb-4">{error}</div>
            <div className="flex gap-2 justify-center">
              <button
                onClick={fetchGenes}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Retry
              </button>
              <button
                onClick={toggleDataMode}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Use Demo Data
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (filteredGenes.length === 0) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="text-gray-600 text-lg mb-2">No genes found</div>
            <div className="text-gray-500 mb-4">
              {searchTerm ? 'Try adjusting your search terms' : 'Create your first gene to get started'}
            </div>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Gene
            </button>
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
    <div className="min-h-screen bg-gray-50">      
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center justify-between sm:justify-start">
              <h1 className="text-xl font-bold text-gray-900">Genes Dashboard</h1>
              <button className="sm:hidden p-2 hover:bg-gray-100 rounded-lg">
                ☰
              </button>
            </div>
           
            <div className="flex items-center justify-between sm:justify-end gap-4">
              <div className="relative flex-1 sm:flex-none">
                <input
                  type="text"
                  placeholder="Search genes..."
                  onChange={handleSearchChange}
                  className="w-full sm:w-64 px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
              </div>
              <button
                onClick={toggleDataMode}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  useDummyData
                    ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                {useDummyData ? 'Demo Mode' : 'Live Mode'}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          <nav className="flex items-center gap-4 mt-4 sm:hidden overflow-x-auto pb-2">
            <a href="#" className="flex items-center text-blue-600 font-medium whitespace-nowrap">
              <span className="mr-2">📊</span>
              Genes
            </a>
            <a href="#" className="text-gray-600 hover:text-gray-900 whitespace-nowrap">
              <span className="mr-2">👥</span>
              Teams
            </a>
            <a href="#" className="text-gray-600 hover:text-gray-900 whitespace-nowrap">
              <span className="mr-2">📈</span>
              Analytics
            </a>
            <a href="#" className="text-gray-600 hover:text-gray-900 whitespace-nowrap">
              <span className="mr-2">⚙️</span>
              Settings
            </a>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 md:py-8">
        {/* Demo Data Notice */}
        {useDummyData && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <span className="text-yellow-600 mr-2">⚠️</span>
              <span className="text-yellow-800 text-sm">
                <strong>Demo Mode:</strong> Using sample data. Switch to Live Mode for real API data.
              </span>
            </div>
          </div>
        )}

        {/* Dashboard Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Gene Management</h2>
              <p className="text-gray-600 text-sm md:text-base">Create, manage, and organize your gene structures with precision</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <button
                onClick={openCreateModal}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                Create New Gene
              </button>
              <button
                onClick={handleShowCsvModal}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm flex items-center justify-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
                </svg>
                <span>Import</span>
              </button>
               <button
                onClick={handleShowUserGeneCsvModal}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm flex items-center justify-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
                </svg>
                <span>usersMapping</span>
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center">
              <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
              {filteredGenes.length} Active Genes
            </span>
            <span className="flex items-center">
              <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
              {filteredGenes.reduce((sum, h) => sum + h.level_depth, 0)} Total Levels
            </span>
            <span className="flex items-center">
              <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
              Last updated {genes.length > 0 ? genes[0].lastUpdated : 'Never'}
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h3 className="font-semibold text-gray-900">Filter & Search</h3>
            <button
              onClick={() => {
                setSearchTerm('');
                setShowArchived(false);
                setShowEmpty(false);
                setMyHierarchiesOnly(false);
              }}
              className="text-blue-600 text-sm flex items-center self-start"
            >
              🔄 Reset All Filters
            </button>
          </div>
         
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-4">
            <input
              type="text"
              placeholder="Search genes..."
              onChange={handleSearchChange}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <select className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
              <option>All Types</option>
              <option>Gene</option>
              <option>Department</option>
            </select>
            <select className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
              <option>All Status</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
         
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                  className="mr-2"
                />
                Show Archived
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={showEmpty}
                  onChange={(e) => setShowEmpty(e.target.checked)}
                  className="mr-2"
                />
                Show Empty
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={myHierarchiesOnly}
                  onChange={(e) => setMyHierarchiesOnly(e.target.checked)}
                  className="mr-2"
                />
                My Genes Only
              </label>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Total Genes</span>
              <span className="text-blue-600">📊</span>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{genes.length}</div>
            <div className="text-xs text-gray-600">All genes</div>
          </div>
         
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Total Levels</span>
              <span className="text-green-600">🏢</span>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
              {genes.reduce((sum, h) => sum + h.level_depth, 0)}
            </div>
            <div className="text-xs text-gray-600">Across all genes</div>
          </div>
         
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Avg. Depth</span>
              <span className="text-blue-600">📏</span>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
              {genes.length > 0 ? (genes.reduce((sum, h) => sum + h.level_depth, 0) / genes.length).toFixed(1) : 0}
            </div>
            <div className="text-xs text-gray-600">Average levels</div>
          </div>
         
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Active Genes</span>
              <span className="text-green-600">✅</span>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
              {genes.filter(g => g.is_active).length}
            </div>
            <div className="text-xs text-gray-600">Currently active</div>
          </div>
        </div>

        {/* Genes View */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {view === 'cards' && 'Genes Cards'}
                {view === 'list' && 'Genes List'}
                {view === 'table' && 'Genes Table'}
              </h3>
              <p className="text-sm text-gray-600">
                {view === 'cards' && 'Visual representation of your gene structures'}
                {view === 'list' && 'Compact list view of all genes'}
                {view === 'table' && 'Detailed table view with all gene information'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 mr-2 hidden sm:inline">View:</span>
              <button
                onClick={() => setView('table')}
                className={`p-2 rounded ${view === 'table' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
                title="Table View"
              >
                ⊞
              </button>
              <button
                onClick={() => setView('list')}
                className={`p-2 rounded ${view === 'list' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
                title="List View"
              >
                ☰
              </button>
              <button
                onClick={() => setView('cards')}
                className={`p-2 rounded ${view === 'cards' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
                title="Cards View"
              >
                ⊡
              </button>
            </div>
            <select className="px-4 py-2 border border-gray-300 rounded-lg text-sm self-start sm:self-auto">
              <option>12 per page</option>
              <option>24 per page</option>
              <option>48 per page</option>
            </select>
          </div>

          {renderGeneView()}
        </div>
      </div>

      {/* Gene Modal */}
      {/* <GeneModal
        showModal={showModal}
        onClose={closeModal}
        onSubmit={handleSubmit}
        editingGene={editingGene}
        geneData={geneData}
        setGeneData={setGeneData}
        addLevel={addLevel}
        removeLevel={removeLevel}
        updateLevel={updateLevel}
      /> */}

        {/* <GeneCsvModal
        isOpen={showCsvModal}
        onClose={handleCloseCsvModal}
        onSubmit={handleCsvSubmit}
      />

       <UserGeneModal
        isOpen={showCsvGeneUserModal}
        onClose={handleCloseUserGeneCsvModal}
        onSubmit={handleCsvUserGeneSubmit}
       /> */}
      {/* View Gene Modal */}
      {showViewModal && selectedGene && (
        <div className="fixed inset-0 backdrop-blur-lg bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col transform transition-all duration-300 scale-100">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 relative overflow-hidden">
              <div className="flex-1 min-w-0 relative z-10">
                <h2 className="text-xl font-bold text-white truncate mb-1">{selectedGene.g_name || selectedGene.name}</h2>
                <div className="flex items-center space-x-3 text-purple-100 text-sm flex-wrap">
                  <span className={`px-2 py-1 rounded-full font-medium text-xs ${getStatusColor(selectedGene.is_active)} bg-white/90`}>
                    {getStatusText(selectedGene.is_active)}
                  </span>
                  <span>•</span>
                  <span>{selectedGene.hierarchyLevels} Levels</span>
                  <span>•</span>
                 <span>Users: {selectedGene.users}</span>
                </div>
              </div>
              <button
                onClick={closeViewModal}
                className="text-white hover:bg-white/20 rounded-xl p-2 transition-all duration-200 text-xl leading-none flex-shrink-0 ml-3 backdrop-blur-sm hover:scale-110"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-200/50">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm">📊</span>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 font-medium">Total Levels</div>
                      <div className="text-lg font-bold text-gray-900">{selectedGene.hierarchyLevels}</div>
                    </div>
                  </div>
                </div>
               
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-200/50">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm">📏</span>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 font-medium">Users</div>
                      <div className="text-lg font-bold text-gray-900">{selectedGene.users}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-200/50">
                  <div className="flex items-center space-x-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedGene.is_active ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-gray-400 to-gray-500'}`}>
                      <span className="text-white text-sm">{selectedGene.is_active ? '✅' : '❌'}</span>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 font-medium">Status</div>
                      <div className="text-lg font-bold text-gray-900">{getStatusText(selectedGene.is_active)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Gene Structure */}
              <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-gray-200/60">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <span className="mr-3 text-xl">🧬</span>
                  Gene Structure
                </h3>

                {selectedGene.levels && selectedGene.levels.length > 0 ? (
                  <div className="space-y-4">
                    {selectedGene.levels.map((level, index) => (
                      <div key={level.id || index} className="relative">
                        {index > 0 && (
                          <div className="flex justify-center mb-3">
                            <div className="w-0.5 h-6 bg-gradient-to-b from-blue-400/80 to-purple-500/80 rounded-full"></div>
                          </div>
                        )}
                       
                        <div className="flex justify-center">
                          <div className="bg-gradient-to-br from-white to-blue-50/50 border border-blue-200/60 rounded-xl p-4 w-full shadow-sm">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md">
                                    {index + 1}
                                  </div>
                                  <h4 className="text-base font-bold text-gray-900">
                                    {level.title}
                                  </h4>
                                </div>
                               
                                <div className="flex items-center space-x-3 text-xs">
                                  <div className="flex items-center space-x-1 bg-white/80 px-2 py-1 rounded-lg">
                                    <span className="text-gray-600">Level:</span>
                                    <span className="font-bold text-gray-900 bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">
                                      {index + 1}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-lg border-2 border-dashed border-gray-300/80">
                    <div className="text-4xl mb-3">🧬</div>
                    <p className="text-sm font-medium text-gray-600">No gene structure available</p>
                    <p className="text-xs text-gray-500 mt-1">The gene structure hasn't been configured yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gradient-to-r from-gray-50/80 to-gray-100/80 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-xs text-gray-600 font-medium flex items-center space-x-1">
                <span>📅</span>
                <span>Last updated: {selectedGene.lastUpdated}</span>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={closeViewModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-white hover:shadow-sm transition-all duration-200 font-medium text-gray-700 text-sm"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    closeViewModal();
                    openEditModal(selectedGene);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium text-sm shadow-md hover:shadow-lg"
                >
                  Edit Gene
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
     
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-100">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Delete Gene</h3>
                  <p className="text-sm text-gray-600">This action cannot be undone</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-5">
              <p className="text-gray-700 mb-2">
                Are you sure you want to delete this gene? This will permanently remove:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 ml-2">
                <li>Gene structure and hierarchy</li>
                <li>All associated levels</li>
                <li>Organization mappings</li>
              </ul>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 rounded-b-2xl flex items-center justify-end space-x-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-white transition-colors font-medium text-gray-700 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm shadow-md hover:shadow-lg"
              >
                Delete Gene
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}