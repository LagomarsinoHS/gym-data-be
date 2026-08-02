import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import {
  DEFAULT_EXCEL_LOCALE,
  EXCEL_TRAINING_PROGRAM_HEADERS,
  type ExcelLocale,
} from './constants/excel-training-program-headers';
import type { AthleteTrainingProgramExport } from './types/athlete-training-program-export.type';

export type ExcelZipEntry = {
  filename: string;
  buffer: Buffer;
};

@Injectable()
export class ExcelService {
  /**
   * Builds an .xlsx buffer for one athlete coach training program.
   * Returns null when there are no sessions (caller should skip that athlete).
   * Sheet layout is temporary and will be refined later.
   */
  async buildAthleteTrainingProgramWorkbook(
    data: AthleteTrainingProgramExport,
    locale: ExcelLocale = DEFAULT_EXCEL_LOCALE,
  ): Promise<Buffer | null> {
    const sessions = [...data.sessions].sort((a, b) => a.order - b.order);
    if (sessions.length === 0) {
      return null;
    }

    const headers = EXCEL_TRAINING_PROGRAM_HEADERS[locale];
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'gym-data-be';
    workbook.created = new Date();

    for (const session of sessions) {
      const sheet = workbook.addWorksheet(this.toSheetName(session.name));
      sheet.addRow([
        headers.exercise,
        headers.sets,
        headers.reps,
        headers.rest,
        headers.notes,
      ]);
      sheet.getRow(1).font = { bold: true };

      const items = [...session.items].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0),
      );

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

  async buildZip(entries: ExcelZipEntry[]): Promise<Buffer> {
    const zip = new JSZip();
    for (const entry of entries) {
      zip.file(entry.filename, entry.buffer);
    }
    return zip.generateAsync({ type: 'nodebuffer' });
  }

  private toSheetName(name: string): string {
    const sanitized = name.replace(/[\\/*?:[\]]/g, '-').trim();
    return (sanitized || 'Sesion').slice(0, 31);
  }
}
