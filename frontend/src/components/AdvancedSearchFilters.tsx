import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  X, 
  ChevronDown, 
  ChevronRight,
  Calendar, 
  Target,
  Settings,
  Info,
  Zap
} from 'lucide-react';

interface AdvancedSearchFiltersProps {
  searchFilters: any;
  setSearchFilters: (filters: any) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  isExpanded?: boolean;
  setIsExpanded?: (expanded: boolean) => void;
  expandedSections?: any;
  setExpandedSections?: (sections: any) => void;
}

// OpenSanctions schema types
const SCHEMA_TYPES = [
  { id: '', name: 'All Types', description: 'Search all entity types' },
  { id: 'Person', name: 'Person', description: 'Individuals & people' },
  { id: 'Organization', name: 'Organization', description: 'Companies & organizations' },
  { id: 'Company', name: 'Company', description: 'Business entities' },
  { id: 'Asset', name: 'Asset', description: 'Properties & assets' },
];

// OpenSanctions topics + Custom data
const OPENSANCTIONS_TOPICS = [
  { id: 'custom', name: 'Custom Data', description: 'Our internal database only' },
  { id: 'sanction', name: 'Sanctions', description: 'International sanctions lists' },
  { id: 'role.pep', name: 'PEP (Politically Exposed)', description: 'Political figures & associates' },
  { id: 'crime', name: 'Crime', description: 'Criminal enforcement lists' },
  { id: 'crime.terror', name: 'Terrorism', description: 'Counter-terrorism lists' },
  { id: 'poi', name: 'Persons of Interest', description: 'Investigation targets' },
  { id: 'debarment', name: 'Debarment', description: 'Procurement exclusions' },
  { id: 'export.control', name: 'Export Control', description: 'Trade restrictions' },
  { id: 'corp.disqual', name: 'Corporate Disqualification', description: 'Business sanctions' },
];

// OpenSanctions datasets
const OPENSANCTIONS_DATASETS = [
  { id: 'us_ofac_sdn', name: 'US OFAC SDN', description: 'US Specially Designated Nationals' },
  { id: 'eu_fsf', name: 'EU Financial Sanctions', description: 'European Union sanctions' },
  { id: 'gb_hmt_sanctions', name: 'UK HM Treasury', description: 'UK Treasury sanctions' },
  { id: 'un_sc_sanctions', name: 'UN Security Council', description: 'United Nations sanctions' },
  { id: 'ca_dfatd_sema_sanctions', name: 'Canada DFATD', description: 'Canadian sanctions' },
  { id: 'au_dfat_sanctions', name: 'Australia DFAT', description: 'Australian sanctions' },
  { id: 'interpol_red_notices', name: 'INTERPOL Red Notices', description: 'International wanted persons' },
  { id: 'worldbank_debarred', name: 'World Bank Debarred', description: 'World Bank exclusions' },
];

// Complete country list with ISO codes
const COUNTRIES = [
  { code: 'AD', name: 'Andorra' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'AF', name: 'Afghanistan' },
  { code: 'AG', name: 'Antigua and Barbuda' },
  { code: 'AI', name: 'Anguilla' },
  { code: 'AL', name: 'Albania' },
  { code: 'AM', name: 'Armenia' },
  { code: 'AO', name: 'Angola' },
  { code: 'AQ', name: 'Antarctica' },
  { code: 'AR', name: 'Argentina' },
  { code: 'AS', name: 'American Samoa' },
  { code: 'AT', name: 'Austria' },
  { code: 'AU', name: 'Australia' },
  { code: 'AW', name: 'Aruba' },
  { code: 'AX', name: 'Åland Islands' },
  { code: 'AZ', name: 'Azerbaijan' },
  { code: 'BA', name: 'Bosnia and Herzegovina' },
  { code: 'BB', name: 'Barbados' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BF', name: 'Burkina Faso' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'BH', name: 'Bahrain' },
  { code: 'BI', name: 'Burundi' },
  { code: 'BJ', name: 'Benin' },
  { code: 'BL', name: 'Saint Barthélemy' },
  { code: 'BM', name: 'Bermuda' },
  { code: 'BN', name: 'Brunei' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'BQ', name: 'Caribbean Netherlands' },
  { code: 'BR', name: 'Brazil' },
  { code: 'BS', name: 'Bahamas' },
  { code: 'BT', name: 'Bhutan' },
  { code: 'BV', name: 'Bouvet Island' },
  { code: 'BW', name: 'Botswana' },
  { code: 'BY', name: 'Belarus' },
  { code: 'BZ', name: 'Belize' },
  { code: 'CA', name: 'Canada' },
  { code: 'CC', name: 'Cocos (Keeling) Islands' },
  { code: 'CD', name: 'Democratic Republic of the Congo' },
  { code: 'CF', name: 'Central African Republic' },
  { code: 'CG', name: 'Republic of the Congo' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'CI', name: 'Côte d\'Ivoire' },
  { code: 'CK', name: 'Cook Islands' },
  { code: 'CL', name: 'Chile' },
  { code: 'CM', name: 'Cameroon' },
  { code: 'CN', name: 'China' },
  { code: 'CO', name: 'Colombia' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'CU', name: 'Cuba' },
  { code: 'CV', name: 'Cape Verde' },
  { code: 'CW', name: 'Curaçao' },
  { code: 'CX', name: 'Christmas Island' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'DE', name: 'Germany' },
  { code: 'DJ', name: 'Djibouti' },
  { code: 'DK', name: 'Denmark' },
  { code: 'DM', name: 'Dominica' },
  { code: 'DO', name: 'Dominican Republic' },
  { code: 'DZ', name: 'Algeria' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'EE', name: 'Estonia' },
  { code: 'EG', name: 'Egypt' },
  { code: 'EH', name: 'Western Sahara' },
  { code: 'ER', name: 'Eritrea' },
  { code: 'ES', name: 'Spain' },
  { code: 'ET', name: 'Ethiopia' },
  { code: 'FI', name: 'Finland' },
  { code: 'FJ', name: 'Fiji' },
  { code: 'FK', name: 'Falkland Islands' },
  { code: 'FM', name: 'Micronesia' },
  { code: 'FO', name: 'Faroe Islands' },
  { code: 'FR', name: 'France' },
  { code: 'GA', name: 'Gabon' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'GD', name: 'Grenada' },
  { code: 'GE', name: 'Georgia' },
  { code: 'GF', name: 'French Guiana' },
  { code: 'GG', name: 'Guernsey' },
  { code: 'GH', name: 'Ghana' },
  { code: 'GI', name: 'Gibraltar' },
  { code: 'GL', name: 'Greenland' },
  { code: 'GM', name: 'Gambia' },
  { code: 'GN', name: 'Guinea' },
  { code: 'GP', name: 'Guadeloupe' },
  { code: 'GQ', name: 'Equatorial Guinea' },
  { code: 'GR', name: 'Greece' },
  { code: 'GS', name: 'South Georgia and the South Sandwich Islands' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'GU', name: 'Guam' },
  { code: 'GW', name: 'Guinea-Bissau' },
  { code: 'GY', name: 'Guyana' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'HM', name: 'Heard Island and McDonald Islands' },
  { code: 'HN', name: 'Honduras' },
  { code: 'HR', name: 'Croatia' },
  { code: 'HT', name: 'Haiti' },
  { code: 'HU', name: 'Hungary' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IL', name: 'Israel' },
  { code: 'IM', name: 'Isle of Man' },
  { code: 'IN', name: 'India' },
  { code: 'IO', name: 'British Indian Ocean Territory' },
  { code: 'IQ', name: 'Iraq' },
  { code: 'IR', name: 'Iran' },
  { code: 'IS', name: 'Iceland' },
  { code: 'IT', name: 'Italy' },
  { code: 'JE', name: 'Jersey' },
  { code: 'JM', name: 'Jamaica' },
  { code: 'JO', name: 'Jordan' },
  { code: 'JP', name: 'Japan' },
  { code: 'KE', name: 'Kenya' },
  { code: 'KG', name: 'Kyrgyzstan' },
  { code: 'KH', name: 'Cambodia' },
  { code: 'KI', name: 'Kiribati' },
  { code: 'KM', name: 'Comoros' },
  { code: 'KN', name: 'Saint Kitts and Nevis' },
  { code: 'KP', name: 'North Korea' },
  { code: 'KR', name: 'South Korea' },
  { code: 'KW', name: 'Kuwait' },
  { code: 'KY', name: 'Cayman Islands' },
  { code: 'KZ', name: 'Kazakhstan' },
  { code: 'LA', name: 'Laos' },
  { code: 'LB', name: 'Lebanon' },
  { code: 'LC', name: 'Saint Lucia' },
  { code: 'LI', name: 'Liechtenstein' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'LR', name: 'Liberia' },
  { code: 'LS', name: 'Lesotho' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'LV', name: 'Latvia' },
  { code: 'LY', name: 'Libya' },
  { code: 'MA', name: 'Morocco' },
  { code: 'MC', name: 'Monaco' },
  { code: 'MD', name: 'Moldova' },
  { code: 'ME', name: 'Montenegro' },
  { code: 'MF', name: 'Saint Martin' },
  { code: 'MG', name: 'Madagascar' },
  { code: 'MH', name: 'Marshall Islands' },
  { code: 'MK', name: 'North Macedonia' },
  { code: 'ML', name: 'Mali' },
  { code: 'MM', name: 'Myanmar' },
  { code: 'MN', name: 'Mongolia' },
  { code: 'MO', name: 'Macao' },
  { code: 'MP', name: 'Northern Mariana Islands' },
  { code: 'MQ', name: 'Martinique' },
  { code: 'MR', name: 'Mauritania' },
  { code: 'MS', name: 'Montserrat' },
  { code: 'MT', name: 'Malta' },
  { code: 'MU', name: 'Mauritius' },
  { code: 'MV', name: 'Maldives' },
  { code: 'MW', name: 'Malawi' },
  { code: 'MX', name: 'Mexico' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'MZ', name: 'Mozambique' },
  { code: 'NA', name: 'Namibia' },
  { code: 'NC', name: 'New Caledonia' },
  { code: 'NE', name: 'Niger' },
  { code: 'NF', name: 'Norfolk Island' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NO', name: 'Norway' },
  { code: 'NP', name: 'Nepal' },
  { code: 'NR', name: 'Nauru' },
  { code: 'NU', name: 'Niue' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'OM', name: 'Oman' },
  { code: 'PA', name: 'Panama' },
  { code: 'PE', name: 'Peru' },
  { code: 'PF', name: 'French Polynesia' },
  { code: 'PG', name: 'Papua New Guinea' },
  { code: 'PH', name: 'Philippines' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'PL', name: 'Poland' },
  { code: 'PM', name: 'Saint Pierre and Miquelon' },
  { code: 'PN', name: 'Pitcairn' },
  { code: 'PR', name: 'Puerto Rico' },
  { code: 'PS', name: 'Palestine' },
  { code: 'PT', name: 'Portugal' },
  { code: 'PW', name: 'Palau' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'QA', name: 'Qatar' },
  { code: 'RE', name: 'Réunion' },
  { code: 'RO', name: 'Romania' },
  { code: 'RS', name: 'Serbia' },
  { code: 'RU', name: 'Russia' },
  { code: 'RW', name: 'Rwanda' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'SB', name: 'Solomon Islands' },
  { code: 'SC', name: 'Seychelles' },
  { code: 'SD', name: 'Sudan' },
  { code: 'SE', name: 'Sweden' },
  { code: 'SG', name: 'Singapore' },
  { code: 'SH', name: 'Saint Helena' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'SJ', name: 'Svalbard and Jan Mayen' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SL', name: 'Sierra Leone' },
  { code: 'SM', name: 'San Marino' },
  { code: 'SN', name: 'Senegal' },
  { code: 'SO', name: 'Somalia' },
  { code: 'SR', name: 'Suriname' },
  { code: 'SS', name: 'South Sudan' },
  { code: 'ST', name: 'São Tomé and Príncipe' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'SX', name: 'Sint Maarten' },
  { code: 'SY', name: 'Syria' },
  { code: 'SZ', name: 'Eswatini' },
  { code: 'TC', name: 'Turks and Caicos Islands' },
  { code: 'TD', name: 'Chad' },
  { code: 'TF', name: 'French Southern Territories' },
  { code: 'TG', name: 'Togo' },
  { code: 'TH', name: 'Thailand' },
  { code: 'TJ', name: 'Tajikistan' },
  { code: 'TK', name: 'Tokelau' },
  { code: 'TL', name: 'Timor-Leste' },
  { code: 'TM', name: 'Turkmenistan' },
  { code: 'TN', name: 'Tunisia' },
  { code: 'TO', name: 'Tonga' },
  { code: 'TR', name: 'Turkey' },
  { code: 'TT', name: 'Trinidad and Tobago' },
  { code: 'TV', name: 'Tuvalu' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'UG', name: 'Uganda' },
  { code: 'UM', name: 'United States Minor Outlying Islands' },
  { code: 'US', name: 'United States' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'UZ', name: 'Uzbekistan' },
  { code: 'VA', name: 'Vatican City' },
  { code: 'VC', name: 'Saint Vincent and the Grenadines' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'VG', name: 'British Virgin Islands' },
  { code: 'VI', name: 'U.S. Virgin Islands' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'VU', name: 'Vanuatu' },
  { code: 'WF', name: 'Wallis and Futuna' },
  { code: 'WS', name: 'Samoa' },
  { code: 'YE', name: 'Yemen' },
  { code: 'YT', name: 'Mayotte' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'ZM', name: 'Zambia' },
  { code: 'ZW', name: 'Zimbabwe' },
];

const AdvancedSearchFilters: React.FC<AdvancedSearchFiltersProps> = ({
  searchFilters,
  setSearchFilters,
  onApplyFilters,
  onClearFilters,
  isExpanded = false,
  setIsExpanded,
  expandedSections: externalExpandedSections,
  setExpandedSections: setExternalExpandedSections,
}) => {
  // Use local state as fallback if external state not provided
  const [localExpanded, setLocalExpanded] = useState(false);
  const expanded = setIsExpanded ? isExpanded : localExpanded;
  const setExpanded = setIsExpanded || setLocalExpanded;
  
  const [localExpandedSections, setLocalExpandedSections] = useState({
    searchType: true,
    refinements: true,
    advanced: false
  });
  
  const expandedSections = externalExpandedSections || localExpandedSections;
  const setExpandedSections = setExternalExpandedSections || setLocalExpandedSections;

  // Derived state
  const selectedTopics = searchFilters.topics || [];
  const selectedCountries = searchFilters.countries || [];
  const selectedDatasets = searchFilters.datasets || [];

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };


  const getActiveFilterCount = () => {
    let count = 0;
    if (searchFilters.schema && searchFilters.schema !== '') count++;
    if (selectedTopics.length > 0) count++;
    if (selectedCountries.length > 0) count++;
    if (selectedDatasets.length > 0) count++;
    if (searchFilters.threshold && searchFilters.threshold !== 75) count++;
    return count;
  };

  const clearAllFilters = () => {
    setSearchFilters(prev => ({
      ...prev,
      schema: '',
      topics: [],
      countries: [],
      datasets: [],
      threshold: 75,
      fuzzy: true,
      simple: true
    }));
    onClearFilters();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
        >
          <Filter size={18} />
          <span>Search Options</span>
          {getActiveFilterCount() > 0 && (
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
              {getActiveFilterCount()}
            </span>
          )}
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        
        {getActiveFilterCount() > 0 && (
          <button
            onClick={clearAllFilters}
            className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1 transition-colors"
          >
            <X size={14} />
            Clear all
          </button>
        )}
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="p-4 space-y-4">
          {/* 2x2 Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Schema Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Entity Type
              </label>
              <select
                value={searchFilters.schema || ''}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, schema: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {SCHEMA_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Country Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country {selectedCountries.length > 0 && `(${selectedCountries.length})`}
              </label>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value && !selectedCountries.includes(e.target.value)) {
                    setSearchFilters(prev => ({ 
                      ...prev, 
                      countries: [...selectedCountries, e.target.value] 
                    }));
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select country...</option>
                {COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
              
              {/* Selected Countries */}
              {selectedCountries.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {selectedCountries.map((countryCode) => {
                    const country = COUNTRIES.find(c => c.code === countryCode);
                    return (
                      <span
                        key={countryCode}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                      >
                        {country?.name}
                        <button
                          onClick={() => setSearchFilters(prev => ({ 
                            ...prev, 
                            countries: selectedCountries.filter(c => c !== countryCode) 
                          }))}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Topics Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Topics {selectedTopics.length > 0 && `(${selectedTopics.length})`}
              </label>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value && !selectedTopics.includes(e.target.value)) {
                    setSearchFilters(prev => ({ 
                      ...prev, 
                      topics: [...selectedTopics, e.target.value] 
                    }));
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select topic...</option>
                {OPENSANCTIONS_TOPICS.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </select>
              
              {/* Selected Topics */}
              {selectedTopics.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {selectedTopics.map((topicId) => {
                    const topic = OPENSANCTIONS_TOPICS.find(t => t.id === topicId);
                    return (
                      <span
                        key={topicId}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs"
                      >
                        {topic?.name}
                        <button
                          onClick={() => setSearchFilters(prev => ({ 
                            ...prev, 
                            topics: selectedTopics.filter(t => t !== topicId) 
                          }))}
                          className="text-green-600 hover:text-green-800"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Datasets Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Datasets {selectedDatasets.length > 0 && `(${selectedDatasets.length})`}
              </label>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value && !selectedDatasets.includes(e.target.value)) {
                    setSearchFilters(prev => ({ 
                      ...prev, 
                      datasets: [...selectedDatasets, e.target.value] 
                    }));
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select dataset...</option>
                {OPENSANCTIONS_DATASETS.map((dataset) => (
                  <option key={dataset.id} value={dataset.id}>
                    {dataset.name}
                  </option>
                ))}
              </select>
              
              {/* Selected Datasets */}
              {selectedDatasets.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {selectedDatasets.map((datasetId) => {
                    const dataset = OPENSANCTIONS_DATASETS.find(d => d.id === datasetId);
                    return (
                      <span
                        key={datasetId}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs"
                      >
                        {dataset?.name}
                        <button
                          onClick={() => setSearchFilters(prev => ({ 
                            ...prev, 
                            datasets: selectedDatasets.filter(d => d !== datasetId) 
                          }))}
                          className="text-purple-600 hover:text-purple-800"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Threshold Slider - Below Grid */}
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                Search Quality
              </label>
              <span className="text-sm text-gray-600">{searchFilters.threshold || 75}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="95"
              step="5"
              value={searchFilters.threshold || 75}
              onChange={(e) => setSearchFilters(prev => ({ 
                ...prev, 
                threshold: parseInt(e.target.value) 
              }))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>More results</span>
              <span>Higher quality</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              {getActiveFilterCount() === 0 
                ? 'Using default settings' 
                : `${getActiveFilterCount()} filter${getActiveFilterCount() !== 1 ? 's' : ''} applied`
              }
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearAllFilters}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Clear
              </button>
              <button
                onClick={onApplyFilters}
                className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors font-medium"
              >
                Search
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedSearchFilters;