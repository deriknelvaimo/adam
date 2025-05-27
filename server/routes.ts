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

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept CSV, JSON, and VCF files
    if (file.mimetype === 'text/csv' || 
        file.mimetype === 'application/json' || 
        file.originalname.endsWith('.vcf') ||
        file.originalname.endsWith('.txt')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV, JSON, and VCF files are allowed.'));
    }
  }
});

// Helper function to analyze genetic risk
function analyzeGeneticRisk(gene: string, variant: string, genotype: string): {
  impact: string;
  riskScore: number;
  clinicalSignificance: string;
} {
  // Simple risk analysis based on known genetic variants
  const riskVariants: Record<string, any> = {
    'APOE': {
      'rs429358': {
        'C/C': { impact: 'High', score: 0.78, significance: 'Alzheimer\'s disease risk factor' },
        'C/T': { impact: 'Moderate', score: 0.45, significance: 'Moderate Alzheimer\'s risk' },
        'T/T': { impact: 'Low', score: 0.23, significance: 'Reduced Alzheimer\'s risk' }
      }
    },
    'BRCA1': {
      'rs1799966': {
        'G/A': { impact: 'Moderate', score: 0.55, significance: 'Breast cancer susceptibility' },
        'G/G': { impact: 'Low', score: 0.12, significance: 'Normal breast cancer risk' },
        'A/A': { impact: 'High', score: 0.85, significance: 'Elevated breast cancer risk' }
      }
    },
    'CYP2D6': {
      'rs16947': {
        'G/G': { impact: 'Pharmacogenetic', score: 0.67, significance: 'Normal drug metabolism' },
        'G/A': { impact: 'Pharmacogenetic', score: 0.34, significance: 'Intermediate drug metabolism' },
        'A/A': { impact: 'Pharmacogenetic', score: 0.89, significance: 'Poor drug metabolism' }
      }
    },
    'MTHFR': {
      'rs1801133': {
        'C/T': { impact: 'Low', score: 0.28, significance: 'Folate metabolism variant' },
        'C/C': { impact: 'Low', score: 0.15, significance: 'Normal folate metabolism' },
        'T/T': { impact: 'Moderate', score: 0.45, significance: 'Reduced folate metabolism' }
      }
    }
  };

  const geneData = riskVariants[gene];
  if (geneData && geneData[variant] && geneData[variant][genotype]) {
    const data = geneData[variant][genotype];
    return {
      impact: data.impact,
      riskScore: data.score,
      clinicalSignificance: data.significance
    };
  }

  // Default for unknown variants
  return {
    impact: 'Unknown',
    riskScore: 0.5,
    clinicalSignificance: 'Variant of uncertain significance'
  };
}

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
        const key = header.toLowerCase();
        if (key.includes('gene')) marker.gene = values[index];
        else if (key.includes('variant') || key.includes('rsid')) marker.variant = values[index];
        else if (key.includes('genotype')) marker.genotype = values[index];
        else if (key.includes('chromosome') || key.includes('chr')) marker.chromosome = values[index];
        else if (key.includes('position') || key.includes('pos')) marker.position = parseInt(values[index]) || undefined;
      });
      
      return marker;
    }).filter(marker => marker.gene && marker.variant && marker.genotype);
    
    return { markers };
  } else if (filename.endsWith('.vcf')) {
    // Basic VCF parsing
    const lines = content.split('\n').filter(line => !line.startsWith('#') && line.trim());
    
    const markers = lines.map(line => {
      const fields = line.split('\t');
      if (fields.length >= 5) {
        return {
          gene: fields[2] || 'Unknown', // ID field
          variant: fields[2] || 'Unknown',
          genotype: fields.length >= 10 ? fields[9].split(':')[0] : 'Unknown',
          chromosome: fields[0],
          position: parseInt(fields[1]) || undefined
        };
      }
      return null;
    }).filter(marker => marker !== null);
    
    return { markers };
  }
  
  throw new Error('Unsupported file format');
}

// Generate risk assessments based on genetic data
function generateRiskAssessments(markers: any[]): Array<{
  condition: string;
  riskLevel: string;
  percentage: number;
  description: string;
}> {
  const assessments = [];
  
  // Check for cardiovascular risk
  const cardioMarkers = markers.filter(m => 
    ['APOE', 'LDLR', 'PCSK9'].includes(m.gene) && 
    ['High', 'Moderate'].includes(m.impact)
  );
  
  if (cardioMarkers.length > 0) {
    const avgRisk = cardioMarkers.reduce((sum, m) => sum + (m.riskScore || 0.5), 0) / cardioMarkers.length;
    assessments.push({
      condition: 'Cardiovascular Disease',
      riskLevel: avgRisk > 0.6 ? 'High Risk' : avgRisk > 0.4 ? 'Moderate Risk' : 'Low Risk',
      percentage: Math.round(avgRisk * 100),
      description: 'Genetic variants associated with cardiovascular risk detected'
    });
  }
  
  // Check for diabetes risk
  const diabetesMarkers = markers.filter(m => 
    ['TCF7L2', 'PPARG', 'KCNJ11'].includes(m.gene)
  );
  
  if (diabetesMarkers.length > 0) {
    assessments.push({
      condition: 'Type 2 Diabetes',
      riskLevel: 'Moderate Risk',
      percentage: 45,
      description: 'Several polymorphisms linked to insulin resistance identified'
    });
  }
  
  // Check for Alzheimer's risk
  const alzheimerMarkers = markers.filter(m => m.gene === 'APOE');
  if (alzheimerMarkers.length > 0) {
    const apoeRisk = alzheimerMarkers[0].riskScore || 0.5;
    assessments.push({
      condition: 'Alzheimer\'s Disease',
      riskLevel: apoeRisk > 0.6 ? 'High Risk' : apoeRisk < 0.3 ? 'Low Risk' : 'Moderate Risk',
      percentage: Math.round(apoeRisk * 100),
      description: apoeRisk < 0.3 ? 'Protective variants for cognitive function present' : 'Risk variants for cognitive decline detected'
    });
  }
  
  // Check for pharmacogenetic variants
  const pharmaMarkers = markers.filter(m => m.impact === 'Pharmacogenetic');
  if (pharmaMarkers.length > 0) {
    assessments.push({
      condition: 'Drug Response',
      riskLevel: 'Actionable',
      percentage: 67,
      description: 'Specific pharmacogenetic recommendations available'
    });
  }
  
  return assessments;
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

      // Analyze each marker
      const analyzedMarkers = geneticData.markers.map(marker => {
        const analysis = analyzeGeneticRisk(marker.gene, marker.variant, marker.genotype);
        return {
          ...marker,
          ...analysis
        };
      });

      // Calculate analysis statistics
      const totalMarkers = analyzedMarkers.length;
      const analyzedVariants = 95; // Simulated percentage
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
        analyzedVariants: analysedVariants.toString(),
        riskFactors,
        analysisData
      });

      // Store genetic markers
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
          riskScore: marker.riskScore.toString()
        });
      }

      // Generate and store risk assessments
      const riskAssessments = generateRiskAssessments(analyzedMarkers);
      for (const assessment of riskAssessments) {
        await storage.createRiskAssessment({
          analysisId: analysis.id,
          condition: assessment.condition,
          riskLevel: assessment.riskLevel,
          percentage: assessment.percentage.toString(),
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
          analyzedVariants: '0%',
          riskFactors: '0 High',
          lastAnalysis: 'No analysis yet'
        });
      }

      const latest = analyses[analyses.length - 1];
      const timeDiff = Date.now() - new Date(latest.createdAt).getTime();
      const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60));
      
      res.json({
        totalMarkers: latest.totalMarkers.toLocaleString(),
        analyzedVariants: `${latest.analyzedVariants}%`,
        riskFactors: `${latest.riskFactors} High`,
        lastAnalysis: hoursAgo === 0 ? 'Just now' : `${hoursAgo} hours ago`
      });
    } catch (error) {
      console.error('Analysis overview error:', error);
      res.status(500).json({ message: "Failed to get analysis overview" });
    }
  });

  // Get genetic analysis results
  app.get("/api/genetic-analysis/:id", async (req, res) => {
    try {
      const analysisId = parseInt(req.params.id);
      const analysis = await storage.getGeneticAnalysis(analysisId);
      
      if (!analysis) {
        return res.status(404).json({ message: "Analysis not found" });
      }

      const [markers, riskAssessments] = await Promise.all([
        storage.getGeneticMarkersByAnalysisId(analysisId),
        storage.getRiskAssessmentsByAnalysisId(analysisId)
      ]);

      res.json({
        analysis,
        markers: markers.slice(0, 20), // Limit to first 20 for display
        riskAssessments,
        totalMarkers: markers.length
      });
    } catch (error) {
      console.error('Get analysis error:', error);
      res.status(500).json({ message: "Failed to get analysis results" });
    }
  });

  // Get latest analysis
  app.get("/api/latest-analysis", async (req, res) => {
    try {
      const analyses = await storage.getAllGeneticAnalyses();
      
      if (analyses.length === 0) {
        return res.json(null);
      }

      const latest = analyses[analyses.length - 1];
      const [markers, riskAssessments] = await Promise.all([
        storage.getGeneticMarkersByAnalysisId(latest.id),
        storage.getRiskAssessmentsByAnalysisId(latest.id)
      ]);

      res.json({
        analysis: latest,
        markers: markers.slice(0, 20),
        riskAssessments,
        totalMarkers: markers.length
      });
    } catch (error) {
      console.error('Get latest analysis error:', error);
      res.status(500).json({ message: "Failed to get latest analysis" });
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
      const riskAssessments = await storage.getRiskAssessmentsByAnalysisId(parseInt(analysisId));

      // Generate response based on the question (mock AI response)
      let response = "I understand you're asking about your genetic data. ";
      
      const lowerMessage = message.toLowerCase();
      
      if (lowerMessage.includes('apoe') || lowerMessage.includes('alzheimer')) {
        const apoeMarker = markers.find(m => m.gene === 'APOE');
        if (apoeMarker) {
          response = `Based on your genetic data, you carry the APOE ${apoeMarker.genotype} genotype at ${apoeMarker.variant}. ${apoeMarker.clinicalSignificance}. This genetic variant affects your risk profile, but remember that genetics is just one factor. Lifestyle interventions like regular exercise, a Mediterranean diet, and cognitive engagement can significantly influence outcomes.`;
        } else {
          response = "I don't see any APOE variants in your current genetic data. This gene is commonly associated with Alzheimer's disease risk.";
        }
      } else if (lowerMessage.includes('medication') || lowerMessage.includes('drug')) {
        const pharmaMarkers = markers.filter(m => m.impact === 'Pharmacogenetic');
        if (pharmaMarkers.length > 0) {
          response = `Your genetic profile shows variants in genes like ${pharmaMarkers.map(m => m.gene).join(', ')} that affect drug metabolism. These variants can influence how you process certain medications. Always consult with your healthcare provider before starting new medications, and mention your pharmacogenetic profile.`;
        } else {
          response = "I don't see specific pharmacogenetic variants in your current data that would affect drug metabolism.";
        }
      } else if (lowerMessage.includes('cardiovascular') || lowerMessage.includes('heart')) {
        const cardioAssessment = riskAssessments.find(r => r.condition.includes('Cardiovascular'));
        if (cardioAssessment) {
          response = `Your genetic analysis shows a ${cardioAssessment.riskLevel} for cardiovascular disease with a ${cardioAssessment.percentage}% genetic risk score. ${cardioAssessment.description}. Focus on heart-healthy lifestyle choices like regular cardio exercise, maintaining healthy cholesterol levels, and managing blood pressure.`;
        } else {
          response = "Your genetic data doesn't show significant cardiovascular risk variants in the markers analyzed.";
        }
      } else if (lowerMessage.includes('nutrition') || lowerMessage.includes('diet')) {
        const mthfrMarker = markers.find(m => m.gene === 'MTHFR');
        if (mthfrMarker) {
          response = `Based on your MTHFR ${mthfrMarker.genotype} genotype, you may benefit from increased folate intake through leafy greens and considering methylated B-vitamin supplements. This variant affects how your body processes folate and B-vitamins.`;
        } else {
          response = "Based on your genetic profile, focus on a balanced diet rich in antioxidants, omega-3 fatty acids, and anti-inflammatory foods. Consider consulting with a genetic counselor for personalized nutrition recommendations.";
        }
      } else {
        response = `I can help you understand your genetic data. You have ${markers.length} genetic markers analyzed with ${riskAssessments.length} risk assessments. Feel free to ask about specific genes, health conditions, medication interactions, or lifestyle recommendations based on your genetics.`;
      }

      // Store the chat message
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

  // Get model status
  app.get("/api/model-status", async (req, res) => {
    try {
      // Mock model status - in real implementation, this would check actual model status
      const models = [
        { name: 'BioLLaMA-7B', status: 'active' as const },
        { name: 'GeneGPT', status: 'active' as const },
        { name: 'NVIDIA Config', status: 'standby' as const }
      ];
      
      res.json(models);
    } catch (error) {
      console.error('Model status error:', error);
      res.status(500).json({ message: "Failed to get model status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
