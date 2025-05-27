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

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['text/csv', 'application/json', 'text/plain'];
    if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.csv') || file.originalname.endsWith('.json')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and JSON files are allowed'));
    }
  }
});

// Helper function to parse genetic data files
function parseGeneticFile(buffer: Buffer, filename: string): GeneticFileData {
  const content = buffer.toString('utf-8');
  
  if (filename.endsWith('.json')) {
    try {
      const data = JSON.parse(content);
      if (data.markers && Array.isArray(data.markers)) {
        return data;
      }
      throw new Error('Invalid JSON format');
    } catch (error) {
      throw new Error('Failed to parse JSON file');
    }
  } else if (filename.endsWith('.csv')) {
    const lines = content.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    
    const markers = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const marker: any = {};
      
      headers.forEach((header, index) => {
        const key = header.toLowerCase().replace(/\s+/g, '');
        marker[key] = values[index] || '';
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
  } else {
    throw new Error('Unsupported file format. Please upload CSV or JSON files.');
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Upload and analyze genetic data
  app.post("/api/genetic-analysis", upload.single('geneticFile'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Parse the genetic file
      const geneticData = parseGeneticFile(req.file.buffer, req.file.originalname);
      
      if (!geneticData.markers || geneticData.markers.length === 0) {
        return res.status(400).json({ message: "No valid genetic markers found in file" });
      }

      // Analyze each marker using AI-powered genetic analysis
      const analyzedMarkers = [];
      for (const marker of geneticData.markers) {
        try {
          const aiAnalysis = await analyzeGeneticMarker({
            gene: marker.gene,
            variant: marker.variant,
            genotype: marker.genotype,
            chromosome: marker.chromosome,
            position: marker.position
          });
          
          analyzedMarkers.push({
            ...marker,
            impact: aiAnalysis.impact,
            riskScore: aiAnalysis.riskScore,
            clinicalSignificance: aiAnalysis.clinicalSignificance,
            healthCategory: aiAnalysis.healthCategory,
            subcategory: aiAnalysis.subcategory,
            explanation: aiAnalysis.explanation,
            recommendations: aiAnalysis.recommendations
          });
        } catch (error) {
          console.error(`Failed to analyze marker ${marker.gene}:`, error);
          // Skip markers that fail analysis rather than using fallback data
          continue;
        }
      }

      // Calculate analysis statistics
      const totalMarkers = analyzedMarkers.length;
      const analyzedVariants = Math.round((totalMarkers / geneticData.markers.length) * 100);
      const highRiskCount = analyzedMarkers.filter(m => m.impact === 'High').length;
      const moderateRiskCount = analyzedMarkers.filter(m => m.impact === 'Moderate').length;
      const riskFactors = highRiskCount;

      // Create genetic analysis record
      const analysisData = {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        uploadDate: new Date(),
        totalMarkers,
        highRiskMarkers: highRiskCount,
        moderateRiskMarkers: moderateRiskCount,
        processedMarkers: analyzedMarkers
      };

      const analysis = await storage.createGeneticAnalysis({
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.file.mimetype || 'application/octet-stream',
        totalMarkers,
        analyzedVariants: analyzedVariants.toString(),
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

      res.json({
        analysisId: analysis.id,
        summary: {
          totalMarkers,
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
          riskFactors: "0",
          lastAnalysis: "No analyses yet"
        });
      }

      const latestAnalysis = analyses[analyses.length - 1];
      
      res.json({
        totalMarkers: latestAnalysis.totalMarkers,
        analyzedVariants: `${latestAnalysis.analyzedVariants}%`,
        riskFactors: `${latestAnalysis.riskFactors}`,
        lastAnalysis: latestAnalysis.createdAt ? new Date(latestAnalysis.createdAt).toLocaleDateString() : "Unknown"
      });
    } catch (error) {
      console.error('Analysis overview error:', error);
      res.status(500).json({ message: "Failed to get analysis overview" });
    }
  });

  // Get latest analysis
  app.get("/api/latest-analysis", async (req, res) => {
    try {
      const analyses = await storage.getAllGeneticAnalyses();
      
      if (analyses.length === 0) {
        return res.json(null);
      }

      const latestAnalysis = analyses[analyses.length - 1];
      res.json(latestAnalysis);
    } catch (error) {
      console.error('Latest analysis error:', error);
      res.status(500).json({ message: "Failed to get latest analysis" });
    }
  });

  // Get genetic markers for an analysis
  app.get("/api/markers/:analysisId", async (req, res) => {
    try {
      const analysisId = parseInt(req.params.analysisId);
      const markers = await storage.getGeneticMarkersByAnalysisId(analysisId);
      res.json(markers);
    } catch (error) {
      console.error('Get markers error:', error);
      res.status(500).json({ message: "Failed to get genetic markers" });
    }
  });

  // Get risk assessments for an analysis
  app.get("/api/risk-assessments/:analysisId", async (req, res) => {
    try {
      const analysisId = parseInt(req.params.analysisId);
      const assessments = await storage.getRiskAssessmentsByAnalysisId(analysisId);
      res.json(assessments);
    } catch (error) {
      console.error('Get risk assessments error:', error);
      res.status(500).json({ message: "Failed to get risk assessments" });
    }
  });

  // Chat with genetic data
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, analysisId } = req.body;
      
      if (!message || !analysisId) {
        return res.status(400).json({ message: "Message and analysis ID required" });
      }

      // Get analysis and markers for context
      const analysis = await storage.getGeneticAnalysis(parseInt(analysisId));
      if (!analysis) {
        return res.status(404).json({ message: "Analysis not found" });
      }

      const markers = await storage.getGeneticMarkersByAnalysisId(parseInt(analysisId));

      // Use AI-powered genetic counseling
      try {
        // Convert markers to the format expected by AI analysis
        const geneticMarkers = markers.map(marker => ({
          gene: marker.gene,
          variant: marker.variant,
          genotype: marker.genotype,
          chromosome: marker.chromosome || undefined,
          position: marker.position || undefined
        }));

        // Get previous chat context for continuity
        const previousMessages = await storage.getChatMessagesByAnalysisId(parseInt(analysisId));
        const previousContext = previousMessages.length > 0 
          ? previousMessages.slice(-3).map(msg => `Q: ${msg.message}\nA: ${msg.response}`).join('\n\n')
          : undefined;

        const response = await answerGeneticQuestion({
          question: message,
          markers: geneticMarkers,
          previousContext
        });

        // Store the chat message with AI response
        const chatMessage = await storage.createChatMessage({
          analysisId: parseInt(analysisId),
          message,
          response
        });

        res.json({
          id: chatMessage.id,
          message: chatMessage.message,
          response: chatMessage.response,
          timestamp: chatMessage.timestamp
        });

      } catch (aiError) {
        console.error('AI chat error:', aiError);
        // Fallback response if AI fails
        const fallbackResponse = "I'm having trouble processing your question right now. Please try rephrasing your question or ask about specific genetic markers in your analysis.";
        
        const chatMessage = await storage.createChatMessage({
          analysisId: parseInt(analysisId),
          message,
          response: fallbackResponse
        });

        res.json({
          id: chatMessage.id,
          message: chatMessage.message,
          response: chatMessage.response,
          timestamp: chatMessage.timestamp
        });
      }

    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({ message: "Failed to process chat message" });
    }
  });

  // Get chat history
  app.get("/api/chat/:analysisId", async (req, res) => {
    try {
      const analysisId = parseInt(req.params.analysisId);
      const messages = await storage.getChatMessagesByAnalysisId(analysisId);
      
      res.json(messages);
    } catch (error) {
      console.error('Get chat history error:', error);
      res.status(500).json({ message: "Failed to get chat history" });
    }
  });

  // Update the model status to reflect Claude integration
  app.get("/api/model-status", async (req, res) => {
    try {
      const models = [
        { name: 'Claude-3.5-Sonnet', status: 'active' as const },
        { name: 'Genetic Analysis AI', status: 'active' as const },
        { name: 'Local Models', status: 'standby' as const }
      ];
      
      res.json(models);
    } catch (error) {
      console.error('Model status error:', error);
      res.status(500).json({ message: "Failed to get model status" });
    }
  });

  const server = createServer(app);
  return server;
}