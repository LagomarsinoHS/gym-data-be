import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { groupTrainingProgramItemsByCategory } from '../common/export/group-training-program-items';
import {
  DEFAULT_EXPORT_LOCALE,
  EXPORT_STYLE,
  TRAINING_PROGRAM_EXPORT_HEADERS,
  exportCategoryTheme,
  type ExportGroupTheme,
  type ExportLocale,
} from '../common/export/training-program-export-headers';
import type {
  AthleteTrainingProgramExport,
  TrainingProgramExportItem,
} from '../common/export/athlete-training-program-export.type';

type SoftBorder = Partial<ExcelJS.Borders>;

@Injectable()
export class ExcelService {
  /**
   * Builds an .xlsx buffer for one athlete coach training program.
   * Layout (single sheet): header once, then each session (banner + category
   * blocks + day total) with two blank rows between sessions.
   * Returns null when there is no coachTrainingProgram (caller should skip that athlete).
   */
  async buildAthleteTrainingProgramWorkbook(
    data: AthleteTrainingProgramExport,
    locale: ExportLocale = DEFAULT_EXPORT_LOCALE,
  ): Promise<Buffer | null> {
    const coachTrainingProgram = [...data.coachTrainingProgram].sort(
      (a, b) => a.order - b.order,
    );
    if (coachTrainingProgram.length === 0) {
      return null;
    }

    const headers = TRAINING_PROGRAM_EXPORT_HEADERS[locale];
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ExerciseDB';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(
      this.toSheetName(
        `${data.firstName} ${data.lastName}`.trim() || headers.fileName,
      ),
    );
    this.applyColumnWidths(
      sheet,
      this.exerciseColumnWidth(coachTrainingProgram, headers.exercise),
    );

    let row = 1;
    row = this.writeHeaderRow(sheet, row, headers);

    for (let i = 0; i < coachTrainingProgram.length; i++) {
      if (i > 0) {
        row += 2; // two blank rows between sessions
      }

      const program = coachTrainingProgram[i];
      row = this.writeSessionBanner(sheet, row, program.name);

      const items = [...program.items].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0),
      );
      const groups = groupTrainingProgramItemsByCategory(
        items,
        locale,
        headers.otherGroup,
      );

      let totalSets = 0;

      for (const group of groups) {
        const theme = exportCategoryTheme(group.key);
        row = this.writeGroupHeader(sheet, row, group.label, theme);

        for (const item of group.items) {
          totalSets += item.sets ?? 0;
          row = this.writeExerciseRow(sheet, row, item);
        }
      }

      row = this.writeTotalRow(sheet, row, headers.totalSets, totalSets);
    }

    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  private applyColumnWidths(
    sheet: ExcelJS.Worksheet,
    exerciseWidth: number,
  ): void {
    sheet.getColumn(1).width = exerciseWidth;
    sheet.getColumn(2).width = 10;
    sheet.getColumn(3).width = 12;
    sheet.getColumn(4).width = 12;
    sheet.getColumn(5).width = 48;
  }

  /** Fit column A to the longest exercise name (Excel width ≈ character count). */
  private exerciseColumnWidth(
    programs: AthleteTrainingProgramExport['coachTrainingProgram'],
    headerLabel: string,
  ): number {
    let longest = headerLabel.length;
    for (const program of programs) {
      for (const item of program.items ?? []) {
        const name = item.exerciseName ?? '';
        if (name.length > longest) longest = name.length;
      }
    }
    // +2 padding; clamp so the sheet stays usable
    return Math.min(60, Math.max(22, longest));
  }

  private writeHeaderRow(
    sheet: ExcelJS.Worksheet,
    row: number,
    headers: (typeof TRAINING_PROGRAM_EXPORT_HEADERS)[ExportLocale],
  ): number {
    const values = [
      headers.exercise,
      headers.sets,
      headers.reps,
      headers.rest,
      headers.notes,
    ];
    const excelRow = sheet.getRow(row);
    excelRow.values = values;
    excelRow.height = 22;
    excelRow.font = {
      bold: true,
      color: { argb: EXPORT_STYLE.headerFontArgb },
      size: 11,
    };
    excelRow.alignment = { vertical: 'middle', horizontal: 'center' };
    excelRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      if (colNumber > EXPORT_STYLE.lastCol) return;
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: EXPORT_STYLE.headerFillArgb },
      };
      cell.border = this.softBorder();
      if (colNumber === 1) {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }
    });
    return row + 1;
  }

  private writeSessionBanner(
    sheet: ExcelJS.Worksheet,
    row: number,
    sessionName: string,
  ): number {
    const endRow = row + 1;
    sheet.mergeCells(row, 1, endRow, EXPORT_STYLE.lastCol);

    const cell = sheet.getCell(row, 1);
    cell.value = sessionName.toUpperCase();
    cell.font = { bold: true, size: 20 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: EXPORT_STYLE.sessionFillArgb },
    };

    // Paint + border both physical rows of the merge
    for (let r = row; r <= endRow; r++) {
      sheet.getRow(r).height = 22;
      for (let col = 1; col <= EXPORT_STYLE.lastCol; col++) {
        const c = sheet.getCell(r, col);
        c.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: EXPORT_STYLE.sessionFillArgb },
        };
        c.border = this.softBorder();
      }
    }

    return endRow + 1;
  }

  private writeGroupHeader(
    sheet: ExcelJS.Worksheet,
    row: number,
    label: string,
    theme: ExportGroupTheme,
  ): number {
    sheet.mergeCells(row, 1, row, EXPORT_STYLE.lastCol);
    const cell = sheet.getCell(row, 1);
    cell.value = label;
    cell.font = { bold: true, size: 11, color: { argb: theme.fontArgb } };
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: theme.fillArgb },
    };
    this.applyRowBorder(sheet, row);
    sheet.getRow(row).height = 20;
    return row + 1;
  }

  private writeExerciseRow(
    sheet: ExcelJS.Worksheet,
    row: number,
    item: TrainingProgramExportItem,
  ): number {
    const notes = item.notes ?? '';
    const excelRow = sheet.getRow(row);
    excelRow.values = [
      item.exerciseName ?? item.exerciseId,
      item.sets ?? '',
      item.reps ?? '',
      item.rest ?? '',
      notes,
    ];
    excelRow.height = this.notesRowHeight(notes);
    excelRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      if (colNumber > EXPORT_STYLE.lastCol) return;
      cell.border = this.softBorder();
      const isNotes = colNumber === 5;
      cell.alignment = {
        vertical: 'middle',
        horizontal: colNumber === 1 || isNotes ? 'left' : 'center',
        wrapText: isNotes,
      };
    });
    return row + 1;
  }

  /** Approximate row height so wrapped notes stay inside the cell. */
  private notesRowHeight(notes: string): number {
    if (!notes.trim()) return 18;
    const explicitLines = notes.split(/\r?\n/).length;
    const wrappedLines = Math.ceil(notes.length / 46);
    const lines = Math.max(explicitLines, wrappedLines, 1);
    return Math.min(90, Math.max(18, lines * 15));
  }

  private writeTotalRow(
    sheet: ExcelJS.Worksheet,
    row: number,
    label: string,
    totalSets: number,
  ): number {
    sheet.mergeCells(row, 1, row, 4);
    const labelCell = sheet.getCell(row, 1);
    labelCell.value = label;
    labelCell.font = { bold: true, size: 11 };
    labelCell.alignment = { horizontal: 'center', vertical: 'middle' };
    labelCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: EXPORT_STYLE.totalFillArgb },
    };

    const totalCell = sheet.getCell(row, 5);
    totalCell.value = totalSets;
    totalCell.font = { bold: true, size: 11 };
    totalCell.alignment = { horizontal: 'center', vertical: 'middle' };
    totalCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: EXPORT_STYLE.totalFillArgb },
    };

    this.applyRowBorder(sheet, row);
    sheet.getRow(row).height = 22;
    return row + 1;
  }

  private softBorder(): SoftBorder {
    const edge: Partial<ExcelJS.Border> = {
      style: 'thin',
      color: { argb: EXPORT_STYLE.softBorderArgb },
    };
    return { top: edge, left: edge, bottom: edge, right: edge };
  }

  private applyRowBorder(sheet: ExcelJS.Worksheet, row: number): void {
    for (let col = 1; col <= EXPORT_STYLE.lastCol; col++) {
      sheet.getCell(row, col).border = this.softBorder();
    }
  }

  private toSheetName(name: string): string {
    const sanitized = name.replace(/[\\/*?:[\]]/g, '-').trim();
    return (sanitized || 'Program').slice(0, 31);
  }
}
