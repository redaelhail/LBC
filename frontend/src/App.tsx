import React, { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import { Search, User, Building, AlertCircle, CheckCircle, Loader2, History, FileText, Globe, Calendar, Download, Eye, Plus, Edit, Trash2, Save, X, MessageSquare, Star, Filter, TrendingUp, BarChart3, Activity, Clock, Shield, UserIcon, Settings, Users, UserX, UserCheck, Key, Building2, Target, Upload } from 'lucide-react';
import EntityManagement from './components/EntityManagement';
import BatchUpload from './components/BatchUpload';

// Simple Login Component
const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-blue-600" />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">SanctionsGuard Pro</h2>
          <p className="mt-2 text-sm text-gray-600">Sign in to access the platform</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="admin@sanctionsguard.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="admin123"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <div className="text-center text-sm text-gray-500">
            Default: admin@sanctionsguard.com / admin123
          </div>
        </form>
      </div>
    </div>
  );
};

// Move SearchInput outside the main component to prevent recreation
const SearchInput = React.memo(({ 
  inputRef, 
  placeholder = "Enter name, company, or ID (fuzzy matching enabled)...", 
  onSearch,
  disabled 
}) => {
  const [localValue, setLocalValue] = useState('');

  const handleChange = (e) => {
    setLocalValue(e.target.value);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !disabled && localValue.trim()) {
      onSearch(localValue);
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      placeholder={placeholder}
      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
      value={localValue}
      onChange={handleChange}
      onKeyPress={handleKeyPress}
      disabled={disabled}
      autoComplete="off"
      spellCheck={false}
    />
  );
});

// Isolated textarea component to prevent cursor jumping
const NotesTextarea = memo(({ initialValue, onSave, onCancel, entityId }) => {
  const [localValue, setLocalValue] = useState(initialValue || '');
  const textareaRef = useRef(null);

  useEffect(() => {
    setLocalValue(initialValue || '');
  }, [initialValue]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const handleSave = () => {
    onSave(entityId, localValue);
  };

  const handleCancel = () => {
    onCancel();
  };

  return (
    <div className="space-y-3">
      <textarea
        ref={textareaRef}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder="Enter compliance notes, risk assessment, or regulatory observations..."
        rows={4}
        className="w-full p-3 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none cursor-text"
        style={{ caretColor: '#7c3aed' }}
        spellCheck="true"
      />
      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors flex items-center gap-2"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Save Notes
        </button>
        <button
          onClick={handleCancel}
          className="px-4 py-2 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors flex items-center gap-2"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Cancel
        </button>
      </div>
    </div>
  );
});

const MainApp = () => {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));
  const isAdmin = user?.role === 'admin';
  // API Configuration - use relative URLs (proxied by Vite)
  const API_BASE_URL = '';

  const [activeTab, setActiveTab] = useState('search');
  const [searchQuery, setSearchQuery] = useState(''); // Only used for the main search tab
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchInfo, setSearchInfo] = useState(null);
  const [searchHistory, setSearchHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedSearch, setSelectedSearch] = useState(null);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState({});
  const [newNote, setNewNote] = useState({ entityId: '', entityName: '', text: '', riskAssessment: '', actionTaken: '' });
  const [editingNote, setEditingNote] = useState(null);
  const [currentSearchId, setCurrentSearchId] = useState(null);
  const [showInlineNoteForm, setShowInlineNoteForm] = useState(null);
  const [editingStarredNote, setEditingStarredNote] = useState(null); // ID of starred entity being edited
  const [confirmUnstar, setConfirmUnstar] = useState(null); // Entity to confirm unstarring
  const [confirmDialog, setConfirmDialog] = useState(null); // Generic confirmation dialog
  const [analytics, setAnalytics] = useState(null);
  const [historyFilter, setHistoryFilter] = useState('all'); // all, starred, high-risk, etc.
  const [expandedDetails, setExpandedDetails] = useState(new Set()); // Track which results have expanded details
  const [starredEntities, setStarredEntities] = useState([]);
  const [isLoadingStarred, setIsLoadingStarred] = useState(false);
  const [starredEntityIds, setStarredEntityIds] = useState(new Set());
  
  // Enhanced search parameters
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    // Basic search fields
    first_name: '',
    last_name: '',
    birth_date: '',
    role: '',
    country: '',
    entity_type: 'Person',
    search_type: 'fuzzy',  // Default to fuzzy search for better results
    dataset: '',
    fuzzy: true,  // Enable OpenSanctions fuzzy matching by default
    simple: true  // Enable simple syntax for better user experience
  });
  
  // Refs to maintain focus
  const searchInputRef = useRef(null);
  const dashboardInputRef = useRef(null);

  // Load search history when history tab is opened
  useEffect(() => {
    if (activeTab === 'history') {
      loadSearchHistory();
    }
    if (activeTab === 'dashboard') {
      loadAnalytics();
    }
    if (activeTab === 'reports') {
      loadStarredEntities();
    }
  }, [activeTab]);

  const loadAnalytics = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/api/v1/search/analytics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  };

  const starEntity = async (entity, index) => {
    if (!currentSearchId) {
      console.warn('⚠️ Cannot star entity: currentSearchId is not set');
      return;
    }
    
    const entityId = entity.id || `entity-${index}`;
    
    try {
      const requestData = {
        search_history_id: currentSearchId,
        entity_id: entityId,
        entity_name: entity.caption || entity.name || 'Unknown Entity',
        entity_data: entity,
        relevance_score: getRelevanceScore(entity),
        risk_level: entity.risk_level || (getRelevanceScore(entity) >= 80 ? 'HIGH' : getRelevanceScore(entity) >= 50 ? 'MEDIUM' : 'LOW'),
        user_id: 1
      };
      
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/api/v1/search/entities/star`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });
      
      if (response.ok) {
        const result = await response.json();
        // Add to starred entity IDs
        setStarredEntityIds(prev => new Set([...prev, entityId]));
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to star entity:', response.status, errorText);
      }
    } catch (error) {
      console.error('❌ Error starring entity:', error);
    }
  };

  const unstarEntity = async (entityId) => {
    if (!currentSearchId) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/search/entities/star/${entityId}/search/${currentSearchId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Remove from starred entity IDs
        setStarredEntityIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(entityId);
          return newSet;
        });
      }
    } catch (error) {
      console.error('Failed to unstar entity:', error);
    }
  };

  const unstarEntityFromReports = async (starredEntity) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.error('No authentication token available');
        return;
      }

      console.log('Attempting to unstar entity:', {
        entity_id: starredEntity.entity_id,
        search_id: starredEntity.search_context.search_id,
        entity_name: starredEntity.entity_name
      });

      const response = await fetch(`${API_BASE_URL}/api/v1/search/entities/star/${starredEntity.entity_id}/search/${starredEntity.search_context.search_id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Unstar API response:', result);
        
        // Remove from starred entities list
        setStarredEntities(prev => prev.filter(entity => entity.id !== starredEntity.id));
        console.log(`✅ Successfully unstarred entity: ${starredEntity.entity_name}`);
        
        // Close confirmation modal
        setConfirmUnstar(null);
      } else {
        const errorText = await response.text();
        console.error('Failed to unstar entity:', response.status, errorText);
      }
    } catch (error) {
      console.error('❌ Error unstarring entity:', error);
    }
  };

  const loadSearchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/api/v1/search/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSearchHistory(data.items || []);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const loadStarredEntities = async () => {
    setIsLoadingStarred(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/search/entities/starred`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStarredEntities(data.items || []);
      }
    } catch (error) {
      console.error('Failed to load starred entities:', error);
    } finally {
      setIsLoadingStarred(false);
    }
  };

  const loadStarredEntityIdsForSearch = async (searchId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/search/entities/starred/search/${searchId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStarredEntityIds(new Set(data.starred_entity_ids || []));
      }
    } catch (error) {
      console.error('Failed to load starred entity IDs:', error);
    }
  };

  const generateStarredReport = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/search/reports/starred-entities`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      if (response.ok) {
        const report = await response.json();
        
        // Create downloadable JSON file
        const dataStr = JSON.stringify(report, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `starred-entities-report-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        return report;
      }
    } catch (error) {
      console.error('Failed to generate starred report:', error);
    }
  };

  const exportStarredEntitiesCsv = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/search/reports/starred-entities/csv`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `starred-entities-report-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export CSV report:', error);
    }
  };

  const exportStarredEntitiesPdf = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/search/reports/starred-entities/pdf`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `starred-entities-report-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export PDF report:', error);
    }
  };

  const showConfirmDialog = (title, message, onConfirm, confirmText = 'Confirm', variant = 'danger') => {
    setConfirmDialog({
      title,
      message,
      onConfirm,
      confirmText,
      variant
    });
  };

  const deleteSearchHistory = async (searchId) => {
    showConfirmDialog(
      'Delete Search History',
      'Are you sure you want to delete this search? This will also remove all associated starred entities and notes.',
      async () => {
        // Continue with deletion
        await performDeleteSearchHistory(searchId);
        setConfirmDialog(null);
      },
      'Delete Search'
    );
  };

  const performDeleteSearchHistory = async (searchId) => {
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/search/history/${searchId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Remove from local state
        setSearchHistory(prev => prev.filter(item => item.id !== searchId));
      } else {
        console.error('Failed to delete search');
      }
    } catch (error) {
      console.error('Failed to delete search:', error);
    }
  };

  const updateSearchNotes = async (searchId, notes) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/search/history/${searchId}/notes`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ notes })
      });
      
      if (response.ok) {
        // Update local state
        setSearchHistory(prev => prev.map(item => 
          item.id === searchId ? { ...item, notes } : item
        ));
        return true;
      } else {
        console.error('Failed to update search notes');
        return false;
      }
    } catch (error) {
      console.error('Failed to update search notes:', error);
      return false;
    }
  };

  const updateStarredEntityNotes = async (starredEntityId, notes) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/search/entities/star/${starredEntityId}/notes`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ notes })
      });
      
      if (response.ok) {
        const result = await response.json();
        // Update local state
        setStarredEntities(prev => prev.map(entity => 
          entity.id === starredEntityId ? { ...entity, notes } : entity
        ));
        return true;
      } else {
        console.error('Failed to update starred entity notes');
        return false;
      }
    } catch (error) {
      console.error('Failed to update starred entity notes:', error);
      return false;
    }
  };

  // Starred entity notes editing functions
  const startEditingStarredNote = useCallback((entityId) => {
    setEditingStarredNote(entityId);
  }, []);

  const cancelEditingStarredNote = useCallback(() => {
    setEditingStarredNote(null);
  }, []);

  const saveStarredNote = async (entityId, noteText) => {
    const success = await updateStarredEntityNotes(entityId, noteText);
    if (success) {
      setEditingStarredNote(null);
    }
  };

  const performSearch = useCallback(async (query) => {
    if (!query.trim()) {
      setError('Please enter a search term');
      return;
    }
    
    setSearchQuery(query); // Update the main search query for display purposes
    setIsLoading(true);
    setError('');
    setResults([]);
    setSearchInfo(null);
    
    try {
      
      // Build request body with enhanced search parameters
      const requestBody = { 
        query: query,
        dataset: searchFilters.dataset || 'default',
        limit: 20,  // Increase limit for better results
        // Always enable fuzzy and simple mode for better matching
        fuzzy: true,
        simple: true,
        // Add non-empty filters
        ...(searchFilters.entity_type && { schema: searchFilters.entity_type }),
        ...(searchFilters.country && { countries: [searchFilters.country] }),
        // Enhanced search options
        ...(searchFilters.topics && { topics: searchFilters.topics }),
        facets: ["countries", "topics", "datasets"],
        filter_op: "OR"
      };
      
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/api/v1/search/entities`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody),
      });
      
      const responseText = await response.text();
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseText}`);
      }
      
      const data = JSON.parse(responseText);
      if (data.results && Array.isArray(data.results)) {
        setResults(data.results);
        setSearchInfo(data);
        // Try to get the search ID from the most recent history entry
        await loadCurrentSearchId(query);
      } else {
        setResults([]);
        setSearchInfo(data);
        await loadCurrentSearchId(query);
      }
      
    } catch (error) {
      console.error('❌ Search error:', error);
      setError(`Search failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getRiskColor = (score) => {
    const numScore = Number(score) || 0;
    if (numScore >= 80) return 'text-red-600 bg-red-100 border-red-200';
    if (numScore >= 50) return 'text-yellow-600 bg-yellow-100 border-yellow-200';
    return 'text-green-600 bg-green-100 border-green-200';
  };

  const getRiskLevelColor = (level) => {
    switch (level) {
      case 'High': return 'text-red-600 bg-red-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'Low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRelevanceScore = (result) => {
    return result.score ? Math.round(result.score * 100) : 
           result.relevance_score || 0;
  };

  const getMatchConfidence = (result) => {
    return result.match_confidence || 0;
  };

  const getMatchType = (result) => {
    return result.match_type || 'unknown';
  };

  const getMatchTypeColor = (matchType) => {
    switch (matchType) {
      case 'exact': return 'text-green-800 bg-green-100';
      case 'fuzzy': return 'text-blue-800 bg-blue-100';
      case 'phonetic': return 'text-purple-800 bg-purple-100';
      case 'no_match': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  const handleExampleClick = useCallback((example) => {
    setSearchQuery(example);
    performSearch(example);
    setError('');
  }, [performSearch]);

  const loadSearchDetails = async (historyId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/search/history/${historyId}/details`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedSearch(data.search_history);
        setNotes(data.notes_by_entity);
        setShowNotes(true);
      }
    } catch (error) {
      console.error('Failed to load search details:', error);
    }
  };

  const addNote = async (entityId, entityName, noteText, riskAssessment = '', actionTaken = '') => {
    if (!selectedSearch || !noteText.trim()) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/search/notes`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          search_history_id: selectedSearch.id,
          entity_id: entityId,
          entity_name: entityName,
          note_text: noteText,
          risk_assessment: riskAssessment,
          action_taken: actionTaken
        })
      });
      
      if (response.ok) {
        // Reload search details to get updated notes
        await loadSearchDetails(selectedSearch.id);
        setNewNote({ entityId: '', entityName: '', text: '', riskAssessment: '', actionTaken: '' });
      }
    } catch (error) {
      console.error('Failed to add note:', error);
    }
  };

  const loadCurrentSearchId = async (query) => {
    // Add retry logic with delay to handle race conditions
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise(resolve => setTimeout(resolve, 200)); // Wait 200ms between attempts
        }
        
        const response = await fetch(`${API_BASE_URL}/api/v1/search/history?limit=1`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.items && data.items.length > 0 && data.items[0].query === query) {
            const searchId = data.items[0].id;
            setCurrentSearchId(searchId);
            // Load starred entities for this search
            loadStarredEntityIdsForSearch(searchId);
            return; // Success, exit retry loop
          }
        }
      } catch (error) {
        console.error(`Failed to get current search ID (attempt ${attempt + 1}):`, error);
      }
    }
    console.warn('⚠️ Could not load current search ID after 3 attempts');
  };

  const addInlineNote = async (entityId, entityName, noteText, riskAssessment = '', actionTaken = '') => {
    if (!currentSearchId || !noteText.trim()) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/search/notes`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          search_history_id: currentSearchId,
          entity_id: entityId,
          entity_name: entityName,
          note_text: noteText,
          risk_assessment: riskAssessment,
          action_taken: actionTaken
        })
      });
      
      if (response.ok) {
        // Clear the form and hide it
        setShowInlineNoteForm(null);
        setNewNote({ entityId: '', entityName: '', text: '', riskAssessment: '', actionTaken: '' });
        // Show success message
      }
    } catch (error) {
      console.error('Failed to add note:', error);
    }
  };

  const closeNotesView = () => {
    setShowNotes(false);
    setSelectedSearch(null);
    setNotes({});
    setNewNote({ entityId: '', entityName: '', text: '', riskAssessment: '', actionTaken: '' });
    setEditingNote(null);
  };

  const DashboardView = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">SanctionsGuard Pro Dashboard</h2>
        <p className="text-blue-100">Sanctions & PEP screening platform for ACAPS insurance intermediaries</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Searches</p>
              <p className="text-3xl font-bold text-gray-900">{analytics?.summary?.total_searches || 0}</p>
              <p className="text-xs text-gray-500 mt-1">All time</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <Search className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">High Risk Entities</p>
              <p className="text-3xl font-bold text-red-600">
                {analytics?.risk_distribution?.find(r => r.level === 'HIGH')?.count || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">Require attention</p>
            </div>
            <div className="bg-red-100 p-3 rounded-full">
              <Shield className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Starred Entities</p>
              <p className="text-3xl font-bold text-yellow-600">{analytics?.summary?.starred_entities || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Important entities</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full">
              <Star className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Relevance</p>
              <p className="text-3xl font-bold text-orange-600">{analytics?.summary?.avg_relevance_score || 0}%</p>
              <p className="text-xs text-gray-500 mt-1">Search relevance</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <Target className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-gray-600" />
            Risk Level Distribution
          </h3>
          {analytics?.risk_distribution?.length > 0 ? (
            <div className="space-y-3">
              {analytics.risk_distribution.map((risk) => (
                <div key={risk.level} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      risk.level === 'HIGH' ? 'bg-red-100 text-red-800' :
                      risk.level === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {risk.level}
                    </span>
                    <span className="text-sm text-gray-600">{risk.count} searches</span>
                  </div>
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        risk.level === 'HIGH' ? 'bg-red-500' :
                        risk.level === 'MEDIUM' ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ 
                        width: `${(risk.count / analytics.summary.total_searches) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No data available</p>
          )}
        </div>

        {/* Data Sources */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5 text-gray-600" />
            Data Sources
          </h3>
          {analytics?.data_sources?.length > 0 ? (
            <div className="space-y-3">
              {analytics.data_sources.map((source) => (
                <div key={source.source} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      source.source?.includes('opensanctions') ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {source.source?.includes('opensanctions') ? 'Live Data' : 'Mock Data'}
                    </span>
                    <span className="text-sm text-gray-600">{source.count} searches</span>
                  </div>
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        source.source?.includes('opensanctions') ? 'bg-green-500' : 'bg-gray-500'
                      }`}
                      style={{ 
                        width: `${(source.count / analytics.summary.total_searches) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No data available</p>
          )}
        </div>
      </div>

      {/* Top Queries */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-gray-600" />
          Most Searched Entities
        </h3>
        {analytics?.top_queries?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analytics.top_queries.slice(0, 6).map((query, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900 truncate">{query.query}</h4>
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    {query.count}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Last searched: {formatDate(query.last_searched)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No search data available</p>
        )}
      </div>

      {/* Welcome Section - Show when no search data */}
      {(!analytics || !analytics?.summary?.total_searches || analytics.summary.total_searches === 0) && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-lg border border-blue-200">
          <div className="text-center">
            <Shield className="mx-auto h-16 w-16 text-blue-600 mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Welcome to SanctionsGuard Pro</h3>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              Your comprehensive sanctions and PEP screening platform for ACAPS insurance intermediaries. 
              Start by performing your first search to identify potential risks and ensure compliance.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="text-center">
                <div className="bg-white p-4 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center shadow-sm">
                  <Search className="h-8 w-8 text-blue-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Search & Screen</h4>
                <p className="text-sm text-gray-600">
                  Search for individuals and entities against sanctions lists and PEP databases
                </p>
              </div>
              
              <div className="text-center">
                <div className="bg-white p-4 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center shadow-sm">
                  <Shield className="h-8 w-8 text-red-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Risk Assessment</h4>
                <p className="text-sm text-gray-600">
                  Automatically assess and categorize risk levels for screening results
                </p>
              </div>
              
              <div className="text-center">
                <div className="bg-white p-4 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center shadow-sm">
                  <FileText className="h-8 w-8 text-green-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Compliance Reports</h4>
                <p className="text-sm text-gray-600">
                  Generate detailed reports and maintain audit trails for regulatory compliance
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Search */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Quick Sanctions Screening</h3>
        <div className="flex gap-4">
          <SearchInput 
            inputRef={dashboardInputRef}
            onSearch={performSearch}
            disabled={isLoading}
          />
          <button
            onClick={() => performSearch(dashboardInputRef.current?.value || '')}
            disabled={isLoading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Search
              </>
            )}
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
        {searchHistory.slice(0, 5).length > 0 ? (
          <div className="space-y-3">
            {searchHistory.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {item.search_type === 'Person' ? <User className="h-5 w-5 text-gray-600" /> : <Building className="h-5 w-5 text-gray-600" />}
                  <div>
                    <p className="font-medium text-gray-900">{item.query}</p>
                    <p className="text-sm text-gray-600">{formatDate(item.created_at)} • {item.results_count} results</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(item.risk_level)}`}>
                  {item.risk_level}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No search history yet. Perform a search to see activity here.</p>
        )}
      </div>
    </div>
  );

  const SearchView = () => (
    <div className="space-y-6">
      {/* Data Source Info */}
      {searchInfo && (
        <div className={`border rounded-lg p-4 ${
          searchInfo.source?.includes('opensanctions')
            ? 'bg-green-50 border-green-200' 
            : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex items-center gap-2">
            {searchInfo.source?.includes('opensanctions') ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-600" />
            )}
            <div>
              <h3 className={`font-medium ${
                searchInfo.source?.includes('opensanctions')
                  ? 'text-green-800' 
                  : 'text-yellow-800'
              }`}>
                {searchInfo.source?.includes('opensanctions')
                  ? '🎉 Using Real OpenSanctions Data!' 
                  : '⏳ Using Demo Data'
                }
              </h3>
              <p className={`text-sm ${
                searchInfo.source?.includes('opensanctions')
                  ? 'text-green-700' 
                  : 'text-yellow-700'
              }`}>
                {searchInfo.source?.includes('opensanctions')
                  ? `Found ${searchInfo.total?.value || 0} matches in live sanctions databases${searchInfo.moroccan_matches > 0 ? ` (including ${searchInfo.moroccan_matches} Moroccan entities)` : ''}` 
                  : 'OpenSanctions is still loading - showing demo results'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search Interface */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h2 className="text-xl font-semibold mb-6">Advanced Sanctions Screening</h2>
        
        <div className="flex gap-4 mb-6">
          <SearchInput 
            inputRef={searchInputRef}
            onSearch={performSearch}
            disabled={isLoading}
          />
          <button
            onClick={() => performSearch(searchInputRef.current?.value || '')}
            disabled={isLoading}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-5 w-5" />
                Search
              </>
            )}
          </button>
        </div>

        {/* Advanced Search Toggle */}
        <div className="mb-4">
          <button
            onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
          >
            <Filter className="h-4 w-4" />
            {showAdvancedSearch ? 'Hide Advanced Filters' : 'Show Advanced Filters'}
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              {Object.values(searchFilters).filter(v => v !== '' && v !== false && v !== 'exact' && v !== 'Person').length} active
            </span>
          </button>
        </div>

        {/* Advanced Search Panel */}
        {showAdvancedSearch && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Advanced Search Filters</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* First Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                <input
                  type="text"
                  value={searchFilters.first_name}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, first_name: e.target.value }))}
                  placeholder="Enter first name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                <input
                  type="text"
                  value={searchFilters.last_name}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, last_name: e.target.value }))}
                  placeholder="Enter last name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Birth Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Birth Date</label>
                <input
                  type="date"
                  value={searchFilters.birth_date}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, birth_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role/Position</label>
                <input
                  type="text"
                  value={searchFilters.role}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, role: e.target.value }))}
                  placeholder="e.g. CEO, Minister, Director..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Entity Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Entity Type</label>
                <select
                  value={searchFilters.entity_type}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, entity_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Person">Person</option>
                  <option value="Company">Company</option>
                  <option value="Organization">Organization</option>
                </select>
              </div>

              {/* Country */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                <input
                  type="text"
                  value={searchFilters.country}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, country: e.target.value }))}
                  placeholder="Country code (e.g. US, UK, FR, MA)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Dataset */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dataset</label>
                <select
                  value={searchFilters.dataset}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, dataset: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Datasets</option>
                  <option value="default">OpenSanctions</option>
                  <option value="moroccan_entities">Moroccan Entities</option>
                </select>
              </div>

              {/* Search Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search Type</label>
                <select
                  value={searchFilters.search_type}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, search_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="exact">Exact Match</option>
                  <option value="partial">Partial Match</option>
                  <option value="fuzzy">Fuzzy Search</option>
                </select>
              </div>

            </div>

            {/* Search Options */}
            <div className="mt-6 flex flex-wrap gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={searchFilters.fuzzy}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, fuzzy: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm">Enable fuzzy search (handles typos and variations)</span>
              </label>
            </div>

            {/* Clear Filters Button */}
            <div className="mt-6 flex justify-between items-center">
              <button
                onClick={() => setSearchFilters({
                  first_name: '',
                  last_name: '',
                  birth_date: '',
                  role: '',
                  country: '',
                  entity_type: 'Person',
                  search_type: 'exact',
                  dataset: '',
                  fuzzy: false
                })}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              >
                Clear All Filters
              </button>
              
              <div className="text-sm text-gray-600">
                Active filters: {Object.values(searchFilters).filter(v => v !== '' && v !== false && v !== 'exact' && v !== 'Person').length}
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <h4 className="font-medium text-red-800">Search Error</h4>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Search Results */}
        {results.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-4">
              Search Results ({results.length})
              {searchInfo?.total?.value && searchInfo.total.value > results.length && (
                <span className="text-base font-normal text-gray-600 ml-2">
                  (showing {results.length} of {searchInfo.total.value} total matches)
                </span>
              )}
            </h3>
            
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={result.id || index} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        {result.schema === 'Person' ? 
                          <User className="h-6 w-6 text-gray-600" /> : 
                          <Building className="h-6 w-6 text-gray-600" />
                        }
                        <h4 className="text-lg font-semibold text-gray-900">
                          {result.caption || result.name || 'Unknown Entity'}
                        </h4>
                        <button
                          onClick={() => {
                            const entityId = result.id || `entity-${index}`;
                            if (starredEntityIds.has(entityId)) {
                              unstarEntity(entityId);
                            } else {
                              starEntity(result, index);
                            }
                          }}
                          className={`p-2 rounded-full transition-colors ${
                            starredEntityIds.has(result.id || `entity-${index}`)
                              ? 'text-yellow-600 bg-yellow-100 hover:bg-yellow-200'
                              : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'
                          }`}
                          title={starredEntityIds.has(result.id || `entity-${index}`) ? 'Unstar this entity' : 'Star this important entity'}
                        >
                          <Star className={`h-5 w-5 ${starredEntityIds.has(result.id || `entity-${index}`) ? 'fill-current' : ''}`} />
                        </button>
                        {starredEntityIds.has(result.id || `entity-${index}`) && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium border border-yellow-300">
                            ⭐ Starred Entity
                          </span>
                        )}
                        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
                          getRiskColor(getRelevanceScore(result))
                        }`}>
                          Relevance: {getRelevanceScore(result)}%
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getMatchTypeColor(getMatchType(result))}`}>
                          {getMatchType(result).charAt(0).toUpperCase() + getMatchType(result).slice(1)} ({getMatchConfidence(result)}%)
                        </span>
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                          {result.schema || 'Entity'}
                        </span>
                      </div>
                      
                      {/* Basic Information Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm mb-4">
                        {result.properties?.birthDate && (
                          <div>
                            <span className="text-gray-600 font-medium">Birth Date:</span>
                            <span className="ml-2">
                              {new Date(result.properties.birthDate[0]).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        {result.properties?.birthPlace && (
                          <div>
                            <span className="text-gray-600 font-medium">Birth Place:</span>
                            <span className="ml-2">
                              {result.properties.birthPlace[0]}
                            </span>
                          </div>
                        )}
                        {result.properties?.gender && (
                          <div>
                            <span className="text-gray-600 font-medium">Gender:</span>
                            <span className="ml-2 capitalize">
                              {result.properties.gender[0]}
                            </span>
                          </div>
                        )}
                        {result.properties?.nationality && (
                          <div>
                            <span className="text-gray-600 font-medium">Nationality:</span>
                            <span className="ml-2">
                              {result.properties.nationality.join(', ').toUpperCase()}
                            </span>
                          </div>
                        )}
                        {result.properties?.citizenship && (
                          <div>
                            <span className="text-gray-600 font-medium">Citizenship:</span>
                            <span className="ml-2">
                              {result.properties.citizenship.join(', ').toUpperCase()}
                            </span>
                          </div>
                        )}
                        {result.properties?.country && (
                          <div>
                            <span className="text-gray-600 font-medium">Country:</span>
                            <span className="ml-2">
                              {result.properties.country.join(', ')}
                            </span>
                          </div>
                        )}
                        {result.properties?.deathDate && (
                          <div>
                            <span className="text-gray-600 font-medium">Death Date:</span>
                            <span className="ml-2 text-red-600">
                              {result.properties.deathDate[0] === result.properties.deathDate[0].slice(0, 7) + '-01' 
                                ? result.properties.deathDate[0].slice(0, 7) 
                                : new Date(result.properties.deathDate[0]).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        {result.properties?.title && (
                          <div>
                            <span className="text-gray-600 font-medium">Title:</span>
                            <span className="ml-2">
                              {result.properties.title.join(', ')}
                            </span>
                          </div>
                        )}
                        {result.properties?.classification && (
                          <div>
                            <span className="text-gray-600 font-medium">Classification:</span>
                            <span className="ml-2">
                              {result.properties.classification.join(', ')}
                            </span>
                          </div>
                        )}
                        {result.datasets && (
                          <div>
                            <span className="text-gray-600 font-medium">Data Sources:</span>
                            <span className="ml-2 text-xs">
                              {result.datasets.length} sources
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Current Positions */}
                      {result.properties?.position && result.properties.position.length > 0 && (
                        <div className="mb-4">
                          <span className="text-gray-600 font-medium text-sm">🏛️ Current/Former Positions:</span>
                          <div className="mt-1 space-y-1">
                            {result.properties.position.slice(0, 3).map((position, i) => (
                              <div key={i} className="text-sm text-gray-700 bg-green-50 px-3 py-2 rounded border-l-3 border-green-300">
                                {position}
                              </div>
                            ))}
                            {result.properties.position.length > 3 && (
                              <div className="text-xs text-gray-500 px-3 py-1">
                                +{result.properties.position.length - 3} more positions
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Names and Aliases */}
                      {result.properties?.alias && result.properties.alias.length > 0 && (
                        <div className="mb-4">
                          <span className="text-gray-600 font-medium text-sm">👤 Known Aliases:</span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {result.properties.alias.slice(0, 5).map((alias, i) => (
                              <span key={i} className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                                {alias}
                              </span>
                            ))}
                            {result.properties.alias.length > 5 && (
                              <span className="px-2 py-1 text-gray-500 text-xs">
                                +{result.properties.alias.length - 5} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Topics/Sanctions */}
                      {result.properties?.topics && (
                        <div className="mb-4">
                          <span className="text-gray-600 font-medium text-sm">Sanctions/Topics:</span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {result.properties.topics.map((topic, i) => (
                              <span key={i} className={`px-2 py-1 rounded text-xs font-medium ${
                                topic.includes('sanction') ? 'bg-red-100 text-red-800' :
                                topic.includes('pep') ? 'bg-orange-100 text-orange-800' :
                                topic.includes('crime') ? 'bg-purple-100 text-purple-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {topic.replace(/\./g, ' ').toUpperCase()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Entity ID and Technical Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-500 mb-4">
                        <div>
                          <span className="font-medium">Entity ID:</span>
                          <span className="ml-2 font-mono">{result.id}</span>
                        </div>
                        {result.properties?.wikidataId && (
                          <div>
                            <span className="font-medium">Wikidata:</span>
                            <a 
                              href={`https://www.wikidata.org/wiki/${result.properties.wikidataId[0]}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 font-mono text-blue-600 hover:text-blue-800"
                            >
                              {result.properties.wikidataId[0]}
                            </a>
                          </div>
                        )}
                        {result.first_seen && (
                          <div>
                            <span className="font-medium">First Seen:</span>
                            <span className="ml-2">{new Date(result.first_seen).toLocaleDateString()}</span>
                          </div>
                        )}
                        {result.last_seen && (
                          <div>
                            <span className="font-medium">Last Updated:</span>
                            <span className="ml-2">{new Date(result.last_seen).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>

                      {/* Notes from OpenSanctions */}
                      {result.properties?.notes && result.properties.notes.length > 0 && (
                        <div className="mb-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                          <h6 className="font-medium text-blue-900 text-sm mb-2">📋 Official Notes:</h6>
                          {result.properties.notes.map((note, i) => (
                            <p key={i} className="text-sm text-blue-800 mb-1">{note}</p>
                          ))}
                        </div>
                      )}

                      {/* Addresses */}
                      {result.properties?.address && result.properties.address.length > 0 && (
                        <div className="mb-4">
                          <span className="text-gray-600 font-medium text-sm">📍 Addresses:</span>
                          <div className="mt-1 space-y-1">
                            {result.properties.address.slice(0, 3).map((address, i) => (
                              <div key={i} className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded">
                                {address}
                              </div>
                            ))}
                            {result.properties.address.length > 3 && (
                              <div className="text-xs text-gray-500 px-3 py-1">
                                +{result.properties.address.length - 3} more addresses
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Phone Numbers */}
                      {result.properties?.phone && result.properties.phone.length > 0 && (
                        <div className="mb-4">
                          <span className="text-gray-600 font-medium text-sm">📞 Phone Numbers:</span>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {result.properties.phone.map((phone, i) => (
                              <span key={i} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-mono">
                                {phone}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Email Addresses */}
                      {result.properties?.email && result.properties.email.length > 0 && (
                        <div className="mb-4">
                          <span className="text-gray-600 font-medium text-sm">📧 Email Addresses:</span>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {result.properties.email.map((email, i) => (
                              <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-mono">
                                {email}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Passport/ID Numbers */}
                      {result.properties?.passportNumber && result.properties.passportNumber.length > 0 && (
                        <div className="mb-4">
                          <span className="text-gray-600 font-medium text-sm">🛂 Passport/ID Numbers:</span>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {result.properties.passportNumber.map((passport, i) => (
                              <span key={i} className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-mono">
                                {passport}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Position/Title */}
                      {result.properties?.position && result.properties.position.length > 0 && (
                        <div className="mb-4">
                          <span className="text-gray-600 font-medium text-sm">💼 Positions/Titles:</span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {result.properties.position.map((position, i) => (
                              <span key={i} className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">
                                {position}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Aliases */}
                      {result.properties?.alias && result.properties.alias.length > 0 && (
                        <div className="mb-4">
                          <span className="text-gray-600 font-medium text-sm">👤 Also known as:</span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {result.properties.alias.slice(0, 5).map((alias, i) => (
                              <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                {alias}
                              </span>
                            ))}
                            {result.properties.alias.length > 5 && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs">
                                +{result.properties.alias.length - 5} more aliases
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* All other names */}
                      {result.properties?.name && result.properties.name.length > 1 && (
                        <div className="mb-4">
                          <span className="text-gray-600 font-medium text-sm">🔤 All Names:</span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {result.properties.name.slice(0, 6).map((name, i) => (
                              <span key={i} className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs">
                                {name}
                              </span>
                            ))}
                            {result.properties.name.length > 6 && (
                              <span className="px-2 py-1 bg-indigo-100 text-indigo-500 rounded text-xs">
                                +{result.properties.name.length - 6} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Data Sources Detail */}
                      {result.datasets && result.datasets.length > 0 && (
                        <div className="mb-4">
                          <span className="text-gray-600 font-medium text-sm">🔍 Data Sources:</span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {result.datasets.map((dataset, i) => (
                              <span key={i} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                                {dataset.replace(/_/g, ' ').toUpperCase()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Risk Assessment */}
                      {result.recommended_action && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <h5 className="font-medium text-gray-900 mb-1">Recommendation</h5>
                          <p className="text-sm text-gray-600">{result.recommended_action}</p>
                        </div>
                      )}

                      {/* Add Note Button */}
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={() => {
                            setShowInlineNoteForm(result.id || index);
                            setNewNote({
                              entityId: result.id || `entity-${index}`,
                              entityName: result.caption || result.name || 'Unknown Entity',
                              text: '',
                              riskAssessment: '',
                              actionTaken: ''
                            });
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
                        >
                          <MessageSquare className="h-4 w-4" />
                          Add Note
                        </button>
                      </div>

                      {/* Inline Note Form */}
                      {showInlineNoteForm === (result.id || index) && (
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                          <h6 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Add Note for {newNote.entityName}
                          </h6>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                              <textarea
                                value={newNote.text}
                                onChange={(e) => setNewNote({...newNote, text: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                rows="3"
                                placeholder="Add your analysis, observations, or decision..."
                                autoFocus
                                onFocus={(e) => e.target.setSelectionRange(e.target.value.length, e.target.value.length)}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Risk Assessment</label>
                                <input
                                  type="text"
                                  value={newNote.riskAssessment}
                                  onChange={(e) => setNewNote({...newNote, riskAssessment: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="Additional risk analysis..."
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Action Taken</label>
                                <input
                                  type="text"
                                  value={newNote.actionTaken}
                                  onChange={(e) => setNewNote({...newNote, actionTaken: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="What action did you take?"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => addInlineNote(newNote.entityId, newNote.entityName, newNote.text, newNote.riskAssessment, newNote.actionTaken)}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                                disabled={!newNote.text.trim()}
                              >
                                <Save className="h-4 w-4" />
                                Save Note
                              </button>
                              <button
                                onClick={() => {
                                  setShowInlineNoteForm(null);
                                  setNewNote({ entityId: '', entityName: '', text: '', riskAssessment: '', actionTaken: '' });
                                }}
                                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
                              >
                                <X className="h-4 w-4" />
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Results */}
        {searchInfo && results.length === 0 && !isLoading && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <h4 className="font-medium text-green-800">No Matches Found</h4>
                <p className="text-sm text-green-700">
                  No sanctions matches found for "{searchQuery}" - Entity appears clean
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Examples */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-3">Try These Examples:</h4>
          <div className="flex flex-wrap gap-2">
            {['Putin', 'Trump', 'Kim Jong Un', 'OFAC', 'Iran'].map((example) => (
              <button
                key={example}
                onClick={() => handleExampleClick(example)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                disabled={isLoading}
                type="button"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const filteredHistory = searchHistory.filter(item => {
    switch (historyFilter) {
      case 'high-risk': return item.risk_level === 'HIGH';
      case 'medium-risk': return item.risk_level === 'MEDIUM';
      case 'clean': return item.results_count === 0;
      default: return true;
    }
  });

  const HistoryView = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Search History</h3>
            <p className="text-sm text-gray-600 mt-1">Manage and review your compliance searches</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={historyFilter}
              onChange={(e) => setHistoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Searches</option>
              <option value="high-risk">🔴 High Risk</option>
              <option value="medium-risk">🟡 Medium Risk</option>
              <option value="clean">✅ Clean</option>
            </select>
            <button
              onClick={loadSearchHistory}
              disabled={isLoadingHistory}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isLoadingHistory ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Activity className="h-4 w-4" />
                  Refresh
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="bg-gray-100 p-2 rounded-full">
              <History className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">{searchHistory.length}</p>
              <p className="text-xs text-gray-600">Total Searches</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 p-2 rounded-full">
              <Star className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-lg font-semibold text-yellow-600">
                {analytics?.summary?.starred_entities || 0}
              </p>
              <p className="text-xs text-gray-600">Starred Entities</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 p-2 rounded-full">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-lg font-semibold text-red-600">
                {searchHistory.filter(s => s.risk_level === 'HIGH').length}
              </p>
              <p className="text-xs text-gray-600">High Risk</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Search History Cards */}
      {filteredHistory.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {filteredHistory.map((item) => (
            <div 
              key={item.id} 
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h4 className="text-lg font-semibold text-gray-900">{item.query}</h4>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(item.risk_level)}`}>
                      {item.risk_level}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                      {item.search_type}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-gray-600 font-medium">Results:</span>
                      <span className="ml-2 font-semibold">{item.results_count}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 font-medium">Relevance:</span>
                      <span className="ml-2 font-semibold">{item.relevance_score || 0}%</span>
                    </div>
                    <div>
                      <span className="text-gray-600 font-medium">Source:</span>
                      <span className={`ml-2 px-2 py-1 rounded text-xs ${
                        item.data_source?.includes('opensanctions') 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {item.data_source?.includes('opensanctions') ? 'Live Data' : 'Mock Data'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 font-medium">Date:</span>
                      <span className="ml-2">{formatDate(item.created_at)}</span>
                    </div>
                  </div>

                  {item.execution_time_ms && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                      <Clock className="h-3 w-3" />
                      Execution time: {item.execution_time_ms}ms
                    </div>
                  )}

                  {item.notes && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <h6 className="text-sm font-medium text-purple-900 mb-1">Search Notes:</h6>
                          <p className="text-sm text-purple-800">{item.notes}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => {
                      setSearchQuery(item.query);
                      setActiveTab('search');
                    }}
                    className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Search again"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => loadSearchDetails(item.id)}
                    className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors" 
                    title="View details & notes"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => {
                      const notes = prompt('Add notes for this search:', item.notes || '');
                      if (notes !== null) {
                        updateSearchNotes(item.id, notes);
                      }
                    }}
                    className="p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors" 
                    title="Add/edit search notes"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => deleteSearchHistory(item.id)}
                    className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors" 
                    title="Delete search"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white p-12 rounded-lg shadow-sm border text-center">
          <History className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h4 className="text-xl font-medium text-gray-900 mb-2">
            {historyFilter === 'all' ? 'No Search History' : `No ${historyFilter.replace('-', ' ')} searches`}
          </h4>
          <p className="text-gray-600 mb-6">
            {historyFilter === 'all' 
              ? 'Your search history will appear here after you perform searches.' 
              : `No searches match the "${historyFilter.replace('-', ' ')}" filter.`
            }
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setActiveTab('search')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              Start Searching
            </button>
            {historyFilter !== 'all' && (
              <button
                onClick={() => setHistoryFilter('all')}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Show All
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const ReportsView = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Compliance Reports</h2>
        <p className="text-purple-100">Generate detailed reports for compliance and audit purposes</p>
      </div>

      {/* Starred Searches Report Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Starred Entities Report
            </h3>
            <p className="text-sm text-gray-600 mt-1">Detailed report of all important entities you've starred</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={loadStarredEntities}
              disabled={isLoadingStarred}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isLoadingStarred ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Activity className="h-4 w-4" />
                  Load Starred
                </>
              )}
            </button>
            <div className="flex gap-2">
              <button
                onClick={generateStarredReport}
                className="px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 flex items-center gap-2 text-sm"
                title="Export as JSON"
              >
                <Download className="h-4 w-4" />
                JSON
              </button>
              <button
                onClick={exportStarredEntitiesCsv}
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm"
                title="Export as CSV"
              >
                <Download className="h-4 w-4" />
                CSV
              </button>
              <button
                onClick={exportStarredEntitiesPdf}
                className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 text-sm"
                title="Export as PDF"
              >
                <Download className="h-4 w-4" />
                PDF
              </button>
            </div>
          </div>
        </div>

        {/* Starred Entities Display */}
        {starredEntities.length > 0 && (
          <div className="mb-6">
            <h4 className="text-xl font-semibold mb-4">
              Starred Entities ({starredEntities.length})
            </h4>
            
            <div className="space-y-4">
              {starredEntities.map((entity) => {
                const entityData = entity.entity_data || {};
                const properties = entityData.properties || {};
                
                return (
                  <div key={entity.id} className="border-2 border-yellow-300 bg-yellow-50 rounded-lg p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-4">
                          {entityData.schema === 'Person' ? 
                            <User className="h-6 w-6 text-gray-600" /> : 
                            <Building className="h-6 w-6 text-gray-600" />
                          }
                          <h4 className="text-lg font-semibold text-gray-900">
                            {entity.entity_name}
                          </h4>
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium border-2 border-yellow-300">
                            ⭐ STARRED ENTITY
                          </span>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
                            getRiskColor(entity.relevance_score || 0)
                          }`}>
                            Relevance: {entity.relevance_score || 0}%
                          </span>
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                            {entityData.schema || 'Entity'}
                          </span>
                        </div>
                        
                        {/* Basic Information Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm mb-4">
                          {properties.birthDate && (
                            <div>
                              <span className="text-gray-600 font-medium">Birth Date:</span>
                              <span className="ml-2">
                                {new Date(properties.birthDate[0]).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          {properties.birthPlace && (
                            <div>
                              <span className="text-gray-600 font-medium">Birth Place:</span>
                              <span className="ml-2">
                                {properties.birthPlace[0]}
                              </span>
                            </div>
                          )}
                          {properties.gender && (
                            <div>
                              <span className="text-gray-600 font-medium">Gender:</span>
                              <span className="ml-2 capitalize">
                                {properties.gender[0]}
                              </span>
                            </div>
                          )}
                          {properties.nationality && (
                            <div>
                              <span className="text-gray-600 font-medium">Nationality:</span>
                              <span className="ml-2">
                                {properties.nationality.join(', ').toUpperCase()}
                              </span>
                            </div>
                          )}
                          {properties.citizenship && (
                            <div>
                              <span className="text-gray-600 font-medium">Citizenship:</span>
                              <span className="ml-2">
                                {properties.citizenship.join(', ').toUpperCase()}
                              </span>
                            </div>
                          )}
                          {properties.country && (
                            <div>
                              <span className="text-gray-600 font-medium">Country:</span>
                              <span className="ml-2">
                                {properties.country.join(', ')}
                              </span>
                            </div>
                          )}
                          {properties.deathDate && (
                            <div>
                              <span className="text-gray-600 font-medium">Death Date:</span>
                              <span className="ml-2 text-red-600">
                                {properties.deathDate[0] === properties.deathDate[0].slice(0, 7) + '-01' 
                                  ? properties.deathDate[0].slice(0, 7) 
                                  : new Date(properties.deathDate[0]).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          {properties.title && (
                            <div>
                              <span className="text-gray-600 font-medium">Title:</span>
                              <span className="ml-2">
                                {properties.title.join(', ')}
                              </span>
                            </div>
                          )}
                          {properties.classification && (
                            <div>
                              <span className="text-gray-600 font-medium">Classification:</span>
                              <span className="ml-2">
                                {properties.classification.join(', ')}
                              </span>
                            </div>
                          )}
                          {entityData.datasets && (
                            <div>
                              <span className="text-gray-600 font-medium">Data Sources:</span>
                              <span className="ml-2 text-xs">
                                {entityData.datasets.length} sources
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Current Positions */}
                        {properties.position && properties.position.length > 0 && (
                          <div className="mb-4">
                            <span className="text-gray-600 font-medium text-sm">🏛️ Current/Former Positions:</span>
                            <div className="mt-1 space-y-1">
                              {properties.position.slice(0, 3).map((position, i) => (
                                <div key={i} className="text-sm text-gray-700 bg-green-50 px-3 py-2 rounded border-l-3 border-green-300">
                                  {position}
                                </div>
                              ))}
                              {properties.position.length > 3 && (
                                <div className="text-xs text-gray-500 px-3 py-1">
                                  +{properties.position.length - 3} more positions
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Names and Aliases */}
                        {properties.alias && properties.alias.length > 0 && (
                          <div className="mb-4">
                            <span className="text-gray-600 font-medium text-sm">👤 Known Aliases:</span>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {properties.alias.slice(0, 5).map((alias, i) => (
                                <span key={i} className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                                  {alias}
                                </span>
                              ))}
                              {properties.alias.length > 5 && (
                                <span className="px-2 py-1 text-gray-500 text-xs">
                                  +{properties.alias.length - 5} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Topics/Sanctions */}
                        {properties.topics && (
                          <div className="mb-4">
                            <span className="text-gray-600 font-medium text-sm">Sanctions/Topics:</span>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {properties.topics.map((topic, i) => (
                                <span key={i} className={`px-2 py-1 rounded text-xs font-medium ${
                                  topic.includes('sanction') ? 'bg-red-100 text-red-800' :
                                  topic.includes('pep') ? 'bg-orange-100 text-orange-800' :
                                  topic.includes('crime') ? 'bg-purple-100 text-purple-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {topic.replace(/\./g, ' ').toUpperCase()}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Entity ID and Technical Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-500 mb-4">
                          <div>
                            <span className="font-medium">Entity ID:</span>
                            <span className="ml-2 font-mono">{entity.entity_id}</span>
                          </div>
                          {properties.wikidataId && (
                            <div>
                              <span className="font-medium">Wikidata:</span>
                              <a 
                                href={`https://www.wikidata.org/wiki/${properties.wikidataId[0]}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-2 font-mono text-blue-600 hover:text-blue-800"
                              >
                                {properties.wikidataId[0]}
                              </a>
                            </div>
                          )}
                          {entityData.first_seen && (
                            <div>
                              <span className="font-medium">First Seen:</span>
                              <span className="ml-2">{new Date(entityData.first_seen).toLocaleDateString()}</span>
                            </div>
                          )}
                          {entityData.last_seen && (
                            <div>
                              <span className="font-medium">Last Updated:</span>
                              <span className="ml-2">{new Date(entityData.last_seen).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>

                        {/* Notes from OpenSanctions */}
                        {properties.notes && properties.notes.length > 0 && (
                          <div className="mb-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                            <h6 className="font-medium text-blue-900 text-sm mb-2">📋 Official Notes:</h6>
                            {properties.notes.map((note, i) => (
                              <p key={i} className="text-sm text-blue-800 mb-1">{note}</p>
                            ))}
                          </div>
                        )}

                        {/* Addresses */}
                        {properties.address && properties.address.length > 0 && (
                          <div className="mb-4">
                            <span className="text-gray-600 font-medium text-sm">📍 Addresses:</span>
                            <div className="mt-1 space-y-1">
                              {properties.address.slice(0, 3).map((address, i) => (
                                <div key={i} className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded">
                                  {address}
                                </div>
                              ))}
                              {properties.address.length > 3 && (
                                <div className="text-xs text-gray-500 px-3 py-1">
                                  +{properties.address.length - 3} more addresses
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Search Context and Starred Info */}
                        <div className="text-sm text-gray-600 mb-4 bg-yellow-100 border border-yellow-200 rounded p-3">
                          <div className="flex items-center gap-4">
                            <div>
                              <span className="font-medium">From search:</span>
                              <span className="ml-2">"{entity.search_context.query}"</span>
                            </div>
                            <div>
                              <span className="font-medium">Starred:</span>
                              <span className="ml-2">{formatDate(entity.starred_at)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Compliance Notes Section */}
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="font-medium text-purple-900 flex items-center gap-2">
                              <MessageSquare className="h-4 w-4" />
                              Compliance Notes
                            </h5>
                            <div className="flex gap-2">
                              {editingStarredNote !== entity.id && (
                                <button
                                  onClick={() => startEditingStarredNote(entity.id)}
                                  className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 transition-colors"
                                  title="Add/edit compliance notes"
                                >
                                  {entity.notes ? 'Edit Notes' : 'Add Notes'}
                                </button>
                              )}
                              <button
                                onClick={() => setConfirmUnstar(entity)}
                                className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors flex items-center gap-1"
                                title="Remove from starred entities"
                              >
                                <X className="h-3 w-3" />
                                Unstar
                              </button>
                            </div>
                          </div>
                          
                          {editingStarredNote === entity.id ? (
                            /* Inline editing mode */
                            <NotesTextarea
                              initialValue={entity.notes}
                              onSave={saveStarredNote}
                              onCancel={cancelEditingStarredNote}
                              entityId={entity.id}
                            />
                          ) : (
                            /* Display mode */
                            <>
                              {entity.notes ? (
                                <div className="bg-white border border-purple-200 rounded p-3">
                                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{entity.notes}</p>
                                </div>
                              ) : (
                                <div className="text-center py-4">
                                  <p className="text-sm text-purple-600 italic">No compliance notes added yet</p>
                                  <p className="text-xs text-purple-500 mt-1">Click "Add Notes" to document compliance observations</p>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-medium text-yellow-900 mb-2">📊 Enhanced Report Features</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-yellow-800">
            <div>
              <h5 className="font-medium mb-2">Report Contents:</h5>
              <ul className="space-y-1">
                <li>• Complete OpenSanctions entity details</li>
                <li>• Full risk assessments & scores</li>
                <li>• Search context & timestamps</li>
                <li>• <strong>Starred entity notes</strong> & compliance decisions</li>
                <li>• Risk distribution analysis</li>
                <li>• Complete audit trail with user actions</li>
              </ul>
            </div>
            <div>
              <h5 className="font-medium mb-2">Export Formats:</h5>
              <ul className="space-y-1">
                <li>• <strong>JSON:</strong> Complete data for analysis</li>
                <li>• <strong>CSV:</strong> Spreadsheet-compatible format</li>
                <li>• <strong>PDF:</strong> Professional compliance report</li>
                <li>• Contains entity properties, countries, topics</li>
                <li>• Includes source URLs and verification data</li>
                <li>• Full OpenSanctions metadata included</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

    </div>
  );

  const NotesModal = () => {
    if (!showNotes || !selectedSearch) return null;

    const searchResults = selectedSearch.results_data || [];

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Search Details & Notes</h2>
              <p className="text-sm text-gray-600 mt-1">
                Query: "{selectedSearch.query}" • {formatDate(selectedSearch.created_at)}
              </p>
            </div>
            <button
              onClick={closeNotesView}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {/* Search Results with Notes */}
            <div className="space-y-6">
              {searchResults.length > 0 ? (
                searchResults.map((result, index) => (
                  <div key={result.id || index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {result.schema === 'Person' ? 
                            <User className="h-5 w-5 text-gray-600" /> : 
                            <Building className="h-5 w-5 text-gray-600" />
                          }
                          <h4 className="text-lg font-semibold text-gray-900">
                            {result.caption || result.name || 'Unknown Entity'}
                          </h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                            getRiskColor(getRelevanceScore(result))
                          }`}>
                            Relevance: {getRelevanceScore(result)}%
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getMatchTypeColor(getMatchType(result))}`}>
                            {getMatchType(result).charAt(0).toUpperCase() + getMatchType(result).slice(1)} ({getMatchConfidence(result)}%)
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                          <div>
                            <span className="text-gray-600 font-medium">Country:</span>
                            <span className="ml-2">
                              {result.properties?.country?.join(', ') || 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 font-medium">Topics:</span>
                            <span className="ml-2">
                              {result.properties?.topics?.join(', ') || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => setNewNote({
                          entityId: result.id,
                          entityName: result.caption || result.name || 'Unknown Entity',
                          text: '',
                          riskAssessment: '',
                          actionTaken: ''
                        })}
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1 text-sm"
                      >
                        <Plus className="h-4 w-4" />
                        Add Note
                      </button>
                    </div>

                    {/* Existing Notes */}
                    {notes[result.id] && notes[result.id].length > 0 && (
                      <div className="mt-4 space-y-3">
                        <h5 className="font-medium text-gray-900 flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Notes ({notes[result.id].length})
                        </h5>
                        {notes[result.id].map((note) => (
                          <div key={note.id} className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-gray-900 mb-2">{note.note_text}</p>
                            {note.risk_assessment && (
                              <p className="text-sm text-orange-700 mb-1">
                                <span className="font-medium">Risk Assessment:</span> {note.risk_assessment}
                              </p>
                            )}
                            {note.action_taken && (
                              <p className="text-sm text-green-700 mb-1">
                                <span className="font-medium">Action Taken:</span> {note.action_taken}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 mt-2">
                              Added {formatDate(note.created_at)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Note Form */}
                    {newNote.entityId === result.id && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                        <h6 className="font-medium text-gray-900 mb-3">Add Note for {newNote.entityName}</h6>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                            <textarea
                              value={newNote.text}
                              onChange={(e) => setNewNote({...newNote, text: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              rows="3"
                              placeholder="Add your analysis or observation..."
                              autoFocus
                              onFocus={(e) => e.target.setSelectionRange(e.target.value.length, e.target.value.length)}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Risk Assessment</label>
                              <input
                                type="text"
                                value={newNote.riskAssessment}
                                onChange={(e) => setNewNote({...newNote, riskAssessment: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Additional risk notes..."
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Action Taken</label>
                              <input
                                type="text"
                                value={newNote.actionTaken}
                                onChange={(e) => setNewNote({...newNote, actionTaken: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="What did you do?"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => addNote(newNote.entityId, newNote.entityName, newNote.text, newNote.riskAssessment, newNote.actionTaken)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                              disabled={!newNote.text.trim()}
                            >
                              <Save className="h-4 w-4" />
                              Save Note
                            </button>
                            <button
                              onClick={() => setNewNote({ entityId: '', entityName: '', text: '', riskAssessment: '', actionTaken: '' })}
                              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
                            >
                              <X className="h-4 w-4" />
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No search results available for this search.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Admin state and functions
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '', username: '', password: '', full_name: '', role: 'viewer', organization: '', department: ''
  });

  // Helper function to update newUser fields without losing focus
  const updateNewUserField = useCallback((field, value) => {
    setNewUser(prevUser => {
      // Only update if the value actually changed
      if (prevUser[field] === value) {
        return prevUser;
      }
      return {
        ...prevUser,
        [field]: value
      };
    });
  }, []);

  const fetchUsers = async () => {
    if (!isAdmin) return;
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/v1/auth/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchAuditLogs = async () => {
    if (!isAdmin) return;
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/v1/auth/audit-logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAuditLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    }
  };

  const createUser = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newUser)
      });
      
      if (response.ok) {
        setShowCreateUser(false);
        setNewUser({ email: '', username: '', password: '', full_name: '', role: 'viewer', organization: '', department: '' });
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  // Load admin data when needed
  useEffect(() => {
    if (isAdmin && (activeTab === 'users' || activeTab === 'audit')) {
      if (activeTab === 'users') fetchUsers();
      if (activeTab === 'audit') fetchAuditLogs();
    }
  }, [activeTab, isAdmin]);

  // Standalone User Management Component (Isolated from parent state)
  const StandaloneUserManagement = memo(() => {
    const [localUsers, setLocalUsers] = useState([]);
    const [localAuditLogs, setLocalAuditLogs] = useState([]);
    const [localShowCreateUser, setLocalShowCreateUser] = useState(false);
    const [localNewUser, setLocalNewUser] = useState({
      email: '', username: '', password: '', full_name: '', role: 'viewer', organization: '', department: ''
    });
    
    // Advanced user management state
    const [editingUser, setEditingUser] = useState(null);
    const [showUserDetails, setShowUserDetails] = useState(null);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [userFilter, setUserFilter] = useState({ role: '', status: '', search: '' });

    // Local helper function for updating form fields
    const localUpdateNewUserField = useCallback((field, value) => {
      setLocalNewUser(prevUser => {
        if (prevUser[field] === value) {
          return prevUser;
        }
        return {
          ...prevUser,
          [field]: value
        };
      });
    }, []);

    // Filter users based on current filters (memoized to prevent unnecessary re-renders)
    const filteredUsers = useMemo(() => {
      return localUsers.filter(user => {
        const matchesRole = !userFilter.role || user.role === userFilter.role;
        const matchesStatus = !userFilter.status || 
          (userFilter.status === 'active' && user.is_active) ||
          (userFilter.status === 'inactive' && !user.is_active);
        const matchesSearch = !userFilter.search || 
          user.full_name.toLowerCase().includes(userFilter.search.toLowerCase()) ||
          user.email.toLowerCase().includes(userFilter.search.toLowerCase()) ||
          user.username.toLowerCase().includes(userFilter.search.toLowerCase());
        
        return matchesRole && matchesStatus && matchesSearch;
      });
    }, [localUsers, userFilter]);

    // Local fetch users function
    const localFetchUsers = useCallback(async () => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch('/api/v1/auth/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setLocalUsers(data);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    }, []);

    // Load users on mount
    useEffect(() => {
      localFetchUsers();
    }, [localFetchUsers]);

    // Local create user function
    const localCreateUser = useCallback(async (e) => {
      e.preventDefault();
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch('/api/v1/auth/register', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(localNewUser)
        });

        if (response.ok) {
          await localFetchUsers(); // Refresh list
          setLocalNewUser({ email: '', username: '', password: '', full_name: '', role: 'viewer', organization: '', department: '' });
          setLocalShowCreateUser(false);
          alert('User created successfully');
        } else {
          const error = await response.json();
          throw new Error(error.detail || 'Failed to create user');
        }
      } catch (error) {
        alert(error.message);
      }
    }, [localNewUser, localFetchUsers]);

    // User action handler (activate, deactivate, update, reset password)
    const handleUserAction = useCallback(async (action, userId, data = {}) => {
      try {
        const token = localStorage.getItem('access_token');
        let response;

        switch (action) {
          case 'activate':
            response = await fetch(`/api/v1/auth/users/${userId}/activate`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` }
            });
            break;
          case 'deactivate':
            response = await fetch(`/api/v1/auth/users/${userId}/deactivate`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` }
            });
            break;
          case 'update':
            response = await fetch(`/api/v1/auth/users/${userId}`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(data)
            });
            break;
          case 'resetPassword':
            const newPassword = prompt('Enter new password for user:');
            if (!newPassword) return;
            const formData = new FormData();
            formData.append('new_password', newPassword);
            response = await fetch(`/api/v1/auth/users/${userId}/reset-password`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`
              },
              body: formData
            });
            break;
        }

        if (response.ok) {
          await localFetchUsers(); // Refresh user list
          setEditingUser(null);
          alert(`User ${action} successful`);
        } else {
          throw new Error(`Failed to ${action} user`);
        }
      } catch (error) {
        alert(error.message);
      }
    }, [localFetchUsers]);

    // Bulk actions handler
    const handleBulkAction = useCallback(async (action) => {
      if (selectedUsers.length === 0) {
        alert('Please select users first');
        return;
      }

      showConfirmDialog(
        `${action.charAt(0).toUpperCase() + action.slice(1)} Users`,
        `Are you sure you want to ${action} ${selectedUsers.length} user(s)?`,
        async () => {
          await performBulkAction(action);
          setConfirmDialog(null);
        },
        `${action.charAt(0).toUpperCase() + action.slice(1)} Users`
      );
    }, [selectedUsers]);

    const performBulkAction = async (action) => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`/api/v1/auth/users/bulk-${action}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(selectedUsers)
        });

        if (response.ok) {
          const result = await response.json();
          await localFetchUsers();
          setSelectedUsers([]);
          const count = result[`${action}d_count`] || result[`${action}_count`] || 0;
          alert(`Bulk ${action}: ${count} users affected`);
        } else {
          throw new Error(`Bulk ${action} failed`);
        }
      } catch (error) {
        alert(error.message);
      }
    };

    // Get user activity
    const getUserActivity = useCallback(async (userId) => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`/api/v1/auth/users/${userId}/activity`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const activity = await response.json();
          setShowUserDetails(activity);
        }
      } catch (error) {
        alert('Failed to load user activity');
      }
    }, []);

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-lg p-6 text-white">
          <h2 className="text-2xl font-bold mb-2">User Management</h2>
          <p className="text-indigo-100">Manage user accounts, permissions, and access</p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex flex-wrap items-center gap-4">
              <input
                type="text"
                placeholder="Search users..."
                value={userFilter.search}
                onChange={(e) => setUserFilter({...userFilter, search: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <select
                value={userFilter.role}
                onChange={(e) => setUserFilter({...userFilter, role: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="compliance_officer">Compliance Officer</option>
                <option value="analyst">Analyst</option>
                <option value="viewer">Viewer</option>
              </select>
              <select
                value={userFilter.status}
                onChange={(e) => setUserFilter({...userFilter, status: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              {selectedUsers.length > 0 && (
                <>
                  <button
                    onClick={() => handleBulkAction('activate')}
                    className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                  >
                    Activate ({selectedUsers.length})
                  </button>
                  <button
                    onClick={() => handleBulkAction('deactivate')}
                    className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                  >
                    Deactivate ({selectedUsers.length})
                  </button>
                </>
              )}
              <button
                onClick={() => setLocalShowCreateUser(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create User
              </button>
            </div>
          </div>

          {/* Create User Form */}
          {localShowCreateUser && (
            <CreateUserFormComponent
              newUser={localNewUser}
              updateNewUserField={localUpdateNewUserField}
              onSubmit={localCreateUser}
              onCancel={() => setLocalShowCreateUser(false)}
            />
          )}

          {/* Advanced User List */}
          <div className="space-y-4">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((u) => (
                <div key={u.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(u.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers([...selectedUsers, u.id]);
                          } else {
                            setSelectedUsers(selectedUsers.filter(id => id !== u.id));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <div className="flex-1">
                        {editingUser === u.id ? (
                          <EditUserForm 
                            user={u} 
                            onSave={(data) => handleUserAction('update', u.id, data)}
                            onCancel={() => setEditingUser(null)}
                          />
                        ) : (
                          <div>
                            <h4 className="text-lg font-medium text-gray-900">{u.full_name}</h4>
                            <p className="text-sm text-gray-500">{u.email} • @{u.username}</p>
                            {u.organization && (
                              <p className="text-sm text-gray-400">{u.organization} {u.department && `• ${u.department}`}</p>
                            )}
                            <div className="flex items-center space-x-2 mt-2">
                              <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                u.role === 'admin' ? 'bg-red-100 text-red-800' :
                                u.role === 'compliance_officer' ? 'bg-purple-100 text-purple-800' :
                                u.role === 'analyst' ? 'bg-blue-100 text-blue-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {u.role.replace('_', ' ').toUpperCase()}
                              </span>
                              <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                u.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {u.is_active ? 'ACTIVE' : 'INACTIVE'}
                              </span>
                              {u.is_superuser && (
                                <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                  SUPERUSER
                                </span>
                              )}
                              {u.last_login && (
                                <span className="text-xs text-gray-400">
                                  Last login: {new Date(u.last_login).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {editingUser !== u.id && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => getUserActivity(u.id)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="View Activity"
                        >
                          <Activity className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditingUser(u.id)}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                          title="Edit User"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleUserAction('resetPassword', u.id)}
                          className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded"
                          title="Reset Password"
                        >
                          <Key className="h-4 w-4" />
                        </button>
                        {u.is_active ? (
                          <button
                            onClick={() => handleUserAction('deactivate', u.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Deactivate User"
                          >
                            <UserX className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUserAction('activate', u.id)}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                            title="Activate User"
                          >
                            <UserCheck className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                {localUsers.length === 0 ? 'No users found' : 'No users match the current filters'}
              </div>
            )}
          </div>

          {/* User Details Modal */}
          {showUserDetails && (
            <UserDetailsModal 
              userActivity={showUserDetails} 
              onClose={() => setShowUserDetails(null)} 
            />
          )}
        </div>
      </div>
    );
  });

  // Create User Form Component (Memoized to prevent re-renders)
  const CreateUserFormComponent = memo(({ newUser, updateNewUserField, onSubmit, onCancel }) => (
    <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
      <h3 className="text-md font-medium text-gray-900 mb-3">Create New User</h3>
      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          key="create-full-name"
          type="text"
          placeholder="Full Name"
          value={newUser.full_name}
          onChange={(e) => updateNewUserField('full_name', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md"
          required
        />
        <input
          key="create-email"
          type="email"
          placeholder="Email"
          value={newUser.email}
          onChange={(e) => updateNewUserField('email', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md"
          required
        />
        <input
          key="create-username"
          type="text"
          placeholder="Username"
          value={newUser.username}
          onChange={(e) => updateNewUserField('username', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md"
          required
        />
        <input
          key="create-password"
          type="password"
          placeholder="Password"
          value={newUser.password}
          onChange={(e) => updateNewUserField('password', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md"
          required
        />
        <input
          key="create-organization"
          type="text"
          placeholder="Organization"
          value={newUser.organization}
          onChange={(e) => updateNewUserField('organization', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md"
        />
        <input
          key="create-department"
          type="text"
          placeholder="Department"
          value={newUser.department}
          onChange={(e) => updateNewUserField('department', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md"
        />
        <select
          key="create-role"
          value={newUser.role}
          onChange={(e) => updateNewUserField('role', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="viewer">Viewer</option>
          <option value="analyst">Analyst</option>
          <option value="compliance_officer">Compliance Officer</option>
          <option value="admin">Admin</option>
        </select>
        <div className="flex space-x-2">
          <button
            type="submit"
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Create User
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  ));

  // Admin Views
  const UsersView = () => {
    const [editingUser, setEditingUser] = useState(null);
    const [showUserDetails, setShowUserDetails] = useState(null);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [userFilter, setUserFilter] = useState({ role: '', status: '', search: '' });

    // Filter users based on current filters (memoized to prevent unnecessary re-renders)
    const filteredUsers = useMemo(() => {
      return users.filter(user => {
        const matchesRole = !userFilter.role || user.role === userFilter.role;
        const matchesStatus = !userFilter.status || 
          (userFilter.status === 'active' && user.is_active) ||
          (userFilter.status === 'inactive' && !user.is_active);
        const matchesSearch = !userFilter.search || 
          user.full_name.toLowerCase().includes(userFilter.search.toLowerCase()) ||
          user.email.toLowerCase().includes(userFilter.search.toLowerCase()) ||
          user.username.toLowerCase().includes(userFilter.search.toLowerCase());
        
        return matchesRole && matchesStatus && matchesSearch;
      });
    }, [users, userFilter]);

    const handleUserAction = async (action, userId, data = {}) => {
      try {
        const token = localStorage.getItem('access_token');
        let response;

        switch (action) {
          case 'activate':
            response = await fetch(`${API_BASE_URL}/api/v1/auth/users/${userId}/activate`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` }
            });
            break;
          case 'deactivate':
            response = await fetch(`${API_BASE_URL}/api/v1/auth/users/${userId}/deactivate`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` }
            });
            break;
          case 'update':
            response = await fetch(`${API_BASE_URL}/api/v1/auth/users/${userId}`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(data)
            });
            break;
          case 'resetPassword':
            const newPassword = prompt('Enter new password for user:');
            if (!newPassword) return;
            response = await fetch(`${API_BASE_URL}/api/v1/auth/users/${userId}/reset-password`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ new_password: newPassword })
            });
            break;
        }

        if (response.ok) {
          fetchUsers(); // Refresh user list
          setEditingUser(null);
          alert(`User ${action} successful`);
        } else {
          throw new Error(`Failed to ${action} user`);
        }
      } catch (error) {
        alert(error.message);
      }
    };

    const handleBulkAction = async (action) => {
      if (selectedUsers.length === 0) {
        alert('Please select users first');
        return;
      }

      showConfirmDialog(
        `${action.charAt(0).toUpperCase() + action.slice(1)} Users`,
        `Are you sure you want to ${action} ${selectedUsers.length} user(s)?`,
        async () => {
          await performBulkActionStandalone(action);
          setConfirmDialog(null);
        },
        `${action.charAt(0).toUpperCase() + action.slice(1)} Users`
      );
    };

    const performBulkActionStandalone = async (action) => {

      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/users/bulk-${action}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ user_ids: selectedUsers })
        });

        if (response.ok) {
          const result = await response.json();
          fetchUsers();
          setSelectedUsers([]);
          alert(`Bulk ${action}: ${result[action + 'd_count']} users affected`);
        } else {
          throw new Error(`Bulk ${action} failed`);
        }
      } catch (error) {
        alert(error.message);
      }
    };

    const getUserActivity = async (userId) => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/users/${userId}/activity`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const activity = await response.json();
          setShowUserDetails(activity);
        }
      } catch (error) {
        alert('Failed to load user activity');
      }
    };

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-lg p-6 text-white">
          <h2 className="text-2xl font-bold mb-2">User Management</h2>
          <p className="text-indigo-100">Manage user accounts, permissions, and access</p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex flex-wrap items-center gap-4">
              <input
                type="text"
                placeholder="Search users..."
                value={userFilter.search}
                onChange={(e) => setUserFilter({...userFilter, search: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <select
                value={userFilter.role}
                onChange={(e) => setUserFilter({...userFilter, role: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="compliance_officer">Compliance Officer</option>
                <option value="analyst">Analyst</option>
                <option value="viewer">Viewer</option>
              </select>
              <select
                value={userFilter.status}
                onChange={(e) => setUserFilter({...userFilter, status: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              {selectedUsers.length > 0 && (
                <>
                  <button
                    onClick={() => handleBulkAction('activate')}
                    className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                  >
                    Activate ({selectedUsers.length})
                  </button>
                  <button
                    onClick={() => handleBulkAction('deactivate')}
                    className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                  >
                    Deactivate ({selectedUsers.length})
                  </button>
                </>
              )}
              <button
                onClick={() => setShowCreateUser(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create User
              </button>
            </div>
          </div>

          {/* Create User Form */}
          {showCreateUser && (
            <CreateUserFormComponent
              newUser={newUser}
              updateNewUserField={updateNewUserField}
              onSubmit={createUser}
              onCancel={() => setShowCreateUser(false)}
            />
          )}

          {/* User List */}
          <div className="space-y-4">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((u) => (
                <div key={u.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(u.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers([...selectedUsers, u.id]);
                          } else {
                            setSelectedUsers(selectedUsers.filter(id => id !== u.id));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <div className="flex-1">
                        {editingUser === u.id ? (
                          <EditUserForm 
                            user={u} 
                            onSave={(data) => handleUserAction('update', u.id, data)}
                            onCancel={() => setEditingUser(null)}
                          />
                        ) : (
                          <div>
                            <h4 className="text-lg font-medium text-gray-900">{u.full_name}</h4>
                            <p className="text-sm text-gray-500">{u.email} • @{u.username}</p>
                            {u.organization && (
                              <p className="text-sm text-gray-400">{u.organization} {u.department && `• ${u.department}`}</p>
                            )}
                            <div className="flex items-center space-x-2 mt-2">
                              <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                u.role === 'admin' ? 'bg-red-100 text-red-800' :
                                u.role === 'compliance_officer' ? 'bg-purple-100 text-purple-800' :
                                u.role === 'analyst' ? 'bg-blue-100 text-blue-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {u.role.replace('_', ' ').toUpperCase()}
                              </span>
                              <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                u.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {u.is_active ? 'ACTIVE' : 'INACTIVE'}
                              </span>
                              {u.is_superuser && (
                                <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                  SUPERUSER
                                </span>
                              )}
                              {u.last_login && (
                                <span className="text-xs text-gray-400">
                                  Last login: {new Date(u.last_login).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {editingUser !== u.id && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => getUserActivity(u.id)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="View Activity"
                        >
                          <Activity className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditingUser(u.id)}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                          title="Edit User"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleUserAction('resetPassword', u.id)}
                          className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded"
                          title="Reset Password"
                        >
                          <Key className="h-4 w-4" />
                        </button>
                        {u.is_active ? (
                          <button
                            onClick={() => handleUserAction('deactivate', u.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Deactivate User"
                          >
                            <UserX className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUserAction('activate', u.id)}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                            title="Activate User"
                          >
                            <UserCheck className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                {users.length === 0 ? 'No users found' : 'No users match the current filters'}
              </div>
            )}
          </div>
        </div>

        {/* User Details Modal */}
        {showUserDetails && (
          <UserDetailsModal 
            userActivity={showUserDetails} 
            onClose={() => setShowUserDetails(null)} 
          />
        )}
      </div>
    );
  };

  // Edit User Form Component (Memoized to prevent re-renders)
  const EditUserForm = memo(({ user, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
      full_name: user.full_name || '',
      email: user.email || '',
      username: user.username || '',
      role: user.role || 'viewer',
      organization: user.organization || '',
      department: user.department || '',
      is_active: user.is_active,
      is_superuser: user.is_superuser
    });

    const updateFormField = useCallback((field, value) => {
      setFormData(prevData => ({
        ...prevData,
        [field]: value
      }));
    }, []);

    const handleSubmit = (e) => {
      e.preventDefault();
      onSave(formData);
    };

    return (
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
        <input
          type="text"
          placeholder="Full Name"
          value={formData.full_name}
          onChange={(e) => updateFormField('full_name', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md"
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => updateFormField('email', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md"
          required
        />
        <input
          type="text"
          placeholder="Username"
          value={formData.username}
          onChange={(e) => updateFormField('username', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md"
          required
        />
        <select
          value={formData.role}
          onChange={(e) => updateFormField('role', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="viewer">Viewer</option>
          <option value="analyst">Analyst</option>
          <option value="compliance_officer">Compliance Officer</option>
          <option value="admin">Admin</option>
        </select>
        <input
          type="text"
          placeholder="Organization"
          value={formData.organization}
          onChange={(e) => updateFormField('organization', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md"
        />
        <input
          type="text"
          placeholder="Department"
          value={formData.department}
          onChange={(e) => updateFormField('department', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md"
        />
        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => updateFormField('is_active', e.target.checked)}
              className="rounded border-gray-300 mr-2"
            />
            Active
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_superuser}
              onChange={(e) => updateFormField('is_superuser', e.target.checked)}
              className="rounded border-gray-300 mr-2"
            />
            Superuser
          </label>
        </div>
        <div className="flex space-x-2">
          <button
            type="submit"
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Save Changes
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  });

  // User Details Modal Component
  const UserDetailsModal = ({ userActivity, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl max-h-screen overflow-y-auto m-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">User Activity: {userActivity.user.full_name}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* User Info */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">User Information</h4>
            <div className="space-y-2 text-sm">
              <p><strong>Email:</strong> {userActivity.user.email}</p>
              <p><strong>Username:</strong> {userActivity.user.username}</p>
              <p><strong>Role:</strong> {userActivity.user.role}</p>
              <p><strong>Organization:</strong> {userActivity.user.organization || 'N/A'}</p>
              <p><strong>Department:</strong> {userActivity.user.department || 'N/A'}</p>
              <p><strong>Created:</strong> {new Date(userActivity.user.created_at).toLocaleString()}</p>
              <p><strong>Last Login:</strong> {userActivity.user.last_login ? new Date(userActivity.user.last_login).toLocaleString() : 'Never'}</p>
            </div>
          </div>

          {/* Recent Searches */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Recent Searches</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {userActivity.recent_searches.length > 0 ? (
                userActivity.recent_searches.map((search) => (
                  <div key={search.id} className="p-2 bg-gray-50 rounded text-sm">
                    <div className="font-medium">{search.query}</div>
                    <div className="text-gray-500">
                      {search.results_count} results • {search.risk_level} risk • {new Date(search.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No recent searches</p>
              )}
            </div>
          </div>
        </div>

        {/* Audit Logs */}
        <div className="mt-6">
          <h4 className="text-lg font-semibold mb-4">Recent Activity</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {userActivity.audit_logs.length > 0 ? (
              userActivity.audit_logs.map((log) => (
                <div key={log.id} className="p-2 bg-gray-50 rounded text-sm">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      log.action.includes('FAILED') ? 'bg-red-100 text-red-800' :
                      log.action.includes('SUCCESS') || log.action.includes('CREATE') ? 'bg-green-100 text-green-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {log.action}
                    </span>
                    <span className="text-gray-500">{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                  {log.ip_address && (
                    <div className="text-gray-400 mt-1">IP: {log.ip_address}</div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-gray-500">No activity logs</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Profile Management View
  const ProfileView = () => {
    const [isEditing, setIsEditing] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [isLoadingProfile, setIsLoadingProfile] = useState(false);
    const [currentUser, setCurrentUser] = useState(user); // Local copy of user data
    const [profileForm, setProfileForm] = useState({
      full_name: user?.full_name || '',
      organization: user?.organization || '',
      department: user?.department || ''
    });
    const [passwordForm, setPasswordForm] = useState({
      old_password: '',
      new_password: '',
      confirm_password: ''
    });

    // Load current user info when component mounts
    useEffect(() => {
      const loadCurrentUser = async () => {
        setIsLoadingProfile(true);
        try {
          const token = localStorage.getItem('access_token');
          const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (response.ok) {
            const userData = await response.json();
            setCurrentUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
            
            // Update profile form with loaded data
            setProfileForm({
              full_name: userData.full_name || '',
              organization: userData.organization || '',
              department: userData.department || ''
            });
          }
        } catch (error) {
          console.error('Failed to load current user:', error);
        } finally {
          setIsLoadingProfile(false);
        }
      };

      // Only load once when component mounts
      loadCurrentUser();
    }, []);  // Empty dependency array - only run once

    const updateProfile = async (e) => {
      e.preventDefault();
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/profile`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(profileForm)
        });

        if (response.ok) {
          const updatedUser = await response.json();
          setCurrentUser(updatedUser);
          setUser(updatedUser); // Also update parent state
          localStorage.setItem('user', JSON.stringify(updatedUser));
          setIsEditing(false);
          alert('Profile updated successfully');
        } else {
          throw new Error('Failed to update profile');
        }
      } catch (error) {
        alert(error.message);
      }
    };

    const changePassword = async (e) => {
      e.preventDefault();
      
      if (passwordForm.new_password !== passwordForm.confirm_password) {
        alert('New passwords do not match');
        return;
      }

      if (passwordForm.new_password.length < 6) {
        alert('Password must be at least 6 characters long');
        return;
      }

      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/change-password`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            old_password: passwordForm.old_password,
            new_password: passwordForm.new_password
          })
        });

        if (response.ok) {
          setIsChangingPassword(false);
          setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
          alert('Password changed successfully');
        } else {
          const error = await response.json();
          throw new Error(error.detail || 'Failed to change password');
        }
      } catch (error) {
        alert(error.message);
      }
    };

    if (isLoadingProfile) {
      return (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-green-600 to-green-800 rounded-lg p-6 text-white">
            <h2 className="text-2xl font-bold mb-2">My Profile</h2>
            <p className="text-green-100">Loading your profile information...</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-800 rounded-lg p-6 text-white">
          <h2 className="text-2xl font-bold mb-2">My Profile</h2>
          <p className="text-green-100">Manage your account information and settings</p>
        </div>

        {/* Profile Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Profile Information</h3>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </button>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={updateProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={profileForm.full_name}
                    onChange={(e) => setProfileForm({...profileForm, full_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Organization</label>
                  <input
                    type="text"
                    value={profileForm.organization}
                    onChange={(e) => setProfileForm({...profileForm, organization: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                  <input
                    type="text"
                    value={profileForm.department}
                    onChange={(e) => setProfileForm({...profileForm, department: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex space-x-2 pt-4">
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setProfileForm({
                      full_name: currentUser?.full_name || '',
                      organization: currentUser?.organization || '',
                      department: currentUser?.department || ''
                    });
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Full Name</label>
                  <p className="text-lg text-gray-900">{currentUser?.full_name || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Email</label>
                  <p className="text-lg text-gray-900">{currentUser?.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Username</label>
                  <p className="text-lg text-gray-900">@{currentUser?.username}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Role</label>
                  <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${
                    currentUser?.role === 'admin' ? 'bg-red-100 text-red-800' :
                    currentUser?.role === 'compliance_officer' ? 'bg-purple-100 text-purple-800' :
                    currentUser?.role === 'analyst' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {currentUser?.role?.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Organization</label>
                  <p className="text-lg text-gray-900">{currentUser?.organization || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Department</label>
                  <p className="text-lg text-gray-900">{currentUser?.department || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Account Status</label>
                  <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${
                    currentUser?.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {currentUser?.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Member Since</label>
                  <p className="text-lg text-gray-900">
                    {currentUser?.created_at ? new Date(currentUser.created_at).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Last Login</label>
                  <p className="text-lg text-gray-900">
                    {currentUser?.last_login ? new Date(currentUser.last_login).toLocaleString() : 'Never'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Password Change */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Security</h3>
            {!isChangingPassword && (
              <button
                onClick={() => setIsChangingPassword(true)}
                className="flex items-center px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
              >
                <Key className="h-4 w-4 mr-2" />
                Change Password
              </button>
            )}
          </div>

          {isChangingPassword ? (
            <form onSubmit={changePassword} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                  <input
                    type="password"
                    value={passwordForm.old_password}
                    onChange={(e) => setPasswordForm({...passwordForm, old_password: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                  <input
                    type="password"
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({...passwordForm, new_password: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
                    minLength="6"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm({...passwordForm, confirm_password: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
                    minLength="6"
                    required
                  />
                </div>
              </div>
              <div className="flex space-x-2 pt-4">
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Change Password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsChangingPassword(false);
                    setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600">Keep your account secure by regularly updating your password.</p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-yellow-800 mb-2">Password Security Tips</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Use at least 8 characters with a mix of letters, numbers, and symbols</li>
                  <li>• Avoid using personal information or common words</li>
                  <li>• Don't reuse passwords from other accounts</li>
                  <li>• Consider using a password manager</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const AuditView = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Audit Logs</h2>
      <div className="space-y-4">
        {auditLogs.map((log) => (
          <div key={log.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    log.action.includes('FAILED') ? 'bg-red-100 text-red-800' :
                    log.action.includes('SUCCESS') || log.action.includes('CREATE') ? 'bg-green-100 text-green-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {log.action}
                  </span>
                  <span className="text-sm text-gray-500">{log.user_email || 'System'}</span>
                </div>
                <div className="flex items-center space-x-4 text-xs text-gray-400">
                  <span>{new Date(log.timestamp).toLocaleString()}</span>
                  {log.ip_address && <span>IP: {log.ip_address}</span>}
                </div>
              </div>
            </div>
          </div>
        ))}
        {auditLogs.length === 0 && (
          <p className="text-gray-500 text-center py-8">No audit logs found</p>
        )}
      </div>
    </div>
  );

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('access_token');
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Search className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">SanctionsGuard Pro</h1>
                <p className="text-sm text-gray-600">Professional Sanctions Screening Platform</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-right">
                <div className="text-gray-900 font-medium">{user?.full_name || user?.username || 'User'}</div>
                <div className="text-gray-500 capitalize">{user?.role?.replace('_', ' ') || 'viewer'}</div>
              </div>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700 focus:outline-none p-2 rounded-md hover:bg-gray-100"
                title="Logout"
              >
                <UserIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Globe },
              { id: 'search', label: 'Sanctions & PEP Screening', icon: Search },
              { id: 'batch', label: 'Batch Upload', icon: Upload },
              { id: 'entities', label: 'Sanctioned Entities', icon: Building2 },
              { id: 'history', label: 'Search History', icon: History },
              { id: 'reports', label: 'Reports', icon: BarChart3 },
              { id: 'profile', label: 'Profile', icon: UserIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-4 text-sm font-medium border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
            {isAdmin && (
              <>
                <button
                  onClick={() => setActiveTab('users')}
                  className={`flex items-center gap-2 px-3 py-4 text-sm font-medium border-b-2 ${
                    activeTab === 'users'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <Users className="h-4 w-4" />
                  Users
                </button>
                <button
                  onClick={() => setActiveTab('audit')}
                  className={`flex items-center gap-2 px-3 py-4 text-sm font-medium border-b-2 ${
                    activeTab === 'audit'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <Eye className="h-4 w-4" />
                  Audit Logs
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'search' && <SearchView />}
        {activeTab === 'batch' && <BatchUpload />}
        {activeTab === 'entities' && <EntityManagement />}
        {activeTab === 'history' && <HistoryView />}
        {activeTab === 'reports' && <ReportsView />}
        {activeTab === 'profile' && <ProfileView />}
        {activeTab === 'users' && isAdmin && <StandaloneUserManagement />}
        {activeTab === 'audit' && isAdmin && <AuditView />}
      </main>

      {/* Notes Modal */}
      <NotesModal />
      
      {/* Unstar Confirmation Modal */}
      {confirmUnstar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2 rounded-full">
                <X className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Remove Starred Entity</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700">
                Are you sure you want to unstar <strong>"{confirmUnstar.entity_name}"</strong>? 
                This will remove it from your starred entities list and any associated compliance notes.
              </p>
              <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                <div>From search: "{confirmUnstar.search_context.query}"</div>
                <div>Starred: {formatDate(confirmUnstar.starred_at)}</div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmUnstar(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => unstarEntityFromReports(confirmUnstar)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Remove Star
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Generic Confirmation Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-full ${
                confirmDialog.variant === 'danger' ? 'bg-red-100' : 'bg-blue-100'
              }`}>
                <AlertCircle className={`h-6 w-6 ${
                  confirmDialog.variant === 'danger' ? 'text-red-600' : 'text-blue-600'
                }`} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{confirmDialog.title}</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700">{confirmDialog.message}</p>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className={`px-4 py-2 text-white rounded transition-colors ${
                  confirmDialog.variant === 'danger' 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main App Component with Authentication
const App = () => {
  const token = localStorage.getItem('access_token');
  const isAuthenticated = !!token;

  return isAuthenticated ? <MainApp /> : <LoginForm />;
};

export default App;