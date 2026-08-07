import { Module } from '@nestjs/common';
import { AI_SERVICE } from './ai.tokens';
import { GeminiAiProvider } from './providers/gemini.provider';

@Module({
  providers: [
    GeminiAiProvider,
    {
      provide: AI_SERVICE,
      useExisting: GeminiAiProvider,
    },
  ],
  exports: [AI_SERVICE],
})
export class AiModule {}
