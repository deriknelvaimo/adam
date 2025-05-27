import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RiskAssessment } from "@shared/schema";

interface RiskAssessmentProps {
  riskAssessments: RiskAssessment[];
}

const getRiskColor = (riskLevel: string) => {
  if (riskLevel.includes('High')) return 'bg-red-100 text-red-800';
  if (riskLevel.includes('Moderate')) return 'bg-yellow-100 text-yellow-800';
  if (riskLevel.includes('Low')) return 'bg-green-100 text-green-800';
  return 'bg-blue-100 text-blue-800';
};

const getRiskBarColor = (riskLevel: string) => {
  if (riskLevel.includes('High')) return 'bg-red-600';
  if (riskLevel.includes('Moderate')) return 'bg-yellow-600';
  if (riskLevel.includes('Low')) return 'bg-green-600';
  return 'bg-blue-600';
};

export default function RiskAssessment({ riskAssessments }: RiskAssessmentProps) {
  if (riskAssessments.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <i className="fas fa-shield-alt text-2xl text-gray-400 mb-2"></i>
          <p className="text-gray-600">No risk assessments available</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {riskAssessments.map((assessment) => (
        <Card key={assessment.id} className="border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-900">{assessment.condition}</h4>
            <Badge className={getRiskColor(assessment.riskLevel)}>
              {assessment.riskLevel}
            </Badge>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div 
              className={`h-2 rounded-full ${getRiskBarColor(assessment.riskLevel)}`}
              style={{ width: `${assessment.percentage}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600">{assessment.description}</p>
          <div className="mt-2 text-right">
            <span className="text-lg font-semibold text-gray-900">
              {assessment.percentage}%
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
}
