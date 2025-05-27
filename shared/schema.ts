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
  analysisData: jsonb("analysis_data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
  riskScore: decimal("risk_score", { precision: 5, scale: 2 }),
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
