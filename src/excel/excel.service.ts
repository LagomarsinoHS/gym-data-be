import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import {
  DEFAULT_EXCEL_LOCALE,
  EXCEL_STYLE,
  EXCEL_TRAINING_PROGRAM_HEADERS,
  excelCategoryLabel,
  excelCategoryTheme,
  type ExcelGroupTheme,
  type ExcelLocale,
} from './constants/excel-training-program-headers';
import type {
  AthleteTrainingProgramExport,
  ExcelTrainingProgramItem,
} from './types/athlete-training-program-export.type';

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
    locale: ExcelLocale = DEFAULT_EXCEL_LOCALE,
  ): Promise<Buffer | null> {
    const coachTrainingProgram = [...data.coachTrainingProgram].sort(
      (a, b) => a.order - b.order,
    );
    if (coachTrainingProgram.length === 0) {
      return null;
    }

    const headers = EXCEL_TRAINING_PROGRAM_HEADERS[locale];
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
      const groups = this.groupItemsByCategory(
        items,
        locale,
        headers.otherGroup,
      );

      let totalSets = 0;

      for (const group of groups) {
        const theme = excelCategoryTheme(group.key);
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
    headers: (typeof EXCEL_TRAINING_PROGRAM_HEADERS)[ExcelLocale],
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
      color: { argb: EXCEL_STYLE.headerFontArgb },
      size: 11,
    };
    excelRow.alignment = { vertical: 'middle', horizontal: 'center' };
    excelRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      if (colNumber > EXCEL_STYLE.lastCol) return;
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: EXCEL_STYLE.headerFillArgb },
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
    sheet.mergeCells(row, 1, endRow, EXCEL_STYLE.lastCol);

    const cell = sheet.getCell(row, 1);
    cell.value = sessionName.toUpperCase();
    cell.font = { bold: true, size: 20 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: EXCEL_STYLE.sessionFillArgb },
    };

    // Paint + border both physical rows of the merge
    for (let r = row; r <= endRow; r++) {
      sheet.getRow(r).height = 22;
      for (let col = 1; col <= EXCEL_STYLE.lastCol; col++) {
        const c = sheet.getCell(r, col);
        c.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: EXCEL_STYLE.sessionFillArgb },
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
    theme: ExcelGroupTheme,
  ): number {
    sheet.mergeCells(row, 1, row, EXCEL_STYLE.lastCol);
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
    item: ExcelTrainingProgramItem,
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
      if (colNumber > EXCEL_STYLE.lastCol) return;
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
      fgColor: { argb: EXCEL_STYLE.totalFillArgb },
    };

    const totalCell = sheet.getCell(row, 5);
    totalCell.value = totalSets;
    totalCell.font = { bold: true, size: 11 };
    totalCell.alignment = { horizontal: 'center', vertical: 'middle' };
    totalCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: EXCEL_STYLE.totalFillArgb },
    };

    this.applyRowBorder(sheet, row);
    sheet.getRow(row).height = 22;
    return row + 1;
  }

  private groupItemsByCategory(
    items: ExcelTrainingProgramItem[],
    locale: ExcelLocale,
    otherLabel: string,
  ): { key: string; label: string; items: ExcelTrainingProgramItem[] }[] {
    const groups: {
      key: string;
      label: string;
      items: ExcelTrainingProgramItem[];
    }[] = [];
    const indexByKey = new Map<string, number>();

    for (const item of items) {
      const key = item.category?.trim().toLowerCase() || '__other__';
      let index = indexByKey.get(key);
      if (index === undefined) {
        index = groups.length;
        indexByKey.set(key, index);
        groups.push({
          key,
          label: excelCategoryLabel(
            key === '__other__' ? undefined : item.category,
            locale,
            otherLabel,
          ),
          items: [],
        });
      }
      groups[index].items.push(item);
    }

    return groups;
  }

  private softBorder(): SoftBorder {
    const edge: Partial<ExcelJS.Border> = {
      style: 'thin',
      color: { argb: EXCEL_STYLE.softBorderArgb },
    };
    return { top: edge, left: edge, bottom: edge, right: edge };
  }

  private applyRowBorder(sheet: ExcelJS.Worksheet, row: number): void {
    for (let col = 1; col <= EXCEL_STYLE.lastCol; col++) {
      sheet.getCell(row, col).border = this.softBorder();
    }
  }

  private toSheetName(name: string): string {
    const sanitized = name.replace(/[\\/*?:[\]]/g, '-').trim();
    return (sanitized || 'Program').slice(0, 31);
  }
}
