import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function QuickStats() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ['/api/analysis-overview'],
  });

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Analysis Overview</h3>
        <div className="space-y-4">
          {isLoading ? (
            <>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex justify-between items-center">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Markers</span>
                <span className="font-semibold text-gray-900">
                  {overview?.totalMarkers || '0'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Analyzed Variants</span>
                <span className="font-semibold text-gray-900">
                  {overview?.analyzedVariants || '0%'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Risk Factors</span>
                <span className="font-semibold text-yellow-600">
                  {overview?.riskFactors || '0 High'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Last Analysis</span>
                <span className="text-sm text-gray-600">
                  {overview?.lastAnalysis || 'No analysis yet'}
                </span>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
