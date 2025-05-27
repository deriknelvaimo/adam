import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useLocation, useParams } from "wouter";
import { ArrowLeft, Download, User } from "lucide-react";
import AnalysisResults from "@/components/analysis-results";
import InteractiveChat from "@/components/interactive-chat";
import DataVisualization from "@/components/data-visualization";
import { GeneticAnalysis, GeneticMarker, RiskAssessment } from "@shared/schema";

interface AnalysisDetailsResponse {
  analysis: GeneticAnalysis;
  markers: GeneticMarker[];
  riskAssessments: RiskAssessment[];
}

export default function AnalysisDetails() {
  const [location] = useLocation();
  const params = useParams();
  const analysisId = parseInt(params.id || '0');

  const { data: analysisData, isLoading, error } = useQuery<AnalysisDetailsResponse>({
    queryKey: [`/api/analysis/${analysisId}`],
    enabled: !isNaN(analysisId) && analysisId > 0,
  });

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/export/${analysisId}`);
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `genetic-analysis-${analysisId}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export analysis');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <div className="flex-shrink-0 flex items-center">
                  <i className="fas fa-dna text-2xl text-blue-600 mr-3"></i>
                  <span className="text-xl font-bold text-gray-900">Adam</span>
                </div>
                <nav className="hidden md:ml-8 md:flex md:space-x-8">
                  <Link href="/" className={`px-1 pt-1 text-sm font-medium ${
                    location === '/' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
                  }`}>
                    Analysis
                  </Link>
                  <a href="#" className="text-gray-500 hover:text-gray-700 px-1 pt-1 text-sm font-medium">
                    Reports
                  </a>
                  <Link href="/history" className={`px-1 pt-1 text-sm font-medium ${
                    location === '/history' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
                  }`}>
                    History
                  </Link>
                  <a href="#" className="text-gray-500 hover:text-gray-700 px-1 pt-1 text-sm font-medium">
                    Settings
                  </a>
                </nav>
              </div>
              <div className="flex items-center space-x-4">
                <button className="text-gray-500 hover:text-gray-700">
                  <i className="fas fa-bell text-lg"></i>
                </button>
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-96" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !analysisData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <div className="flex-shrink-0 flex items-center">
                  <i className="fas fa-dna text-2xl text-blue-600 mr-3"></i>
                  <span className="text-xl font-bold text-gray-900">Adam</span>
                </div>
                <nav className="hidden md:ml-8 md:flex md:space-x-8">
                  <Link href="/" className="text-gray-500 hover:text-gray-700 px-1 pt-1 text-sm font-medium">
                    Analysis
                  </Link>
                  <a href="#" className="text-gray-500 hover:text-gray-700 px-1 pt-1 text-sm font-medium">
                    Reports
                  </a>
                  <Link href="/history" className="text-gray-500 hover:text-gray-700 px-1 pt-1 text-sm font-medium">
                    History
                  </Link>
                  <a href="#" className="text-gray-500 hover:text-gray-700 px-1 pt-1 text-sm font-medium">
                    Settings
                  </a>
                </nav>
              </div>
              <div className="flex items-center space-x-4">
                <button className="text-gray-500 hover:text-gray-700">
                  <i className="fas fa-bell text-lg"></i>
                </button>
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Analysis Not Found</h2>
              <p className="text-gray-600 mb-4">The requested analysis could not be found or may have been deleted.</p>
              <Link href="/history">
                <Button>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to History
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { analysis } = analysisData;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <i className="fas fa-dna text-2xl text-blue-600 mr-3"></i>
                <span className="text-xl font-bold text-gray-900">Adam</span>
              </div>
              <nav className="hidden md:ml-8 md:flex md:space-x-8">
                <Link href="/" className="text-gray-500 hover:text-gray-700 px-1 pt-1 text-sm font-medium">
                  Analysis
                </Link>
                <a href="#" className="text-gray-500 hover:text-gray-700 px-1 pt-1 text-sm font-medium">
                  Reports
                </a>
                <Link href="/history" className="text-gray-500 hover:text-gray-700 px-1 pt-1 text-sm font-medium">
                  History
                </Link>
                <a href="#" className="text-gray-500 hover:text-gray-700 px-1 pt-1 text-sm font-medium">
                  Settings
                </a>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <button className="text-gray-500 hover:text-gray-700">
                <i className="fas fa-bell text-lg"></i>
              </button>
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with back button */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center mb-2">
              <Link href="/history">
                <Button variant="ghost" size="sm" className="mr-3">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to History
                </Button>
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Analysis Details</h1>
            </div>
            <p className="text-gray-600">
              Viewing analysis: {analysis?.fileName} (Analysis #{analysisId})
            </p>
          </div>
          <Button onClick={handleExport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Analysis
          </Button>
        </div>

        <div className="space-y-8">
          {/* Analysis Results */}
          <AnalysisResults analysisId={analysisId} />

          {/* Interactive Chat */}
          <InteractiveChat analysisId={analysisId} />

          {/* Data Visualization */}
          <DataVisualization analysisId={analysisId} />
        </div>
      </div>
    </div>
  );
}