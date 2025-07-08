import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface AnalysisProgressProps {
  isVisible: boolean;
}

export default function AnalysisProgress({ isVisible }: AnalysisProgressProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <i className="fas fa-dna text-blue-600 mr-2"></i>
            Analysis in Progress
          </h3>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">Processing...</span>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Analyzing genetic markers</span>
              <span>Please wait...</span>
            </div>
            <Progress value={undefined} className="h-2" />
          </div>
          
          <div className="text-sm text-gray-500">
            <p>Your genetic data is being analyzed by our AI model.</p>
            <p>This may take a few minutes depending on the file size.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}