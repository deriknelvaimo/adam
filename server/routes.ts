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

// Comprehensive genetic risk analysis based on report data
function analyzeGeneticRisk(gene: string, variant: string, genotype: string): {
  impact: string;
  riskScore: number;
  clinicalSignificance: string;
  category: string;
  subcategory: string;
} {
  // Comprehensive genetic variants database based on the report
  const riskVariants: Record<string, any> = {
    // Physical Activity & Sport
    'ACE': {
      'rs4341': {
        'GG': { impact: 'Low', score: 0.2, significance: 'Optimal endurance performance', category: 'Physical Activity & Sport', subcategory: 'Endurance (Aerobic Predisposition)' },
        'AG': { impact: 'Moderate', score: 0.4, significance: 'Average endurance performance', category: 'Physical Activity & Sport', subcategory: 'Endurance (Aerobic Predisposition)' },
        'AA': { impact: 'High', score: 0.7, significance: 'Power/strength advantage over endurance', category: 'Physical Activity & Sport', subcategory: 'Power/Strength (Anaerobic Predisposition)' }
      }
    },
    'ACTN3': {
      'rs1815739': {
        'TT': { impact: 'Low', score: 0.2, significance: 'Enhanced endurance performance', category: 'Physical Activity & Sport', subcategory: 'Endurance (Aerobic Predisposition)' },
        'CT': { impact: 'Moderate', score: 0.4, significance: 'Balanced power and endurance', category: 'Physical Activity & Sport', subcategory: 'Exercise Tolerance' },
        'CC': { impact: 'High', score: 0.1, significance: 'Superior power and strength', category: 'Physical Activity & Sport', subcategory: 'Power/Strength (Anaerobic Predisposition)' }
      }
    },
    'PPARGC1A': {
      'rs8192678': {
        'GG': { impact: 'Low', score: 0.2, significance: 'Excellent mitochondrial function', category: 'Physical Activity & Sport', subcategory: 'Energy production during exercise' },
        'GT': { impact: 'Moderate', score: 0.4, significance: 'Average energy production', category: 'Physical Activity & Sport', subcategory: 'Energy production during exercise' },
        'TT': { impact: 'High', score: 0.7, significance: 'Reduced energy efficiency', category: 'Physical Activity & Sport', subcategory: 'Energy production during exercise' }
      }
    },
    // Cardiovascular Health
    'AGT': {
      'rs699': {
        'AA': { impact: 'Low', score: 0.2, significance: 'Normal blood pressure regulation', category: 'Cardiovascular Health', subcategory: 'Blood Pressure' },
        'AG': { impact: 'Moderate', score: 0.4, significance: 'Moderate hypertension risk', category: 'Cardiovascular Health', subcategory: 'Blood Pressure' },
        'GG': { impact: 'High', score: 0.8, significance: 'Elevated blood pressure risk', category: 'Cardiovascular Health', subcategory: 'Blood Pressure' }
      }
    },
    // Alzheimer's & Cognitive Health
    'APOE': {
      'rs429358': {
        'T/T': { impact: 'Low', score: 0.1, significance: 'Protective against Alzheimer\'s disease', category: 'Genetic Risk for Specific Conditions', subcategory: 'Alzheimer\'s Disease' },
        'C/T': { impact: 'Moderate', score: 0.4, significance: 'Moderate Alzheimer\'s risk (E3/E4)', category: 'Genetic Risk for Specific Conditions', subcategory: 'Alzheimer\'s Disease' },
        'C/C': { impact: 'High', score: 0.9, significance: 'Significantly elevated Alzheimer\'s risk (E4/E4)', category: 'Genetic Risk for Specific Conditions', subcategory: 'Alzheimer\'s Disease' }
      }
    },
    // Methylation & Folate Metabolism
    'MTHFR': {
      'rs1801133': {
        'C/C': { impact: 'Low', score: 0.1, significance: 'Normal folate metabolism', category: 'Cellular Pathways', subcategory: 'Methylation' },
        'C/T': { impact: 'Moderate', score: 0.4, significance: 'Reduced folate metabolism efficiency', category: 'Cellular Pathways', subcategory: 'Methylation' },
        'T/T': { impact: 'High', score: 0.8, significance: 'Significantly impaired folate metabolism', category: 'Cellular Pathways', subcategory: 'Methylation' }
      },
      'rs1801131': {
        'A/A': { impact: 'Low', score: 0.1, significance: 'Normal methionine synthesis', category: 'Cellular Pathways', subcategory: 'Methylation' },
        'A/C': { impact: 'Moderate', score: 0.3, significance: 'Mildly reduced methionine synthesis', category: 'Cellular Pathways', subcategory: 'Methylation' },
        'C/C': { impact: 'High', score: 0.7, significance: 'Impaired methionine synthesis', category: 'Cellular Pathways', subcategory: 'Methylation' }
      }
    },
    // Vitamin D Metabolism
    'VDR': {
      'rs2228570': {
        'CC': { impact: 'Low', score: 0.2, significance: 'Efficient vitamin D metabolism', category: 'Nutrients & Compounds', subcategory: 'Vitamin D Requirements' },
        'CT': { impact: 'Moderate', score: 0.4, significance: 'Moderately reduced vitamin D efficiency', category: 'Nutrients & Compounds', subcategory: 'Vitamin D Requirements' },
        'TT': { impact: 'High', score: 0.8, significance: 'Reduced vitamin D receptor function', category: 'Nutrients & Compounds', subcategory: 'Vitamin D Requirements' }
      },
      'rs1544410': {
        'AA': { impact: 'Low', score: 0.2, significance: 'Optimal vitamin D binding', category: 'Nutrients & Compounds', subcategory: 'Vitamin D Requirements' },
        'AG': { impact: 'Moderate', score: 0.4, significance: 'Moderately reduced vitamin D binding', category: 'Nutrients & Compounds', subcategory: 'Vitamin D Requirements' },
        'GG': { impact: 'High', score: 0.7, significance: 'Reduced vitamin D binding efficiency', category: 'Nutrients & Compounds', subcategory: 'Vitamin D Requirements' }
      }
    },
    // Iron Metabolism
    'HFE': {
      'rs1800562': {
        'GG': { impact: 'Low', score: 0.1, significance: 'Normal iron metabolism', category: 'Immunity', subcategory: 'Iron Deficiency Risk' },
        'GA': { impact: 'Moderate', score: 0.4, significance: 'Carrier for hemochromatosis', category: 'Immunity', subcategory: 'Iron Overload Susceptibility' },
        'AA': { impact: 'High', score: 0.9, significance: 'High risk for iron overload', category: 'Immunity', subcategory: 'Iron Overload Susceptibility' }
      }
    },
    // Inflammation Response
    'TNF': {
      'rs1800629': {
        'GG': { impact: 'Low', score: 0.2, significance: 'Normal inflammatory response', category: 'Cellular Pathways', subcategory: 'Inflammation' },
        'GA': { impact: 'Moderate', score: 0.5, significance: 'Moderately elevated inflammation', category: 'Cellular Pathways', subcategory: 'Inflammation' },
        'AA': { impact: 'High', score: 0.8, significance: 'High inflammatory response', category: 'Cellular Pathways', subcategory: 'Inflammation' }
      }
    },
    'IL6': {
      'rs1800795': {
        'GG': { impact: 'Low', score: 0.2, significance: 'Lower inflammatory response', category: 'Cellular Pathways', subcategory: 'Inflammation' },
        'GC': { impact: 'Moderate', score: 0.4, significance: 'Moderate inflammatory response', category: 'Cellular Pathways', subcategory: 'Inflammation' },
        'CC': { impact: 'High', score: 0.8, significance: 'Elevated inflammatory response', category: 'Cellular Pathways', subcategory: 'Inflammation' }
      }
    },
    // Detoxification
    'GSTM1': {
      'rs1065411': {
        'PRS': { impact: 'Low', score: 0.2, significance: 'Present - good detoxification', category: 'Cellular Pathways', subcategory: 'Detoxification Phase 2' },
        'DEL': { impact: 'High', score: 0.8, significance: 'Deleted - impaired detoxification', category: 'Cellular Pathways', subcategory: 'Detoxification Phase 2' }
      }
    },
    // Collagen & Skin Health
    'COL1A1': {
      'rs1800012': {
        'GG': { impact: 'Low', score: 0.2, significance: 'Strong collagen production', category: 'Healthy Ageing', subcategory: 'Skin Firmness & Elasticity' },
        'GT': { impact: 'Moderate', score: 0.4, significance: 'Moderately reduced collagen strength', category: 'Healthy Ageing', subcategory: 'Skin Firmness & Elasticity' },
        'TT': { impact: 'High', score: 0.8, significance: 'Reduced collagen strength', category: 'Healthy Ageing', subcategory: 'Skin Firmness & Elasticity' }
      }
    },
    // Caffeine Metabolism
    'CYP1A2': {
      'rs762551': {
        'AA': { impact: 'Low', score: 0.2, significance: 'Fast caffeine metabolizer', category: 'Dietary Sensitivities', subcategory: 'Caffeine (Health & Diet)' },
        'AC': { impact: 'Moderate', score: 0.4, significance: 'Intermediate caffeine metabolism', category: 'Dietary Sensitivities', subcategory: 'Caffeine (Health & Diet)' },
        'CC': { impact: 'High', score: 0.8, significance: 'Slow caffeine metabolizer', category: 'Dietary Sensitivities', subcategory: 'Caffeine (Health & Diet)' }
      }
    }
  };

  const geneData = riskVariants[gene];
  if (geneData && geneData[variant] && geneData[variant][genotype]) {
    const data = geneData[variant][genotype];
    return {
      impact: data.impact,
      riskScore: data.score,
      clinicalSignificance: data.significance,
      category: data.category,
      subcategory: data.subcategory
    };
  }

  // Default for unknown variants
  return {
    impact: 'Unknown',
    riskScore: 0.5,
    clinicalSignificance: 'Variant of uncertain significance',
    category: 'Other',
    subcategory: 'Unknown'
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

// Enhanced risk assessments based on comprehensive health categories
function generateRiskAssessments(markers: any[]): Array<{
  condition: string;
  riskLevel: string;
  percentage: number;
  description: string;
  category: string;
}> {
  const assessments = [];
  
  // Cardiovascular Health Assessment
  const cardioMarkers = markers.filter(m => 
    m.category === 'Cardiovascular Health' && ['High', 'Moderate'].includes(m.impact)
  );
  if (cardioMarkers.length > 0) {
    const avgRisk = cardioMarkers.reduce((sum, m) => sum + (m.riskScore || 0.5), 0) / cardioMarkers.length;
    assessments.push({
      condition: 'Cardiovascular Disease Risk',
      riskLevel: avgRisk > 0.6 ? 'High Risk' : avgRisk > 0.4 ? 'Moderate Risk' : 'Low Risk',
      percentage: Math.round(avgRisk * 100),
      description: 'Based on blood pressure, cholesterol and clotting factor variants',
      category: 'Cardiovascular Health'
    });
  }

  // Alzheimer's Disease Risk
  const alzheimerMarkers = markers.filter(m => 
    m.subcategory === "Alzheimer's Disease"
  );
  if (alzheimerMarkers.length > 0) {
    const apoeRisk = alzheimerMarkers[0].riskScore || 0.5;
    assessments.push({
      condition: "Alzheimer's Disease",
      riskLevel: apoeRisk > 0.7 ? 'High Risk' : apoeRisk > 0.4 ? 'Moderate Risk' : 'Low Risk',
      percentage: Math.round(apoeRisk * 100),
      description: apoeRisk < 0.3 ? 'Protective APOE variants detected' : 'APOE risk variants present - lifestyle interventions recommended',
      category: 'Genetic Risk for Specific Conditions'
    });
  }

  // Methylation & Detoxification
  const methylationMarkers = markers.filter(m => 
    m.subcategory === 'Methylation' && ['High', 'Moderate'].includes(m.impact)
  );
  if (methylationMarkers.length > 0) {
    const avgRisk = methylationMarkers.reduce((sum, m) => sum + (m.riskScore || 0.5), 0) / methylationMarkers.length;
    assessments.push({
      condition: 'Methylation Efficiency',
      riskLevel: avgRisk > 0.6 ? 'Impaired' : avgRisk > 0.4 ? 'Reduced' : 'Normal',
      percentage: Math.round((1 - avgRisk) * 100),
      description: 'MTHFR variants affect folate metabolism - consider B-vitamin supplementation',
      category: 'Cellular Pathways'
    });
  }

  // Physical Performance Assessment
  const sportsMarkers = markers.filter(m => 
    m.category === 'Physical Activity & Sport'
  );
  if (sportsMarkers.length > 0) {
    const enduranceMarkers = sportsMarkers.filter(m => m.subcategory.includes('Endurance'));
    const powerMarkers = sportsMarkers.filter(m => m.subcategory.includes('Power'));
    
    if (enduranceMarkers.length > 0) {
      const enduranceScore = enduranceMarkers.reduce((sum, m) => sum + (1 - m.riskScore), 0) / enduranceMarkers.length;
      assessments.push({
        condition: 'Endurance Performance Potential',
        riskLevel: enduranceScore > 0.7 ? 'Excellent' : enduranceScore > 0.5 ? 'Good' : 'Average',
        percentage: Math.round(enduranceScore * 100),
        description: 'Genetic predisposition for aerobic activities and endurance sports',
        category: 'Physical Activity & Sport'
      });
    }
  }

  // Vitamin D Requirements
  const vitDMarkers = markers.filter(m => 
    m.subcategory === 'Vitamin D Requirements' && ['High', 'Moderate'].includes(m.impact)
  );
  if (vitDMarkers.length > 0) {
    const avgRisk = vitDMarkers.reduce((sum, m) => sum + (m.riskScore || 0.5), 0) / vitDMarkers.length;
    assessments.push({
      condition: 'Vitamin D Deficiency Risk',
      riskLevel: avgRisk > 0.6 ? 'High Risk' : avgRisk > 0.4 ? 'Moderate Risk' : 'Low Risk',
      percentage: Math.round(avgRisk * 100),
      description: 'VDR variants affect vitamin D metabolism - higher supplementation may be needed',
      category: 'Nutrients & Compounds'
    });
  }

  // Inflammation Response
  const inflammationMarkers = markers.filter(m => 
    m.subcategory === 'Inflammation' && ['High', 'Moderate'].includes(m.impact)
  );
  if (inflammationMarkers.length > 0) {
    const avgRisk = inflammationMarkers.reduce((sum, m) => sum + (m.riskScore || 0.5), 0) / inflammationMarkers.length;
    assessments.push({
      condition: 'Inflammatory Response',
      riskLevel: avgRisk > 0.6 ? 'Elevated' : avgRisk > 0.4 ? 'Moderate' : 'Normal',
      percentage: Math.round(avgRisk * 100),
      description: 'TNF and IL-6 variants affect inflammatory response - anti-inflammatory diet recommended',
      category: 'Cellular Pathways'
    });
  }

  // Iron Metabolism
  const ironMarkers = markers.filter(m => 
    (m.subcategory === 'Iron Deficiency Risk' || m.subcategory === 'Iron Overload Susceptibility') &&
    ['High', 'Moderate'].includes(m.impact)
  );
  if (ironMarkers.length > 0) {
    const overloadRisk = ironMarkers.find(m => m.subcategory === 'Iron Overload Susceptibility');
    if (overloadRisk && overloadRisk.impact === 'High') {
      assessments.push({
        condition: 'Iron Overload Risk',
        riskLevel: 'High Risk',
        percentage: Math.round(overloadRisk.riskScore * 100),
        description: 'HFE variants detected - monitor iron levels and avoid iron supplementation',
        category: 'Immunity'
      });
    }
  }

  // Caffeine Sensitivity
  const caffeineMarkers = markers.filter(m => 
    m.subcategory === 'Caffeine (Health & Diet)' && ['High', 'Moderate'].includes(m.impact)
  );
  if (caffeineMarkers.length > 0) {
    const sensitivity = caffeineMarkers[0].riskScore;
    assessments.push({
      condition: 'Caffeine Sensitivity',
      riskLevel: sensitivity > 0.6 ? 'Slow Metabolizer' : sensitivity > 0.4 ? 'Intermediate' : 'Fast Metabolizer',
      percentage: Math.round(sensitivity * 100),
      description: 'CYP1A2 variants affect caffeine metabolism - adjust intake accordingly',
      category: 'Dietary Sensitivities'
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

      // Analyze each marker with enhanced categorization
      const analyzedMarkers = geneticData.markers.map(marker => {
        const analysis = analyzeGeneticRisk(marker.gene, marker.variant, marker.genotype);
        return {
          ...marker,
          impact: analysis.impact,
          riskScore: analysis.riskScore,
          clinicalSignificance: analysis.clinicalSignificance,
          category: analysis.category,
          subcategory: analysis.subcategory
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
        analyzedVariants: analyzedVariants.toString(),
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

      // Enhanced AI response system based on comprehensive genetic analysis
      let response = "I understand you're asking about your genetic data. ";
      
      const lowerMessage = message.toLowerCase();
      
      if (lowerMessage.includes('apoe') || lowerMessage.includes('alzheimer')) {
        const apoeMarker = markers.find(m => m.gene === 'APOE');
        if (apoeMarker) {
          const riskLevel = apoeMarker.riskScore > 0.7 ? 'significantly elevated' : apoeMarker.riskScore > 0.4 ? 'moderately increased' : 'lower than average';
          response = `Based on your genetic data, you carry the APOE ${apoeMarker.genotype} genotype at ${apoeMarker.variant}. This gives you a ${riskLevel} risk for Alzheimer's disease. ${apoeMarker.clinicalSignificance}. 

Key recommendations:
• Regular cardiovascular exercise (30+ min, 5x/week)
• Mediterranean diet rich in omega-3s
• Cognitive engagement through learning and social activities
• Stress management and quality sleep (7-9 hours)
• Regular monitoring of cardiovascular health

Remember, genetics is just one factor - lifestyle interventions can significantly influence outcomes.`;
        } else {
          response = "I don't see any APOE variants in your current genetic data. This gene is commonly associated with Alzheimer's disease risk and would typically be included in comprehensive genetic panels.";
        }
      } else if (lowerMessage.includes('cardiovascular') || lowerMessage.includes('heart') || lowerMessage.includes('blood pressure')) {
        const cardioMarkers = markers.filter(m => m.category === 'Cardiovascular Health');
        const cardioAssessment = riskAssessments.find(r => r.condition.includes('Cardiovascular'));
        
        if (cardioMarkers.length > 0 || cardioAssessment) {
          const riskLevel = cardioAssessment ? cardioAssessment.riskLevel : 'moderate';
          const percentage = cardioAssessment ? cardioAssessment.percentage : 50;
          
          response = `Your cardiovascular genetic profile shows ${riskLevel.toLowerCase()} risk with a ${percentage}% genetic risk score. Key findings:

${cardioMarkers.map(m => `• ${m.gene} (${m.variant}): ${m.clinicalSignificance}`).join('\n')}

Recommendations:
• Monitor blood pressure regularly
• Maintain healthy cholesterol levels
• Follow a heart-healthy diet (low sodium, high fiber)
• Regular aerobic exercise
• Avoid smoking and limit alcohol
• Consider omega-3 supplementation

Your genetics inform your risk, but lifestyle choices are equally important for heart health.`;
        } else {
          response = "Based on your current genetic markers, I don't see specific cardiovascular risk variants. However, lifestyle factors like diet, exercise, and stress management remain crucial for heart health regardless of genetic predisposition.";
        }
      } else if (lowerMessage.includes('exercise') || lowerMessage.includes('fitness') || lowerMessage.includes('sport') || lowerMessage.includes('athletic')) {
        const sportsMarkers = markers.filter(m => m.category === 'Physical Activity & Sport');
        const performanceAssessment = riskAssessments.find(r => r.condition.includes('Performance'));
        
        if (sportsMarkers.length > 0) {
          const enduranceMarkers = sportsMarkers.filter(m => m.subcategory.includes('Endurance'));
          const powerMarkers = sportsMarkers.filter(m => m.subcategory.includes('Power'));
          
          response = `Your athletic genetic profile reveals:

**Endurance Capacity:**
${enduranceMarkers.map(m => `• ${m.gene}: ${m.clinicalSignificance}`).join('\n') || '• No specific endurance markers analyzed'}

**Power/Strength Potential:**  
${powerMarkers.map(m => `• ${m.gene}: ${m.clinicalSignificance}`).join('\n') || '• No specific power markers analyzed'}

**Training Recommendations:**
• Focus on your genetic strengths while developing weaker areas
• Adjust recovery time based on your inflammation response genetics
• Consider altitude training effectiveness based on your profile
• Optimize nutrition timing around your fuel utilization genetics

Your genetics provide a blueprint, but consistent training and proper recovery are key to athletic success.`;
        } else {
          response = "To provide specific exercise recommendations, I'd need to see sports-related genetic markers like ACE (endurance), ACTN3 (power/speed), or PPARGC1A (energy production). These help determine your optimal training approach.";
        }
      } else if (lowerMessage.includes('vitamin') || lowerMessage.includes('supplement') || lowerMessage.includes('nutrition')) {
        const nutritionMarkers = markers.filter(m => m.category === 'Nutrients & Compounds');
        const methylationMarkers = markers.filter(m => m.subcategory === 'Methylation');
        
        if (nutritionMarkers.length > 0 || methylationMarkers.length > 0) {
          response = `Based on your genetic variants affecting nutrient metabolism:

**Key Findings:**
${nutritionMarkers.map(m => `• ${m.subcategory}: ${m.clinicalSignificance}`).join('\n')}
${methylationMarkers.map(m => `• Methylation (${m.gene}): ${m.clinicalSignificance}`).join('\n')}

**Supplement Considerations:**
• Higher doses of specific vitamins may be needed based on your genetics
• B-vitamin complex important if MTHFR variants present
• Vitamin D requirements may be elevated with VDR variants
• Antioxidant needs vary based on oxidative stress genetics

Always consult with a healthcare provider familiar with nutrigenomics before starting new supplements.`;
        } else {
          response = "To provide specific nutritional recommendations, I'd need to see genetic markers related to nutrient metabolism like MTHFR (folate), VDR (vitamin D), or other vitamin-processing genes in your analysis.";
        }
      } else if (lowerMessage.includes('inflammation') || lowerMessage.includes('recovery')) {
        const inflammationMarkers = markers.filter(m => m.subcategory === 'Inflammation');
        const recoveryMarkers = markers.filter(m => m.subcategory.includes('Recovery'));
        
        if (inflammationMarkers.length > 0 || recoveryMarkers.length > 0) {
          response = `Your inflammation and recovery genetic profile:

${inflammationMarkers.map(m => `• ${m.gene}: ${m.clinicalSignificance}`).join('\n')}
${recoveryMarkers.map(m => `• ${m.subcategory}: ${m.clinicalSignificance}`).join('\n')}

**Management Strategies:**
• Anti-inflammatory diet (omega-3s, antioxidants, colorful vegetables)
• Adequate sleep for recovery (7-9 hours)
• Stress management techniques
• Consider natural anti-inflammatory supplements (turmeric, omega-3s)
• Adjust exercise intensity based on recovery genetics

Your genetic profile helps optimize your recovery strategy for better overall health.`;
        } else {
          response = "To assess your inflammation and recovery profile, I'd need to see markers in genes like TNF, IL-6, or recovery-related variants in your genetic analysis.";
        }
      } else if (lowerMessage.includes('caffeine') || lowerMessage.includes('coffee')) {
        const caffeineMarkers = markers.filter(m => m.subcategory.includes('Caffeine'));
        
        if (caffeineMarkers.length > 0) {
          const metabolism = caffeineMarkers[0].riskScore > 0.6 ? 'slow' : caffeineMarkers[0].riskScore > 0.4 ? 'intermediate' : 'fast';
          response = `Your caffeine metabolism profile shows you are a ${metabolism} metabolizer based on your ${caffeineMarkers[0].gene} ${caffeineMarkers[0].genotype} genotype.

**Recommendations for ${metabolism} metabolizers:**
${metabolism === 'slow' ? 
  '• Limit caffeine intake (especially after 2 PM)\n• May experience stronger effects from smaller amounts\n• Higher risk of anxiety/jitters from excess caffeine\n• Consider decaf alternatives in afternoon/evening' :
  metabolism === 'intermediate' ?
  '• Moderate caffeine intake is generally well-tolerated\n• Monitor individual response to timing and amounts\n• May need to adjust intake based on stress levels' :
  '• Can generally handle higher caffeine amounts\n• May need more caffeine for same effects\n• Less likely to experience sleep disruption\n• Still important to moderate intake for overall health'
}

Individual response can vary even within genetic categories, so pay attention to how your body responds.`;
        } else {
          response = "To assess your caffeine sensitivity, I'd need to see CYP1A2 genetic variants in your analysis. This gene significantly affects how quickly you metabolize caffeine.";
        }
      } else {
        // Generate a comprehensive overview based on available markers
        const categories = [...new Set(markers.map(m => m.category))];
        response = `I can help you understand your genetic results across multiple health areas. Based on your current analysis, you have genetic information for:

${categories.map(cat => `• ${cat}`).join('\n')}

**You can ask me about:**
• Specific health conditions (Alzheimer's, heart disease, diabetes)
• Athletic performance and exercise optimization
• Nutrition and supplement needs  
• Inflammation and recovery
• Vitamin requirements and metabolism
• Caffeine sensitivity and dietary responses
• Detailed explanations of specific genetic variants

What specific aspect of your genetic health would you like to explore in detail?`;
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
