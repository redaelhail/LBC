import React, { useState, useEffect } from 'react';
import { Building2, Plus, Users, Shield, BarChart3, Eye, X } from 'lucide-react';
import EntityProfile from './EntityProfile';
import RiskMatrixVisualization from './RiskMatrixVisualization';

interface Entity {
  id: number;
  denomination: string;
  commercial_name?: string;
  category: string;
  registration_number?: string;
  status: string;
  current_risk_level?: string;
  directors_count: number;
  lbc_contacts_count: number;
  created_at: string;
}

const CreateEntityForm: React.FC<{
  onSubmit: (data: any) => void;
  onCancel: () => void;
  loading?: boolean;
}> = ({ onSubmit, onCancel, loading = false }) => {
  const [formData, setFormData] = useState({
    denomination: '',
    commercial_name: '',
    category: 'insurance_company',
    registration_number: '',
    tax_id: '',
    legal_form: '',
    headquarters_address: '',
    city: '',
    authorized_capital: '',
    paid_capital: '',
    license_number: '',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      authorized_capital: formData.authorized_capital ? parseFloat(formData.authorized_capital) : null,
      paid_capital: formData.paid_capital ? parseFloat(formData.paid_capital) : null
    };
    onSubmit(submitData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Building2 className="h-6 w-6 mr-2 text-blue-600" />
            Add New Entity
          </h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Denomination *
              </label>
              <input
                type="text"
                name="denomination"
                value={formData.denomination}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Entity legal name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Commercial Name
              </label>
              <input
                type="text"
                name="commercial_name"
                value={formData.commercial_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Trading name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="insurance_company">Insurance Company</option>
                <option value="reinsurance_company">Reinsurance Company</option>
                <option value="insurance_intermediary">Insurance Intermediary</option>
                <option value="broker">Broker</option>
                <option value="agent">Agent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Registration Number
              </label>
              <input
                type="text"
                name="registration_number"
                value={formData.registration_number}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="RC-XXX-XXXX"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tax ID
              </label>
              <input
                type="text"
                name="tax_id"
                value={formData.tax_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tax identification number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Legal Form
              </label>
              <input
                type="text"
                name="legal_form"
                value={formData.legal_form}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., SA, SARL"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Headquarters city"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                License Number
              </label>
              <input
                type="text"
                name="license_number"
                value={formData.license_number}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Insurance license number"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Headquarters Address
            </label>
            <textarea
              name="headquarters_address"
              value={formData.headquarters_address}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Full business address"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Authorized Capital (MAD)
              </label>
              <input
                type="number"
                name="authorized_capital"
                value={formData.authorized_capital}
                onChange={handleChange}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Paid Capital (MAD)
              </label>
              <input
                type="number"
                name="paid_capital"
                value={formData.paid_capital}
                onChange={handleChange}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Additional information or remarks"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Entity
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EntityManagement: React.FC = () => {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState<number | null>(null);
  const [currentView, setCurrentView] = useState<'list' | 'profile' | 'matrix' | 'create'>('list');
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    fetchEntities();
  }, []);

  const fetchEntities = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/v1/entities/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch entities');
      }

      const data = await response.json();
      setEntities(data.entities || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleEntitySelect = (entityId: number, view: 'profile' | 'matrix') => {
    setSelectedEntity(entityId);
    setCurrentView(view);
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedEntity(null);
  };

  const createEntity = async (entityData: any) => {
    try {
      setCreateLoading(true);
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/v1/entities/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(entityData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create entity');
      }

      const newEntity = await response.json();
      setEntities(prev => [...prev, {
        id: newEntity.id,
        denomination: newEntity.denomination,
        commercial_name: newEntity.commercial_name,
        category: newEntity.category,
        registration_number: newEntity.registration_number,
        status: newEntity.status,
        current_risk_level: null,
        directors_count: 0,
        lbc_contacts_count: 0,
        created_at: newEntity.created_at
      }]);
      setShowCreateModal(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create entity');
    } finally {
      setCreateLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading entities...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex items-center">
          <div className="text-red-800">{error}</div>
          <button
            onClick={fetchEntities}
            className="ml-4 text-red-600 hover:text-red-800 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show selected entity profile
  if (currentView === 'profile' && selectedEntity) {
    return (
      <div>
        <div className="mb-4">
          <button
            onClick={handleBackToList}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            ← Back to Entity List
          </button>
        </div>
        <EntityProfile entityId={selectedEntity} />
      </div>
    );
  }

  // Show risk matrix for selected entity
  if (currentView === 'matrix' && selectedEntity) {
    return (
      <div>
        <div className="mb-4">
          <button
            onClick={handleBackToList}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            ← Back to Entity List
          </button>
        </div>
        <RiskMatrixVisualization entityId={selectedEntity} />
      </div>
    );
  }

  // Entity list view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Building2 className="h-8 w-8 mr-3 text-blue-600" />
            Supervised Entities
          </h1>
          <p className="text-gray-600 mt-2">
            Manage insurance companies and intermediaries under ACAPS supervision
          </p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Entity
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Entities</p>
              <p className="text-2xl font-semibold text-gray-900">{entities.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center">
            <div className="bg-green-100 p-2 rounded-lg">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Entities</p>
              <p className="text-2xl font-semibold text-gray-900">
                {entities.filter(e => e.status === 'active').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center">
            <div className="bg-orange-100 p-2 rounded-lg">
              <Shield className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">With Risk Scores</p>
              <p className="text-2xl font-semibold text-gray-900">
                {entities.filter(e => e.current_risk_level).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center">
            <div className="bg-purple-100 p-2 rounded-lg">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">High Risk</p>
              <p className="text-2xl font-semibold text-gray-900">
                {entities.filter(e => e.current_risk_level === 'high' || e.current_risk_level === 'critical').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Entity List */}
      <div className="bg-white rounded-lg border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Entity Directory</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Team Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {entities.map((entity) => (
                <tr key={entity.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {entity.denomination}
                      </div>
                      <div className="text-sm text-gray-500">
                        {entity.commercial_name || 'No commercial name'}
                      </div>
                      <div className="text-xs text-gray-400">
                        {entity.registration_number || 'No registration'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {entity.category.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      entity.status === 'active' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {entity.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entity.current_risk_level ? (
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        entity.current_risk_level === 'high' || entity.current_risk_level === 'critical'
                          ? 'bg-red-100 text-red-800'
                          : entity.current_risk_level === 'medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {entity.current_risk_level.toUpperCase()}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">Not assessed</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center space-x-2">
                      <span className="flex items-center text-xs">
                        <Users className="h-3 w-3 mr-1" />
                        {entity.directors_count} directors
                      </span>
                      <span className="flex items-center text-xs">
                        <Shield className="h-3 w-3 mr-1" />
                        {entity.lbc_contacts_count} contacts
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEntitySelect(entity.id, 'profile')}
                      className="text-blue-600 hover:text-blue-900 flex items-center text-xs"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Profile
                    </button>
                    {entity.current_risk_level && (
                      <button
                        onClick={() => handleEntitySelect(entity.id, 'matrix')}
                        className="text-green-600 hover:text-green-900 flex items-center text-xs"
                      >
                        <BarChart3 className="h-3 w-3 mr-1" />
                        Risk Matrix
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {entities.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No entities found</h3>
            <p className="text-gray-500 mb-4">Get started by adding your first supervised entity.</p>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add First Entity
            </button>
          </div>
        )}
      </div>

      {/* Create Entity Modal */}
      {showCreateModal && (
        <CreateEntityForm
          onSubmit={createEntity}
          onCancel={() => setShowCreateModal(false)}
          loading={createLoading}
        />
      )}
    </div>
  );
};

export default EntityManagement;