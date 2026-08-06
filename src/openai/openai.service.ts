import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ApiErrorCode } from '../common/errors/api-error-code';
import { throwApiError } from '../common/errors/api-http.exception';
import {
  PROGRESS_ANALYST_SYSTEM_PROMPT,
  PROGRESS_ANALYZE_USER_PROMPT,
  TRAINER_SYSTEM_PROMPT,
  analyzeProgressLanguageInstruction,
  recommendNoteLanguageInstruction,
} from './prompts';
import type {
  AnalyzeProgressInput,
  AnalyzeProgressResult,
} from './types/analyze-progress.type';
import type {
  OpenAiRecommendJson,
  RecommendLocale,
  RecommendWorkoutInput,
  RecommendWorkoutResult,
} from './types/recommend-workout.type';

@Injectable()
export class OpenAiService {
  private readonly logger = new Logger(OpenAiService.name);
  private readonly client: OpenAI | null;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.model = this.configService.get<string>('OPENAI_MODEL') as string;
    this.client = apiKey ? new OpenAI({ apiKey }) : null;
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  /**
   * Visual analysis of two progress months (front + back) via Cloudinary URLs.
   */
  async analyzeProgressPhotos(
    input: AnalyzeProgressInput,
  ): Promise<AnalyzeProgressResult> {
    const client = this.assertConfigured();

    return {
      analysis: `Este es un análisis de prueba para el progreso físico del atleta.
Se observa una leve mejoría en la definición muscular general.
El desarrollo de los hombros muestra avances notables en volumen.
La zona del pecho ha mejorado su simetría y firmeza.
Se aprecia un incremento en la masa muscular de los brazos.
La espalda presenta mayor densidad, especialmente en la parte superior.
Las piernas y glúteos muestran una mejor separación muscular.
La postura general es más sólida y erguida en las fotos finales.
No se identifican cambios negativos ni regresiones evidentes.
En resumen, el atleta ha experimentado un progreso positivo en varios aspectos.`,
    };

    try {
      const response = await client.responses.create({
        model: this.model,
        input: [
          { role: 'system', content: PROGRESS_ANALYST_SYSTEM_PROMPT },
          {
            role: 'user',
            content: this.buildAnalyzeProgressUserText(input),
          },
        ],
      });

      console.log(JSON.stringify(response, null, 2));

      const text = response.output_text?.trim();
      if (!text) {
        throwApiError(
          HttpStatus.BAD_GATEWAY,
          ApiErrorCode.OpenaiRequestFailed,
          'OpenAI returned an empty response',
        );
      }

      return { analysis: text };
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      const message =
        err instanceof Error ? err.message : 'OpenAI request failed';
      this.logger.error(`OpenAI progress analysis error: ${message}`);
      throwApiError(
        HttpStatus.BAD_GATEWAY,
        ApiErrorCode.OpenaiRequestFailed,
        'OpenAI request failed',
        { reason: message },
      );
    }
  }

  /**
   * Picks exactly 4 exercise ids from candidates + one explanatory note.
   */
  async recommendWorkout(
    input: RecommendWorkoutInput,
  ): Promise<RecommendWorkoutResult> {
    const client = this.assertConfigured();
    const allowed = new Set(input.candidates.map((c) => c.id));

    try {
      const response = await client.responses.create({
        model: this.model,
        input: [
          { role: 'system', content: TRAINER_SYSTEM_PROMPT },
          { role: 'user', content: this.buildRecommendUserContent(input) },
        ],
      });

      const text = response.output_text?.trim();
      if (!text) {
        throwApiError(
          HttpStatus.BAD_GATEWAY,
          ApiErrorCode.OpenaiRequestFailed,
          'OpenAI returned an empty response',
        );
      }

      return this.parseRecommendResult(text, allowed);
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      const message =
        err instanceof Error ? err.message : 'OpenAI request failed';
      this.logger.error(`OpenAI error: ${message}`);
      throwApiError(
        HttpStatus.BAD_GATEWAY,
        ApiErrorCode.OpenaiRequestFailed,
        'OpenAI request failed',
        { reason: message },
      );
    }
  }

  private buildAnalyzeProgressUserText(input: AnalyzeProgressInput): string {
    return [
      PROGRESS_ANALYZE_USER_PROMPT,
      '',
      `Estas son las mas antiguas`,
      this.monthUrlsLine(input.older),
      '',
      `Y aqui son las imagenes mas recientes`,
      this.monthUrlsLine(input.newer),
      '',
      analyzeProgressLanguageInstruction(input.locale),
    ].join('\n');
  }

  private monthUrlsLine(month: AnalyzeProgressInput['older']): string {
    return [month.frontUrl, month.backUrl].filter(Boolean).join(', ');
  }

  private buildRecommendUserContent(input: RecommendWorkoutInput): string {
    const locale: RecommendLocale = input.locale;
    const noteHint =
      locale === 'en'
        ? 'brief explanation in English of why you chose these four'
        : 'explicación breve en español del porqué de la selección';

    return [
      `Muscle group / zone: ${input.zone}`,
      `Available equipment: ${input.equipment.join(', ')}`,
      `UI locale: ${locale}`,
      recommendNoteLanguageInstruction(locale),
      'Pick exactly 4 distinct exercises from the list (use only their ids).',
      'Reply ONLY with this JSON:',
      `{"ids":["id1","id2","id3","id4"],"note":"${noteHint}"}`,
      'Candidates:',
      JSON.stringify(input.candidates),
    ].join('\n');
  }

  private parseRecommendResult(
    raw: string,
    allowed: Set<string>,
  ): RecommendWorkoutResult {
    let parsed: OpenAiRecommendJson;
    try {
      const jsonText = this.extractJsonObject(raw);
      parsed = JSON.parse(jsonText) as OpenAiRecommendJson;
    } catch {
      this.logger.warn(`OpenAI JSON parse failed: ${raw.slice(0, 200)}`);
      throwApiError(
        HttpStatus.BAD_GATEWAY,
        ApiErrorCode.OpenaiRequestFailed,
        'OpenAI returned invalid JSON',
      );
    }

    const ids = Array.isArray(parsed.ids)
      ? parsed.ids
          .map((id) => String(id).trim())
          .filter((id) => id && allowed.has(id))
      : [];
    const uniqueIds = [...new Set(ids)].slice(0, 4);
    const note = typeof parsed.note === 'string' ? parsed.note.trim() : '';

    if (uniqueIds.length !== 4 || !note) {
      throwApiError(
        HttpStatus.BAD_GATEWAY,
        ApiErrorCode.OpenaiRequestFailed,
        'OpenAI did not return 4 valid exercise ids and a note',
        { ids: uniqueIds, hasNote: Boolean(note) },
      );
    }

    return { ids: uniqueIds, note };
  }

  /** Allows accidental markdown fences around the JSON object. */
  private extractJsonObject(raw: string): string {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{')) {
      return trimmed;
    }
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return trimmed.slice(start, end + 1);
    }
    return trimmed;
  }

  private assertConfigured(): OpenAI {
    if (!this.client) {
      throwApiError(
        HttpStatus.SERVICE_UNAVAILABLE,
        ApiErrorCode.OpenaiNotConfigured,
        'OpenAI is not configured (set OPENAI_API_KEY)',
      );
    }
    return this.client;
  }
}
