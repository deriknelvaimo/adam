import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function ModelStatus() {
  const { data: models, isLoading } = useQuery({
    queryKey: ['/api/model-status'],
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'standby':
        return 'bg-gray-100 text-gray-600';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return 'w-2 h-2 bg-green-500 rounded-full';
      case 'standby':
        return 'w-2 h-2 bg-gray-400 rounded-full';
      case 'error':
        return 'w-2 h-2 bg-red-500 rounded-full';
      default:
        return 'w-2 h-2 bg-gray-400 rounded-full';
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Local Models</h3>
        <div className="space-y-3">
          {isLoading ? (
            <>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Skeleton className="w-2 h-2 rounded-full mr-2" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-5 w-12" />
                </div>
              ))}
            </>
          ) : (
            <>
              {models?.map((model: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={getStatusIcon(model.status)} />
                    <span className="text-sm text-gray-700 ml-2">{model.name}</span>
                  </div>
                  <Badge className={getStatusColor(model.status)}>
                    {model.status.charAt(0).toUpperCase() + model.status.slice(1)}
                  </Badge>
                </div>
              )) || (
                <div className="text-center text-gray-500 text-sm">
                  No model status available
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
