import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { User } from "lucide-react";
import FileUpload from "@/components/file-upload";
import AnalysisProgress from "@/components/analysis-progress";
import AnalysisResults from "@/components/analysis-results";
import QuickStats from "@/components/quick-stats";
import InteractiveChat from "@/components/interactive-chat";
import ModelStatus from "@/components/model-status";

interface AnalysisSummary {
  totalMarkers: number;
  analyzedVariants: string;
  riskFactors: number;
  lastAnalysis: string;
}

export default function GeneticsDashboard() {
  const [currentAnalysisId, setCurrentAnalysisId] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [location] = useLocation();

  const { data: analysisOverview } = useQuery<AnalysisSummary>({
    queryKey: ['/api/analysis-overview'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/analysis-overview');
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: latestAnalysis } = useQuery({
    queryKey: ['/api/latest-analysis'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/latest-analysis');
      return response.json();
    },
    refetchInterval: 30000,
  });

  const handleUploadComplete = (analysisId: number) => {
    setCurrentAnalysisId(analysisId);
    setIsAnalyzing(false);
  };

  const handleUploadStart = () => {
    setIsAnalyzing(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Genetic Analysis Dashboard
          </h1>
          <p className="text-gray-600">
            Upload and analyze your genetic data with AI-powered insights
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Upload and Progress */}
          <div className="lg:col-span-1 space-y-6">
            <FileUpload 
              onUploadComplete={handleUploadComplete}
            />
            
            <AnalysisProgress isVisible={isAnalyzing} />
            
            <QuickStats />
            
            <ModelStatus />
          </div>

          {/* Right Column - Results and Analysis */}
          <div className="lg:col-span-2 space-y-6">
            {currentAnalysisId && (
              <AnalysisResults analysisId={currentAnalysisId} />
            )}
            
            <InteractiveChat analysisId={currentAnalysisId || latestAnalysis?.id} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              <p>Adam v1.0 - Local Genetic Analysis Platform</p>
              <p className="mt-1">Running on local models for privacy and security</p>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                System Status: Operational
              </span>
              <span>Last Updated: 5 min ago</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
