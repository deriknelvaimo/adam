import { pgTable, text, serial, integer, timestamp, jsonb, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const geneticAnalyses = pgTable("genetic_analyses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  fileType: text("file_type").notNull(),
  totalMarkers: integer("total_markers").notNull(),
  analyzedVariants: decimal("analyzed_variants", { precision: 5, scale: 2 }).notNull(),
  riskFactors: integer("risk_factors").notNull(),
  analysisData: jsonb("analysis_data"),
  status: text("status").notNull().default("completed"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const geneticMarkers = pgTable("genetic_markers", {
  id: serial("id").primaryKey(),
  analysisId: integer("analysis_id").notNull(),
  gene: text("gene").notNull(),
  variant: text("variant").notNull(),
  genotype: text("genotype").notNull(),
  impact: text("impact").notNull(),
  clinicalSignificance: text("clinical_significance").notNull(),
  chromosome: text("chromosome"),
  position: integer("position"),
  riskScore: integer("risk_score"),
  healthCategory: text("health_category"),
  subcategory: text("subcategory"),
  explanation: text("explanation"),
  recommendations: text("recommendations").array(),
});

export const riskAssessments = pgTable("risk_assessments", {
  id: serial("id").primaryKey(),
  analysisId: integer("analysis_id").notNull(),
  condition: text("condition").notNull(),
  riskLevel: text("risk_level").notNull(),
  percentage: decimal("percentage", { precision: 5, scale: 2 }).notNull(),
  description: text("description").notNull(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  analysisId: integer("analysis_id").notNull(),
  message: text("message").notNull(),
  response: text("response").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertGeneticAnalysisSchema = createInsertSchema(geneticAnalyses).pick({
  fileName: true,
  fileSize: true,
  fileType: true,
  totalMarkers: true,
  analyzedVariants: true,
  riskFactors: true,
  analysisData: true,
});

export const insertGeneticMarkerSchema = createInsertSchema(geneticMarkers).pick({
  analysisId: true,
  gene: true,
  variant: true,
  genotype: true,
  impact: true,
  clinicalSignificance: true,
  chromosome: true,
  position: true,
  riskScore: true,
  healthCategory: true,
  subcategory: true,
  explanation: true,
  recommendations: true,
});

export const insertRiskAssessmentSchema = createInsertSchema(riskAssessments).pick({
  analysisId: true,
  condition: true,
  riskLevel: true,
  percentage: true,
  description: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).pick({
  analysisId: true,
  message: true,
  response: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type GeneticAnalysis = typeof geneticAnalyses.$inferSelect;
export type InsertGeneticAnalysis = z.infer<typeof insertGeneticAnalysisSchema>;

export type GeneticMarker = typeof geneticMarkers.$inferSelect;
export type InsertGeneticMarker = z.infer<typeof insertGeneticMarkerSchema>;

export type RiskAssessment = typeof riskAssessments.$inferSelect;
export type InsertRiskAssessment = z.infer<typeof insertRiskAssessmentSchema>;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

// Additional types for frontend
export interface AnalysisOverview {
  totalMarkers: number;
  analyzedVariants: string;
  riskFactors: string;
  lastAnalysis: string;
}

export interface ModelStatus {
  name: string;
  status: 'active' | 'standby' | 'error';
}

export interface GeneticFileData {
  markers: Array<{
    gene: string;
    variant: string;
    genotype: string;
    chromosome?: string;
    position?: number;
  }>;
}

// Enhanced health categories based on the comprehensive report
export interface HealthCategory {
  id: string;
  name: string;
  subcategories: string[];
}

export const HEALTH_CATEGORIES: HealthCategory[] = [
  {
    id: 'physical_activity_sport',
    name: 'Physical Activity & Sport',
    subcategories: [
      'Altitude Training', 'Blood Flow and Circulation', 'Energy production during exercise',
      'Fuel switching during exercise', 'Fuel mobilization in endurance activities', 'Injury Risk',
      'Recovery: Inflammation', 'Recovery: Oxidative Stress', 'Lactate Threshold',
      'Power/Strength (Anaerobic Predisposition)', 'Endurance (Aerobic Predisposition)',
      'VO2 Max', 'Exercise Tolerance'
    ]
  },
  {
    id: 'weight_management',
    name: 'Weight Management',
    subcategories: [
      'Glutathione Metabolism', 'Iron Deficiency Risk (Sport)', 'Iron Overload Susceptibility (Sport)',
      'Antioxidants for Sport', 'Caffeine (Sport)', 'Eating Behaviours: Addictive Tendencies',
      'Eating Behaviours: Emotional Eating', 'Eating Behaviours: Tendency to snack',
      'Energy Expenditure (Metabolism)', 'Exercise responsiveness for weight loss',
      'Hunger & Satiety', 'Obesity Risk', 'Pro-Inflammatory Response',
      'Taste Perception: Bitter Taste', 'Taste Perception: Sweet Tooth',
      'Taste Preference: Fat', 'Weight gain & Weight loss resistance'
    ]
  },
  {
    id: 'cellular_pathways',
    name: 'Cellular Pathways',
    subcategories: [
      'Detoxification Phase 1', 'Detoxification Phase 2', 'Gut Health',
      'Inflammation', 'Methylation', 'Oxidative Stress'
    ]
  },
  {
    id: 'dietary_sensitivities',
    name: 'Dietary Sensitivities',
    subcategories: [
      'Alcohol', 'Caffeine (Health & Diet)', 'Lactose Intolerance',
      'Salt', 'Non-Celiac Gluten'
    ]
  },
  {
    id: 'conversion_effectiveness',
    name: 'Conversion Effectiveness',
    subcategories: [
      'Plant – Derived Omega 3', 'Plant – Derived Omega 6', 'Plant – Derived Vitamin A'
    ]
  },
  {
    id: 'nutrients_compounds',
    name: 'Nutrients & Compounds',
    subcategories: [
      'Antioxidant Requirements', 'Choline Requirements', 'Collagen Requirements',
      'Fibre Requirements', 'Glutathione Binding Capacity', 'Magnesium Requirements',
      'Omega 3 Requirements', 'Vitamin B12 Requirements', 'Vitamin B9 (Folate) Requirements',
      'Vitamin C Requirements', 'Vitamin D Requirements'
    ]
  },
  {
    id: 'immunity',
    name: 'Immunity',
    subcategories: [
      'Iron Deficiency Risk', 'Iron Overload Susceptibility', 'Initial Response to Infection',
      'General Immune Health', 'Tissue Repair and Recovery'
    ]
  },
  {
    id: 'cardiovascular_health',
    name: 'Cardiovascular Health',
    subcategories: [
      'Blood Clotting', 'Blood Pressure', 'Cholesterol'
    ]
  },
  {
    id: 'biological_systems',
    name: 'Biological Systems',
    subcategories: [
      'Bone Health', 'Joints', 'Thyroid Health', 'Type 2 Diabetes & Insulin Resistance Risk',
      'Histamine Tolerance', 'Oestrogen & Testosterone Metabolism'
    ]
  },
  {
    id: 'healthy_ageing',
    name: 'Healthy Ageing',
    subcategories: [
      'Cognitive Functioning & Memory', 'Mood Disorder & Behaviours',
      'Cell Renewal & Hair Loss', 'Pigmentation & UV Protection',
      'Skin Firmness & Elasticity', 'Glycation'
    ]
  },
  {
    id: 'genetic_risk_conditions',
    name: 'Genetic Risk for Specific Conditions',
    subcategories: [
      'Addictive Tendencies', 'ADHD', "Alzheimer's Disease", 'Anxiety',
      'COPD (Chronic Obstructive Pulmonary Disease)', 'Deep Vein Thrombosis (DVT)',
      'Exaggerated Stress Response', 'Higher Dopamine Levels', 'Higher Oestrogen Levels',
      'Intestinal Permeability ("Leaky Gut")', 'Lower Serotonin Levels',
      'Lower Testosterone / DHEA Levels', 'Non-Alcoholic Fatty Liver Disease',
      'Osteoarthritis', 'Osteopenia & Osteoporosis', 'Pernicious Anaemia (Vitamin B 12 Deficiency)',
      'Sleep Disorders', 'Stroke'
    ]
  }
];

// Impact level mapping to match report symbols
export const IMPACT_LEVELS = {
  'HIGH': { symbol: '⬤', level: 5, description: 'VERY HIGH - HIGH PRIORITY FOR CHANGE' },
  'MODERATE': { symbol: '▲', level: 3, description: 'MODERATE - MODERATE CONCERN' },
  'LOW': { symbol: '★', level: 2, description: 'LOW - KEEP ON YOUR RADAR' },
  'NO_IMPACT': { symbol: '◼', level: 1, description: 'VERY LOW - YOU\'RE WINNING' }
};
