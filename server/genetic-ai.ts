import Anthropic from '@anthropic-ai/sdk';

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface GeneticAnalysisRequest {
  gene: string;
  variant: string;
  genotype: string;
  chromosome?: string;
  position?: number;
}

export interface GeneticAnalysisResult {
  gene: string;
  variant: string;
  genotype: string;
  impact: string;
  clinicalSignificance: string;
  riskScore: number;
  healthCategory: string;
  subcategory: string;
  explanation: string;
  recommendations: string[];
}

export interface ChatAnalysisRequest {
  question: string;
  markers: GeneticAnalysisRequest[];
  previousContext?: string;
}

export async function analyzeGeneticMarker(marker: GeneticAnalysisRequest): Promise<GeneticAnalysisResult> {
  const prompt = `As a clinical geneticist, analyze this genetic marker and provide detailed assessment:

Gene: ${marker.gene}
Variant: ${marker.variant}
Genotype: ${marker.genotype}
${marker.chromosome ? `Chromosome: ${marker.chromosome}` : ''}
${marker.position ? `Position: ${marker.position}` : ''}

Please provide a comprehensive analysis in JSON format with these exact keys:
- gene: string
- variant: string
- genotype: string
- impact: string (High/Moderate/Low/Benign)
- clinicalSignificance: string (Pathogenic/Likely Pathogenic/VUS/Likely Benign/Benign)
- riskScore: number (1-5 scale where 5 is highest risk)
- healthCategory: string (e.g., "Cardiovascular Health", "Cancer Risk", "Metabolic Health")
- subcategory: string (specific condition or trait)
- explanation: string (detailed clinical interpretation)
- recommendations: array of strings (actionable health recommendations)

Focus on clinical accuracy and evidence-based interpretations.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
      system: 'You are a board-certified clinical geneticist with expertise in genetic variant interpretation. Provide accurate, evidence-based genetic counseling based on current scientific literature and clinical guidelines.'
    });

    const content = response.content[0];
    if (content.type === 'text') {
      // Extract JSON from the response
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        return {
          gene: marker.gene,
          variant: marker.variant,
          genotype: marker.genotype,
          impact: analysis.impact || 'Unknown',
          clinicalSignificance: analysis.clinicalSignificance || 'VUS',
          riskScore: Math.min(5, Math.max(1, analysis.riskScore || 3)),
          healthCategory: analysis.healthCategory || 'General Health',
          subcategory: analysis.subcategory || 'Genetic Variant',
          explanation: analysis.explanation || 'Analysis pending',
          recommendations: Array.isArray(analysis.recommendations) ? analysis.recommendations : []
        };
      }
    }

    // Fallback if JSON parsing fails
    return {
      gene: marker.gene,
      variant: marker.variant,
      genotype: marker.genotype,
      impact: 'Unknown',
      clinicalSignificance: 'VUS',
      riskScore: 3,
      healthCategory: 'General Health',
      subcategory: 'Genetic Variant',
      explanation: 'Analysis could not be completed',
      recommendations: []
    };
  } catch (error) {
    console.error('Error analyzing genetic marker:', error);
    throw new Error('Failed to analyze genetic marker');
  }
}

export async function generateRiskAssessments(markers: GeneticAnalysisResult[]): Promise<Array<{
  category: string;
  subcategory: string;
  riskLevel: number;
  description: string;
  recommendation: string;
}>> {
  const prompt = `As a clinical geneticist, analyze these genetic markers and create comprehensive risk assessments:

${markers.map(m => `${m.gene} (${m.variant}): ${m.genotype} - ${m.impact} impact, Clinical: ${m.clinicalSignificance}, Risk: ${m.riskScore}/5`).join('\n')}

Please provide risk assessments grouped by health category in JSON format. Each assessment should have:
- category: string (health category)
- subcategory: string (specific condition)
- riskLevel: number (1-5 scale)
- description: string (clear explanation of the risk)
- recommendation: string (specific actionable advice)

Focus on evidence-based interpretations and practical recommendations.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
      system: 'You are a clinical geneticist providing comprehensive genetic risk assessments. Base your analysis on current scientific evidence and clinical guidelines.'
    });

    const content = response.content[0];
    if (content.type === 'text') {
      const jsonMatch = content.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const assessments = JSON.parse(jsonMatch[0]);
        return Array.isArray(assessments) ? assessments : [];
      }
    }

    return [];
  } catch (error) {
    console.error('Error generating risk assessments:', error);
    return [];
  }
}

export async function answerGeneticQuestion(request: ChatAnalysisRequest): Promise<string> {
  const markersContext = request.markers.map(m => 
    `${m.gene} ${m.variant} (${m.genotype})`
  ).join(', ');

  const prompt = `Question: ${request.question}

Available genetic data: ${markersContext}

${request.previousContext ? `Previous context: ${request.previousContext}` : ''}

As a clinical geneticist, provide a detailed, accurate answer based on the genetic data provided. Focus on:
- Evidence-based interpretations
- Clinical significance
- Practical health implications
- Actionable recommendations

Keep the response informative but accessible to patients.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
      system: 'You are a board-certified clinical geneticist providing genetic counseling. Give accurate, evidence-based answers while being sensitive to patient concerns and maintaining appropriate clinical boundaries.'
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return content.text;
    }

    return 'I apologize, but I cannot provide an analysis at this time. Please try rephrasing your question.';
  } catch (error) {
    console.error('Error answering genetic question:', error);
    throw new Error('Failed to process genetic question');
  }
}