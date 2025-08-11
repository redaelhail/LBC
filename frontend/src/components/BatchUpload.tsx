import React, { useState, useRef, useCallback } from 'react';
import { 
  Upload, 
  Download, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  X,
  Eye,
  FileDown,
  Clock,
  Target,
  Users,
  TrendingUp
} from 'lucide-react';

interface BatchJob {
  job_id: string;
  filename: string;
  status: string;
  summary: {
    total_records: number;
    processed_records: number;
    successful_records: number;
    failed_records: number;
    processing_time_ms: number;
  };
  results_preview?: any[];
  errors_preview?: any[];
  has_more_results: boolean;
  has_more_errors: boolean;
}

interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
  records_count: number;
  template_type: string;
  sample_data?: any[];
}

const BatchUpload: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [templateType, setTemplateType] = useState('screening');
  const [dataset, setDataset] = useState('default');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [batchJob, setBatchJob] = useState<BatchJob | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setSelectedFile(file);
        setError(null);
      } else {
        setError('Please select an Excel file (.xlsx or .xls)');
      }
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setSelectedFile(file);
        setError(null);
      } else {
        setError('Please select an Excel file (.xlsx or .xls)');
      }
    }
  };

  const validateTemplate = async () => {
    if (!selectedFile) return;

    setIsValidating(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(`/api/v1/search/batch/validate?template_type=${templateType}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Validation failed');
      }

      const data = await response.json();
      setValidationResult(data.validation);
    } catch (err: any) {
      setError(err.message || 'Failed to validate template');
    } finally {
      setIsValidating(false);
    }
  };

  const processFile = async () => {
    if (!selectedFile || !validationResult?.valid) return;

    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(`/api/v1/search/batch/process?dataset=${dataset}&template_type=${templateType}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Processing failed');
      }

      const data = await response.json();
      setBatchJob(data);
    } catch (err: any) {
      setError(err.message || 'Failed to process batch');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await fetch(`/api/v1/search/batch/template/download?template_type=${templateType}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download template');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sanctions_screening_template_${templateType}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Failed to download template');
    }
  };

  const exportResults = async (format: 'excel' | 'csv' | 'json') => {
    if (!batchJob) return;

    try {
      const response = await fetch(`/api/v1/search/batch/results/${batchJob.job_id}/export?format=${format}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to export results');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `batch_results_${batchJob.job_id}.${format === 'excel' ? 'xlsx' : format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Failed to export results');
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setValidationResult(null);
    setBatchJob(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Upload className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Batch Screening</h1>
        </div>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Upload an Excel file to screen multiple entities against sanctions and PEP lists simultaneously
        </p>
      </div>

      {/* Template Download Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <FileText className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Step 1: Download Template</h3>
            <p className="text-blue-700 mb-4">
              Download the Excel template with the required format and sample data.
            </p>
            <div className="flex gap-4 items-center">
              <select
                value={templateType}
                onChange={(e) => setTemplateType(e.target.value)}
                className="px-3 py-2 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="screening">Basic Screening (Name, Type)</option>
                <option value="enhanced_screening">Enhanced Screening (All Fields)</option>
              </select>
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                Download Template
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* File Upload Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Step 2: Upload Your File</h3>
        
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {selectedFile ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <FileText className="h-12 w-12 text-green-500" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                onClick={resetForm}
                className="text-red-600 hover:text-red-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="h-12 w-12 text-gray-400 mx-auto" />
              <div>
                <p className="text-lg font-medium text-gray-900">
                  Drop your Excel file here or click to browse
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Supports .xlsx and .xls files up to 10MB
                </p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Select File
              </button>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Dataset Selection */}
        {selectedFile && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dataset to Search
            </label>
            <select
              value={dataset}
              onChange={(e) => setDataset(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="default">All Datasets (Sanctions + PEP)</option>
              <option value="sanctions">Sanctions Lists Only</option>
              <option value="pep">PEP Lists Only</option>
            </select>
          </div>
        )}
      </div>

      {/* Validation Section */}
      {selectedFile && !batchJob && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Step 3: Validate & Process</h3>
          
          {!validationResult && (
            <button
              onClick={validateTemplate}
              disabled={isValidating}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              {isValidating ? 'Validating...' : 'Validate Template'}
            </button>
          )}

          {validationResult && (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${
                validationResult.valid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-start gap-3">
                  {validationResult.valid ? (
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <h4 className={`font-medium ${
                      validationResult.valid ? 'text-green-900' : 'text-red-900'
                    }`}>
                      {validationResult.valid ? 'Template Valid' : 'Template Issues Found'}
                    </h4>
                    <p className={`text-sm mt-1 ${
                      validationResult.valid ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {validationResult.valid 
                        ? `Found ${validationResult.records_count} valid records ready for processing`
                        : 'Please fix the issues below before processing'
                      }
                    </p>
                    
                    {validationResult.errors && validationResult.errors.length > 0 && (
                      <ul className="mt-2 text-sm text-red-700 list-disc list-inside space-y-1">
                        {validationResult.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    )}
                    
                    {validationResult.warnings && validationResult.warnings.length > 0 && (
                      <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside space-y-1">
                        {validationResult.warnings.map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              {validationResult.valid && (
                <div className="flex gap-4">
                  <button
                    onClick={processFile}
                    disabled={isProcessing}
                    className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
                    {isProcessing ? 'Processing...' : `Process ${validationResult.records_count} Entities`}
                  </button>
                  
                  <button
                    onClick={resetForm}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Results Section */}
      {batchJob && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Processing Results</h3>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              {batchJob.status}
            </span>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Users className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-900">{batchJob.summary.total_records}</div>
              <div className="text-sm text-blue-700">Total Records</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-900">{batchJob.summary.successful_records}</div>
              <div className="text-sm text-green-700">Successful</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <AlertCircle className="h-6 w-6 text-red-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-red-900">{batchJob.summary.failed_records}</div>
              <div className="text-sm text-red-700">Failed</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Clock className="h-6 w-6 text-gray-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{(batchJob.summary.processing_time_ms / 1000).toFixed(1)}s</div>
              <div className="text-sm text-gray-700">Processing Time</div>
            </div>
          </div>

          {/* Export Options */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => exportResults('excel')}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
            >
              <FileDown className="h-4 w-4" />
              Export Excel
            </button>
            <button
              onClick={() => exportResults('csv')}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              <FileDown className="h-4 w-4" />
              Export CSV
            </button>
            <button
              onClick={() => exportResults('json')}
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
            >
              <FileDown className="h-4 w-4" />
              Export JSON
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Process New File
            </button>
          </div>

          {/* Results Preview */}
          {batchJob.results_preview && batchJob.results_preview.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Sample Results</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Entity Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Matches</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Highest Risk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {batchJob.results_preview.slice(0, 5).map((result, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900">{result.entity_name}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{result.entity_type}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{result.results_count}</td>
                        <td className="px-4 py-2">
                          {result.highest_risk_match ? (
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              result.highest_risk_match.risk_level === 'HIGH' 
                                ? 'bg-red-100 text-red-800'
                                : result.highest_risk_match.risk_level === 'MEDIUM'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {result.highest_risk_match.risk_level}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-500">No matches</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {batchJob.has_more_results && (
                <p className="text-sm text-gray-500 text-center">
                  and {batchJob.summary.successful_records - 5} more results...
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-900">Error</h4>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchUpload;