import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Search, User, Building, AlertCircle, CheckCircle, Loader2, History, FileText, Globe, Calendar, Download, Eye, Plus, Edit, Trash2, Save, X, MessageSquare, Star, Filter, TrendingUp, BarChart3, Activity, Clock, Target, Shield } from 'lucide-react';

// Move SearchInput outside the main component to prevent recreation
const SearchInput = React.memo(({ 
  inputRef, 
  placeholder = "Enter name, company, or ID number...", 
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

const App = () => {
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
  const [analytics, setAnalytics] = useState(null);
  const [historyFilter, setHistoryFilter] = useState('all'); // all, starred, high-risk, etc.
  const [expandedDetails, setExpandedDetails] = useState(new Set()); // Track which results have expanded details
  const [starredEntities, setStarredEntities] = useState([]);
  const [isLoadingStarred, setIsLoadingStarred] = useState(false);
  const [starredEntityIds, setStarredEntityIds] = useState(new Set());
  
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
      const response = await fetch(`${API_BASE_URL}/api/v1/search/analytics`);
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
      
      const response = await fetch(`${API_BASE_URL}/api/v1/search/entities/star`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  const loadSearchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/search/history`);
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
      const response = await fetch(`${API_BASE_URL}/api/v1/search/entities/starred`);
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
      const response = await fetch(`${API_BASE_URL}/api/v1/search/entities/starred/search/${searchId}`);
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
      const response = await fetch(`${API_BASE_URL}/api/v1/search/reports/starred-entities`);
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
      const response = await fetch(`${API_BASE_URL}/api/v1/search/reports/starred-entities/csv`);
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
      const response = await fetch(`${API_BASE_URL}/api/v1/search/reports/starred-entities/pdf`);
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

  const deleteSearchHistory = async (searchId) => {
    if (!window.confirm('Are you sure you want to delete this search? This will also remove all associated starred entities and notes.')) {
      return;
    }
    
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
      
      const requestBody = { 
        query: query,
        dataset: 'default',
        limit: 10 
      };
      
      const response = await fetch(`${API_BASE_URL}/api/v1/search/entities`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
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
      const response = await fetch(`${API_BASE_URL}/api/v1/search/history/${historyId}/details`);
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
        headers: { 'Content-Type': 'application/json' },
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
        
        const response = await fetch(`${API_BASE_URL}/api/v1/search/history?limit=1`);
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
        headers: { 'Content-Type': 'application/json' },
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
        <h2 className="text-2xl font-bold mb-2">Compliance Dashboard</h2>
        <p className="text-blue-100">Real-time sanctions screening analytics and insights</p>
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
                            {editingStarredNote !== entity.id && (
                              <button
                                onClick={() => startEditingStarredNote(entity.id)}
                                className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 transition-colors"
                                title="Add/edit compliance notes"
                              >
                                {entity.notes ? 'Edit Notes' : 'Add Notes'}
                              </button>
                            )}
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Search className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">SanctionsGuard Pro</h1>
              <p className="text-sm text-gray-600">Professional Sanctions Screening Platform</p>
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
              { id: 'search', label: 'Search', icon: Search },
              { id: 'history', label: 'History', icon: History },
              { id: 'reports', label: 'Reports', icon: FileText }
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
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'search' && <SearchView />}
        {activeTab === 'history' && <HistoryView />}
        {activeTab === 'reports' && <ReportsView />}
      </main>

      {/* Notes Modal */}
      <NotesModal />
    </div>
  );
};

export default App;