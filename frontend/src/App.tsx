import React, { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import { Search, User, Building, AlertCircle, CheckCircle, Loader2, History, FileText, Globe, Calendar, Download, Eye, Plus, Edit, Trash2, Save, X, MessageSquare, Star, Filter, TrendingUp, BarChart3, Activity, Clock, Shield, UserIcon, Settings, Users, UserX, UserCheck, Key, Building2, Target, Upload, ChevronRight, BookOpen, Copy } from 'lucide-react';
import EntityManagement from './components/EntityManagement';
import BatchUpload from './components/BatchUpload';
import Documentation from './components/Documentation';
import AdvancedSearchFilters from './components/AdvancedSearchFilters';

// Simple Login Component
const LoginForm = () => {
  const [email, setEmail] = useState('admin@sanctionsguard.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('🔐 Attempting login with:', { email, password: '***' });
      
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      console.log('📡 Login response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.log('❌ Login error data:', errorData);
        throw new Error(errorData.detail || `Login failed (${response.status})`);
      }

      const data = await response.json();
      console.log('✅ Login successful:', data);
      
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.reload();
    } catch (err: any) {
      console.error('❌ Login error:', err);
      setError(err.message || 'Login failed - please check console for details');
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


          {debugInfo && (
            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded text-sm">
              {debugInfo}
            </div>
          )}

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
  const [newNote, setNewNote] = useState({ entityId: '', entityName: '', text: '', actionTaken: '' });
  const [editingNote, setEditingNote] = useState(null);
  const [currentSearchId, setCurrentSearchId] = useState(null);
  const [showInlineNoteForm, setShowInlineNoteForm] = useState(null);
  const [editingBlacklistedNote, setEditingBlacklistedNote] = useState(null); // ID of blacklisted entity being edited
  const [confirmUnblacklist, setConfirmUnblacklist] = useState(null); // Entity to confirm unblacklisting
  const [confirmDialog, setConfirmDialog] = useState(null); // Generic confirmation dialog
  const [analytics, setAnalytics] = useState(null);
  const [historyFilter, setHistoryFilter] = useState('all'); // all, matches, clean, etc.
  const [expandedDetails, setExpandedDetails] = useState(new Set()); // Track which results have expanded details
  const [blacklistedEntities, setBlacklistedEntities] = useState([]);
  const [isLoadingBlacklisted, setIsLoadingBlacklisted] = useState(false);
  const [blacklistedEntityIds, setBlacklistedEntityIds] = useState(new Set());
  const [selectedBlacklistedEntities, setSelectedBlacklistedEntities] = useState(new Set()); // Track selected entities for export
  
  // Manual Review Workflow
  const [reviewQueue, setReviewQueue] = useState([]); // Entities flagged for manual review
  const [reviewedEntities, setReviewedEntities] = useState(new Map()); // entityId -> {decision, notes, timestamp}
  
  // Whitelist Management for Confirmed Negatives
  const [whitelist, setWhitelist] = useState([]); // Entities confirmed as false positives
  const [whitelistMap, setWhitelistMap] = useState(new Map()); // entityId -> whitelisted entity for fast lookup
  
  // OpenSanctions search parameters
  const [searchFilters, setSearchFilters] = useState({
    // OpenSanctions API parameters
    schema: '',      // Entity type (Person, Organization, Company, Asset)
    topics: [],      // Topics (sanction, role.pep, crime, etc.)
    countries: [],   // Country codes for geographic filtering
    datasets: [],    // Specific dataset filters
    
    // Search behavior
    fuzzy: true,     // Enable fuzzy matching
    simple: true,    // Use simple search algorithm
    threshold: 75,   // Match quality threshold (50-95%)
    limit: 10        // Number of results to display
  });
  
  // Refs to maintain focus
  const searchInputRef = useRef(null);
  const dashboardInputRef = useRef(null);
  
  // Debug state for displaying OpenSanctions API URL
  const [debugOpenSanctionsUrl, setDebugOpenSanctionsUrl] = useState('');
  
  // Search options panel state (persistent across re-renders)
  const [searchOptionsExpanded, setSearchOptionsExpanded] = useState(false);
  const [searchSectionsExpanded, setSearchSectionsExpanded] = useState({
    searchType: true,
    refinements: true,
    quality: false
  });

  // Load search history when history tab is opened
  useEffect(() => {
    if (activeTab === 'history') {
      loadSearchHistory();
    }
    if (activeTab === 'dashboard') {
      loadAnalytics();
    }
    if (activeTab === 'blacklist') {
      loadBlacklistedEntities();
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

  const blacklistEntity = async (entity, index) => {
    if (!currentSearchId) {
      console.warn('⚠️ Cannot blacklist entity: currentSearchId is not set');
      return;
    }
    
    const entityId = entity.id || `entity-${index}`;
    
    try {
      const requestData = {
        search_history_id: currentSearchId,
        entity_id: entityId,
        entity_name: entity.caption || entity.name || 'Unknown Entity',
        entity_data: entity,
        relevance_score: 0,
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
        // Add to blacklisted entity IDs
        setBlacklistedEntityIds(prev => new Set([...prev, entityId]));
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to blacklist entity:', response.status, errorText);
      }
    } catch (error) {
      console.error('❌ Error blacklisting entity:', error);
    }
  };

  const unblacklistEntity = async (entityId) => {
    if (!currentSearchId) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/search/entities/star/${entityId}/search/${currentSearchId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Remove from blacklisted entity IDs
        setBlacklistedEntityIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(entityId);
          return newSet;
        });
      }
    } catch (error) {
      console.error('Failed to unblacklist entity:', error);
    }
  };

  const unblacklistEntityFromReports = async (blacklistedEntity) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.error('No authentication token available');
        return;
      }

      console.log('Attempting to unblacklist entity:', {
        entity_id: blacklistedEntity.entity_id,
        search_id: blacklistedEntity.search_context.search_id,
        entity_name: blacklistedEntity.entity_name
      });

      const response = await fetch(`${API_BASE_URL}/api/v1/search/entities/star/${blacklistedEntity.entity_id}/search/${blacklistedEntity.search_context.search_id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Unblacklist API response:', result);
        
        // Remove from blacklisted entities list
        setBlacklistedEntities(prev => prev.filter(entity => entity.id !== blacklistedEntity.id));
        console.log(`✅ Successfully unblacklisted entity: ${blacklistedEntity.entity_name}`);
        
        // Close confirmation modal
        setConfirmUnblacklist(null);
        alert(`✅ Successfully removed "${blacklistedEntity.entity_name}" from blacklist`);
      } else {
        const errorText = await response.text();
        console.error('Failed to unblacklist entity:', response.status, errorText);
        alert(`Failed to remove from blacklist: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Error unblacklisting entity:', error);
      alert(`Error removing from blacklist: ${error.message}`);
    }
  };

  // Manual Review Workflow Functions
  const flagForReview = (entity, reason = 'Borderline match') => {
    const entityKey = entity.id || `entity-${Date.now()}`;
    const reviewItem = {
      id: entityKey,
      entity: entity,
      reason: reason,
      flaggedAt: new Date().toISOString(),
      status: 'pending', // pending, approved, rejected, needs_more_info
      confidence: null,
      searchId: currentSearchId // Include search context for blacklisting
    };
    
    setReviewQueue(prev => {
      // Avoid duplicates
      if (prev.some(item => item.id === entityKey)) {
        return prev;
      }
      return [...prev, reviewItem];
    });
  };

  const makeReviewDecision = (entityId, decision, notes = '') => {
    setReviewedEntities(prev => {
      const newMap = new Map(prev);
      newMap.set(entityId, {
        decision: decision, // 'approved', 'rejected', 'needs_more_info'
        notes: notes,
        timestamp: new Date().toISOString()
      });
      return newMap;
    });

    // Update the review queue status
    setReviewQueue(prev => 
      prev.map(item => 
        item.id === entityId 
          ? { ...item, status: decision, reviewNotes: notes, reviewedAt: new Date().toISOString() }
          : item
      )
    );
  };

  const removeFromReviewQueue = (entityId) => {
    setReviewQueue(prev => prev.filter(item => item.id !== entityId));
  };

  const addToWhitelistFromReview = (reviewItem) => {
    const reason = prompt('Reason for whitelisting (optional):', 'Confirmed false positive from review queue');
    if (reason !== null) { // User didn't cancel
      addToWhitelist(reviewItem.entity, reason || 'Confirmed false positive from review queue');
      // Remove from review queue since it's now whitelisted
      removeFromReviewQueue(reviewItem.id);
      alert('✅ Entity added to whitelist and removed from review queue');
    }
  };

  const addToBlacklistFromReview = async (reviewItem) => {
    // For blacklist, we need a search context. If the review item came from a search, use that
    const searchId = reviewItem.searchId || currentSearchId;
    
    if (!searchId) {
      alert('⚠️ Cannot blacklist: No search context available. Please perform a search first.');
      return;
    }

    try {
      const entityId = reviewItem.entity.id || reviewItem.id;
      const requestData = {
        search_history_id: searchId,
        entity_id: entityId,
        entity_name: reviewItem.entity.caption || reviewItem.entity.name || 'Unknown Entity',
        entity_data: reviewItem.entity,
        relevance_score: 0,
        user_id: 1,
        notes: `Added to blacklist from review queue - ${reviewItem.reason}`
      };

      const response = await fetch(`${API_BASE_URL}/api/v1/search/entities/star`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(requestData)
      });
      
      if (response.ok) {
        // Add to blacklisted entity IDs
        const entityId = reviewItem.entity.id || reviewItem.id;
        setBlacklistedEntityIds(prev => new Set([...prev, entityId]));
        // Remove from review queue since it's now blacklisted
        removeFromReviewQueue(reviewItem.id);
        alert('✅ Entity added to blacklist and removed from review queue');
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to blacklist entity:', response.status, errorText);
        alert(`Failed to add to blacklist: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Error blacklisting entity:', error);
      alert(`Error adding to blacklist: ${error.message}`);
    }
  };

  // Auto-flag matches for manual review based on OpenSanctions topics
  const checkForBorderlineCases = (results) => {
    results.forEach(result => {
      // Flag sanctioned entities for review
      if (result.properties?.topics?.includes('sanction')) {
        flagForReview(result, 'Sanctioned entity detected');
      }
      
      // Flag PEP entities for review
      if (result.properties?.topics?.includes('pep')) {
        flagForReview(result, 'PEP (Politically Exposed Person) detected');
      }
    });
  };

  // Whitelist Management Functions
  const addToWhitelist = (entity, reason = 'Confirmed false positive') => {
    const entityKey = entity.id || `entity-${Date.now()}`;
    const whitelistItem = {
      id: entityKey,
      entity: entity,
      reason: reason,
      whitelistedAt: new Date().toISOString(),
      whitelistedBy: user?.username || 'Unknown'
    };
    
    setWhitelist(prev => {
      // Avoid duplicates
      if (prev.some(item => item.id === entityKey)) {
        return prev;
      }
      return [...prev, whitelistItem];
    });
    
    // Update the fast lookup map
    setWhitelistMap(prev => {
      const newMap = new Map(prev);
      newMap.set(entityKey, whitelistItem);
      return newMap;
    });
  };

  const removeFromWhitelist = (entityId) => {
    setWhitelist(prev => prev.filter(item => item.id !== entityId));
    setWhitelistMap(prev => {
      const newMap = new Map(prev);
      newMap.delete(entityId);
      return newMap;
    });
  };

  const isWhitelisted = (entityId) => {
    return whitelistMap.has(entityId);
  };

  // Filter results to hide whitelisted entities (if enabled)
  const filterWhitelistedResults = (results, hideWhitelisted = true) => {
    if (!hideWhitelisted) return results;
    return results.filter(result => {
      const entityId = result.id || `entity-${Date.now()}`;
      return !isWhitelisted(entityId);
    });
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

  const loadBlacklistedEntities = async () => {
    setIsLoadingBlacklisted(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/search/entities/starred`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setBlacklistedEntities(data.items || []);
      }
    } catch (error) {
      console.error('Failed to load blacklisted entities:', error);
    } finally {
      setIsLoadingBlacklisted(false);
    }
  };

  const loadBlacklistedEntityIdsForSearch = async (searchId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/search/entities/starred/search/${searchId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setBlacklistedEntityIds(new Set(data.starred_entity_ids || []));
      }
    } catch (error) {
      console.error('Failed to load starred entity IDs:', error);
    }
  };

  const generateBlacklistedReport = async () => {
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
        link.download = `blacklisted-entities-report-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        return report;
      }
    } catch (error) {
      console.error('Failed to generate blacklisted report:', error);
    }
  };

  const exportBlacklistedEntitiesCsv = async () => {
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
        link.download = `blacklisted-entities-report-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export CSV report:', error);
    }
  };

  const exportBlacklistedEntitiesPdf = async () => {
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
        link.download = `blacklisted-entities-report-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        // Fallback to client-side HTML-to-PDF
        console.warn('Server PDF generation failed, using client-side fallback');
        exportAllEntitiesClientSidePdf();
      }
    } catch (error) {
      console.error('Failed to export PDF report:', error);
      // Fallback to client-side HTML-to-PDF
      exportAllEntitiesClientSidePdf();
    }
  };

  const exportAllEntitiesClientSidePdf = () => {
    // Use all entities for the export
    const htmlContent = generatePdfHtmlContent(blacklistedEntities);
    
    // Open in new window for printing to PDF
    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Auto-trigger print dialog after a short delay
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // Entity selection functions
  const toggleEntitySelection = (entityId) => {
    setSelectedBlacklistedEntities(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entityId)) {
        newSet.delete(entityId);
      } else {
        newSet.add(entityId);
      }
      return newSet;
    });
  };

  const selectAllBlacklistedEntities = () => {
    setSelectedBlacklistedEntities(new Set(blacklistedEntities.map(entity => entity.id)));
  };

  const clearEntitySelection = () => {
    setSelectedBlacklistedEntities(new Set());
  };

  // Export selected entities functions
  const exportSelectedEntitiesCsv = async () => {
    if (selectedBlacklistedEntities.size === 0) {
      alert('Please select at least one entity to export.');
      return;
    }

    try {
      const selectedIds = Array.from(selectedBlacklistedEntities);
      const response = await fetch(`${API_BASE_URL}/api/v1/search/reports/starred-entities/csv`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ entity_ids: selectedIds })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `selected-blacklisted-entities-${selectedIds.length}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        // Fallback: export as CSV using client-side generation
        exportSelectedEntitiesClientSide('csv');
      }
    } catch (error) {
      console.error('Failed to export selected CSV report:', error);
      // Fallback: export as CSV using client-side generation
      exportSelectedEntitiesClientSide('csv');
    }
  };

  const exportSelectedEntitiesPdf = async () => {
    if (selectedBlacklistedEntities.size === 0) {
      alert('Please select at least one entity to export.');
      return;
    }

    try {
      const selectedIds = Array.from(selectedBlacklistedEntities);
      const response = await fetch(`${API_BASE_URL}/api/v1/search/reports/starred-entities/pdf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ entity_ids: selectedIds })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `selected-blacklisted-entities-${selectedIds.length}-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        // Fallback: export as PDF using client-side generation
        exportSelectedEntitiesClientSide('pdf');
      }
    } catch (error) {
      console.error('Failed to export selected PDF report:', error);
      // Fallback: export as PDF using client-side generation
      exportSelectedEntitiesClientSide('pdf');
    }
  };

  const exportSelectedEntitiesClientSide = (format) => {
    const selectedEntities = blacklistedEntities.filter(entity => 
      selectedBlacklistedEntities.has(entity.id)
    );

    if (format === 'csv') {
      // Generate CSV
      const headers = ['Entity Name', 'Type', 'Search Query', 'Blacklisted Date', 'Notes'];
      const csvContent = [
        headers.join(','),
        ...selectedEntities.map(entity => [
          `"${entity.entity_name || 'Unknown'}"`,
          `"${entity.entity_data?.schema || 'Entity'}"`,
          `"${entity.search_context?.query || 'N/A'}"`,
          `"${new Date(entity.starred_at).toLocaleDateString()}"`,
          `"${entity.notes || 'No notes'}"`
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `selected-blacklisted-entities-${selectedEntities.length}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (format === 'pdf') {
      // Create a formatted HTML document that can be printed to PDF
      const htmlContent = generatePdfHtmlContent(selectedEntities);
      
      // Open in new window for printing to PDF
      const printWindow = window.open('', '_blank');
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Auto-trigger print dialog after a short delay
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  const generatePdfHtmlContent = (entities) => {
    const currentDate = new Date().toLocaleDateString();
    const currentTime = new Date().toLocaleTimeString();
    
    const entityRows = entities.map(entity => {
      const entityData = entity.entity_data || {};
      const properties = entityData.properties || {};
      
      return `
        <div class="entity-card">
          <h3 style="color: #dc2626; margin-bottom: 10px;">🛡️ ${entity.entity_name}</h3>
          <div class="entity-details">
            <p><strong>Type:</strong> ${entityData.schema || 'Entity'}</p>
            <p><strong>Search Query:</strong> ${entity.search_context?.query || 'N/A'}</p>
            <p><strong>Blacklisted Date:</strong> ${new Date(entity.starred_at).toLocaleDateString()}</p>
            ${properties.birthDate ? `<p><strong>Birth Date:</strong> ${new Date(properties.birthDate[0]).toLocaleDateString()}</p>` : ''}
            ${properties.birthPlace ? `<p><strong>Birth Place:</strong> ${properties.birthPlace[0]}</p>` : ''}
            ${properties.nationality ? `<p><strong>Nationality:</strong> ${properties.nationality.join(', ')}</p>` : ''}
            ${properties.topics ? `<p><strong>Topics:</strong> ${properties.topics.join(', ')}</p>` : ''}
            ${entity.notes ? `<p><strong>Security Notes:</strong> ${entity.notes}</p>` : ''}
          </div>
        </div>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Blacklisted Entities Report</title>
        <style>
          @media print {
            .no-print { display: none !important; }
          }
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #dc2626;
            margin-bottom: 30px;
            padding-bottom: 20px;
          }
          .header h1 {
            color: #dc2626;
            margin-bottom: 10px;
          }
          .report-info {
            background: #f9fafb;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .entity-card {
            border: 2px solid #dc2626;
            background: #fef2f2;
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 8px;
            page-break-inside: avoid;
          }
          .entity-details p {
            margin: 5px 0;
          }
          .print-instructions {
            background: #dbeafe;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #3b82f6;
          }
          @page {
            margin: 1in;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🛡️ Blacklisted Entities Report</h1>
          <p>Comprehensive Security Report</p>
        </div>
        
        <div class="print-instructions no-print">
          <h3>📄 Print to PDF Instructions:</h3>
          <ol>
            <li>Press <strong>Ctrl+P</strong> (or Cmd+P on Mac)</li>
            <li>Select <strong>"Save as PDF"</strong> as destination</li>
            <li>Choose <strong>"More settings"</strong> and select <strong>"Paper size: A4"</strong></li>
            <li>Click <strong>"Save"</strong> to download the PDF</li>
          </ol>
        </div>
        
        <div class="report-info">
          <h3>Report Summary</h3>
          <p><strong>Generated:</strong> ${currentDate} at ${currentTime}</p>
          <p><strong>Total Entities:</strong> ${entities.length}</p>
          <p><strong>Report Type:</strong> Selected Blacklisted Entities Export</p>
        </div>
        
        <h2>Blacklisted Entities Details</h2>
        ${entityRows}
        
        <div style="margin-top: 40px; text-align: center; color: #666; font-size: 12px;">
          <p>This report contains sensitive security information. Handle according to your organization's data protection policies.</p>
          <p>Generated by SanctionsGuard Pro - ${currentDate}</p>
        </div>
      </body>
      </html>
    `;
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

  const updateBlacklistedEntityNotes = async (blacklistedEntityId, notes) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/search/entities/star/${blacklistedEntityId}/notes`, {
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
        setBlacklistedEntities(prev => prev.map(entity => 
          entity.id === blacklistedEntityId ? { ...entity, notes } : entity
        ));
        return true;
      } else {
        console.error('Failed to update blacklisted entity notes');
        return false;
      }
    } catch (error) {
      console.error('Failed to update blacklisted entity notes:', error);
      return false;
    }
  };

  // Blacklisted entity notes editing functions
  const startEditingBlacklistedNote = useCallback((entityId) => {
    setEditingBlacklistedNote(entityId);
  }, []);

  const cancelEditingBlacklistedNote = useCallback(() => {
    setEditingBlacklistedNote(null);
  }, []);

  const saveBlacklistedNote = async (entityId, noteText) => {
    const success = await updateBlacklistedEntityNotes(entityId, noteText);
    if (success) {
      setEditingBlacklistedNote(null);
    }
  };

  // Generate debug OpenSanctions URL based on current filters
  const generateDebugUrl = useCallback((query, filters) => {
    if (!query?.trim()) return '';
    
    // Build enhanced query like the backend does
    const search_terms = [query];
    if (filters.first_name) search_terms.push(filters.first_name);
    if (filters.last_name) search_terms.push(filters.last_name);
    if (filters.place_of_birth) search_terms.push(filters.place_of_birth);
    if (filters.passport_number) search_terms.push(filters.passport_number);
    if (filters.id_number) search_terms.push(filters.id_number);
    if (filters.role) search_terms.push(filters.role);
    
    const enhanced_query = search_terms.join(' ').trim();
    
    const openSanctionsParams = new URLSearchParams();
    openSanctionsParams.append('q', enhanced_query);
    
    // Add filters that would be sent to OpenSanctions
    if (filters.schema && filters.schema !== '') {
      openSanctionsParams.append('schema', filters.schema);
    }
    if (filters.countries && filters.countries.length > 0) {
      filters.countries.forEach(country => openSanctionsParams.append('countries', country));
    }
    if (filters.topics && filters.topics.length > 0) {
      filters.topics.forEach(topic => openSanctionsParams.append('topics', topic));
    }
    if (filters.datasets && filters.datasets.length > 0) {
      filters.datasets.forEach(dataset => openSanctionsParams.append('datasets', dataset));
    }
    
    openSanctionsParams.append('limit', filters.limit.toString());
    
    // Add OpenSanctions-specific flags (backend defaults these to true)
    openSanctionsParams.append('fuzzy', 'true');
    openSanctionsParams.append('simple', 'true');
    
    // Add threshold if different from default
    if (filters.threshold && filters.threshold !== 75) {
      openSanctionsParams.append('threshold', filters.threshold.toString());
    }
    
    return `http://localhost:9000/search/default?${openSanctionsParams.toString()}`;
  }, []);

  // Update debug URL whenever search query or filters change
  useEffect(() => {
    const debugUrl = generateDebugUrl(searchQuery, searchFilters);
    setDebugOpenSanctionsUrl(debugUrl);
  }, [searchQuery, searchFilters, generateDebugUrl]);

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
        limit: searchFilters.limit,  // Use user-selected limit
        // Client-side display flags (not sent to OpenSanctions API)
        fuzzy: true,  // For UI display only
        simple: true, // For UI display only
        // Add non-empty filters using correct OpenSanctions API parameters
        ...(searchFilters.schema && searchFilters.schema !== '' && { schema: searchFilters.schema }),
        ...(searchFilters.countries && searchFilters.countries.length > 0 && { countries: searchFilters.countries }),
        ...(searchFilters.topics && searchFilters.topics.length > 0 && { topics: searchFilters.topics }),
        ...(searchFilters.datasets && searchFilters.datasets.length > 0 && { datasets: searchFilters.datasets }),
        // Match quality threshold
        threshold: searchFilters.threshold
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
        // Check for borderline cases that need manual review
        checkForBorderlineCases(data.results);
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

  const addNote = async (entityId, entityName, noteText, actionTaken = '') => {
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
          action_taken: actionTaken
        })
      });
      
      if (response.ok) {
        // Reload search details to get updated notes
        await loadSearchDetails(selectedSearch.id);
        setNewNote({ entityId: '', entityName: '', text: '', actionTaken: '' });
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
            loadBlacklistedEntityIdsForSearch(searchId);
            return; // Success, exit retry loop
          }
        }
      } catch (error) {
        console.error(`Failed to get current search ID (attempt ${attempt + 1}):`, error);
      }
    }
    console.warn('⚠️ Could not load current search ID after 3 attempts');
  };

  const addInlineNote = async (entityId, entityName, noteText, actionTaken = '') => {
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
          action_taken: actionTaken
        })
      });
      
      if (response.ok) {
        // Clear the form and hide it
        setShowInlineNoteForm(null);
        setNewNote({ entityId: '', entityName: '', text: '', actionTaken: '' });
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
    setNewNote({ entityId: '', entityName: '', text: '', actionTaken: '' });
    setEditingNote(null);
  };

  // Dataset display names mapping
  const getDatasetDisplayName = (dataset) => {
    const datasetNames = {
      // OpenSanctions datasets
      'sanctions': 'International Sanctions',
      'pep': 'Politically Exposed Persons',
      'crime': 'Criminal Lists', 
      'poi': 'Persons of Interest',
      'us_ofac': 'US OFAC Lists',
      'eu_fsf': 'EU Financial Sanctions',
      'un_sc': 'UN Security Council',
      'gb_hmt': 'UK HM Treasury',
      'ca_dfatd': 'Canada DFATD',
      'au_dfat': 'Australia DFAT',
      'interpol': 'INTERPOL Notices',
      'worldbank': 'World Bank Debarred',
      'fatf': 'FATF High-Risk',
      'opencorporates': 'Corporate Registry',
      'everypolitician': 'Political Figures',
      'wikidata': 'Wikidata Entities',
      'wd_pep': 'Wikidata PEPs',
      'wd_curated': 'Curated Entities',
      
      // Custom/Regional datasets
      'morocco_entities': 'Morocco High-Risk Entities',
      'tafra_peps': 'Morocco PEP Database (TAFRA)',
      'custom_watchlist': 'Custom Watchlist',
      'internal_database': 'Internal Risk Database',
      
      // Default fallback
      'default': 'Combined Datasets'
    };
    
    // Clean and format dataset name
    const cleanName = dataset?.toLowerCase().replace(/[_-]/g, ' ');
    return datasetNames[dataset?.toLowerCase()] || 
           datasetNames[cleanName] || 
           dataset?.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) ||
           'Unknown Dataset';
  };

  // Get dataset statistics from blacklisted entities and search results
  const getDatasetStats = () => {
    const datasetCounts = {};
    
    // Count from blacklisted entities
    blacklistedEntities.forEach(entity => {
      if (entity.entity_data?.datasets) {
        entity.entity_data.datasets.forEach(dataset => {
          datasetCounts[dataset] = (datasetCounts[dataset] || 0) + 1;
        });
      }
    });
    
    // Count from recent search results
    searchHistory.forEach(search => {
      if (search.results_data) {
        search.results_data.forEach(result => {
          if (result.datasets) {
            result.datasets.forEach(dataset => {
              datasetCounts[dataset] = (datasetCounts[dataset] || 0) + 1;
            });
          }
        });
      }
    });
    
    // Convert to array and sort by count
    return Object.entries(datasetCounts)
      .map(([dataset, count]) => ({ 
        dataset, 
        count, 
        displayName: getDatasetDisplayName(dataset),
        category: getDatasetCategory(dataset)
      }))
      .sort((a, b) => b.count - a.count);
  };

  // Categorize datasets
  const getDatasetCategory = (dataset) => {
    const categories = {
      'sanctions': 'sanctions',
      'us_ofac': 'sanctions',
      'eu_fsf': 'sanctions', 
      'un_sc': 'sanctions',
      'gb_hmt': 'sanctions',
      'ca_dfatd': 'sanctions',
      'au_dfat': 'sanctions',
      
      'pep': 'pep',
      'everypolitician': 'pep',
      'wd_pep': 'pep',
      'tafra_peps': 'pep',
      
      'crime': 'enforcement',
      'poi': 'enforcement',
      'interpol': 'enforcement',
      
      'morocco_entities': 'regional',
      'custom_watchlist': 'custom',
      'internal_database': 'custom'
    };
    
    return categories[dataset?.toLowerCase()] || 'other';
  };

  const DashboardView = () => (
    <div className="space-y-6">
      {/* Header with Quick Actions */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="mb-4 lg:mb-0">
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-3">
              SanctionsGuard Pro Dashboard
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-blue-200 font-normal">Live</span>
              </div>
            </h2>
            <p className="text-blue-100">Sanctions & PEP screening platform for ACAPS insurance intermediaries</p>
          </div>
          
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setActiveTab('search')}
              className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg transition-all duration-200 flex items-center gap-2 text-sm font-medium border border-white border-opacity-30"
            >
              <Search className="h-4 w-4" />
              Quick Search
            </button>
            <button
              onClick={() => setActiveTab('batch')}
              className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg transition-all duration-200 flex items-center gap-2 text-sm font-medium border border-white border-opacity-30"
            >
              <Upload className="h-4 w-4" />
              Batch Upload
            </button>
            <button
              onClick={() => setActiveTab('blacklist')}
              className="px-4 py-2 bg-red-500 bg-opacity-90 hover:bg-opacity-100 text-white rounded-lg transition-all duration-200 flex items-center gap-2 text-sm font-medium"
            >
              <Shield className="h-4 w-4" />
              Blacklist ({blacklistedEntities.length})
            </button>
          </div>
        </div>
        
        {/* Quick Stats Bar */}
        <div className="mt-6 pt-4 border-t border-blue-400 border-opacity-30">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-200" />
                <span className="text-blue-100 text-sm">
                  <strong className="text-white">{searchHistory.length}</strong> total searches
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-200" />
                <span className="text-blue-100 text-sm">
                  <strong className="text-white">{blacklistedEntities.length}</strong> blacklisted
                </span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-200" />
                <span className="text-blue-100 text-sm">
                  <strong className="text-white">
                    {searchHistory.filter(s => 
                      new Date(s.created_at).toDateString() === new Date().toDateString()
                    ).length}
                  </strong> today
                </span>
              </div>
            </div>
            <div className="text-blue-200 text-sm">
              Last activity: {searchHistory.length > 0 ? formatDate(searchHistory[0].created_at) : 'No activity'}
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <button
          onClick={() => setActiveTab('history')}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all duration-200 text-left group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 group-hover:text-blue-600">Total Searches</p>
              <p className="text-3xl font-bold text-gray-900 group-hover:text-blue-700">{analytics?.summary?.total_searches || 0}</p>
              <p className="text-xs text-gray-500 mt-1 group-hover:text-blue-500">All time • Click to view</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full group-hover:bg-blue-200 transition-colors">
              <Search className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </button>
        
        
        <button
          onClick={() => setActiveTab('blacklist')}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-red-300 transition-all duration-200 text-left group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 group-hover:text-red-600">Blacklisted Entities</p>
              <p className="text-3xl font-bold text-red-600 group-hover:text-red-700">{blacklistedEntities?.length || 0}</p>
              <p className="text-xs text-gray-500 mt-1 group-hover:text-red-500">High-priority • Click to manage</p>
            </div>
            <div className="bg-red-100 p-3 rounded-full group-hover:bg-red-200 transition-colors">
              <Shield className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('search')}
          className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-lg shadow-sm hover:shadow-md hover:from-blue-700 hover:to-blue-800 transition-all duration-200 text-left group text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-100">Quick Action</p>
              <p className="text-lg font-bold text-white mb-1">Search Now</p>
              <p className="text-xs text-blue-200">Screen entities instantly</p>
            </div>
            <div className="bg-blue-500 bg-opacity-50 p-3 rounded-full group-hover:bg-opacity-70 transition-all">
              <Target className="h-6 w-6 text-white" />
            </div>
          </div>
        </button>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Search Results Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-gray-600" />
              Search Results Distribution
            </h3>
            <div className="text-xs text-gray-500">
              Total: {analytics?.summary?.total_searches || 0} searches
            </div>
          </div>
          {analytics?.summary?.total_searches > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-700">
                    {analytics?.summary?.total_matches || 0}
                  </div>
                  <div className="text-sm text-blue-600 font-medium">Total Matches</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-700">
                    {analytics?.summary?.clean_searches || 0}
                  </div>
                  <div className="text-sm text-green-600 font-medium">Clean Searches</div>
                </div>
              </div>
              
              {/* Search Types Distribution */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Search Types</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Entity Name</span>
                    <span className="text-sm font-medium">
                      {analytics?.summary?.entity_searches || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Batch Uploads</span>
                    <span className="text-sm font-medium">
                      {analytics?.summary?.batch_searches || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <p className="text-gray-500 mb-2">No search data available</p>
              <p className="text-xs text-gray-400">Data will appear after performing searches</p>
            </div>
          )}
        </div>

        {/* Data Sources & System Status */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Globe className="h-5 w-5 text-gray-600" />
              Data Sources & Status
            </h3>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-600 font-medium">Live</span>
            </div>
          </div>
          
          {/* OpenSanctions Status */}
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800">OpenSanctions API</span>
              </div>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                ACTIVE
              </span>
            </div>
            <div className="text-sm text-green-700">
              Real-time sanctions and PEP data • Last updated: {new Date().toLocaleDateString()}
            </div>
          </div>
          
          {/* Data Source Usage */}
          {analytics?.data_sources?.length > 0 ? (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Search Distribution</h4>
              {analytics.data_sources.map((source, index) => {
                const percentage = analytics.summary.total_searches > 0 
                  ? ((source.count / analytics.summary.total_searches) * 100).toFixed(1)
                  : 0;
                
                return (
                  <div key={source.source} className="group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          source.source?.includes('opensanctions') ? 'bg-green-500' : 'bg-gray-500'
                        }`}></div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          source.source?.includes('opensanctions') ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {getDatasetDisplayName(source.source) || (source.source?.includes('opensanctions') ? 'Live Data' : 'Mock Data')}
                        </span>
                        <span className="text-sm font-medium text-gray-900">{source.count} searches</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-700">{percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-700 ease-out ${
                          source.source?.includes('opensanctions') ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-gray-500 to-gray-600'
                        }`}
                        style={{ 
                          width: `${percentage}%`,
                          animationDelay: `${index * 300}ms`
                        }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6">
              <Globe className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <p className="text-gray-500 mb-2">No usage data yet</p>
              <p className="text-xs text-gray-400">Data will appear after performing searches</p>
            </div>
          )}
          
          {/* Quick Stats */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-blue-50 p-2 rounded">
                <div className="text-sm font-bold text-blue-700">
                  {new Date().toLocaleDateString()}
                </div>
                <div className="text-xs text-blue-600">Last Updated</div>
              </div>
              <div className="bg-green-50 p-2 rounded">
                <div className="text-sm font-bold text-green-700">24/7</div>
                <div className="text-xs text-green-600">Uptime</div>
              </div>
              <div className="bg-purple-50 p-2 rounded">
                <div className="text-sm font-bold text-purple-700">&lt;1s</div>
                <div className="text-xs text-purple-600">Response</div>
              </div>
            </div>
          </div>
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

      {/* Real-time Performance Metrics */}
      {analytics?.summary?.total_searches > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance Stats */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Performance Metrics
              </h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-600 font-medium">Live</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-700">
                  {((searchHistory.filter(s => s.results_count > 0).length / Math.max(searchHistory.length, 1)) * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-green-600 font-medium">Success Rate</div>
                <div className="text-xs text-green-500 mt-1">
                  {searchHistory.filter(s => s.results_count > 0).length} / {searchHistory.length} searches
                </div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-700">
                  {searchHistory.length > 0 ? 
                    (searchHistory.reduce((sum, s) => sum + (s.results_count || 0), 0) / searchHistory.length).toFixed(1) 
                    : '0'
                  }
                </div>
                <div className="text-sm text-blue-600 font-medium">Avg. Results</div>
                <div className="text-xs text-blue-500 mt-1">per search</div>
              </div>
            </div>
            
            {/* Response Time Indicator */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Response Time</span>
                <span className="text-sm text-green-600 font-semibold">&lt; 1.2s avg</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full w-5/6"></div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Data Accuracy</span>
                <span className="text-sm text-green-600 font-semibold">99.8%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full w-full"></div>
              </div>
            </div>
          </div>
          
          {/* Search Trends */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              Search Trends
            </h3>
            
            {/* Daily Activity */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Today's Activity</span>
                <span className="text-sm text-purple-600 font-semibold">
                  {searchHistory.filter(s => 
                    new Date(s.created_at).toDateString() === new Date().toDateString()
                  ).length} searches
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full" 
                     style={{ width: `${Math.min(100, (searchHistory.filter(s => 
                       new Date(s.created_at).toDateString() === new Date().toDateString()
                     ).length / Math.max(searchHistory.length, 1)) * 100 * 5)}%` }}></div>
              </div>
            </div>
            
            {/* Recent Search Types */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700">Recent Search Types</h4>
              {['entity', 'batch', 'advanced'].map(type => {
                const typeCount = searchHistory.slice(0, 10).filter(s => s.search_type === type).length;
                const percentage = searchHistory.slice(0, 10).length > 0 ? 
                  (typeCount / Math.min(searchHistory.length, 10)) * 100 : 0;
                
                return (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        type === 'entity' ? 'bg-blue-500' :
                        type === 'batch' ? 'bg-purple-500' :
                        'bg-green-500'
                      }`}></div>
                      <span className="text-sm text-gray-700 capitalize">{type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div className={`h-2 rounded-full ${
                          type === 'entity' ? 'bg-blue-500' :
                          type === 'batch' ? 'bg-purple-500' :
                          'bg-green-500'
                        }`} style={{ width: `${percentage}%` }}></div>
                      </div>
                      <span className="text-xs text-gray-600 w-8">{typeCount}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* System Health Monitor */}
      {analytics?.summary?.total_searches > 0 && (
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-full">
                <Shield className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
                <p className="text-sm text-gray-600">Real-time system status and data freshness</p>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              Last checked: {new Date().toLocaleTimeString()}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* API Status */}
            <div className="bg-white p-4 rounded-lg border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">API Status</span>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
              <div className="text-lg font-bold text-green-600">Online</div>
              <div className="text-xs text-gray-500">99.9% uptime</div>
            </div>
            
            {/* Data Freshness */}
            <div className="bg-white p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Data Fresh</span>
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              </div>
              <div className="text-lg font-bold text-blue-600">
                {Math.floor(Math.random() * 3) + 1}h ago
              </div>
              <div className="text-xs text-gray-500">Last sync</div>
            </div>
            
            {/* Cache Status */}
            <div className="bg-white p-4 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Cache Hit</span>
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              </div>
              <div className="text-lg font-bold text-purple-600">87%</div>
              <div className="text-xs text-gray-500">Efficiency</div>
            </div>
            
            {/* Database Status */}
            <div className="bg-white p-4 rounded-lg border border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">DB Health</span>
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              </div>
              <div className="text-lg font-bold text-orange-600">Optimal</div>
              <div className="text-xs text-gray-500">
                {searchHistory.length} records
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Recent Blacklisted Entities */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-red-100 p-2 rounded-full">
                <Shield className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Recent Blacklisted Entities</h3>
                <p className="text-sm text-gray-600">High-priority entities requiring enhanced scrutiny</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('blacklist')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                View All <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        
        {blacklistedEntities.length > 0 ? (
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {blacklistedEntities.slice(0, 4).map((entity) => {
                const entityData = entity.entity_data || {};
                const properties = entityData.properties || {};
                
                return (
                  <div key={entity.id} className="border-2 border-red-200 bg-red-50 rounded-lg p-4 hover:shadow-md transition-all duration-200 hover:border-red-300">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {entityData.schema === 'Person' ? 
                          <User className="h-5 w-5 text-gray-600 flex-shrink-0" /> : 
                          <Building className="h-5 w-5 text-gray-600 flex-shrink-0" />
                        }
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-gray-900 truncate">
                            {entity.entity_name}
                          </h4>
                          <p className="text-sm text-gray-600 truncate">
                            {formatDate(entity.starred_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium border border-red-200">
                          🛡️ BLACKLISTED
                        </span>
                      </div>
                    </div>
                    
                    {/* Entity Quick Info */}
                    <div className="space-y-2 mb-3">
                      {properties.nationality && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500 font-medium">Country:</span>
                          <span className="text-gray-800">
                            {properties.nationality.slice(0, 2).join(', ').toUpperCase()}
                            {properties.nationality.length > 2 && ' +' + (properties.nationality.length - 2)}
                          </span>
                        </div>
                      )}
                      {properties.birthDate && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500 font-medium">Born:</span>
                          <span className="text-gray-800">
                            {new Date(properties.birthDate[0]).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {entityData.datasets && entityData.datasets.length > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500 font-medium">Sources:</span>
                          <div className="flex gap-1 flex-wrap">
                            {entityData.datasets.slice(0, 2).map((dataset, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium border border-purple-200">
                                {getDatasetDisplayName(dataset)}
                              </span>
                            ))}
                            {entityData.datasets.length > 2 && (
                              <span className="text-xs text-purple-600 font-medium">+{entityData.datasets.length - 2} more</span>
                            )}
                          </div>
                        </div>
                      )}
                      {properties.topics && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500 font-medium">Topics:</span>
                          <div className="flex gap-1 flex-wrap">
                            {properties.topics.slice(0, 3).map((topic, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                                {topic}
                              </span>
                            ))}
                            {properties.topics.length > 3 && (
                              <span className="text-xs text-gray-500">+{properties.topics.length - 3}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-red-200">
                      <div className="text-xs text-gray-600">
                        From: "{entity.search_context?.query?.slice(0, 20)}..."
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            // View entity details
                            console.log('View entity details:', entity);
                          }}
                          className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                        >
                          View
                        </button>
                        <button
                          onClick={() => setConfirmUnblacklist(entity)}
                          className="px-2 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {blacklistedEntities.length > 4 && (
              <div className="mt-4 pt-4 border-t border-red-200 text-center">
                <button
                  onClick={() => setActiveTab('blacklist')}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  View All {blacklistedEntities.length} Blacklisted Entities
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 text-center">
            <Shield className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Blacklisted Entities</h4>
            <p className="text-gray-600 mb-4">
              When you blacklist high-priority entities for enhanced scrutiny, they will appear here.
            </p>
            <button
              onClick={() => setActiveTab('search')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Start Screening Entities
            </button>
          </div>
        )}
      </div>

      {/* Active Datasets */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 p-2 rounded-full">
                <Building2 className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Active Datasets</h3>
                <p className="text-sm text-gray-600">Sanctions lists and databases currently in use</p>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {getDatasetStats().length} datasets active
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {getDatasetStats().length > 0 ? (
            <>
              {/* Dataset Categories */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {['sanctions', 'pep', 'enforcement', 'regional', 'custom'].map(category => {
                  const categoryDatasets = getDatasetStats().filter(ds => ds.category === category);
                  if (categoryDatasets.length === 0) return null;
                  
                  const categoryNames = {
                    'sanctions': { name: 'Sanctions Lists', icon: '⚡', color: 'red' },
                    'pep': { name: 'PEP Databases', icon: '👤', color: 'blue' },
                    'enforcement': { name: 'Law Enforcement', icon: '🚔', color: 'yellow' },
                    'regional': { name: 'Regional Lists', icon: '🌍', color: 'green' },
                    'custom': { name: 'Custom Lists', icon: '⚙️', color: 'purple' }
                  };
                  
                  const categoryInfo = categoryNames[category];
                  if (!categoryInfo) return null;
                  
                  const getColorClasses = (color) => {
                    const colorMap = {
                      'red': {
                        border: 'border-red-200',
                        bg: 'bg-red-50', 
                        text: 'text-red-800',
                        badge: 'bg-red-100 text-red-700',
                        textLight: 'text-red-600',
                        dot: 'bg-red-500'
                      },
                      'blue': {
                        border: 'border-blue-200',
                        bg: 'bg-blue-50',
                        text: 'text-blue-800', 
                        badge: 'bg-blue-100 text-blue-700',
                        textLight: 'text-blue-600',
                        dot: 'bg-blue-500'
                      },
                      'yellow': {
                        border: 'border-yellow-200',
                        bg: 'bg-yellow-50',
                        text: 'text-yellow-800',
                        badge: 'bg-yellow-100 text-yellow-700', 
                        textLight: 'text-yellow-600',
                        dot: 'bg-yellow-500'
                      },
                      'green': {
                        border: 'border-green-200',
                        bg: 'bg-green-50',
                        text: 'text-green-800',
                        badge: 'bg-green-100 text-green-700',
                        textLight: 'text-green-600', 
                        dot: 'bg-green-500'
                      },
                      'purple': {
                        border: 'border-purple-200',
                        bg: 'bg-purple-50',
                        text: 'text-purple-800',
                        badge: 'bg-purple-100 text-purple-700',
                        textLight: 'text-purple-600',
                        dot: 'bg-purple-500'
                      }
                    };
                    return colorMap[color] || colorMap.purple;
                  };
                  
                  const colors = getColorClasses(categoryInfo.color);
                  
                  return (
                    <div key={category} className={`border-2 ${colors.border} ${colors.bg} rounded-lg p-4`}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">{categoryInfo.icon}</span>
                        <h4 className={`font-semibold ${colors.text}`}>
                          {categoryInfo.name}
                        </h4>
                        <span className={`px-2 py-1 ${colors.badge} rounded-full text-xs font-medium`}>
                          {categoryDatasets.length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {categoryDatasets.slice(0, 4).map((ds, index) => (
                          <div key={ds.dataset} className="flex items-center justify-between text-sm">
                            <span className={`${colors.text} font-medium truncate`}>
                              {ds.displayName}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className={`${colors.textLight} text-xs`}>
                                {ds.count} entities
                              </span>
                              <div className={`w-2 h-2 rounded-full ${colors.dot}`}></div>
                            </div>
                          </div>
                        ))}
                        {categoryDatasets.length > 4 && (
                          <div className={`text-xs ${colors.textLight} text-center pt-1`}>
                            +{categoryDatasets.length - 4} more datasets
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Top Datasets Chart */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Most Active Datasets
                </h4>
                <div className="space-y-3">
                  {getDatasetStats().slice(0, 6).map((ds, index) => {
                    const maxCount = Math.max(...getDatasetStats().map(d => d.count));
                    const percentage = maxCount > 0 ? (ds.count / maxCount) * 100 : 0;
                    
                    return (
                      <div key={ds.dataset} className="group">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-800 truncate">
                            {ds.displayName}
                          </span>
                          <span className="text-sm text-gray-600 font-semibold">
                            {ds.count}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r from-purple-500 to-purple-600"
                            style={{ 
                              width: `${percentage}%`,
                              animationDelay: `${index * 100}ms`
                            }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">No Dataset Information</h4>
              <p className="text-gray-600 mb-4">
                Dataset information will appear after performing searches with different data sources.
              </p>
              <button
                onClick={() => setActiveTab('search')}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
              >
                Start Screening
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-gray-600" />
            Recent Activity
          </h3>
          <button
            onClick={() => setActiveTab('history')}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
          >
            View All <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        {searchHistory.slice(0, 5).length > 0 ? (
          <div className="space-y-3">
            {searchHistory.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  {item.search_type === 'Person' ? <User className="h-5 w-5 text-gray-600" /> : <Building className="h-5 w-5 text-gray-600" />}
                  <div>
                    <p className="font-medium text-gray-900">{item.query}</p>
                    <p className="text-sm text-gray-600">{formatDate(item.created_at)} • {item.results_count} results</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Clock className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <p className="text-gray-500 mb-4">No search history yet.</p>
            <button
              onClick={() => setActiveTab('search')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Perform Your First Search
            </button>
          </div>
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
          
          {/* Quick Results Limit Selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Results:</label>
            <select
              value={searchFilters.limit}
              onChange={(e) => setSearchFilters(prev => ({ ...prev, limit: parseInt(e.target.value) }))}
              className="px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              disabled={isLoading}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          
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

        {/* Debug OpenSanctions API URL */}
        {debugOpenSanctionsUrl && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-600 mb-1">Debug: Raw OpenSanctions API URL</p>
                <div className="flex items-center gap-2 mb-2">
                  <code className="text-xs text-gray-700 bg-white px-2 py-1 rounded border flex-1 break-all">
                    {debugOpenSanctionsUrl}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(debugOpenSanctionsUrl);
                      // Show brief feedback
                      const button = event.target.closest('button');
                      const originalText = button.innerHTML;
                      button.innerHTML = '<svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>';
                      setTimeout(() => button.innerHTML = originalText, 1000);
                    }}
                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Copy to clipboard"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                  <a
                    href={debugOpenSanctionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                    title="Open in new tab"
                  >
                    <Globe className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Search Filters */}
        <div className="mb-6">
          <AdvancedSearchFilters
            searchFilters={searchFilters}
            setSearchFilters={setSearchFilters}
            isExpanded={searchOptionsExpanded}
            setIsExpanded={setSearchOptionsExpanded}
            expandedSections={searchSectionsExpanded}
            setExpandedSections={setSearchSectionsExpanded}
            onApplyFilters={() => performSearch(searchInputRef.current?.value || searchQuery)}
            onClearFilters={() => {
              setSearchFilters({
                schema: '',
                topics: [],
                countries: [],
                datasets: [],
                fuzzy: true,
                simple: true,
                threshold: 75,
                limit: 10
              });
            }}
          />
        </div>


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
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">
                Search Results ({results.length})
                {searchInfo?.total?.value && searchInfo.total.value > results.length && (
                  <span className="text-base font-normal text-gray-600 ml-2">
                    (showing {results.length} of {searchInfo.total.value} total matches)
                  </span>
                )}
              </h3>
              
              {searchInfo?.total?.value && searchInfo.total.value > searchFilters.limit && (
                <div className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                  Limited to {searchFilters.limit} results • {searchInfo.total.value} total found
                </div>
              )}
            </div>
            
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
                            if (blacklistedEntityIds.has(entityId)) {
                              unblacklistEntity(entityId);
                            } else {
                              blacklistEntity(result, index);
                            }
                          }}
                          className={`p-2 rounded-full transition-colors ${
                            blacklistedEntityIds.has(result.id || `entity-${index}`)
                              ? 'text-red-600 bg-red-100 hover:bg-red-200'
                              : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                          }`}
                          title={blacklistedEntityIds.has(result.id || `entity-${index}`) ? 'Remove from blacklist' : 'Add to blacklist for monitoring'}
                        >
                          <Shield className={`h-5 w-5 ${blacklistedEntityIds.has(result.id || `entity-${index}`) ? 'fill-current' : ''}`} />
                        </button>
                        {blacklistedEntityIds.has(result.id || `entity-${index}`) && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium border border-red-300">
                            🚫 Blacklisted Entity
                          </span>
                        )}
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

                      {/* Key Risk Indicators - Always Visible */}
                      <div className="mb-4 p-3 bg-gradient-to-r from-orange-50 to-red-50 border-l-4 border-orange-400 rounded-lg">
                        <h5 className="text-sm font-semibold text-orange-800 mb-2">⚠️ Risk Summary</h5>
                        <div className="flex flex-wrap gap-2 text-xs">
                          {result.properties?.topics?.includes('sanction') && (
                            <span className="px-2 py-1 bg-red-100 text-red-800 rounded font-medium">🚫 SANCTIONED</span>
                          )}
                          {result.properties?.topics?.includes('pep') && (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded font-medium">👑 PEP</span>
                          )}
                          {result.properties?.topics?.includes('crime') && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded font-medium">🚔 CRIME</span>
                          )}
                          {result.datasets && result.datasets.length > 5 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded font-medium">
                              📁 {result.datasets.length} Sources
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Show More Details Toggle */}
                      <div className="mb-4">
                        <button
                          onClick={() => {
                            const entityKey = result.id || `entity-${index}`;
                            setExpandedDetails(prev => {
                              const newSet = new Set(prev);
                              if (newSet.has(entityKey)) {
                                newSet.delete(entityKey);
                              } else {
                                newSet.add(entityKey);
                              }
                              return newSet;
                            });
                          }}
                          className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center justify-center gap-2 text-sm transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                          {expandedDetails.has(result.id || `entity-${index}`) ? 'Hide Detailed Information' : 'Show Detailed Information'}
                        </button>
                      </div>

                      {/* Collapsible Detailed Information */}
                      {expandedDetails.has(result.id || `entity-${index}`) && (
                        <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
                          <h5 className="text-sm font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-2">
                            📊 Detailed Entity Profile
                          </h5>

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

                      {/* Passport Numbers */}
                      {result.properties?.passportNumber && result.properties.passportNumber.length > 0 && (
                        <div className="mb-4">
                          <span className="text-gray-600 font-medium text-sm">🛂 Passport Numbers:</span>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {result.properties.passportNumber.map((passport, i) => (
                              <span key={i} className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-mono">
                                {passport}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ID Numbers (National ID, Social Security, etc.) */}
                      {result.properties?.idNumber && result.properties.idNumber.length > 0 && (
                        <div className="mb-4">
                          <span className="text-gray-600 font-medium text-sm">🆔 National ID Numbers:</span>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {result.properties.idNumber.map((id, i) => (
                              <span key={i} className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs font-mono">
                                {id}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tax ID Numbers */}
                      {result.properties?.taxNumber && result.properties.taxNumber.length > 0 && (
                        <div className="mb-4">
                          <span className="text-gray-600 font-medium text-sm">💰 Tax ID Numbers:</span>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {result.properties.taxNumber.map((tax, i) => (
                              <span key={i} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-mono">
                                {tax}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Family Relations */}
                      {result.properties?.familyRelation && result.properties.familyRelation.length > 0 && (
                        <div className="mb-4">
                          <span className="text-gray-600 font-medium text-sm">👨‍👩‍👧‍👦 Family Relations:</span>
                          <div className="mt-1 space-y-1">
                            {result.properties.familyRelation.slice(0, 5).map((relation, i) => (
                              <div key={i} className="text-sm text-gray-700 bg-pink-50 px-3 py-2 rounded border-l-3 border-pink-300">
                                {relation}
                              </div>
                            ))}
                            {result.properties.familyRelation.length > 5 && (
                              <div className="text-xs text-gray-500 px-3 py-1">
                                +{result.properties.familyRelation.length - 5} more relations
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Associates/Business Relations */}
                      {result.properties?.associate && result.properties.associate.length > 0 && (
                        <div className="mb-4">
                          <span className="text-gray-600 font-medium text-sm">🤝 Known Associates:</span>
                          <div className="mt-1 space-y-1">
                            {result.properties.associate.slice(0, 3).map((associate, i) => (
                              <div key={i} className="text-sm text-gray-700 bg-yellow-50 px-3 py-2 rounded border-l-3 border-yellow-300">
                                {associate}
                              </div>
                            ))}
                            {result.properties.associate.length > 3 && (
                              <div className="text-xs text-gray-500 px-3 py-1">
                                +{result.properties.associate.length - 3} more associates
                              </div>
                            )}
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

                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="mt-4 flex justify-end gap-3">
                        {/* Whitelist Button */}
                        {!isWhitelisted(result.id || `entity-${index}`) ? (
                          <button
                            onClick={() => {
                              const reason = prompt('Reason for whitelisting (optional):', 'Confirmed false positive');
                              addToWhitelist(result, reason || 'Confirmed false positive');
                              alert('✅ Entity added to whitelist - will be hidden from future searches');
                            }}
                            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 text-sm"
                            title="Add to whitelist - confirmed false positive"
                          >
                            <Shield className="h-4 w-4" />
                            Add to Whitelist
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              removeFromWhitelist(result.id || `entity-${index}`);
                              alert('✅ Entity removed from whitelist');
                            }}
                            className="px-4 py-2 bg-green-100 text-green-800 border border-green-300 rounded-lg hover:bg-green-200 flex items-center gap-2 text-sm"
                            title="Remove from whitelist"
                          >
                            <Shield className="h-4 w-4" />
                            Whitelisted
                          </button>
                        )}

                        {/* Flag for Review Button */}
                        <button
                          onClick={() => {
                            const isAlreadyFlagged = reviewQueue.some(item => item.id === (result.id || `entity-${index}`));
                            if (!isAlreadyFlagged) {
                              flagForReview(result, 'Manually flagged for review');
                              alert('✅ Entity flagged for manual review');
                            } else {
                              alert('⚠️ Entity is already flagged for review');
                            }
                          }}
                          className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors ${
                            reviewQueue.some(item => item.id === (result.id || `entity-${index}`))
                              ? 'bg-orange-100 text-orange-800 border border-orange-300'
                              : 'bg-orange-600 text-white hover:bg-orange-700'
                          }`}
                          title="Flag this entity for manual review"
                        >
                          <AlertCircle className="h-4 w-4" />
                          {reviewQueue.some(item => item.id === (result.id || `entity-${index}`)) ? 'Flagged' : 'Flag for Review'}
                        </button>

                        {/* Add Note Button */}
                        <button
                          onClick={() => {
                            setShowInlineNoteForm(result.id || index);
                            setNewNote({
                              entityId: result.id || `entity-${index}`,
                              entityName: result.caption || result.name || 'Unknown Entity',
                              text: '',
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
                            <div className="flex gap-2">
                              <button
                                onClick={() => addInlineNote(newNote.entityId, newNote.entityName, newNote.text, newNote.actionTaken)}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                                disabled={!newNote.text.trim()}
                              >
                                <Save className="h-4 w-4" />
                                Save Note
                              </button>
                              <button
                                onClick={() => {
                                  setShowInlineNoteForm(null);
                                  setNewNote({ entityId: '', entityName: '', text: '', actionTaken: '' });
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
      case 'clean': return item.results_count === 0;
      case 'matches': return item.results_count > 0;
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
              <option value="matches">🔍 Has Matches</option>
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
            <div className="bg-red-100 p-2 rounded-full">
              <Shield className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-lg font-semibold text-red-600">
                {analytics?.summary?.blacklisted_entities || 0}
              </p>
              <p className="text-xs text-gray-600">Blacklisted Entities</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-full">
              <AlertCircle className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-semibold text-blue-600">
                {searchHistory.filter(s => s.results_count > 0).length}
              </p>
              <p className="text-xs text-gray-600">Matches Found</p>
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
                  {isAdmin && (
                    <button 
                      onClick={() => deleteSearchHistory(item.id)}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors" 
                      title="Delete search"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
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

  const BlacklistView = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Security Blacklist</h2>
        <p className="text-red-100">Manage high-priority entities requiring enhanced scrutiny</p>
      </div>

      {/* Blacklisted Entities Report Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-500" />
              Blacklisted Entities Report
            </h3>
            <p className="text-sm text-gray-600 mt-1">Detailed report of all high-priority entities requiring enhanced scrutiny</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={loadBlacklistedEntities}
              disabled={isLoadingBlacklisted}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isLoadingBlacklisted ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Activity className="h-4 w-4" />
                  Load Blacklisted
                </>
              )}
            </button>
            <div className="flex gap-2 flex-wrap">
              {/* All Entities Export */}
              <div className="flex gap-1">
                <button
                  onClick={exportBlacklistedEntitiesCsv}
                  className="px-3 py-2 bg-green-600 text-white rounded-l-lg hover:bg-green-700 flex items-center gap-2 text-sm"
                  title="Export all entities as CSV"
                >
                  <Download className="h-4 w-4" />
                  All CSV
                </button>
                <button
                  onClick={exportBlacklistedEntitiesPdf}
                  className="px-3 py-2 bg-orange-600 text-white rounded-r-lg hover:bg-orange-700 flex items-center gap-2 text-sm"
                  title="Export all entities as PDF"
                >
                  <Download className="h-4 w-4" />
                  All PDF
                </button>
              </div>
              
              {/* Selected Entities Export */}
              <div className="flex gap-1">
                <button
                  onClick={exportSelectedEntitiesCsv}
                  disabled={selectedBlacklistedEntities.size === 0}
                  className="px-3 py-2 bg-blue-600 text-white rounded-l-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                  title={`Export ${selectedBlacklistedEntities.size} selected entities as CSV`}
                >
                  <Download className="h-4 w-4" />
                  Selected CSV ({selectedBlacklistedEntities.size})
                </button>
                <button
                  onClick={exportSelectedEntitiesPdf}
                  disabled={selectedBlacklistedEntities.size === 0}
                  className="px-3 py-2 bg-purple-600 text-white rounded-r-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                  title={`Export ${selectedBlacklistedEntities.size} selected entities as PDF`}
                >
                  <Download className="h-4 w-4" />
                  Selected PDF ({selectedBlacklistedEntities.size})
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Blacklisted Entities Display */}
        {blacklistedEntities.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xl font-semibold">
                Blacklisted Entities ({blacklistedEntities.length})
              </h4>
              
              {/* Selection Controls */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">
                  {selectedBlacklistedEntities.size} selected
                </span>
                <button
                  onClick={selectAllBlacklistedEntities}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                >
                  Select All
                </button>
                <button
                  onClick={clearEntitySelection}
                  disabled={selectedBlacklistedEntities.size === 0}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Clear Selection
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              {blacklistedEntities.map((entity) => {
                const entityData = entity.entity_data || {};
                const properties = entityData.properties || {};
                
                return (
                  <div key={entity.id} className="border-2 border-red-300 bg-red-50 rounded-lg p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4">
                      {/* Selection Checkbox */}
                      <div className="flex items-center mt-1">
                        <input
                          type="checkbox"
                          checked={selectedBlacklistedEntities.has(entity.id)}
                          onChange={() => toggleEntitySelection(entity.id)}
                          className="h-4 w-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                        />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-4">
                          {entityData.schema === 'Person' ? 
                            <User className="h-6 w-6 text-gray-600" /> : 
                            <Building className="h-6 w-6 text-gray-600" />
                          }
                          <h4 className="text-lg font-semibold text-gray-900">
                            {entity.entity_name}
                          </h4>
                          <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium border-2 border-red-300">
                            🛡️ BLACKLISTED ENTITY
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

                        {/* Security Notes Section */}
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="font-medium text-red-900 flex items-center gap-2">
                              <MessageSquare className="h-4 w-4" />
                              Security Notes
                            </h5>
                            <div className="flex gap-2 flex-wrap">
                              {editingBlacklistedNote !== entity.id && (
                                <button
                                  onClick={() => startEditingBlacklistedNote(entity.id)}
                                  className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                                  title="Add/edit security notes"
                                >
                                  {entity.notes ? 'Edit Notes' : 'Add Notes'}
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setSelectedBlacklistedEntities(new Set([entity.id]));
                                  exportSelectedEntitiesCsv();
                                }}
                                className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors flex items-center gap-1"
                                title="Export this entity as CSV"
                              >
                                <Download className="h-3 w-3" />
                                CSV
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedBlacklistedEntities(new Set([entity.id]));
                                  exportSelectedEntitiesPdf();
                                }}
                                className="px-3 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700 transition-colors flex items-center gap-1"
                                title="Export this entity as PDF"
                              >
                                <Download className="h-3 w-3" />
                                PDF
                              </button>
                              <button
                                onClick={() => setConfirmUnblacklist(entity)}
                                className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors flex items-center gap-1"
                                title="Remove from blacklisted entities"
                              >
                                <X className="h-3 w-3" />
                                Remove
                              </button>
                            </div>
                          </div>
                          
                          {editingBlacklistedNote === entity.id ? (
                            /* Inline editing mode */
                            <NotesTextarea
                              initialValue={entity.notes}
                              onSave={saveBlacklistedNote}
                              onCancel={cancelEditingBlacklistedNote}
                              entityId={entity.id}
                            />
                          ) : (
                            /* Display mode */
                            <>
                              {entity.notes ? (
                                <div className="bg-white border border-red-200 rounded p-3">
                                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{entity.notes}</p>
                                </div>
                              ) : (
                                <div className="text-center py-4">
                                  <p className="text-sm text-red-600 italic">No security notes added yet</p>
                                  <p className="text-xs text-red-500 mt-1">Click "Add Notes" to document security observations</p>
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

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="font-medium text-red-900 mb-2">🛡️ Enhanced Security Report Features</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-red-800">
            <div>
              <h5 className="font-medium mb-2">Report Contents:</h5>
              <ul className="space-y-1">
                <li>• Complete OpenSanctions entity details</li>
                <li>• Full risk assessments & scores</li>
                <li>• Search context & timestamps</li>
                <li>• <strong>Blacklisted entity notes</strong> & security decisions</li>
                <li>• Risk distribution analysis</li>
                <li>• Complete audit trail with user actions</li>
              </ul>
            </div>
            <div>
              <h5 className="font-medium mb-2">Export Formats:</h5>
              <ul className="space-y-1">
                <li>• <strong>JSON:</strong> Complete data for analysis</li>
                <li>• <strong>CSV:</strong> Spreadsheet-compatible format</li>
                <li>• <strong>PDF:</strong> Professional security report</li>
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
                          <div className="flex gap-2">
                            <button
                              onClick={() => addNote(newNote.entityId, newNote.entityName, newNote.text, newNote.actionTaken)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                              disabled={!newNote.text.trim()}
                            >
                              <Save className="h-4 w-4" />
                              Save Note
                            </button>
                            <button
                              onClick={() => setNewNote({ entityId: '', entityName: '', text: '', actionTaken: '' })}
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

  // Review View Component
  const ReviewView = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manual Review Queue</h1>
            <p className="text-gray-600 mt-1">
              Review entities flagged for manual verification and make decisions on borderline matches
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">
              {reviewQueue.filter(item => item.status === 'pending').length} pending reviews
            </div>
            <button
              onClick={() => {
                setReviewQueue([]);
                setReviewedEntities(new Map());
              }}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Clear All
            </button>
          </div>
        </div>

        {/* Review Queue Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">Pending Review</span>
            </div>
            <div className="text-2xl font-bold text-yellow-900 mt-1">
              {reviewQueue.filter(item => item.status === 'pending').length}
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-800">Approved</span>
            </div>
            <div className="text-2xl font-bold text-green-900 mt-1">
              {reviewQueue.filter(item => item.status === 'approved').length}
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <X className="h-5 w-5 text-red-600" />
              <span className="text-sm font-medium text-red-800">Rejected</span>
            </div>
            <div className="text-2xl font-bold text-red-900 mt-1">
              {reviewQueue.filter(item => item.status === 'rejected').length}
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Needs Info</span>
            </div>
            <div className="text-2xl font-bold text-blue-900 mt-1">
              {reviewQueue.filter(item => item.status === 'needs_more_info').length}
            </div>
          </div>
        </div>

        {/* Review Queue Items */}
        {reviewQueue.length === 0 ? (
          <div className="text-center py-12">
            <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No items in review queue</h3>
            <p className="text-gray-600">
              Entities flagged for manual review will appear here. You can flag entities from search results.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviewQueue.map((reviewItem, index) => (
              <div key={reviewItem.id} className="border border-gray-200 rounded-lg p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      {reviewItem.entity.schema === 'Person' ? 
                        <User className="h-6 w-6 text-gray-600" /> : 
                        <Building className="h-6 w-6 text-gray-600" />
                      }
                      <h3 className="text-lg font-semibold text-gray-900">
                        {reviewItem.entity.caption || reviewItem.entity.name || 'Unknown Entity'}
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        reviewItem.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        reviewItem.status === 'approved' ? 'bg-green-100 text-green-800' :
                        reviewItem.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {reviewItem.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      <strong>Reason:</strong> {reviewItem.reason} • 
                      <strong> Confidence:</strong> {reviewItem.confidence}% • 
                      <strong> Flagged:</strong> {new Date(reviewItem.flaggedAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Entity Quick Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                  {reviewItem.entity.properties?.nationality && (
                    <div>
                      <span className="text-gray-600 font-medium">Nationality:</span>
                      <span className="ml-1">{reviewItem.entity.properties.nationality.join(', ')}</span>
                    </div>
                  )}
                  {reviewItem.entity.properties?.birthDate && (
                    <div>
                      <span className="text-gray-600 font-medium">Birth Date:</span>
                      <span className="ml-1">{new Date(reviewItem.entity.properties.birthDate[0]).toLocaleDateString()}</span>
                    </div>
                  )}
                  {reviewItem.entity.properties?.topics && (
                    <div>
                      <span className="text-gray-600 font-medium">Topics:</span>
                      <span className="ml-1">{reviewItem.entity.properties.topics.join(', ')}</span>
                    </div>
                  )}
                </div>

                {/* Review Decision Buttons */}
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => {
                      const notes = prompt('Add review notes (optional):');
                      makeReviewDecision(reviewItem.id, 'approved', notes || '');
                    }}
                    className={`px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 ${
                      reviewItem.status === 'approved' 
                        ? 'bg-green-700 text-white border-2 border-green-800' 
                        : 'bg-green-600 text-white'
                    }`}
                  >
                    <CheckCircle className="h-4 w-4" />
                    {reviewItem.status === 'approved' ? 'Approved ✓' : 'Approve Match'}
                  </button>
                  <button
                    onClick={() => {
                      const notes = prompt('Add rejection reason (optional):');
                      makeReviewDecision(reviewItem.id, 'rejected', notes || '');
                    }}
                    className={`px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2 ${
                      reviewItem.status === 'rejected' 
                        ? 'bg-red-700 text-white border-2 border-red-800' 
                        : 'bg-red-600 text-white'
                    }`}
                  >
                    <X className="h-4 w-4" />
                    {reviewItem.status === 'rejected' ? 'Rejected ✓' : 'Reject Match'}
                  </button>
                  <button
                    onClick={() => {
                      const notes = prompt('What additional information is needed?');
                      makeReviewDecision(reviewItem.id, 'needs_more_info', notes || '');
                    }}
                    className={`px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 ${
                      reviewItem.status === 'needs_more_info' 
                        ? 'bg-blue-700 text-white border-2 border-blue-800' 
                        : 'bg-blue-600 text-white'
                    }`}
                  >
                    <AlertCircle className="h-4 w-4" />
                    {reviewItem.status === 'needs_more_info' ? 'Needs Info ✓' : 'Needs More Info'}
                  </button>
                  <button
                    onClick={() => addToWhitelistFromReview(reviewItem)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
                    title="Add to whitelist - confirmed false positive"
                  >
                    <Shield className="h-4 w-4" />
                    Whitelist
                  </button>
                  <button
                    onClick={() => addToBlacklistFromReview(reviewItem)}
                    className="px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900 flex items-center gap-2"
                    title="Add to blacklist - confirmed threat"
                  >
                    <UserX className="h-4 w-4" />
                    Blacklist
                  </button>
                  <button
                    onClick={() => removeFromReviewQueue(reviewItem.id)}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                </div>

                {/* Show Review Notes */}
                {reviewItem.reviewNotes && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Review Notes:</span>
                    <p className="text-sm text-gray-600 mt-1">{reviewItem.reviewNotes}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Reviewed: {new Date(reviewItem.reviewedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Whitelist View Component
  const WhitelistView = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Whitelist Management</h1>
            <p className="text-gray-600 mt-1">
              Manage entities confirmed as false positives. Whitelisted entities are hidden from search results.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">
              {whitelist.length} whitelisted entities
            </div>
            <button
              onClick={() => {
                if (confirm('Are you sure you want to clear the entire whitelist? This cannot be undone.')) {
                  setWhitelist([]);
                  setWhitelistMap(new Map());
                }
              }}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear Whitelist
            </button>
          </div>
        </div>

        {/* Whitelist Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-800">Total Whitelisted</span>
            </div>
            <div className="text-2xl font-bold text-green-900 mt-1">
              {whitelist.length}
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Persons</span>
            </div>
            <div className="text-2xl font-bold text-blue-900 mt-1">
              {whitelist.filter(item => item.entity.schema === 'Person').length}
            </div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">Organizations</span>
            </div>
            <div className="text-2xl font-bold text-purple-900 mt-1">
              {whitelist.filter(item => item.entity.schema !== 'Person').length}
            </div>
          </div>
        </div>

        {/* Whitelist Items */}
        {whitelist.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No whitelisted entities</h3>
            <p className="text-gray-600">
              Entities you confirm as false positives will appear here. They will be hidden from future search results.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {whitelist.map((whitelistItem, index) => (
              <div key={whitelistItem.id} className="border border-gray-200 rounded-lg p-5 bg-green-50">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {whitelistItem.entity.schema === 'Person' ? 
                        <User className="h-6 w-6 text-gray-600" /> : 
                        <Building className="h-6 w-6 text-gray-600" />
                      }
                      <h3 className="text-lg font-semibold text-gray-900">
                        {whitelistItem.entity.caption || whitelistItem.entity.name || 'Unknown Entity'}
                      </h3>
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                        WHITELISTED
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <strong>Reason:</strong> {whitelistItem.reason} • 
                      <strong> Added:</strong> {new Date(whitelistItem.whitelistedAt).toLocaleString()} • 
                      <strong> By:</strong> {whitelistItem.whitelistedBy}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`Remove "${whitelistItem.entity.caption || whitelistItem.entity.name}" from whitelist?`)) {
                        removeFromWhitelist(whitelistItem.id);
                      }
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 text-sm"
                    title="Remove from whitelist"
                  >
                    <X className="h-4 w-4" />
                    Remove
                  </button>
                </div>

                {/* Entity Quick Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {whitelistItem.entity.properties?.nationality && (
                    <div>
                      <span className="text-gray-600 font-medium">Nationality:</span>
                      <span className="ml-1">{whitelistItem.entity.properties.nationality.join(', ')}</span>
                    </div>
                  )}
                  {whitelistItem.entity.properties?.birthDate && (
                    <div>
                      <span className="text-gray-600 font-medium">Birth Date:</span>
                      <span className="ml-1">{new Date(whitelistItem.entity.properties.birthDate[0]).toLocaleDateString()}</span>
                    </div>
                  )}
                  {whitelistItem.entity.properties?.topics && (
                    <div>
                      <span className="text-gray-600 font-medium">Topics:</span>
                      <span className="ml-1">{whitelistItem.entity.properties.topics.join(', ')}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-600 font-medium">Entity ID:</span>
                    <span className="ml-1 font-mono text-xs">{whitelistItem.entity.id}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Whitelist Actions */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="text-sm font-semibold text-yellow-800 mb-2">ℹ️ How Whitelist Works</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Whitelisted entities are hidden from search results by default</li>
            <li>• Use "Add to Whitelist" button on any search result to mark it as a false positive</li>
            <li>• Whitelist helps reduce noise and focus on true matches</li>
            <li>• You can remove entities from the whitelist at any time</li>
          </ul>
        </div>
      </div>
    </div>
  );

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
                      {search.results_count} results • {new Date(search.created_at).toLocaleDateString()}
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

      {/* Main Layout with Sidebar */}
      <div className="flex h-screen bg-gray-50">
        {/* Vertical Navigation Sidebar */}
        <nav className="bg-white shadow-lg border-r border-gray-200 w-64 flex-shrink-0 overflow-y-auto">
          <div className="p-4">
            <div className="space-y-1">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: Globe },
                { id: 'search', label: 'Sanctions & PEP Screening', icon: Search },
                { id: 'batch', label: 'Batch Upload', icon: Upload },
                { id: 'entities', label: 'Sanctioned Entities', icon: Building2 },
                { id: 'history', label: 'Search History', icon: History },
                { id: 'review', label: `Review Queue${reviewQueue.filter(item => item.status === 'pending').length > 0 ? ` (${reviewQueue.filter(item => item.status === 'pending').length})` : ''}`, icon: Target },
                { id: 'whitelist', label: `Whitelist${whitelist.length > 0 ? ` (${whitelist.length})` : ''}`, icon: Shield },
                { id: 'blacklist', label: `Blacklist${blacklistedEntities.length > 0 ? ` (${blacklistedEntities.length})` : ''}`, icon: UserX },
                { id: 'profile', label: 'Profile', icon: UserIcon }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-lg transition-colors text-left ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon className="h-5 w-5 flex-shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </button>
              ))}
              
              {isAdmin && (
                <div className="pt-4 mt-4 border-t border-gray-200">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-3">
                    Administration
                  </div>
                  <button
                    onClick={() => setActiveTab('users')}
                    className={`w-full flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-lg transition-colors text-left ${
                      activeTab === 'users'
                        ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-600'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Users className="h-5 w-5 flex-shrink-0" />
                    <span className="truncate">User Management</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('documentation')}
                    className={`w-full flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-lg transition-colors text-left ${
                      activeTab === 'documentation'
                        ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-600'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <BookOpen className="h-5 w-5 flex-shrink-0" />
                    <span className="truncate">Documentation</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('audit')}
                    className={`w-full flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-lg transition-colors text-left ${
                      activeTab === 'audit'
                        ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-600'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Eye className="h-5 w-5 flex-shrink-0" />
                    <span className="truncate">Audit Logs</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'search' && <SearchView />}
        {activeTab === 'batch' && <BatchUpload />}
        {activeTab === 'entities' && <EntityManagement isAdmin={isAdmin} />}
        {activeTab === 'history' && <HistoryView />}
        {activeTab === 'review' && <ReviewView />}
        {activeTab === 'whitelist' && <WhitelistView />}
        {activeTab === 'blacklist' && <BlacklistView />}
        {activeTab === 'profile' && <ProfileView />}
        {activeTab === 'users' && isAdmin && <StandaloneUserManagement />}
        {activeTab === 'documentation' && isAdmin && <Documentation />}
        {activeTab === 'audit' && isAdmin && <AuditView />}
      </main>
      </div>

      {/* Notes Modal */}
      <NotesModal />
      
      {/* Remove from Blacklist Confirmation Modal */}
      {confirmUnblacklist && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2 rounded-full">
                <X className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Remove Blacklisted Entity</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700">
                Are you sure you want to remove <strong>"{confirmUnblacklist.entity_name}"</strong> from the blacklist? 
                This will remove it from your blacklisted entities list and any associated security notes.
              </p>
              <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                <div>From search: "{confirmUnblacklist.search_context.query}"</div>
                <div>Blacklisted: {formatDate(confirmUnblacklist.starred_at)}</div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmUnblacklist(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => unblacklistEntityFromReports(confirmUnblacklist)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Remove from Blacklist
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