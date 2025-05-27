interface OllamaResponse {
  model: string;
  response: string;
  done: boolean;
}

export interface LocalLLMConfig {
  baseUrl: string;
  model: string;
}

export class LocalLLM {
  private config: LocalLLMConfig;

  constructor(config: LocalLLMConfig) {
    this.config = config;
  }

  async generateResponse(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const payload = {
        model: this.config.model,
        prompt: prompt,
        system: systemPrompt,
        stream: false,
        options: {
          temperature: 0.1, // Low temperature for consistent medical analysis
          top_p: 0.9,
          top_k: 40
        }
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout
      
      const response = await fetch(`${this.config.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Local LLM API error: ${response.status} ${response.statusText}`);
      }

      const data: OllamaResponse = await response.json();
      return data.response;
    } catch (error) {
      console.error('Local LLM error:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Local model analysis timeout (exceeded 2 minutes). The model may need more time for complex genetic variants.`);
      }
      throw new Error(`Failed to get response from local model: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`);
      if (!response.ok) return [];
      
      const data = await response.json();
      return data.models?.map((model: any) => model.name) || [];
    } catch (error) {
      return [];
    }
  }
}

// Initialize the local LLM
export const localLLM = new LocalLLM({
  baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  model: process.env.LOCAL_MODEL_NAME || 'llama3.1:8b'
});