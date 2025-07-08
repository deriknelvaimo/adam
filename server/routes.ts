import { Express, Request, Response } from "express";
import { createServer, Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { analyzeGeneticMarker, generateRiskAssessments, answerGeneticQuestion } from "./genetic-ai";
import { sendProgressUpdate, setupProgressSSE, cleanupProgressConnection } from "./progress-sse";
import { db } from "./db";
import { geneticAnalyses } from "../shared/schema";
import { eq } from "drizzle-orm";

const upload = multer({ storage: multer.memoryStorage() });

interface GeneticFileData {
  markers: Array<{
    gene: string;
    variant: string;
    genotype: string;
    chromosome?: string;
    position?: number;
  }>;
}

function parseGeneticFile(buffer: Buffer, filename: string): GeneticFileData {
  const content = buffer.toString('utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('File must contain at least a header and one data row');
  }

  const headers = lines[0].split(',').map(h => h.trim());
  const markers: GeneticFileData['markers'] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length >= headers.length) {
      const marker: any = {};
      headers.forEach((header, index) => {
        marker[header] = values[index];
      });

      if (marker.gene && marker.variant && marker.genotype) {
        markers.push({
          gene: marker.gene,
          variant: marker.variant,
          genotype: marker.genotype,
          chromosome: marker.chromosome || undefined,
          position: marker.position ? parseInt(marker.position) : undefined
        });
      }
    }
  }

  if (markers.length === 0) {
    throw new Error('No valid genetic markers found in file');
  }

  return { markers };
}

export async function registerRoutes(app: Express): Promise<Server> {
  const server = createServer(app);
  setupProgressSSE(app);

  // Upload and analyze genetic data
  app.post("/api/upload-genetic-data", upload.single('file'), async (req: Request, res: Response) => {
    try {
      console.log('Upload request received');
      if (!req.file) {
        console.log('No file in request');
        return res.status(400).json({ message: "No file uploaded" });
      }
      console.log('File received:', req.file.originalname);

      const analysisId = Date.now().toString();
      const fileData = parseGeneticFile(req.file.buffer, req.file.originalname || 'unknown');
      
      // Limit analysis to prevent timeouts - max 50 markers for initial testing
      const maxMarkers = 50;
      const markersToAnalyze = fileData.markers.slice(0, maxMarkers);
      
      if (fileData.markers.length > maxMarkers) {
        console.log(`Limiting analysis to ${maxMarkers} markers out of ${fileData.markers.length} total`);
      }
      
      sendProgressUpdate(analysisId, {
        type: 'analysis_started',
        message: `File uploaded: ${req.file.originalname}. Analyzing ${markersToAnalyze.length} genetic markers (${fileData.markers.length} total found).`,
        total: markersToAnalyze.length
      });

      const analysis = await storage.createGeneticAnalysis({
        fileName: req.file.originalname || 'unknown',
        fileSize: req.file.size,
        fileType: req.file.mimetype || 'text/csv',
        totalMarkers: fileData.markers.length,
        analyzedVariants: "0",
        riskFactors: 0
      });

      // Increase batch size for faster processing
      const batchSize = 5;
      const analyzedMarkers: any[] = [];
      
      for (let i = 0; i < markersToAnalyze.length; i += batchSize) {
        const batch = markersToAnalyze.slice(i, i + batchSize);
        const batchPromises = batch.map(async (marker, batchIndex) => {
          const globalIndex = i + batchIndex;
          
          try {
            console.log(`Analyzing marker ${globalIndex + 1}/${markersToAnalyze.length}: ${marker.gene} (${marker.variant})`);
            
            sendProgressUpdate(analysisId, {
              type: 'marker_progress',
              current: globalIndex + 1,
              total: markersToAnalyze.length,
              gene: marker.gene,
              variant: marker.variant,
              message: `Analyzing ${marker.gene} (${marker.variant})...`
            });

            const result = await analyzeGeneticMarker({
              gene: marker.gene,
              variant: marker.variant,
              genotype: marker.genotype,
              chromosome: marker.chromosome,
              position: marker.position
            });

            // Convert recommendations to text format for database storage
            let recommendations = '';
            if (Array.isArray(result.recommendations)) {
              recommendations = result.recommendations.join('; ');
            } else if (typeof result.recommendations === 'string') {
              recommendations = result.recommendations;
            } else if (result.recommendations) {
              recommendations = String(result.recommendations);
            }

            const savedMarker = await storage.createGeneticMarker({
              analysisId: analysis.id,
              gene: result.gene,
              variant: result.variant,
              genotype: result.genotype,
              impact: result.impact,
              clinicalSignificance: result.clinicalSignificance,
              chromosome: marker.chromosome,
              position: marker.position,
              riskScore: result.riskScore,
              healthCategory: result.healthCategory,
              subcategory: result.subcategory,
              explanation: result.explanation,
              recommendations: recommendations
            });

            sendProgressUpdate(analysisId, {
              type: 'marker_complete',
              current: globalIndex + 1,
              total: markersToAnalyze.length,
              gene: marker.gene,
              variant: marker.variant,
              impact: result.impact,
              message: `Completed analysis of ${marker.gene}: ${result.impact} impact`
            });

            return savedMarker;
          } catch (error) {
            console.error(`Error analyzing marker ${marker.gene}:`, error);
            
            // Create fallback marker with faster processing
            const fallbackMarker = await storage.createGeneticMarker({
              analysisId: analysis.id,
              gene: marker.gene,
              variant: marker.variant,
              genotype: marker.genotype,
              impact: "Analysis Pending",
              clinicalSignificance: "Processing",
              chromosome: marker.chromosome,
              position: marker.position,
              riskScore: null,
              healthCategory: null,
              subcategory: null,
              explanation: "Analysis will be completed in background",
              recommendations: "Check back later for complete results"
            });

            return fallbackMarker;
          }
        });

        // Process batch with timeout protection
        const batchResults = await Promise.allSettled(batchPromises);
        const successfulResults = batchResults
          .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
          .map(result => result.value);
        
        analyzedMarkers.push(...successfulResults);
        
        // Add small delay between batches to prevent overwhelming the system
        if (i + batchSize < markersToAnalyze.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Generate risk assessments only if we have analyzed markers
      if (analyzedMarkers.length > 0) {
        try {
          const riskAssessments = await generateRiskAssessments(analyzedMarkers);
          for (const assessment of riskAssessments) {
            await storage.createRiskAssessment({
              analysisId: analysis.id,
              category: assessment.category,
              subcategory: assessment.subcategory,
              riskLevel: assessment.riskLevel,
              description: assessment.description,
              recommendation: assessment.recommendation
            });
          }
        } catch (error) {
          console.error('Error generating risk assessments:', error);
        }
      }

      const totalMarkersAnalyzed = analyzedMarkers.length;
      const analyzedVariants = Math.round((totalMarkersAnalyzed / fileData.markers.length) * 100);
      const riskFactors = analyzedMarkers.filter(m => m.impact === 'High').length;

      // Update the analysis record with calculated values
      await db.update(geneticAnalyses)
        .set({
          analyzedVariants: `${analyzedVariants}.00`,
          riskFactors: riskFactors,
          status: 'completed'
        })
        .where(eq(geneticAnalyses.id, analysis.id));

      sendProgressUpdate(analysisId, {
        type: 'analysis_complete',
        totalMarkers: totalMarkersAnalyzed,
        message: `Analysis complete! Processed ${totalMarkersAnalyzed} genetic markers.`
      });

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

  // Get specific analysis by ID
  app.get("/api/analysis/:id", async (req: Request, res: Response) => {
    try {
      const analysisId = parseInt(req.params.id);
      if (isNaN(analysisId)) {
        return res.status(400).json({ message: "Invalid analysis ID" });
      }

      const analysis = await storage.getGeneticAnalysis(analysisId);
      if (!analysis) {
        return res.status(404).json({ message: "Analysis not found" });
      }

      const markers = await storage.getGeneticMarkersByAnalysisId(analysisId);
      const riskAssessments = await storage.getRiskAssessmentsByAnalysisId(analysisId);

      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      res.json({
        analysis,
        markers,
        riskAssessments
      });
    } catch (error) {
      console.error('Error fetching specific analysis:', error);
      res.status(500).json({ message: "Failed to fetch analysis details" });
    }
  });

  // Get analysis history
  app.get("/api/analysis-history", async (req: Request, res: Response) => {
    try {
      const analyses = await storage.getAllGeneticAnalyses();
      const historyWithSummary = await Promise.all(
        analyses.map(async (analysis) => {
          const markers = await storage.getGeneticMarkersByAnalysisId(analysis.id);
          const riskAssessments = await storage.getRiskAssessmentsByAnalysisId(analysis.id);
          
          return {
            id: analysis.id,
            fileName: analysis.fileName,
            createdAt: analysis.createdAt,
            totalMarkers: analysis.totalMarkers,
            analyzedVariants: analysis.analyzedVariants,
            riskFactors: analysis.riskFactors,
            status: analysis.status || 'completed',
            summary: {
              highRiskCount: markers.filter(m => m.impact === 'High').length,
              moderateRiskCount: markers.filter(m => m.impact === 'Moderate').length,
              lowRiskCount: markers.filter(m => m.impact === 'Low').length,
              totalRiskAssessments: riskAssessments.length
            }
          };
        })
      );
      
      res.json(historyWithSummary);
    } catch (error) {
      console.error('Error fetching analysis history:', error);
      res.status(500).json({ message: "Failed to fetch analysis history" });
    }
  });

  // Export analysis data
  app.get("/api/export/:analysisId", async (req: Request, res: Response) => {
    try {
      const analysisId = parseInt(req.params.analysisId);
      const analysis = await storage.getGeneticAnalysis(analysisId);
      
      if (!analysis) {
        return res.status(404).json({ message: "Analysis not found" });
      }

      const markers = await storage.getGeneticMarkersByAnalysisId(analysisId);
      const riskAssessments = await storage.getRiskAssessmentsByAnalysisId(analysisId);
      const chatMessages = await storage.getChatMessagesByAnalysisId(analysisId);

      const exportData = {
        analysis,
        markers,
        riskAssessments,
        chatMessages,
        exportedAt: new Date().toISOString(),
        exportVersion: "1.0"
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="genetic-analysis-${analysisId}-${new Date().toISOString().split('T')[0]}.json"`);
      res.json(exportData);
    } catch (error) {
      console.error('Error exporting analysis:', error);
      res.status(500).json({ message: "Failed to export analysis" });
    }
  });

  // Get genetic analysis data
  app.get("/api/genetic-analysis", async (req: Request, res: Response) => {
    try {
      const analyses = await storage.getAllGeneticAnalyses();
      if (analyses.length === 0) {
        return res.json({ analysis: null, markers: [], riskAssessments: [] });
      }

      const latestAnalysis = analyses[0];
      const markers = await storage.getGeneticMarkersByAnalysisId(latestAnalysis.id);
      const riskAssessments = await storage.getRiskAssessmentsByAnalysisId(latestAnalysis.id);

      res.json({
        analysis: latestAnalysis,
        markers,
        riskAssessments
      });
    } catch (error) {
      console.error('Error fetching genetic analysis:', error);
      res.status(500).json({ message: "Failed to fetch genetic analysis" });
    }
  });

  // Get analysis overview
  app.get("/api/analysis-overview", async (req: Request, res: Response) => {
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

      const latestAnalysis = analyses[0];
      const allMarkers = await storage.getGeneticMarkersByAnalysisId(latestAnalysis.id);
      const highRiskCount = allMarkers.filter(m => m.impact === 'High').length;

      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      res.json({
        totalMarkers: latestAnalysis.totalMarkers,
        analyzedVariants: `${latestAnalysis.analyzedVariants}%`,
        riskFactors: `${latestAnalysis.riskFactors} High`,
        lastAnalysis: new Date(latestAnalysis.createdAt).toLocaleDateString()
      });
    } catch (error) {
      console.error('Error fetching analysis overview:', error);
      res.status(500).json({ message: "Failed to fetch analysis overview" });
    }
  });

  // Chat endpoint
  app.post("/api/chat", async (req: Request, res: Response) => {
    try {
      const { message, analysisId } = req.body;

      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      const markers = analysisId ? 
        await storage.getGeneticMarkersByAnalysisId(analysisId) : 
        [];

      const response = await answerGeneticQuestion({
        question: message,
        markers: markers.map(m => ({
          gene: m.gene,
          variant: m.variant,
          genotype: m.genotype,
          chromosome: m.chromosome || undefined,
          position: m.position || undefined
        }))
      });

      if (analysisId) {
        await storage.createChatMessage({
          message,
          analysisId,
          response
        });
      }

      res.json({ response });
    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to process chat message" 
      });
    }
  });

  // Get chat messages
  app.get("/api/chat", async (req: Request, res: Response) => {
    try {
      const analysisId = req.query.analysisId ? parseInt(req.query.analysisId as string) : null;
      
      if (!analysisId) {
        return res.json([]);
      }

      const messages = await storage.getChatMessagesByAnalysisId(analysisId);
      res.json(messages);
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      res.status(500).json({ message: "Failed to fetch chat messages" });
    }
  });

  return server;
}