import Anthropic from '@anthropic-ai/sdk';
import { Injectable, Logger } from '@nestjs/common';

export interface AiCompletionRequest {
  model: string;
  system: string;
  user: string;
  maxTokens: number;
  /** Thinking/token-spend depth. Lower = cheaper, less thinking overhead. */
  effort?: 'low' | 'medium' | 'high';
}

export interface AiCompletionResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  stopReason: string | null;
}

/**
 * Thin wrapper over the official Anthropic SDK. Lazily constructs the client so
 * the module loads fine when `ANTHROPIC_API_KEY` is unset (AI simply reports
 * disabled). The SDK resolves the key from the environment on construction.
 */
@Injectable()
export class AnthropicClientService {
  private readonly logger = new Logger(AnthropicClientService.name);
  private client: Anthropic | null = null;

  isConfigured(): boolean {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  }

  private getClient(): Anthropic {
    if (!this.client) {
      // Reads ANTHROPIC_API_KEY from the environment.
      this.client = new Anthropic();
    }
    return this.client;
  }

  async complete(req: AiCompletionRequest): Promise<AiCompletionResult> {
    const body: Anthropic.MessageCreateParamsNonStreaming = {
      model: req.model,
      max_tokens: req.maxTokens,
      system: req.system,
      messages: [{ role: 'user', content: req.user }],
    };
    // `output_config.effort` is GA but its typing varies by SDK version; set it
    // defensively so the build is resilient across SDK minor versions.
    if (req.effort) {
      (body as unknown as Record<string, unknown>).output_config = {
        effort: req.effort,
      };
    }

    const response = await this.getClient().messages.create(body);

    let text = '';
    for (const block of response.content) {
      if (block.type === 'text') text += block.text;
    }

    return {
      text,
      inputTokens: response.usage?.input_tokens ?? 0,
      outputTokens: response.usage?.output_tokens ?? 0,
      stopReason: response.stop_reason ?? null,
    };
  }
}
