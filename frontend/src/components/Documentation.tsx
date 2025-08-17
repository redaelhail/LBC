import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Folder, 
  Download, 
  Eye, 
  ChevronRight, 
  ChevronDown, 
  BookOpen,
  AlertCircle,
  Loader2,
  Search
} from 'lucide-react';

interface DocItem {
  name: string;
  type: 'file' | 'directory';
  path: string;
  size?: number;
  children?: DocItem[];
}

interface DocStructure {
  documentation: DocItem[];
  root_docs: DocItem[];
}

interface DocContent {
  type: string;
  content: string;
  html?: string;
  path: string;
  name: string;
}

const Documentation = () => {
  const [structure, setStructure] = useState<DocStructure | null>(null);
  const [currentDoc, setCurrentDoc] = useState<DocContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadDocumentationStructure();
  }, []);

  const loadDocumentationStructure = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/v1/documentation/structure', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Admin privileges required to access documentation.');
        }
        throw new Error('Failed to load documentation structure');
      }

      const data = await response.json();
      setStructure(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDocumentContent = async (path: string) => {
    try {
      setContentLoading(true);
      const token = localStorage.getItem('access_token');
      const response = await fetch(`/api/v1/documentation/content/${path}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load document content');
      }

      const data = await response.json();
      setCurrentDoc(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setContentLoading(false);
    }
  };

  const downloadDocument = async (path: string, filename: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`/api/v1/documentation/download/${path}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download document');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const filterItems = (items: DocItem[]): DocItem[] => {
    if (!searchTerm) return items;
    
    return items.filter(item => {
      if (item.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return true;
      }
      if (item.children) {
        const filteredChildren = filterItems(item.children);
        return filteredChildren.length > 0;
      }
      return false;
    }).map(item => ({
      ...item,
      children: item.children ? filterItems(item.children) : undefined
    }));
  };

  const renderDocItem = (item: DocItem, level: number = 0) => {
    const isExpanded = expandedFolders.has(item.path);
    const paddingLeft = level * 16;

    return (
      <div key={item.path}>
        <div 
          className={`flex items-center py-2 px-3 hover:bg-gray-50 cursor-pointer ${
            currentDoc?.path === item.path ? 'bg-blue-50 border-r-2 border-blue-500' : ''
          }`}
          style={{ paddingLeft: `${12 + paddingLeft}px` }}
        >
          {item.type === 'directory' ? (
            <>
              <button
                onClick={() => toggleFolder(item.path)}
                className="flex items-center flex-1 text-left"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 mr-2 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 mr-2 text-gray-500" />
                )}
                <Folder className="h-4 w-4 mr-2 text-yellow-600" />
                <span className="text-sm font-medium text-gray-700">{item.name}</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => loadDocumentContent(item.path)}
                className="flex items-center flex-1 text-left"
              >
                <FileText className="h-4 w-4 mr-2 ml-6 text-blue-600" />
                <span className="text-sm text-gray-700">{item.name}</span>
                {item.size && (
                  <span className="text-xs text-gray-500 ml-2">
                    ({formatFileSize(item.size)})
                  </span>
                )}
              </button>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => loadDocumentContent(item.path)}
                  className="p-1 text-gray-500 hover:text-blue-600 rounded"
                  title="View"
                >
                  <Eye className="h-3 w-3" />
                </button>
                <button
                  onClick={() => downloadDocument(item.path, item.name)}
                  className="p-1 text-gray-500 hover:text-green-600 rounded"
                  title="Download"
                >
                  <Download className="h-3 w-3" />
                </button>
              </div>
            </>
          )}
        </div>
        {item.type === 'directory' && isExpanded && item.children && (
          <div>
            {filterItems(item.children).map(child => renderDocItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading documentation...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <AlertCircle className="h-8 w-8 text-red-600 mr-2" />
        <span className="text-red-600">{error}</span>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Sidebar - Documentation Tree */}
      <div className="w-1/3 border-r border-gray-200 bg-gray-50">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Documentation</h2>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search documentation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-y-auto h-full">
          {structure && (
            <>
              {/* Root Documentation Files */}
              {structure.root_docs.length > 0 && (
                <div className="py-2">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Project Documentation
                  </div>
                  {filterItems(structure.root_docs).map(item => renderDocItem(item))}
                </div>
              )}

              {/* Organized Documentation */}
              {structure.documentation.length > 0 && (
                <div className="py-2">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Organized Docs
                  </div>
                  {filterItems(structure.documentation).map(item => renderDocItem(item))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {currentDoc ? (
          <div className="flex-1 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">{currentDoc.name}</h1>
                  <p className="text-sm text-gray-500">{currentDoc.path}</p>
                </div>
                <button
                  onClick={() => downloadDocument(currentDoc.path, currentDoc.name)}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {contentLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">Loading content...</span>
                </div>
              ) : currentDoc.type === 'markdown' && currentDoc.html ? (
                <div 
                  className="prose prose-blue max-w-none"
                  dangerouslySetInnerHTML={{ __html: currentDoc.html }}
                />
              ) : (
                <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-x-auto">
                  {currentDoc.content}
                </pre>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Document</h3>
              <p className="text-gray-500">Choose a documentation file from the sidebar to view its content.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Documentation;