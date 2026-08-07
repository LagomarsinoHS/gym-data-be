import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import {
  DEFAULT_EXCEL_LOCALE,
  EXCEL_TRAINING_PROGRAM_HEADERS,
  type ExcelLocale,
} from './constants/excel-training-program-headers';
import type { AthleteTrainingProgramExport } from './types/athlete-training-program-export.type';

@Injectable()
export class ExcelService {
  /**
   * Builds an .xlsx buffer for one athlete coach training program.
   * Returns null when there is no coachTrainingProgram (caller should skip that athlete).
   * Sheet layout is temporary and will be refined later.
   */
  async buildAthleteTrainingProgramWorkbook(
    data: AthleteTrainingProgramExport,
    locale: ExcelLocale = DEFAULT_EXCEL_LOCALE,
  ): Promise<Buffer | null> {
    const coachTrainingProgram = [...data.coachTrainingProgram].sort((a, b) => a.order - b.order);
    if (coachTrainingProgram.length === 0) {
      return null;
    }

    const headers = EXCEL_TRAINING_PROGRAM_HEADERS[locale];
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ExerciseDB';
    workbook.created = new Date();

    for (const program of coachTrainingProgram) {
      const sheet = workbook.addWorksheet(this.toSheetName(program.name));
      sheet.addRow([headers.exercise, headers.sets, headers.reps, headers.rest, headers.notes]);
      sheet.getRow(1).font = { bold: true };

      const items = [...program.items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      for (const item of items) {
        sheet.addRow([
          item.exerciseName ?? item.exerciseId,
          item.sets ?? '',
          item.reps ?? '',
          item.rest ?? '',
          item.notes ?? '',
        ]);
      }

      sheet.columns.forEach((column) => {
        column.width = 18;
      });
    }

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  private toSheetName(name: string): string {
    const sanitized = name.replace(/[\\/*?:[\]]/g, '-').trim();
    return (sanitized || 'Program').slice(0, 31);
  }
}
