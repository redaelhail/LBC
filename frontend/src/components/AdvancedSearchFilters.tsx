import React, { useState, useEffect } from 'react';
import { Filter, X, MapPin, Flag, Calendar, User } from 'lucide-react';

interface AdvancedSearchFiltersProps {
  searchFilters: any;
  setSearchFilters: (filters: any) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
}

// Common countries for sanctions screening
const COMMON_COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'RU', name: 'Russia' },
  { code: 'CN', name: 'China' },
  { code: 'IR', name: 'Iran' },
  { code: 'KP', name: 'North Korea' },
  { code: 'SY', name: 'Syria' },
  { code: 'IQ', name: 'Iraq' },
  { code: 'AF', name: 'Afghanistan' },
  { code: 'BY', name: 'Belarus' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'CU', name: 'Cuba' },
  { code: 'SO', name: 'Somalia' },
  { code: 'LY', name: 'Libya' },
  { code: 'YE', name: 'Yemen' },
  { code: 'SD', name: 'Sudan' },
  { code: 'ZW', name: 'Zimbabwe' },
  { code: 'MM', name: 'Myanmar' },
  { code: 'MA', name: 'Morocco' },
];

// OpenSanctions topics for list type filtering
const LIST_TOPICS = [
  { id: 'sanction', name: 'Sanctions Lists', description: 'UN, EU, US, UK sanctions' },
  { id: 'pep', name: 'Politically Exposed Persons', description: 'Government officials and associates' },
  { id: 'crime', name: 'Criminal Lists', description: 'Law enforcement databases' },
  { id: 'poi', name: 'Persons of Interest', description: 'Investigation targets' },
  { id: 'debarment', name: 'Debarment Lists', description: 'Procurement exclusions' },
  { id: 'regulatory', name: 'Regulatory Actions', description: 'Financial penalties and actions' },
  { id: 'export', name: 'Export Controls', description: 'Trade restrictions' },
  { id: 'terrorism', name: 'Terrorism Lists', description: 'Counter-terrorism databases' },
];

// Entity types
const ENTITY_TYPES = [
  { id: 'Person', name: 'Person', icon: User },
  { id: 'Organization', name: 'Organization', icon: Filter },
  { id: 'Company', name: 'Company', icon: Filter },
  { id: 'Asset', name: 'Asset', icon: Filter },
  { id: 'Vehicle', name: 'Vehicle', icon: Filter },
];

const AdvancedSearchFilters: React.FC<AdvancedSearchFiltersProps> = ({
  searchFilters,
  setSearchFilters,
  onApplyFilters,
  onClearFilters,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedCountries, setSelectedCountries] = useState<string[]>(searchFilters.countries || []);
  const [selectedTopics, setSelectedTopics] = useState<string[]>(searchFilters.topics || []);
  const [countrySearch, setCountrySearch] = useState('');

  // Sync with parent state
  useEffect(() => {
    setSelectedCountries(searchFilters.countries || []);
    setSelectedTopics(searchFilters.topics || []);
  }, [searchFilters.countries, searchFilters.topics]);

  const handleCountryToggle = (countryCode: string) => {
    const newCountries = selectedCountries.includes(countryCode)
      ? selectedCountries.filter(c => c !== countryCode)
      : [...selectedCountries, countryCode];
    
    setSelectedCountries(newCountries);
    setSearchFilters(prev => ({ ...prev, countries: newCountries }));
  };

  const handleTopicToggle = (topicId: string) => {
    const newTopics = selectedTopics.includes(topicId)
      ? selectedTopics.filter(t => t !== topicId)
      : [...selectedTopics, topicId];
    
    setSelectedTopics(newTopics);
    setSearchFilters(prev => ({ ...prev, topics: newTopics }));
  };

  const clearAllFilters = () => {
    setSelectedCountries([]);
    setSelectedTopics([]);
    onClearFilters();
  };

  const getActiveFilterCount = () => {
    return selectedCountries.length + selectedTopics.length + 
           (searchFilters.date_from ? 1 : 0) + 
           (searchFilters.entity_type && searchFilters.entity_type !== 'Person' ? 1 : 0);
  };

  const filteredCountries = COMMON_COUNTRIES.filter(country =>
    country.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    country.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium"
        >
          <Filter size={18} />
          Advanced Filters
          {getActiveFilterCount() > 0 && (
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
              {getActiveFilterCount()}
            </span>
          )}
        </button>
        
        <div className="flex items-center gap-2">
          {getActiveFilterCount() > 0 && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <X size={14} />
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="p-4 space-y-6">
          {/* Entity Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <User size={16} className="inline mr-2" />
              Entity Type
            </label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {ENTITY_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSearchFilters(prev => ({ ...prev, entity_type: type.id }))}
                  className={`p-3 text-sm rounded-lg border transition-colors ${
                    searchFilters.entity_type === type.id
                      ? 'bg-blue-50 border-blue-200 text-blue-800'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <type.icon size={16} className="mx-auto mb-1" />
                  {type.name}
                </button>
              ))}
            </div>
          </div>

          {/* List Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Flag size={16} className="inline mr-2" />
              List Types ({selectedTopics.length} selected)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {LIST_TOPICS.map((topic) => (
                <label
                  key={topic.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedTopics.includes(topic.id)
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedTopics.includes(topic.id)}
                    onChange={() => handleTopicToggle(topic.id)}
                    className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">{topic.name}</div>
                    <div className="text-xs text-gray-500 mt-1">{topic.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Country Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <MapPin size={16} className="inline mr-2" />
              Countries ({selectedCountries.length} selected)
            </label>
            
            {/* Country Search */}
            <div className="mb-3">
              <input
                type="text"
                placeholder="Search countries..."
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Selected Countries */}
            {selectedCountries.length > 0 && (
              <div className="mb-3">
                <div className="text-xs text-gray-500 mb-2">Selected:</div>
                <div className="flex flex-wrap gap-1">
                  {selectedCountries.map((code) => {
                    const country = COMMON_COUNTRIES.find(c => c.code === code);
                    return (
                      <span
                        key={code}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                      >
                        {country?.name || code}
                        <button
                          onClick={() => handleCountryToggle(code)}
                          className="hover:bg-blue-200 rounded-full p-0.5"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Country Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
              {filteredCountries.map((country) => (
                <label
                  key={country.code}
                  className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                    selectedCountries.includes(country.code)
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedCountries.includes(country.code)}
                    onChange={() => handleCountryToggle(country.code)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">{country.code}</div>
                    <div className="text-xs text-gray-500 truncate">{country.name}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Calendar size={16} className="inline mr-2" />
              Date Range Filtering
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">From Date</label>
                <input
                  type="date"
                  value={searchFilters.date_from || ''}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, date_from: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">To Date</label>
                <input
                  type="date"
                  value={searchFilters.date_to || ''}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, date_to: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              {getActiveFilterCount()} filter{getActiveFilterCount() !== 1 ? 's' : ''} active
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearAllFilters}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
              >
                Clear All
              </button>
              <button
                onClick={onApplyFilters}
                className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedSearchFilters;