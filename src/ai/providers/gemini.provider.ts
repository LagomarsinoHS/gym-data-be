import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { ApiErrorCode } from '../../common/errors/api-error-code';
import { throwApiError } from '../../common/errors/api-http.exception';
import type { AiService } from '../ai.service';
import {
  PROGRESS_ANALYST_SYSTEM_PROMPT,
  PROGRESS_ANALYZE_USER_PROMPT,
  TRAINER_SYSTEM_PROMPT,
  languageInstruction,
} from '../prompts';
import type { AnalyzeProgressInput, AnalyzeProgressResult } from '../types/analyze-progress.type';
import type { RecommendWorkoutInput, RecommendWorkoutResult } from '../types/recommend-workout.type';

@Injectable()
export class GeminiAiProvider implements AiService {
  private readonly logger = new Logger(GeminiAiProvider.name);
  private readonly client: GoogleGenAI;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    this.model = this.configService.get<string>('GEMINI_MODEL') as string;
    this.client = new GoogleGenAI({
      apiKey: this.configService.getOrThrow<string>('GEMINI_API_KEY'),
    });
  }

  async analyzeProgressPhotos(input: AnalyzeProgressInput): Promise<AnalyzeProgressResult> {
    const imageUrls = [...input.older.photoUrls, ...input.newer.photoUrls];

    // 1. Descargar y subir a Google File API en un solo paso paralelo
    const uploadedFiles = await Promise.all(
      imageUrls.map(async (rawUrl, i) => {
        // Aplicar transformación liviana de Cloudinary
        const optimizedUrl = this.transformCloudinaryUrl(rawUrl);

        const res = await fetch(optimizedUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status} fetching image`);

        const mimeType = res.headers.get('content-type') || 'image/png';
        const arrayBuffer = await res.arrayBuffer();

        return this.client.files.upload({
          file: new Blob([arrayBuffer], { type: mimeType }),
          config: { displayName: `progress_${i + 1}`, mimeType },
        });
      }),
    );

    // 2. Mapear directamente a fileData
    const fileDataParts = uploadedFiles.map((file) => ({
      fileData: { fileUri: file.uri, mimeType: file.mimeType },
    }));

    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        config: {
          systemInstruction: PROGRESS_ANALYST_SYSTEM_PROMPT,
          responseMimeType: 'application/json',
        },
        contents: [
          {
            role: 'user',
            parts: [
              { text: PROGRESS_ANALYZE_USER_PROMPT },
              {
                text: `Mes inicial (${input.older.yearMonth}): ${input.older.photoUrls.length} foto(s), adjuntas primero.`,
              },
              {
                text: `Mes final (${input.newer.yearMonth}): ${input.newer.photoUrls.length} foto(s), adjuntas después.`,
              },
              { text: languageInstruction(input.locale) },
              ...fileDataParts,
            ],
          },
        ],
      });

      const text = response.text?.trim();
      if (!text) {
        throwApiError(HttpStatus.BAD_GATEWAY, ApiErrorCode.AiRequestFailed, 'AI returned an empty response');
      }

      return JSON.parse(text) as AnalyzeProgressResult;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const message = err instanceof Error ? err.message : 'AI request failed';
      this.logger.error(`Gemini progress analysis error: ${message}`);
      throwApiError(HttpStatus.BAD_GATEWAY, ApiErrorCode.AiRequestFailed, 'AI request failed', { reason: message });
    } finally {
      // Limpieza en segundo plano tras enviar o fallar la respuesta
      void Promise.all(
        uploadedFiles.map((file) => {
          if (!file.name) return Promise.resolve();
          return this.client.files.delete({ name: file.name }).catch((err: unknown) => {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.warn(`Error borrando archivo temporal ${file.name}: ${message}`);
          });
        }),
      );
    }
  }

  async recommendWorkout(input: RecommendWorkoutInput): Promise<RecommendWorkoutResult> {
    // TEMP: mock while free-tier Gemini quota is exhausted — remove when quota resets.
    const mockPick = input.candidates.slice(0, 4);
    if (mockPick.length === 4) {
      this.logger.warn('recommendWorkout: returning mock response (Gemini quota bypass)');
      await new Promise((resolve) => setTimeout(resolve, 800));
      return {
        detailedExercises: [
          { id: mockPick[0].id, sets: 4, reps: '6-8', rest: 120 },
          { id: mockPick[1].id, sets: 3, reps: '8-10', rest: 90 },
          { id: mockPick[2].id, sets: 3, reps: '10-12', rest: 75 },
          { id: mockPick[3].id, sets: 3, reps: '12-15', rest: 60 },
        ],
        note:
          input.locale === 'en'
            ? 'Mock plan for front-end testing: start with a heavy compound, then accessory volume with shorter rest.'
            : 'Esta rutina fue seleccionada priorizando el desarrollo global del cuádriceps mediante una progresión que va de mayor a menor demanda neurológica y estabilidad asistida. Comenzamos con la Sentadilla Hack para aplicar máxima tensión mecánica en la zona de mayor estiramiento con total seguridad espinal. Continuamos con la Prensa de Piernas para acumular volumen de trabajo pesado sin fatiga lumbar, seguimos con la Sentadilla Búlgara para corregir asimetrías y enfatizar el trabajo unilateral, y finalizamos con las Extensiones de Cuádriceps para aislar el recto femoral en su posición acortada.\n\nAsegúrate de descender de forma controlada en 2 a 3 segundos en cada repetición, manteniendo el talón firme sobre la plataforma para transferir la fuerza de forma eficiente. En los ejercicios multiarticulares profundiza hasta donde la movilidad de tu tobillo lo permita sin guiño pélvico, y en las extensiones finales haz una pausa de 1 segundo en el punto de máxima contracción para acentuar el trabajo analítico.',
      };
    }

    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        config: {
          systemInstruction: TRAINER_SYSTEM_PROMPT,
          responseMimeType: 'application/json',
        },
        contents: [
          `Muscle group / zone: ${input.zone}`,
          `Available equipment: ${input.equipment.join(', ')}`,
          'Candidates:',
          JSON.stringify(input.candidates),
          languageInstruction(input.locale),
        ].join('\n'),
      });

      const text = response.text?.trim();
      if (!text) {
        throwApiError(HttpStatus.BAD_GATEWAY, ApiErrorCode.AiRequestFailed, 'AI returned an empty response');
      } else {
        return JSON.parse(text) as RecommendWorkoutResult;
      }
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      const message = err instanceof Error ? err.message : 'AI request failed';
      this.logger.error(`Gemini recommend error: ${message}`);
      throwApiError(HttpStatus.BAD_GATEWAY, ApiErrorCode.AiRequestFailed, 'AI request failed', {
        reason: message,
      });
    }
  }

  private transformCloudinaryUrl(url: string): string {
    if (!url.includes('/upload/')) return url;
    return url.replace('/upload/', '/upload/w_1024,c_limit,q_auto,f_png/');
  }
}
