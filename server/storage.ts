import { 
  users, 
  geneticAnalyses,
  geneticMarkers,
  riskAssessments,
  chatMessages,
  type User, 
  type InsertUser,
  type GeneticAnalysis,
  type InsertGeneticAnalysis,
  type GeneticMarker,
  type InsertGeneticMarker,
  type RiskAssessment,
  type InsertRiskAssessment,
  type ChatMessage,
  type InsertChatMessage,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Genetic analysis methods
  createGeneticAnalysis(analysis: InsertGeneticAnalysis): Promise<GeneticAnalysis>;
  getGeneticAnalysis(id: number): Promise<GeneticAnalysis | undefined>;
  getAllGeneticAnalyses(): Promise<GeneticAnalysis[]>;

  // Genetic marker methods
  createGeneticMarker(marker: InsertGeneticMarker): Promise<GeneticMarker>;
  getGeneticMarkersByAnalysisId(analysisId: number): Promise<GeneticMarker[]>;

  // Risk assessment methods
  createRiskAssessment(assessment: InsertRiskAssessment): Promise<RiskAssessment>;
  getRiskAssessmentsByAnalysisId(analysisId: number): Promise<RiskAssessment[]>;

  // Chat message methods
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessagesByAnalysisId(analysisId: number): Promise<ChatMessage[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async createGeneticAnalysis(insertAnalysis: InsertGeneticAnalysis): Promise<GeneticAnalysis> {
    const [analysis] = await db
      .insert(geneticAnalyses)
      .values({
        ...insertAnalysis,
        status: 'completed',
        updatedAt: new Date()
      })
      .returning();
    return analysis;
  }

  async getGeneticAnalysis(id: number): Promise<GeneticAnalysis | undefined> {
    const [analysis] = await db.select().from(geneticAnalyses).where(eq(geneticAnalyses.id, id));
    return analysis || undefined;
  }

  async getAllGeneticAnalyses(): Promise<GeneticAnalysis[]> {
    return await db.select().from(geneticAnalyses).orderBy(desc(geneticAnalyses.createdAt));
  }

  async createGeneticMarker(insertMarker: InsertGeneticMarker): Promise<GeneticMarker> {
    const [marker] = await db
      .insert(geneticMarkers)
      .values(insertMarker)
      .returning();
    return marker;
  }

  async getGeneticMarkersByAnalysisId(analysisId: number): Promise<GeneticMarker[]> {
    return await db.select().from(geneticMarkers).where(eq(geneticMarkers.analysisId, analysisId));
  }

  async createRiskAssessment(insertAssessment: InsertRiskAssessment): Promise<RiskAssessment> {
    const [assessment] = await db
      .insert(riskAssessments)
      .values(insertAssessment)
      .returning();
    return assessment;
  }

  async getRiskAssessmentsByAnalysisId(analysisId: number): Promise<RiskAssessment[]> {
    return await db.select().from(riskAssessments).where(eq(riskAssessments.analysisId, analysisId));
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const [message] = await db
      .insert(chatMessages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async getChatMessagesByAnalysisId(analysisId: number): Promise<ChatMessage[]> {
    return await db.select().from(chatMessages).where(eq(chatMessages.analysisId, analysisId));
  }
}

export const storage = new DatabaseStorage();