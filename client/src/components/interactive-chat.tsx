import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Send, MessageSquare } from "lucide-react";

interface InteractiveChatProps {
  analysisId: number | null;
}

interface ChatMessage {
  id: number;
  message: string;
  response: string;
  timestamp: string;
}

export default function InteractiveChat({ analysisId }: InteractiveChatProps) {
  const [inputMessage, setInputMessage] = useState("");
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: chatHistory, isLoading } = useQuery({
    queryKey: ['/api/chat', analysisId],
    enabled: !!analysisId,
  });

  const chatMutation = useMutation({
    mutationFn: async ({ message, analysisId }: { message: string; analysisId: number }) => {
      const response = await apiRequest('POST', '/api/chat', { message, analysisId });
      return response.json();
    },
    onSuccess: (data) => {
      setLocalMessages(prev => [...prev, data]);
      setInputMessage("");
      scrollToBottom();
    },
    onError: (error: Error) => {
      toast({
        title: "Chat Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (chatHistory) {
      setLocalMessages(chatHistory);
    }
  }, [chatHistory]);

  useEffect(() => {
    scrollToBottom();
  }, [localMessages]);

  const handleSendMessage = () => {
    if (!inputMessage.trim() || !analysisId) return;
    chatMutation.mutate({ message: inputMessage, analysisId });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const suggestedQuestions = [
    "What are my cardiovascular risks?",
    "Drug interactions to watch for?",
    "Nutrition recommendations?",
    "What does my APOE variant mean?",
  ];

  if (!analysisId) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <i className="fas fa-comments text-4xl text-gray-400 mb-4"></i>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Interactive Chat Unavailable</h3>
            <p className="text-sm text-gray-600">Upload and analyze genetic data to start asking questions</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <MessageSquare className="h-5 w-5 text-blue-600 mr-2" />
          Ask Questions About Your Genetic Data
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Interact with your genetic analysis using natural language queries
        </p>
      </div>
      
      <CardContent className="p-6">
        {/* Chat Messages */}
        <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-end">
                    <Skeleton className="h-10 w-48" />
                  </div>
                  <div className="flex justify-start">
                    <Skeleton className="h-16 w-64" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {localMessages.map((msg) => (
                <div key={msg.id} className="space-y-2">
                  {/* User Message */}
                  <div className="flex justify-end">
                    <div className="bg-blue-600 text-white rounded-lg px-4 py-2 max-w-xs">
                      <p className="text-sm">{msg.message}</p>
                    </div>
                  </div>
                  
                  {/* AI Response */}
                  <div className="flex justify-start">
                    <div className="bg-gray-100 text-gray-900 rounded-lg px-4 py-2 max-w-md">
                      <p className="text-sm">{msg.response}</p>
                    </div>
                  </div>
                </div>
              ))}
              
              {chatMutation.isPending && (
                <div className="space-y-2">
                  <div className="flex justify-end">
                    <div className="bg-blue-600 text-white rounded-lg px-4 py-2 max-w-xs">
                      <p className="text-sm">{inputMessage}</p>
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-gray-100 text-gray-900 rounded-lg px-4 py-2 max-w-md">
                      <div className="flex items-center space-x-2">
                        <i className="fas fa-spinner fa-spin text-blue-600"></i>
                        <p className="text-sm">Analyzing your genetic data...</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="flex space-x-2">
          <Input
            type="text"
            placeholder="Ask about your genetic results, health risks, or recommendations..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={chatMutation.isPending}
            className="flex-1"
          />
          <Button 
            onClick={handleSendMessage}
            disabled={chatMutation.isPending || !inputMessage.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Suggested Questions */}
        {localMessages.length === 0 && (
          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-2">Suggested questions:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((question, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => setInputMessage(question)}
                  className="text-xs"
                >
                  {question}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
