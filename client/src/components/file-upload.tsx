import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface FileUploadProps {
  onUploadComplete: (analysisId: number, progressId?: string) => void;
  onUploadStart?: () => void;
}

export default function FileUpload({ onUploadComplete, onUploadStart }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('geneticFile', file);
      
      const response = await apiRequest('POST', '/api/genetic-analysis', formData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Analysis Complete",
        description: `Successfully analyzed ${selectedFile?.name}. Found ${data.summary.totalMarkers} genetic markers.`,
      });
      setSelectedFile(null);
      onUploadComplete(data.analysisId, data.progressId);
      queryClient.invalidateQueries({ queryKey: ['/api/analysis-overview'] });
      queryClient.invalidateQueries({ queryKey: ['/api/latest-analysis'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    const validTypes = ['text/csv', 'application/json'];
    const validExtensions = ['.csv', '.json', '.vcf', '.txt'];
    
    const isValidType = validTypes.includes(file.type) || 
      validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    
    if (!isValidType) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a CSV, JSON, VCF, or TXT file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 50MB.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <i className="fas fa-upload text-blue-600 mr-2"></i>
          DNA Data Upload
        </h2>
        
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
            isDragging 
              ? 'border-blue-600 bg-blue-50' 
              : 'border-gray-300 hover:border-blue-600'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <i className="fas fa-file-csv text-4xl text-gray-400 mb-4"></i>
          {selectedFile ? (
            <div>
              <p className="text-sm font-medium text-gray-900 mb-2">{selectedFile.name}</p>
              <p className="text-xs text-gray-500 mb-4">{formatFileSize(selectedFile.size)}</p>
              <Button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleUpload();
                }}
                disabled={uploadMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {uploadMutation.isPending ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Analyzing...
                  </>
                ) : (
                  'Start Analysis'
                )}
              </Button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-600 mb-2">Drag and drop your genetic data file</p>
              <p className="text-xs text-gray-500 mb-4">Supports CSV, JSON, VCF formats</p>
              <Button className="bg-blue-600 hover:bg-blue-700">
                Choose File
              </Button>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.json,.vcf,.txt"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
          }}
          className="hidden"
        />
        
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-start">
            <i className="fas fa-info-circle text-blue-600 mt-0.5 mr-2"></i>
            <div>
              <p className="text-sm font-medium text-blue-900">Supported Format</p>
              <p className="text-xs text-blue-700 mt-1">
                Upload genetic markers in Section 14 format or standard VCF files
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
