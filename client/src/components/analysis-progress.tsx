import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface ProgressMessage {
  type: 'analysis_started' | 'marker_progress' | 'marker_complete' | 'analysis_complete' | 'connected';
  current?: number;
  total?: number;
  totalMarkers?: number;
  gene?: string;
  variant?: string;
  impact?: string;
  message: string;
}

interface AnalysisProgressProps {
  isAnalyzing: boolean;
  progressId?: string;
}

export default function AnalysisProgress({ isAnalyzing, progressId }: AnalysisProgressProps) {
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState('');
  const [completedMarkers, setCompletedMarkers] = useState<Array<{gene: string, impact: string}>>([]);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!isAnalyzing || !progressId) {
      // Reset when not analyzing
      setProgress(0);
      setCurrentMessage('');
      setCompletedMarkers([]);
      setTotal(0);
      setCurrent(0);
      setIsConnected(false);
      
      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    // Connect to Server-Sent Events for real-time progress
    const connectToProgress = () => {
      try {
        console.log('Attempting to connect to progress stream:', `/api/progress/${progressId}`);
        const eventSource = new EventSource(`/api/progress/${progressId}`);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          console.log('✅ Progress connection established successfully');
          setIsConnected(true);
        };

        eventSource.onmessage = (event) => {
          try {
            console.log('📨 Received progress message:', event.data);
            const data: ProgressMessage = JSON.parse(event.data);
            console.log('📊 Parsed progress data:', data);

            switch (data.type) {
              case 'analysis_started':
                console.log('🚀 Analysis started:', data.message);
                setCurrentMessage(data.message);
                setTotal(data.total || 0);
                setProgress(5);
                break;

              case 'marker_progress':
                console.log('🔬 Marker progress:', data.current, '/', data.total);
                setCurrentMessage(data.message);
                setCurrent(data.current || 0);
                if (data.total) {
                  const progressPercent = Math.round(((data.current || 0) / data.total) * 90) + 5;
                  setProgress(progressPercent);
                }
                break;

              case 'marker_complete':
                console.log('✅ Marker complete:', data.gene, data.impact);
                setCurrent(data.current || 0);
                if (data.gene && data.impact) {
                  setCompletedMarkers(prev => [...prev, { gene: data.gene!, impact: data.impact! }]);
                }
                if (data.total) {
                  const progressPercent = Math.round(((data.current || 0) / data.total) * 90) + 5;
                  setProgress(progressPercent);
                }
                break;

              case 'analysis_complete':
                console.log('🎉 Analysis complete!');
                setProgress(100);
                setCurrentMessage(data.message);
                setIsConnected(false);
                eventSource.close();
                break;

              case 'connected':
                console.log('🔗 SSE connection confirmed');
                break;

              default:
                console.log('❓ Unknown progress type:', data.type);
            }
          } catch (error) {
            console.error('❌ Error parsing progress message:', error);
            console.error('Raw message:', event.data);
          }
        };

        eventSource.onerror = (error) => {
          console.error('❌ Progress connection error:', error);
          setIsConnected(false);
          eventSource.close();
          
          // Fallback to simulated progress if connection fails
          console.log('🔄 Falling back to simulated progress');
          setCurrentMessage('Genetic analysis in progress... (offline mode)');
          setProgress(10);
          
          const interval = setInterval(() => {
            setProgress(prev => {
              if (prev < 90) return prev + 2;
              return prev;
            });
          }, 3000);
          
          return () => clearInterval(interval);
        };

      } catch (error) {
        console.error('❌ Failed to connect to progress stream:', error);
        // Fallback to simulated progress
        console.log('🔄 Using fallback simulated progress');
        setCurrentMessage('Genetic analysis in progress... (offline mode)');
        setProgress(10);
        
        const interval = setInterval(() => {
          setProgress(prev => {
            if (prev < 90) return prev + 2;
            return prev;
          });
        }, 3000);
        
        return () => clearInterval(interval);
      }
    };

    connectToProgress();

    // Cleanup function
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [isAnalyzing, progressId]);

  if (!isAnalyzing && completedMarkers.length === 0) {
    return null;
  }

  const getImpactColor = (impact: string) => {
    switch (impact.toLowerCase()) {
      case 'high':
      case 'pathogenic':
        return 'bg-red-100 text-red-800';
      case 'moderate':
      case 'likely pathogenic':
        return 'bg-orange-100 text-orange-800';
      case 'low':
      case 'benign':
      case 'likely benign':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🧬 Real-time Genetic Analysis
          {isAnalyzing && (
            <Badge variant="outline" className={isConnected ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"}>
              {isConnected ? "Live" : "Processing..."}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {total > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress: {current} / {total} markers</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
            <div className="text-xs text-gray-500">
              {isConnected ? "Live updates enabled" : "Offline mode - estimated progress"}
            </div>
          </div>
        )}
        
        {currentMessage && (
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
            <div className="flex items-center gap-2">
              {isAnalyzing && (
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              )}
              {currentMessage}
            </div>
          </div>
        )}
        
        {completedMarkers.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Recently Analyzed:</h4>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {completedMarkers.slice(-5).reverse().map((marker, index) => (
                <div key={index} className="flex items-center justify-between text-xs bg-white p-2 rounded border">
                  <span className="font-mono">{marker.gene}</span>
                  <Badge className={getImpactColor(marker.impact)}>
                    {marker.impact}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {progress === 100 && (
          <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">
            ✅ Analysis complete! Check the results below.
          </div>
        )}
      </CardContent>
    </Card>
  );
}