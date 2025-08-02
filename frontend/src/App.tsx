import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, User, Building, AlertCircle, CheckCircle, Loader2, History, FileText, Globe, Calendar, Download, Eye } from 'lucide-react';

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

const App = () => {
  const [activeTab, setActiveTab] = useState('search');
  const [searchQuery, setSearchQuery] = useState(''); // Only used for the main search tab
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchInfo, setSearchInfo] = useState(null);
  const [searchHistory, setSearchHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  // Refs to maintain focus
  const searchInputRef = useRef(null);
  const dashboardInputRef = useRef(null);

  // Load search history when history tab is opened
  useEffect(() => {
    if (activeTab === 'history') {
      loadSearchHistory();
    }
  }, [activeTab]);

  const loadSearchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch('/api/v1/search/history');
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
      console.log('🔍 Starting search for:', query);
      
      const requestBody = { 
        query: query,
        dataset: 'default',
        limit: 10 
      };
      
      const response = await fetch('/api/v1/search/entities', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody),
      });
      
      console.log('📥 Response status:', response.status);
      
      const responseText = await response.text();
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseText}`);
      }
      
      const data = JSON.parse(responseText);
      console.log('📊 Parsed data:', data);
      
      if (data.results && Array.isArray(data.results)) {
        setResults(data.results);
        setSearchInfo(data);
        console.log('✅ Search successful, found', data.results.length, 'results');
      } else {
        setResults([]);
        setSearchInfo(data);
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

  const getRiskScore = (result) => {
    return result.morocco_risk_score || 
           (result.score ? Math.round(result.score * 100) : 0) ||
           result.risk_score || 0;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  const handleExampleClick = useCallback((example) => {
    setSearchQuery(example);
    performSearch(example);
    setError('');
  }, [performSearch]);

  const DashboardView = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Today's Searches</p>
              <p className="text-2xl font-bold text-gray-900">{searchHistory.length}</p>
            </div>
            <Search className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">High Risk Matches</p>
              <p className="text-2xl font-bold text-red-600">
                {searchHistory.filter(h => h.risk_level === 'High').length}
              </p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Clean Searches</p>
              <p className="text-2xl font-bold text-green-600">
                {searchHistory.filter(h => h.results_count === 0).length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Data Source</p>
              <p className="text-lg font-bold text-blue-600">
                {searchInfo?.source === 'opensanctions' ? 'Live' : 'Demo'}
              </p>
            </div>
            <Globe className="h-8 w-8 text-blue-600" />
          </div>
        </div>
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
          searchInfo.source === 'opensanctions' 
            ? 'bg-green-50 border-green-200' 
            : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex items-center gap-2">
            {searchInfo.source === 'opensanctions' ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-600" />
            )}
            <div>
              <h3 className={`font-medium ${
                searchInfo.source === 'opensanctions' 
                  ? 'text-green-800' 
                  : 'text-yellow-800'
              }`}>
                {searchInfo.source === 'opensanctions' 
                  ? '🎉 Using Real OpenSanctions Data!' 
                  : '⏳ Using Demo Data'
                }
              </h3>
              <p className={`text-sm ${
                searchInfo.source === 'opensanctions' 
                  ? 'text-green-700' 
                  : 'text-yellow-700'
              }`}>
                {searchInfo.source === 'opensanctions' 
                  ? `Found ${searchInfo.total?.value || 0} matches in live sanctions databases` 
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
                        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
                          getRiskColor(getRiskScore(result))
                        }`}>
                          Risk: {getRiskScore(result)}%
                        </span>
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                          {result.schema || 'Entity'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                        <div>
                          <span className="text-gray-600 font-medium">Country:</span>
                          <span className="ml-2">
                            {result.properties?.country?.join(', ') || result.country || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 font-medium">Topics:</span>
                          <span className="ml-2">
                            {result.properties?.topics?.join(', ') || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 font-medium">ID:</span>
                          <span className="ml-2 font-mono text-xs">
                            {result.id || 'N/A'}
                          </span>
                        </div>
                      </div>

                      {/* Aliases */}
                      {result.properties?.alias && result.properties.alias.length > 0 && (
                        <div className="mb-3">
                          <span className="text-gray-600 font-medium text-sm">Also known as:</span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {result.properties.alias.slice(0, 5).map((alias, i) => (
                              <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                {alias}
                              </span>
                            ))}
                            {result.properties.alias.length > 5 && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs">
                                +{result.properties.alias.length - 5} more
                              </span>
                            )}
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

  const HistoryView = () => (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold">Search History</h3>
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
              <History className="h-4 w-4" />
              Refresh
            </>
          )}
        </button>
      </div>
      
      {searchHistory.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Query</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Results</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Risk Level</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {searchHistory.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{item.query}</td>
                  <td className="py-3 px-4">{item.search_type}</td>
                  <td className="py-3 px-4">{formatDate(item.created_at)}</td>
                  <td className="py-3 px-4">{item.results_count}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(item.risk_level)}`}>
                      {item.risk_level}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => {
                        setSearchQuery(item.query);
                        setActiveTab('search');
                      }}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                      title="Search again"
                    >
                      <Search className="h-4 w-4" />
                    </button>
                    <button className="text-green-600 hover:text-green-800" title="View details">
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8">
          <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Search History</h4>
          <p className="text-gray-600 mb-4">Your search history will appear here after you perform searches.</p>
          <button
            onClick={() => setActiveTab('search')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Start Searching
          </button>
        </div>
      )}
    </div>
  );

  const ReportsView = () => (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h3 className="text-xl font-semibold mb-6">Compliance Reports</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Daily Summary Report</h4>
          <p className="text-sm text-gray-600 mb-4">Generate daily compliance summary with search statistics</p>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <Download className="h-4 w-4" />
            Generate Report
          </button>
        </div>
        
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Risk Assessment Report</h4>
          <p className="text-sm text-gray-600 mb-4">Detailed analysis of high-risk entities found</p>
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Generate Report
          </button>
        </div>
      </div>
      
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Available Report Types</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Daily search activity summary</li>
          <li>• High-risk entity detection report</li>
          <li>• Compliance audit trail</li>
          <li>• User activity monitoring</li>
          <li>• BAM regulatory reporting</li>
        </ul>
      </div>
    </div>
  );

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
    </div>
  );
};

export default App;