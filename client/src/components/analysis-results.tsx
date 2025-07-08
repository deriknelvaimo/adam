import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import RiskAssessment from "@/components/risk-assessment";
import GeneticMarkersTable from "@/components/genetic-markers-table";

interface AnalysisResultsProps {
  analysisId: number | null;
  isAnalyzing?: boolean;
}

export default function AnalysisResults({ analysisId, isAnalyzing = false }: AnalysisResultsProps) {
  const { data: analysisData, isLoading } = useQuery({
    queryKey: ['/api/genetic-analysis', analysisId],
    enabled: !!analysisId,
  });

  if (!analysisId) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <i className="fas fa-dna text-4xl text-gray-400 mb-4"></i>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Analysis Available</h3>
            <p className="text-sm text-gray-600">Upload your genetic data to get started with analysis</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isAnalyzing) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Analysis in Progress</h3>
            <p className="text-sm text-gray-600 mb-4">Your genetic data is being analyzed by our local AI model</p>
            
            <div className="max-w-md mx-auto space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Processing genetic markers...</span>
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  Live
                </Badge>
              </div>
              <Progress value={45} className="w-full" />
              <p className="text-xs text-gray-500">
                This may take a few minutes depending on the number of markers
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
            <Skeleton className="h-64" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysisData) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <i className="fas fa-exclamation-triangle text-4xl text-yellow-500 mb-4"></i>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Analysis Not Found</h3>
            <p className="text-sm text-gray-600">The requested analysis could not be found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { analysis, markers, riskAssessments } = (analysisData as any) || { analysis: null, markers: [], riskAssessments: [] };

  return (
    <Card>
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Genetic Analysis Report</h2>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              <i className="fas fa-download"></i>
            </Button>
            <Button variant="ghost" size="sm">
              <i className="fas fa-share"></i>
            </Button>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Analysis of {analysis?.fileName || 'genetic data'} ({analysis?.totalMarkers?.toLocaleString() || '0'} markers)
        </p>
      </div>

      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Risk Assessment Summary */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Assessment Summary</h3>
            <RiskAssessment riskAssessments={riskAssessments || []} />
          </div>

          {/* Genetic Markers Table */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Key Genetic Markers</h3>
            <GeneticMarkersTable markers={markers || []} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
