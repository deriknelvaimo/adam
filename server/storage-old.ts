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

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Genetic analysis methods
  async createGeneticAnalysis(insertAnalysis: InsertGeneticAnalysis): Promise<GeneticAnalysis> {
    const id = this.currentAnalysisId++;
    const analysis: GeneticAnalysis = { 
      ...insertAnalysis, 
      id,
      userId: null,
      createdAt: new Date()
    };
    this.geneticAnalyses.set(id, analysis);
    return analysis;
  }

  async getGeneticAnalysis(id: number): Promise<GeneticAnalysis | undefined> {
    return this.geneticAnalyses.get(id);
  }

  async getAllGeneticAnalyses(): Promise<GeneticAnalysis[]> {
    return Array.from(this.geneticAnalyses.values());
  }

  // Genetic marker methods
  async createGeneticMarker(insertMarker: InsertGeneticMarker): Promise<GeneticMarker> {
    const id = this.currentMarkerId++;
    const marker: GeneticMarker = { 
      ...insertMarker, 
      id,
      chromosome: insertMarker.chromosome || null,
      position: insertMarker.position || null,
      riskScore: insertMarker.riskScore || null,
      healthCategory: insertMarker.healthCategory || null,
      subcategory: insertMarker.subcategory || null,
      explanation: insertMarker.explanation || null,
      recommendations: insertMarker.recommendations || null
    };
    this.geneticMarkers.set(id, marker);
    return marker;
  }

  async getGeneticMarkersByAnalysisId(analysisId: number): Promise<GeneticMarker[]> {
    return Array.from(this.geneticMarkers.values()).filter(
      marker => marker.analysisId === analysisId
    );
  }

  // Risk assessment methods
  async createRiskAssessment(insertAssessment: InsertRiskAssessment): Promise<RiskAssessment> {
    const id = this.currentRiskId++;
    const assessment: RiskAssessment = { ...insertAssessment, id };
    this.riskAssessments.set(id, assessment);
    return assessment;
  }

  async getRiskAssessmentsByAnalysisId(analysisId: number): Promise<RiskAssessment[]> {
    return Array.from(this.riskAssessments.values()).filter(
      assessment => assessment.analysisId === analysisId
    );
  }

  // Chat message methods
  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const id = this.currentChatId++;
    const message: ChatMessage = { 
      ...insertMessage, 
      id,
      timestamp: new Date()
    };
    this.chatMessages.set(id, message);
    return message;
  }

  async getChatMessagesByAnalysisId(analysisId: number): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values()).filter(
      message => message.analysisId === analysisId
    );
  }
}

export const storage = new MemStorage();
