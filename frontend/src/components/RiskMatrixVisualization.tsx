import React, { useState, useEffect, useMemo } from 'react';
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { 
  Shield, 
  TrendingUp, 
  AlertTriangle, 
  Info,
  RefreshCw,
  Download,
  Eye
} from 'lucide-react';

interface RiskMatrixProps {
  entityId: number;
  onEntityClick?: (entityId: number) => void;
  showControls?: boolean;
}

interface MatrixData {
  entity_id: number;
  has_complete_assessment: boolean;
  inherent_risk: {
    score: number | null;
    level: string | null;
    date: string | null;
  };
  dmr_score: {
    score: number | null;
    level: string | null;
    date: string | null;
  };
  net_risk: {
    score: number | null;
    level: string | null;
    date: string | null;
  };
  matrix_position?: {
    inherent_position: { x: number; y: number; label: string };
    dmr_position: { x: number; y: number; label: string };
    net_position: { x: number; y: number; value: number; label: string };
    matrix_cell: string;
    visualization_data: {
      inherent_risk_axis: { min: number; max: number; label: string };
      dmr_axis: { min: number; max: number; label: string };
      risk_zones: Array<{
        zone: string;
        color: string;
        range: [number, number];
      }>;
    };
  };
}

interface EntityPoint {
  entityId: number;
  entityName?: string;
  inherentRisk: number;
  dmrScore: number;
  netRisk: number;
  riskLevel: string;
  matrixCell: string;
}

const RiskMatrixVisualization: React.FC<RiskMatrixProps> = ({ 
  entityId, 
  onEntityClick,
  showControls = true 
}) => {
  const [matrixData, setMatrixData] = useState<MatrixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'single' | 'all'>('single');

  useEffect(() => {
    fetchMatrixData();
  }, [entityId]);

  const fetchMatrixData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/v1/risk-scoring/matrix/${entityId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch matrix data');
      }

      const data = await response.json();
      setMatrixData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatRiskLevel = (level: string | null) => {
    if (!level) return 'N/A';
    return level.toUpperCase();
  };

  const getRiskLevelColor = (level: string | null) => {
    if (!level) return '#94a3b8'; // gray-400
    
    switch (level.toLowerCase()) {
      case 'low': return '#22c55e'; // green-500
      case 'medium': return '#eab308'; // yellow-500
      case 'high': return '#f97316'; // orange-500
      case 'critical': return '#ef4444'; // red-500
      default: return '#94a3b8'; // gray-400
    }
  };

  const getZoneColor = (inherent: number, dmr: number) => {
    // Net risk calculation for coloring
    const netRisk = inherent * (1 - dmr / 200);
    
    if (netRisk >= 80) return '#fecaca'; // red-200
    if (netRisk >= 60) return '#fed7aa'; // orange-200  
    if (netRisk >= 40) return '#fef3c7'; // yellow-200
    return '#d1fae5'; // green-200
  };

  const matrixPoints = useMemo(() => {
    if (!matrixData || !matrixData.has_complete_assessment) return [];

    const point: EntityPoint = {
      entityId: matrixData.entity_id,
      entityName: `Entity ${matrixData.entity_id}`,
      inherentRisk: matrixData.inherent_risk.score || 0,
      dmrScore: matrixData.dmr_score.score || 0,
      netRisk: matrixData.net_risk.score || 0,
      riskLevel: matrixData.net_risk.level || 'unknown',
      matrixCell: matrixData.matrix_position?.matrix_cell || 'N/A'
    };

    return [point];
  }, [matrixData]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as EntityPoint;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{data.entityName}</p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Risque Inhérent:</span> {data.inherentRisk.toFixed(1)}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Score DMR:</span> {data.dmrScore.toFixed(1)}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Risque Net:</span> {data.netRisk.toFixed(1)}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Niveau:</span> {formatRiskLevel(data.riskLevel)}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Cellule:</span> {data.matrixCell}
          </p>
        </div>
      );
    }
    return null;
  };

  const generateBackgroundZones = () => {
    if (!matrixData?.matrix_position?.visualization_data) return [];
    
    const zones = [];
    const step = 10;
    
    for (let i = 0; i <= 100; i += step) {
      for (let j = 0; j <= 100; j += step) {
        zones.push({
          x: i,
          y: j,
          color: getZoneColor(i, j)
        });
      }
    }
    
    return zones;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 bg-white rounded-lg border">
        <RefreshCw className="h-6 w-6 text-blue-600 animate-spin mr-2" />
        <span className="text-gray-600">Chargement de la matrice des risques...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
          <span className="text-red-800">{error}</span>
        </div>
        <button 
          onClick={fetchMatrixData}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (!matrixData) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-lg">
        <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Aucune donnée de matrice disponible</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Shield className="h-6 w-6 mr-2 text-blue-600" />
            Matrice des Risques
          </h2>
          <p className="text-gray-600 mt-1">
            Positionnement bidimensionnel : Risque Inhérent × Dispositif de Maîtrise des Risques
          </p>
        </div>
        
        {showControls && (
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchMatrixData}
              className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Actualiser
            </button>
            <button
              onClick={() => {/* TODO: Export functionality */}}
              className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-1" />
              Exporter
            </button>
          </div>
        )}
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center">
            <div className="bg-blue-100 p-2 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Risque Inhérent</p>
              <div className="flex items-center">
                <p className="text-2xl font-semibold text-gray-900">
                  {matrixData.inherent_risk.score?.toFixed(1) || 'N/A'}
                </p>
                {matrixData.inherent_risk.level && (
                  <span 
                    className="ml-2 px-2 py-1 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: getRiskLevelColor(matrixData.inherent_risk.level) }}
                  >
                    {formatRiskLevel(matrixData.inherent_risk.level)}
                  </span>
                )}
              </div>
              {matrixData.inherent_risk.date && (
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(matrixData.inherent_risk.date).toLocaleDateString('fr-FR')}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center">
            <div className="bg-green-100 p-2 rounded-lg">
              <Shield className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Score DMR</p>
              <div className="flex items-center">
                <p className="text-2xl font-semibold text-gray-900">
                  {matrixData.dmr_score.score?.toFixed(1) || 'N/A'}
                </p>
                {matrixData.dmr_score.level && (
                  <span 
                    className="ml-2 px-2 py-1 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: getRiskLevelColor(matrixData.dmr_score.level) }}
                  >
                    {formatRiskLevel(matrixData.dmr_score.level)}
                  </span>
                )}
              </div>
              {matrixData.dmr_score.date && (
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(matrixData.dmr_score.date).toLocaleDateString('fr-FR')}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center">
            <div className="bg-orange-100 p-2 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Risque Net</p>
              <div className="flex items-center">
                <p className="text-2xl font-semibold text-gray-900">
                  {matrixData.net_risk.score?.toFixed(1) || 'N/A'}
                </p>
                {matrixData.net_risk.level && (
                  <span 
                    className="ml-2 px-2 py-1 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: getRiskLevelColor(matrixData.net_risk.level) }}
                  >
                    {formatRiskLevel(matrixData.net_risk.level)}
                  </span>
                )}
              </div>
              {matrixData.net_risk.date && (
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(matrixData.net_risk.date).toLocaleDateString('fr-FR')}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Matrix Visualization */}
      {matrixData.has_complete_assessment && matrixPoints.length > 0 ? (
        <div className="bg-white p-6 rounded-lg border">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Positionnement dans la Matrice
            </h3>
            <p className="text-sm text-gray-600">
              Position: {matrixData.matrix_position?.matrix_cell} 
              (Inhérent-DMR: {matrixData.inherent_risk.score?.toFixed(0)}-{matrixData.dmr_score.score?.toFixed(0)})
            </p>
          </div>

          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart
                margin={{ top: 20, right: 30, bottom: 60, left: 60 }}
                data={matrixPoints}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                
                {/* Risk zones background */}
                {generateBackgroundZones().map((zone, index) => (
                  <Cell key={index} fill={zone.color} fillOpacity={0.1} />
                ))}
                
                <XAxis 
                  type="number" 
                  dataKey="inherentRisk"
                  domain={[0, 100]}
                  axisLine={{ stroke: '#6b7280' }}
                  tickLine={{ stroke: '#6b7280' }}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  label={{ 
                    value: 'Risque Inhérent (%)', 
                    position: 'insideBottom', 
                    offset: -5,
                    style: { textAnchor: 'middle', fill: '#374151', fontWeight: 500 }
                  }}
                />
                
                <YAxis 
                  type="number" 
                  dataKey="dmrScore"
                  domain={[0, 100]}
                  axisLine={{ stroke: '#6b7280' }}
                  tickLine={{ stroke: '#6b7280' }}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  label={{ 
                    value: 'Dispositif de Maîtrise des Risques (%)', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { textAnchor: 'middle', fill: '#374151', fontWeight: 500 }
                  }}
                />
                
                <Tooltip content={<CustomTooltip />} />
                
                <Legend 
                  verticalAlign="top" 
                  height={36}
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: '20px' }}
                />
                
                <Scatter 
                  name="Entité supervisée"
                  data={matrixPoints}
                  fill="#3b82f6"
                  onClick={(data) => onEntityClick && onEntityClick(data.entityId)}
                  cursor="pointer"
                >
                  {matrixPoints.map((point, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getRiskLevelColor(point.riskLevel)}
                      stroke="#ffffff"
                      strokeWidth={2}
                      r={8}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-200 rounded mr-2"></div>
              <span className="text-gray-600">Risque Faible (0-40)</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-yellow-200 rounded mr-2"></div>
              <span className="text-gray-600">Risque Moyen (40-60)</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-orange-200 rounded mr-2"></div>
              <span className="text-gray-600">Risque Élevé (60-80)</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-200 rounded mr-2"></div>
              <span className="text-gray-600">Risque Critique (80-100)</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Évaluation incomplète
          </h3>
          <p className="text-gray-600 mb-4">
            {!matrixData.inherent_risk.score && !matrixData.dmr_score.score
              ? 'Les scores de risque inhérent et DMR sont requis pour générer la matrice.'
              : !matrixData.inherent_risk.score
              ? 'Le score de risque inhérent est requis.'
              : 'Le score DMR est requis.'
            }
          </p>
          <button
            onClick={() => {/* TODO: Navigate to scoring */}}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Lancer l'évaluation des risques
          </button>
        </div>
      )}

      {/* Interpretation Guide */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-3" />
          <div>
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              Interprétation de la Matrice
            </h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p>
                <strong>Axe horizontal (Risque Inhérent):</strong> Exposition naturelle aux risques LBC/FT
              </p>
              <p>
                <strong>Axe vertical (DMR):</strong> Efficacité du dispositif de maîtrise des risques
              </p>
              <p>
                <strong>Risque Net:</strong> Résultat de la combinaison Risque Inhérent × (100 - Efficacité DMR)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskMatrixVisualization;