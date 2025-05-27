import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Calendar, FileText, TrendingUp, User } from "lucide-react";
import { Link, useLocation } from "wouter";

interface AnalysisHistoryItem {
  id: number;
  fileName: string;
  createdAt: string;
  totalMarkers: number;
  analyzedVariants: string;
  riskFactors: number;
  status: string;
  summary: {
    highRiskCount: number;
    moderateRiskCount: number;
    lowRiskCount: number;
    totalRiskAssessments: number;
  };
}

export default function AnalysisHistory() {
  const [location] = useLocation();
  const { data: historyData, isLoading, error } = useQuery({
    queryKey: ['/api/analysis-history'],
  });

  const handleExport = async (analysisId: number, fileName: string) => {
    try {
      const response = await fetch(`/api/export/${analysisId}`);
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `genetic-analysis-${analysisId}-${fileName}.json`;
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
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="grid gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-48 mb-4" />
                  <div className="grid grid-cols-4 gap-4">
                    <Skeleton className="h-16" />
                    <Skeleton className="h-16" />
                    <Skeleton className="h-16" />
                    <Skeleton className="h-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !historyData) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load History</h2>
              <p className="text-gray-600">There was an error loading your analysis history.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analysis History</h1>
          <p className="text-gray-600">View and manage your past genetic analyses</p>
        </div>

        {historyData.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No Analyses Yet</h2>
              <p className="text-gray-600 mb-4">Upload your first genetic data file to get started</p>
              <Link href="/">
                <Button>Start New Analysis</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {historyData.map((analysis: AnalysisHistoryItem) => (
              <Card key={analysis.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        {analysis.fileName}
                      </CardTitle>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(analysis.createdAt).toLocaleDateString()}</span>
                        </div>
                        <Badge variant={analysis.status === 'completed' ? 'default' : 'secondary'}>
                          {analysis.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExport(analysis.id, analysis.fileName)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Export
                      </Button>
                      <Link href={`/analysis/${analysis.id}`}>
                        <Button size="sm">
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center mb-2">
                        <TrendingUp className="h-4 w-4 text-blue-600 mr-2" />
                        <span className="text-sm font-medium text-blue-900">Total Markers</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-900">{analysis.totalMarkers}</div>
                    </div>
                    
                    <div className="bg-red-50 p-4 rounded-lg">
                      <div className="flex items-center mb-2">
                        <div className="w-3 h-3 bg-red-600 rounded mr-2"></div>
                        <span className="text-sm font-medium text-red-900">High Risk</span>
                      </div>
                      <div className="text-2xl font-bold text-red-900">{analysis.summary.highRiskCount}</div>
                    </div>
                    
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <div className="flex items-center mb-2">
                        <div className="w-3 h-3 bg-yellow-600 rounded mr-2"></div>
                        <span className="text-sm font-medium text-yellow-900">Moderate Risk</span>
                      </div>
                      <div className="text-2xl font-bold text-yellow-900">{analysis.summary.moderateRiskCount}</div>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center mb-2">
                        <div className="w-3 h-3 bg-green-600 rounded mr-2"></div>
                        <span className="text-sm font-medium text-green-900">Low Risk</span>
                      </div>
                      <div className="text-2xl font-bold text-green-900">{analysis.summary.lowRiskCount}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}