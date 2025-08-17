import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Shield, 
  Users, 
  Mail, 
  Phone, 
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  FileText
} from 'lucide-react';

interface EntityProfileProps {
  entityId: number;
}

interface SupervisedEntity {
  id: number;
  denomination: string;
  commercial_name?: string;
  category: string;
  registration_number?: string;
  tax_id?: string;
  headquarters_address?: string;
  city?: string;
  status: string;
  authorized_capital?: number;
  paid_capital?: number;
  activities_authorized?: string[];
  license_number?: string;
  pep_exposure?: boolean;
  foreign_clients_ratio?: number;
  cash_transactions_volume?: number;
  created_at: string;
  updated_at: string;
  notes?: string;
  directors: EntityDirector[];
  lbc_contacts: EntityLBCContact[];
}

interface EntityDirector {
  id: number;
  full_name: string;
  position_title: string;
  is_effective_director: boolean;
  appointment_date: string;
  is_active: boolean;
  tenure_years: number;
}

interface EntityLBCContact {
  id: number;
  full_name: string;
  position_title: string;
  email: string;
  phone: string;
  is_primary_contact: boolean;
  is_compliance_officer: boolean;
  certification_status: string;
  training_status: string;
}


const EntityProfile: React.FC<EntityProfileProps> = ({ entityId }) => {
  const [entity, setEntity] = useState<SupervisedEntity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchEntityDetails();
  }, [entityId]);

  const fetchEntityDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching entity details for ID:', entityId);
      
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await fetch(`/api/v1/entities/${entityId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error(`Failed to fetch entity details: ${response.status}`);
      }

      const data = await response.json();
      console.log('Entity data received:', data);
      setEntity(data);
    } catch (err) {
      console.error('Error in fetchEntityDetails:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };


  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'text-green-600 bg-green-50';
      case 'inactive': return 'text-gray-600 bg-gray-50';
      case 'suspended': return 'text-red-600 bg-red-50';
      case 'under_investigation': return 'text-orange-600 bg-orange-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Chargement du profil de l'entité...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
          <span className="text-red-800">{error}</span>
        </div>
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="text-center p-8">
        <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Entité non trouvée</h3>
        <p className="text-gray-500">L'entité demandée n'a pas pu être trouvée.</p>
        <button
          onClick={fetchEntityDetails}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Réessayer
        </button>
      </div>
    );
  }

  console.log('Rendering entity profile for:', entity.denomination);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{entity.denomination}</h1>
              {entity.commercial_name && (
                <p className="text-gray-600 mt-1">Nom commercial: {entity.commercial_name}</p>
              )}
              <div className="flex items-center space-x-4 mt-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(entity.status)}`}>
                  {entity.status}
                </span>
                <span className="text-sm text-gray-500">
                  {entity.category.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right text-sm text-gray-500">
            <p>Créé le {formatDate(entity.created_at)}</p>
            <p>Mis à jour le {formatDate(entity.updated_at)}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Vue d\'ensemble', icon: Building2 },
              { id: 'directors', label: 'Dirigeants', icon: Users },
              { id: 'contacts', label: 'Contacts LBC/FT', icon: Mail }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Informations générales
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-gray-500">N° d'immatriculation</div>
                    <div className="mt-1 text-sm text-gray-900">{entity.registration_number || 'N/A'}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-gray-500">Identifiant fiscal</div>
                    <div className="mt-1 text-sm text-gray-900">{entity.tax_id || 'N/A'}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-gray-500">N° de licence</div>
                    <div className="mt-1 text-sm text-gray-900">{entity.license_number || 'N/A'}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-gray-500">Siège social</div>
                    <div className="mt-1 text-sm text-gray-900">
                      <div className="flex items-start">
                        <MapPin className="h-4 w-4 text-gray-400 mr-1 mt-0.5" />
                        <div>
                          {entity.headquarters_address && <div>{entity.headquarters_address}</div>}
                          {entity.city && <div>{entity.city}</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-gray-500">Capital autorisé</div>
                    <div className="mt-1 text-sm text-gray-900">{formatCurrency(entity.authorized_capital)}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-gray-500">Capital libéré</div>
                    <div className="mt-1 text-sm text-gray-900">{formatCurrency(entity.paid_capital)}</div>
                  </div>
                </div>
              </div>

              {/* Activities */}
              {entity.activities_authorized && entity.activities_authorized.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Activités autorisées</h3>
                  <div className="flex flex-wrap gap-2">
                    {entity.activities_authorized.map((activity, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {activity}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Financial Metrics */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Indicateurs financiers clés
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-gray-500">Capital Autorisé</div>
                    <div className="mt-1 text-lg font-semibold text-gray-900">
                      {formatCurrency(entity.authorized_capital)}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-gray-500">Capital Libéré</div>
                    <div className="mt-1 text-lg font-semibold text-gray-900">
                      {formatCurrency(entity.paid_capital)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Risk Indicators */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Indicateurs de risque
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                    <div className="text-sm font-medium text-yellow-800">Exposition aux PPE</div>
                    <div className="mt-1 text-sm text-yellow-700">
                      {entity.pep_exposure ? 'Oui' : 'Non'}
                    </div>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                    <div className="text-sm font-medium text-yellow-800">Clients étrangers</div>
                    <div className="mt-1 text-sm text-yellow-700">
                      {entity.foreign_clients_ratio ? `${(entity.foreign_clients_ratio * 100).toFixed(1)}%` : 'N/A'}
                    </div>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                    <div className="text-sm font-medium text-yellow-800">Volume transactions liquides</div>
                    <div className="mt-1 text-sm text-yellow-700">
                      {formatCurrency(entity.cash_transactions_volume)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}


          {/* Directors Tab */}
          {activeTab === 'directors' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Dirigeants ({entity.directors.length})
              </h3>
              {entity.directors.length > 0 ? (
                <div className="space-y-4">
                  {entity.directors.map((director) => (
                    <div key={director.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h4 className="text-lg font-medium text-gray-900">{director.full_name}</h4>
                            {director.is_effective_director && (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                Dirigeant effectif
                              </span>
                            )}
                            {!director.is_active && (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                Inactif
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 mt-1">{director.position_title}</p>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                            <span className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              Nommé le {formatDate(director.appointment_date)}
                            </span>
                            <span className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {director.tenure_years} années d'ancienneté
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8 bg-gray-50 rounded-lg">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Aucun dirigeant enregistré</p>
                </div>
              )}
            </div>
          )}

          {/* Contacts Tab */}
          {activeTab === 'contacts' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Mail className="h-5 w-5 mr-2" />
                Contacts LBC/FT ({entity.lbc_contacts.length})
              </h3>
              {entity.lbc_contacts.length > 0 ? (
                <div className="space-y-4">
                  {entity.lbc_contacts.map((contact) => (
                    <div key={contact.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h4 className="text-lg font-medium text-gray-900">{contact.full_name}</h4>
                            {contact.is_primary_contact && (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                                Contact principal
                              </span>
                            )}
                            {contact.is_compliance_officer && (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                Responsable conformité
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 mt-1">{contact.position_title}</p>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                            <span className="flex items-center">
                              <Mail className="h-4 w-4 mr-1" />
                              {contact.email}
                            </span>
                            <span className="flex items-center">
                              <Phone className="h-4 w-4 mr-1" />
                              {contact.phone}
                            </span>
                          </div>
                          <div className="flex items-center space-x-4 mt-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              contact.certification_status === 'valid'
                                ? 'bg-green-100 text-green-800'
                                : contact.certification_status === 'expired'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              Certification: {contact.certification_status}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              contact.training_status === 'current'
                                ? 'bg-green-100 text-green-800'
                                : contact.training_status === 'overdue'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              Formation: {contact.training_status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8 bg-gray-50 rounded-lg">
                  <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Aucun contact LBC/FT enregistré</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Notes Section */}
      {entity.notes && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Notes</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-gray-700 whitespace-pre-wrap">{entity.notes}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EntityProfile;