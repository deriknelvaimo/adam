import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { z } from "zod";
import { 
  insertGeneticAnalysisSchema,
  insertGeneticMarkerSchema,
  insertRiskAssessmentSchema,
  insertChatMessageSchema,
  type GeneticFileData
} from "@shared/schema";
import { analyzeGeneticMarker, generateRiskAssessments, answerGeneticQuestion, type GeneticAnalysisRequest } from "./genetic-ai";
import { localLLM } from "./local-llm";
import { sendProgressUpdate, setupProgressSSE, cleanupProgressConnection } from "./progress-sse";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

function parseGeneticFile(buffer: Buffer, filename: string): GeneticFileData {
  const content = buffer.toString('utf-8');
  
  if (filename.endsWith('.csv')) {
    const lines = content.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    const markers = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const marker: any = {};
      
      headers.forEach((header, index) => {
        marker[header] = values[index];
      });
      
      return {
        gene: marker.gene || marker.genename || '',
        variant: marker.variant || marker.rsid || marker.snp || '',
        genotype: marker.genotype || marker.alleles || '',
        chromosome: marker.chromosome || marker.chr || undefined,
        position: marker.position ? parseInt(marker.position) : undefined
      };
    }).filter(marker => marker.gene && marker.variant && marker.genotype);
    
    return { markers };
  } else if (filename.endsWith('.json')) {
    const data = JSON.parse(content);
    const markers = (data.markers || data).map((marker: any) => {
      return {
        gene: marker.gene || marker.genename || '',
        variant: marker.variant || marker.rsid || marker.snp || '',
        genotype: marker.genotype || marker.alleles || '',
        chromosome: marker.chromosome || marker.chr || undefined,
        position: marker.position ? parseInt(marker.position) : undefined
      };
    }).filter(marker => marker.gene && marker.variant && marker.genotype);
    
    return { markers };
  } else {
    throw new Error('Unsupported file format. Please upload CSV or JSON files.');
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup SSE endpoint for progress updates
  setupProgressSSE(app);

  // Upload and analyze genetic data
  app.post("/api/genetic-analysis", upload.single('geneticFile'), async (req, res) => {
    try {
      console.log('🧬 File upload received:', req.file?.originalname);
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Parse the genetic file
      const geneticData = parseGeneticFile(req.file.buffer, req.file.originalname);
      console.log('📊 Parsed genetic markers:', geneticData.markers.length);
      
      if (!geneticData.markers || geneticData.markers.length === 0) {
        return res.status(400).json({ message: "No valid genetic markers found in file" });
      }

      // Generate unique analysis ID for progress tracking
      const analysisId = Date.now().toString();
      
      // Analyze each marker using AI-powered genetic analysis
      const analyzedMarkers = [];
      const totalMarkersCount = geneticData.markers.length;
      console.log('🤖 Starting genetic analysis with local model...');
      
      // Send analysis started event
      sendProgressUpdate(analysisId, {
        type: 'analysis_started',
        total: totalMarkersCount,
        message: `Starting analysis of ${totalMarkersCount} genetic markers`
      });
      
      // Process markers concurrently in batches for better performance
      const BATCH_SIZE = 3; // Process 3 markers simultaneously
      const batches = [];
      
      for (let i = 0; i < geneticData.markers.length; i += BATCH_SIZE) {
        batches.push(geneticData.markers.slice(i, i + BATCH_SIZE));
      }

      let processedCount = 0;
      
      for (const batch of batches) {
        // Process batch concurrently
        const batchPromises = batch.map(async (marker, batchIndex) => {
          const globalIndex = processedCount + batchIndex;
          try {
            console.log(`🧬 Analyzing (batch): ${marker.gene} ${marker.variant}`);
            
            // Send progress update
            sendProgressUpdate(analysisId, {
              type: 'marker_progress',
              current: globalIndex + 1,
              total: totalMarkersCount,
              gene: marker.gene,
              message: `Analyzing ${marker.gene}...`
            });
            
            const aiAnalysis = await analyzeGeneticMarker({
              gene: marker.gene,
              variant: marker.variant,
              genotype: marker.genotype,
              chromosome: marker.chromosome,
              position: marker.position
            });
            console.log(`✅ Analysis complete for ${marker.gene}:`, aiAnalysis.impact);
            
            // Send completion update for this marker
            sendProgressUpdate(analysisId, {
              type: 'marker_complete',
              current: globalIndex + 1,
              total: totalMarkersCount,
              gene: marker.gene,
              impact: aiAnalysis.impact,
              message: `${marker.gene}: ${aiAnalysis.impact} impact`
            });
            
            return {
              ...marker,
              impact: aiAnalysis.impact,
              clinicalSignificance: aiAnalysis.clinicalSignificance,
              riskScore: aiAnalysis.riskScore,
              healthCategory: aiAnalysis.healthCategory,
              subcategory: aiAnalysis.subcategory,
              explanation: aiAnalysis.explanation,
              recommendations: aiAnalysis.recommendations
            };
          } catch (error) {
            console.error(`Error analyzing marker ${marker.gene}:`, error);
            return null;
          }
        });

        // Wait for current batch to complete
        const batchResults = await Promise.all(batchPromises);
        
        // Add successful results to analyzed markers
        batchResults.forEach(result => {
          if (result) {
            analyzedMarkers.push(result);
          }
        });
        
        processedCount += batch.length;
        console.log(`🚀 Completed batch: ${processedCount}/${totalMarkersCount} markers processed`);
      }

      // Send analysis complete event
      sendProgressUpdate(analysisId, {
        type: 'analysis_complete',
        total: totalMarkersCount,
        analyzedCount: analyzedMarkers.length,
        message: `Analysis complete! Processed ${analyzedMarkers.length} markers`
      });

      // Calculate analysis statistics
      const totalMarkersAnalyzed = analyzedMarkers.length;
      const analyzedVariants = Math.round((totalMarkersAnalyzed / geneticData.markers.length) * 100);
      const highRiskCount = analyzedMarkers.filter(m => m.impact === 'High').length;
      const moderateRiskCount = analyzedMarkers.filter(m => m.impact === 'Moderate').length;
      const riskFactors = highRiskCount;

      // Create genetic analysis record
      const analysisData = {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        uploadDate: new Date(),
        totalMarkers: totalMarkersAnalyzed,
        highRiskMarkers: highRiskCount,
        moderateRiskMarkers: moderateRiskCount,
        processedMarkers: analyzedMarkers
      };

      const analysis = await storage.createGeneticAnalysis({
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.file.mimetype || 'application/octet-stream',
        totalMarkers: totalMarkersAnalyzed,
        analyzedVariants: `${analyzedVariants}%`,
        riskFactors,
        analysisData
      });

      // Store genetic markers with AI analysis results
      for (const marker of analyzedMarkers) {
        await storage.createGeneticMarker({
          analysisId: analysis.id,
          gene: marker.gene,
          variant: marker.variant,
          genotype: marker.genotype,
          impact: marker.impact,
          clinicalSignificance: marker.clinicalSignificance,
          chromosome: marker.chromosome,
          position: marker.position,
          riskScore: marker.riskScore,
          healthCategory: marker.healthCategory,
          subcategory: marker.subcategory,
          explanation: marker.explanation,
          recommendations: marker.recommendations
        });
      }

      // Generate AI-powered risk assessments
      try {
        const aiRiskAssessments = await generateRiskAssessments(analyzedMarkers);
        for (const assessment of aiRiskAssessments) {
          await storage.createRiskAssessment({
            analysisId: analysis.id,
            condition: assessment.category,
            riskLevel: assessment.riskLevel.toString(),
            percentage: assessment.riskLevel.toString(),
            description: assessment.description
          });
        }
      } catch (error) {
        console.error('Error generating risk assessments:', error);
      }

      // Clean up SSE connection
      cleanupProgressConnection(analysisId);

      res.json({
        analysisId: analysis.id,
        progressId: analysisId,
        summary: {
          totalMarkers: totalMarkersAnalyzed,
          analyzedVariants: `${analyzedVariants}%`,
          riskFactors: `${riskFactors} High`,
          lastAnalysis: 'Just now'
        },
        message: "Genetic analysis completed successfully"
      });

    } catch (error) {
      console.error('Genetic analysis error:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to analyze genetic data" 
      });
    }
  });

  // Get analysis overview
  app.get("/api/analysis-overview", async (req, res) => {
    try {
      const analyses = await storage.getAllGeneticAnalyses();
      
      if (analyses.length === 0) {
        return res.json({
          totalMarkers: 0,
          analyzedVariants: "0%",
          riskFactors: "0 High",
          lastAnalysis: "No analyses yet"
        });
      }

      const totalMarkers = analyses.reduce((sum, analysis) => sum + analysis.totalMarkers, 0);
      const lastAnalysis = analyses[analyses.length - 1];
      
      res.json({
        totalMarkers,
        analyzedVariants: lastAnalysis.analyzedVariants,
        riskFactors: `${lastAnalysis.riskFactors} High`,
        lastAnalysis: "Recently"
      });
    } catch (error) {
      console.error('Error fetching analysis overview:', error);
      res.status(500).json({ message: "Failed to fetch analysis overview" });
    }
  });

  // Get latest analysis
  app.get("/api/latest-analysis", async (req, res) => {
    try {
      const analyses = await storage.getAllGeneticAnalyses();
      if (analyses.length === 0) {
        return res.json(null);
      }
      res.json(analyses[analyses.length - 1]);
    } catch (error) {
      console.error('Error fetching latest analysis:', error);
      res.status(500).json({ message: "Failed to fetch latest analysis" });
    }
  });

  // Get genetic analysis by ID
  app.get("/api/genetic-analysis", async (req, res) => {
    try {
      const analyses = await storage.getAllGeneticAnalyses();
      const analysisId = req.query.analysisId ? parseInt(req.query.analysisId as string) : null;
      
      if (analysisId) {
        const analysis = analyses.find(a => a.id === analysisId);
        if (!analysis) {
          return res.status(404).json({ message: "Analysis not found" });
        }
        
        const markers = await storage.getGeneticMarkersByAnalysisId(analysisId);
        res.json({ ...analysis, markers });
      } else {
        // Return latest analysis if no ID provided
        const latestAnalysis = analyses[analyses.length - 1];
        if (!latestAnalysis) {
          return res.json({ markers: [] });
        }
        
        const markers = await storage.getGeneticMarkersByAnalysisId(latestAnalysis.id);
        res.json({ ...latestAnalysis, markers });
      }
    } catch (error) {
      console.error('Error fetching genetic analysis:', error);
      res.status(500).json({ message: "Failed to fetch genetic analysis" });
    }
  });

  // Get risk assessments
  app.get("/api/risk-assessments", async (req, res) => {
    try {
      const analyses = await storage.getAllGeneticAnalyses();
      const analysisId = req.query.analysisId ? parseInt(req.query.analysisId as string) : null;
      
      if (analysisId) {
        const assessments = await storage.getRiskAssessmentsByAnalysisId(analysisId);
        res.json(assessments);
      } else {
        // Return risk assessments for latest analysis
        const latestAnalysis = analyses[analyses.length - 1];
        if (!latestAnalysis) {
          return res.json([]);
        }
        
        const assessments = await storage.getRiskAssessmentsByAnalysisId(latestAnalysis.id);
        res.json(assessments);
      }
    } catch (error) {
      console.error('Error fetching risk assessments:', error);
      res.status(500).json({ message: "Failed to fetch risk assessments" });
    }
  });

  // Interactive chat endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, analysisId } = req.body;
      
      if (!message) {
        return res.status(400).json({ message: "Question is required" });
      }

      // Get genetic markers for context
      let markers: any[] = [];
      if (analysisId) {
        markers = await storage.getGeneticMarkersByAnalysisId(analysisId);
      } else {
        // Use latest analysis
        const analyses = await storage.getAllGeneticAnalyses();
        if (analyses.length > 0) {
          const latestAnalysis = analyses[analyses.length - 1];
          markers = await storage.getGeneticMarkersByAnalysisId(latestAnalysis.id);
        }
      }

      // Convert stored markers to analysis request format
      const markerRequests: GeneticAnalysisRequest[] = markers.map(marker => ({
        gene: marker.gene,
        variant: marker.variant,
        genotype: marker.genotype,
        chromosome: marker.chromosome || undefined,
        position: marker.position || undefined
      }));

      const response = await answerGeneticQuestion({
        question: message,
        markers: markerRequests
      });

      // Store the chat message
      const targetAnalysisId = analysisId || (markers.length > 0 ? markers[0].analysisId : 1);
      await storage.createChatMessage({
        analysisId: targetAnalysisId,
        message,
        response
      });

      res.json({ response });
    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({ 
        message: "Failed to process question",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get chat history
  app.get("/api/chat", async (req, res) => {
    try {
      const analyses = await storage.getAllGeneticAnalyses();
      const analysisId = req.query.analysisId ? parseInt(req.query.analysisId as string) : null;
      
      if (analysisId) {
        const messages = await storage.getChatMessagesByAnalysisId(analysisId);
        res.json(messages);
      } else {
        // Return chat for latest analysis
        const latestAnalysis = analyses[analyses.length - 1];
        if (!latestAnalysis) {
          return res.json([]);
        }
        
        const messages = await storage.getChatMessagesByAnalysisId(latestAnalysis.id);
        res.json(messages);
      }
    } catch (error) {
      console.error('Error fetching chat history:', error);
      res.status(500).json({ message: "Failed to fetch chat history" });
    }
  });

  // Model status endpoint
  app.get("/api/model-status", async (req, res) => {
    try {
      const isHealthy = await localLLM.checkHealth();
      res.json([
        { 
          name: isHealthy ? 'Llama3.1:8b (Local)' : 'Check: localhost:11434', 
          status: isHealthy ? 'active' as const : 'standby' as const 
        }
      ]);
    } catch (error) {
      res.json([
        { name: 'Check: localhost:11434', status: 'standby' as const }
      ]);
    }
  });

  const server = createServer(app);
  return server;
}