import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import FileUpload from "@/components/file-upload";
import AnalysisResults from "@/components/analysis-results";
import InteractiveChat from "@/components/interactive-chat";
import DataVisualization from "@/components/data-visualization";
import QuickStats from "@/components/quick-stats";
import ModelStatus from "@/components/model-status";
import AnalysisProgress from "@/components/analysis-progress";
import { User } from "lucide-react";

export default function GeneticsDashboard() {
  const [currentAnalysisId, setCurrentAnalysisId] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progressId, setProgressId] = useState<string | null>(null);
  const [location] = useLocation();

  const { data: latestAnalysis } = useQuery({
    queryKey: ['/api/latest-analysis'],
    enabled: !currentAnalysisId,
  });

  // Use latest analysis if no specific analysis is selected
  const analysisId = currentAnalysisId || (latestAnalysis as any)?.id || null;

  const handleUploadComplete = (analysisId: number, progressId?: string) => {
    setCurrentAnalysisId(analysisId);
    setProgressId(progressId || null);
    setIsAnalyzing(false);
  };

  const handleUploadStart = (progressId?: string) => {
    setIsAnalyzing(true);
    // Use provided progressId or generate one
    setProgressId(progressId || Date.now().toString());
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

      {/* Progress Banner - Show prominently when analyzing */}
      {isAnalyzing && (
        <div className="bg-blue-600 text-white py-3">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-white rounded-full animate-pulse"></div>
                <span className="font-medium">Genetic Analysis in Progress</span>
                <span className="text-blue-200">• Real-time updates enabled</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Upload and Quick Stats */}
          <div className="lg:col-span-1 space-y-6">
            <FileUpload onUploadComplete={handleUploadComplete} onUploadStart={handleUploadStart} />
            
            {/* Show progress prominently when analyzing */}
            {isAnalyzing && (
              <div className="order-first">
                <AnalysisProgress isAnalyzing={isAnalyzing} progressId={progressId || undefined} />
              </div>
            )}
            
            <QuickStats />
            <ModelStatus />
          </div>

          {/* Center Column: Analysis Results */}
          <div className="lg:col-span-2 space-y-6">
            <AnalysisResults analysisId={analysisId} isAnalyzing={isAnalyzing} />
            <InteractiveChat analysisId={analysisId} />
          </div>
        </div>

        {/* Data Visualization */}
        <DataVisualization analysisId={analysisId} />
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
