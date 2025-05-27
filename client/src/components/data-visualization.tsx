import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface DataVisualizationProps {
  analysisId: number | null;
}

export default function DataVisualization({ analysisId }: DataVisualizationProps) {
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

  // Calculate visualization stats
  const highRiskCount = markers?.filter((m: any) => m.impact === 'High').length || 0;
  const moderateRiskCount = markers?.filter((m: any) => m.impact === 'Moderate').length || 0;
  const protectiveCount = markers?.filter((m: any) => m.impact === 'Low').length || 0;

  return (
    <Card className="mt-8">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Genetic Marker Visualization</h3>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              Chromosome View
            </Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              Risk Heatmap
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div className="bg-gray-50 rounded-lg p-6 h-64 flex items-center justify-center">
              <div className="text-center">
                <i className="fas fa-chart-bar text-4xl text-gray-400 mb-2"></i>
                <p className="text-gray-600">Interactive genetic risk visualization</p>
                <p className="text-sm text-gray-500">Chromosome-based risk heatmap will render here</p>
                <div className="mt-4 grid grid-cols-6 gap-2">
                  {[...Array(24)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-4 rounded ${
                        i < 6 ? 'bg-red-200' :
                        i < 12 ? 'bg-yellow-200' :
                        i < 18 ? 'bg-green-200' :
                        'bg-blue-200'
                      }`}
                      title={`Chromosome ${i + 1}`}
                    />
                  ))}
                </div>
              </div>
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
                <h4 className="font-medium text-gray-900 text-sm">{assessment.condition}</h4>
                <span className={`text-xs px-2 py-1 rounded ${
                  assessment.riskLevel.includes('High') ? 'bg-red-100 text-red-800' :
                  assessment.riskLevel.includes('Moderate') ? 'bg-yellow-100 text-yellow-800' :
                  assessment.riskLevel.includes('Low') ? 'bg-green-100 text-green-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {assessment.riskLevel}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className={`h-2 rounded-full ${
                    assessment.riskLevel.includes('High') ? 'bg-red-600' :
                    assessment.riskLevel.includes('Moderate') ? 'bg-yellow-600' :
                    assessment.riskLevel.includes('Low') ? 'bg-green-600' :
                    'bg-blue-600'
                  }`}
                  style={{ width: `${assessment.percentage}%` }}
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
