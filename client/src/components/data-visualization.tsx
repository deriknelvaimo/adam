import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface DataVisualizationProps {
  analysisId: number | null;
}

export default function DataVisualization({ analysisId }: DataVisualizationProps) {
  const [viewMode, setViewMode] = useState<'chromosome' | 'heatmap'>('chromosome');
  
  const { data: analysisData, isLoading } = useQuery({
    queryKey: ['/api/genetic-analysis', analysisId],
    enabled: !!analysisId,
  });

  if (!analysisId) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="mt-8">
        <CardContent className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-1/3" />
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3">
                <Skeleton className="h-64" />
              </div>
              <div className="lg:col-span-1 space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysisData) {
    return null;
  }

  const { markers, riskAssessments } = analysisData;

  // Calculate visualization stats from actual data
  const highRiskCount = markers?.filter((m: any) => m.impact === 'High').length || 0;
  const moderateRiskCount = markers?.filter((m: any) => m.impact === 'Moderate').length || 0;
  const protectiveCount = markers?.filter((m: any) => m.impact === 'Low' || m.impact === 'Protective').length || 0;
  
  // Group markers by chromosome for visualization
  const chromosomeData = markers?.reduce((acc: any, marker: any) => {
    const chr = marker.chromosome || 'Unknown';
    if (!acc[chr]) acc[chr] = [];
    acc[chr].push(marker);
    return acc;
  }, {}) || {};

  return (
    <Card className="mt-8">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Genetic Marker Visualization</h3>
          <div className="flex space-x-2">
            <Button 
              variant={viewMode === 'chromosome' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setViewMode('chromosome')}
            >
              Chromosome View
            </Button>
            <Button 
              variant={viewMode === 'heatmap' ? 'default' : 'outline'}
              size="sm" 
              className={viewMode === 'heatmap' ? "bg-blue-600 hover:bg-blue-700" : ""}
              onClick={() => setViewMode('heatmap')}
            >
              Risk Heatmap
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div className="bg-gray-50 rounded-lg p-6">
              {viewMode === 'chromosome' ? (
                <>
                  <h4 className="text-md font-medium mb-4">Chromosome Distribution</h4>
                  <div className="space-y-3">
                    {Object.keys(chromosomeData).map((chr) => (
                      <div key={chr} className="flex items-center space-x-4">
                        <div className="w-20 text-sm font-medium text-gray-700">
                          Chr {chr}
                        </div>
                        <div className="flex-1 flex space-x-2">
                          {chromosomeData[chr].map((marker: any, idx: number) => (
                            <div
                              key={idx}
                              className={`h-8 px-3 rounded flex items-center text-xs font-medium text-white ${
                                marker.impact === 'High' ? 'bg-red-500' :
                                marker.impact === 'Moderate' ? 'bg-yellow-500' :
                                marker.impact === 'Low' ? 'bg-green-500' :
                                'bg-gray-400'
                              }`}
                              title={`${marker.gene} (${marker.variant}) - ${marker.impact} impact`}
                            >
                              {marker.gene}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {markers && markers.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-md font-medium mb-3">Genetic Marker Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {markers.map((marker: any, idx: number) => (
                          <div key={idx} className="border rounded-lg p-3 bg-white">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-900">{marker.gene}</span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                marker.impact === 'High' ? 'bg-red-100 text-red-800' :
                                marker.impact === 'Moderate' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {marker.impact}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              {marker.variant} • Chr {marker.chromosome} • {marker.genotype}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h4 className="text-md font-medium mb-4">Risk Heatmap</h4>
                  <div className="grid grid-cols-6 gap-2 mb-6">
                    {Array.from({ length: 22 }, (_, i) => i + 1).concat(['X', 'Y']).map((chr) => {
                      const chrMarkers = chromosomeData[chr.toString()] || [];
                      const hasHighRisk = chrMarkers.some((m: any) => m.impact === 'High');
                      const hasModerateRisk = chrMarkers.some((m: any) => m.impact === 'Moderate');
                      const hasLowRisk = chrMarkers.some((m: any) => m.impact === 'Low');
                      
                      return (
                        <div
                          key={chr}
                          className={`h-16 rounded-lg flex flex-col items-center justify-center text-xs font-medium ${
                            hasHighRisk ? 'bg-red-500 text-white' :
                            hasModerateRisk ? 'bg-yellow-500 text-white' :
                            hasLowRisk ? 'bg-green-500 text-white' :
                            'bg-gray-200 text-gray-600'
                          }`}
                          title={chrMarkers.length > 0 ? `${chrMarkers.length} marker(s)` : 'No markers'}
                        >
                          <div>{chr}</div>
                          <div className="text-xs">{chrMarkers.length}</div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-gray-900">Risk Summary by Gene</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {markers?.map((marker: any, idx: number) => (
                        <div
                          key={idx}
                          className={`p-4 rounded-lg border-l-4 ${
                            marker.impact === 'High' ? 'border-red-500 bg-red-50' :
                            marker.impact === 'Moderate' ? 'border-yellow-500 bg-yellow-50' :
                            'border-green-500 bg-green-50'
                          }`}
                        >
                          <div className="font-medium text-gray-900">{marker.gene}</div>
                          <div className="text-sm text-gray-600">{marker.variant}</div>
                          <div className={`text-xs font-medium mt-1 ${
                            marker.impact === 'High' ? 'text-red-800' :
                            marker.impact === 'Moderate' ? 'text-yellow-800' :
                            'text-green-800'
                          }`}>
                            {marker.impact} Impact
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="lg:col-span-1">
            <div className="space-y-4">
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <div className="w-3 h-3 bg-red-600 rounded mr-2"></div>
                  <span className="font-medium text-red-900">High Risk</span>
                </div>
                <p className="text-sm text-red-700">Variants requiring attention</p>
                <p className="text-2xl font-bold text-red-900 mt-1">{highRiskCount}</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <div className="w-3 h-3 bg-yellow-600 rounded mr-2"></div>
                  <span className="font-medium text-yellow-900">Moderate Risk</span>
                </div>
                <p className="text-sm text-yellow-700">Variants to monitor</p>
                <p className="text-2xl font-bold text-yellow-900 mt-1">{moderateRiskCount}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <div className="w-3 h-3 bg-green-600 rounded mr-2"></div>
                  <span className="font-medium text-green-900">Protective</span>
                </div>
                <p className="text-sm text-green-700">Beneficial variants</p>
                <p className="text-2xl font-bold text-green-900 mt-1">{protectiveCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Distribution Chart */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {riskAssessments?.map((assessment: any, index: number) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900 text-sm">{assessment.category}</h4>
                <span className={`text-xs px-2 py-1 rounded ${
                  parseFloat(assessment.riskLevel) >= 4 ? 'bg-red-100 text-red-800' :
                  parseFloat(assessment.riskLevel) >= 3 ? 'bg-yellow-100 text-yellow-800' :
                  parseFloat(assessment.riskLevel) >= 2 ? 'bg-blue-100 text-blue-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {parseFloat(assessment.riskLevel) >= 4 ? 'High' :
                   parseFloat(assessment.riskLevel) >= 3 ? 'Moderate' :
                   parseFloat(assessment.riskLevel) >= 2 ? 'Low' : 'Protective'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className={`h-2 rounded-full ${
                    parseFloat(assessment.riskLevel) >= 4 ? 'bg-red-600' :
                    parseFloat(assessment.riskLevel) >= 3 ? 'bg-yellow-600' :
                    parseFloat(assessment.riskLevel) >= 2 ? 'bg-blue-600' :
                    'bg-green-600'
                  }`}
                  style={{ width: `${(parseFloat(assessment.riskLevel) / 5) * 100}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-600">{assessment.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
