import { Injectable, OnModuleInit } from '@nestjs/common';
import * as path from 'path';
import pdfmake from 'pdfmake';
import type {
  Content,
  TDocumentDefinitions,
  TableCell,
} from 'pdfmake/interfaces';
import {
  DEFAULT_EXCEL_LOCALE,
  EXCEL_STYLE,
  EXCEL_TRAINING_PROGRAM_HEADERS,
  excelCategoryLabel,
  excelCategoryTheme,
  type ExcelLocale,
} from '../excel/constants/excel-training-program-headers';
import type {
  AthleteTrainingProgramExport,
  ExcelTrainingProgramItem,
} from '../excel/types/athlete-training-program-export.type';

function argbToHex(argb: string): string {
  const hex = argb.replace(/^FF/i, '');
  return `#${hex}`;
}

@Injectable()
export class PdfService implements OnModuleInit {
  onModuleInit(): void {
    // Fonts live under node_modules; restrict local FS to that tree only.
    pdfmake.setLocalAccessPolicy((filePath: string) =>
      path.normalize(filePath).includes(`${path.sep}pdfmake${path.sep}`),
    );
    pdfmake.setUrlAccessPolicy(() => false);

    const fontsRoot = path.join(
      process.cwd(),
      'node_modules',
      'pdfmake',
      'fonts',
      'Roboto',
    );
    pdfmake.addFonts({
      Roboto: {
        normal: path.join(fontsRoot, 'Roboto-Regular.ttf'),
        bold: path.join(fontsRoot, 'Roboto-Medium.ttf'),
        italics: path.join(fontsRoot, 'Roboto-Italic.ttf'),
        bolditalics: path.join(fontsRoot, 'Roboto-MediumItalic.ttf'),
      },
    });
  }

  /**
   * Builds a PDF buffer for one athlete coach training program.
   * Same layout idea as Excel: sessions stacked with gaps, category color blocks.
   * Returns null when there is no coachTrainingProgram.
   */
  async buildAthleteTrainingProgramPdf(
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
    const athleteName =
      `${data.firstName} ${data.lastName}`.trim() || headers.fileName;

    const content: Content[] = [
      {
        text: athleteName,
        style: 'athleteTitle',
        margin: [0, 0, 0, 12],
      },
    ];

    for (let i = 0; i < coachTrainingProgram.length; i++) {
      if (i > 0) {
        content.push({ text: '', margin: [0, 0, 0, 18] });
      }

      const program = coachTrainingProgram[i];
      content.push({
        table: {
          widths: ['*'],
          body: [
            [
              {
                text: program.name.toUpperCase(),
                style: 'sessionBanner',
                fillColor: argbToHex(EXCEL_STYLE.sessionFillArgb),
                alignment: 'center',
                margin: [0, 10, 0, 10],
              },
            ],
          ],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 6],
      });

      const items = [...program.items].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0),
      );
      const groups = this.groupItemsByCategory(
        items,
        locale,
        headers.otherGroup,
      );

      const tableBody: TableCell[][] = [
        [
          {
            text: headers.exercise,
            style: 'tableHeader',
            fillColor: argbToHex(EXCEL_STYLE.headerFillArgb),
            color: argbToHex(EXCEL_STYLE.headerFontArgb),
          },
          {
            text: headers.sets,
            style: 'tableHeader',
            fillColor: argbToHex(EXCEL_STYLE.headerFillArgb),
            color: argbToHex(EXCEL_STYLE.headerFontArgb),
            alignment: 'center',
          },
          {
            text: headers.reps,
            style: 'tableHeader',
            fillColor: argbToHex(EXCEL_STYLE.headerFillArgb),
            color: argbToHex(EXCEL_STYLE.headerFontArgb),
            alignment: 'center',
          },
          {
            text: headers.rest,
            style: 'tableHeader',
            fillColor: argbToHex(EXCEL_STYLE.headerFillArgb),
            color: argbToHex(EXCEL_STYLE.headerFontArgb),
            alignment: 'center',
          },
          {
            text: headers.notes,
            style: 'tableHeader',
            fillColor: argbToHex(EXCEL_STYLE.headerFillArgb),
            color: argbToHex(EXCEL_STYLE.headerFontArgb),
          },
        ],
      ];

      let totalSets = 0;

      for (const group of groups) {
        const theme = excelCategoryTheme(group.key);
        tableBody.push([
          {
            text: group.label,
            colSpan: 5,
            bold: true,
            color: argbToHex(theme.fontArgb),
            fillColor: argbToHex(theme.fillArgb),
            margin: [4, 4, 4, 4],
          },
          {},
          {},
          {},
          {},
        ]);

        for (const item of group.items) {
          totalSets += item.sets ?? 0;
          tableBody.push([
            { text: item.exerciseName ?? item.exerciseId, margin: [2, 3, 2, 3] },
            {
              text: item.sets != null ? String(item.sets) : '',
              alignment: 'center',
              margin: [2, 3, 2, 3],
            },
            {
              text: item.reps ?? '',
              alignment: 'center',
              margin: [2, 3, 2, 3],
            },
            {
              text: item.rest != null ? String(item.rest) : '',
              alignment: 'center',
              margin: [2, 3, 2, 3],
            },
            { text: item.notes ?? '', margin: [2, 3, 2, 3] },
          ]);
        }
      }

      tableBody.push([
        {
          text: headers.totalSets,
          colSpan: 4,
          bold: true,
          alignment: 'center',
          fillColor: argbToHex(EXCEL_STYLE.totalFillArgb),
          margin: [4, 6, 4, 6],
        },
        {},
        {},
        {},
        {
          text: String(totalSets),
          bold: true,
          alignment: 'center',
          fillColor: argbToHex(EXCEL_STYLE.totalFillArgb),
          margin: [4, 6, 4, 6],
        },
      ]);

      content.push({
        table: {
          headerRows: 1,
          widths: ['*', 40, 50, 50, '*'],
          body: tableBody,
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => argbToHex(EXCEL_STYLE.softBorderArgb),
          vLineColor: () => argbToHex(EXCEL_STYLE.softBorderArgb),
        },
      });
    }

    const docDefinition: TDocumentDefinitions = {
      pageSize: 'A4',
      pageMargins: [36, 40, 36, 40],
      info: {
        title: `${athleteName} — ${headers.fileName}`,
        author: 'ExerciseDB',
        creator: 'ExerciseDB',
      },
      defaultStyle: {
        font: 'Roboto',
        fontSize: 9,
      },
      styles: {
        athleteTitle: {
          fontSize: 14,
          bold: true,
        },
        sessionBanner: {
          fontSize: 16,
          bold: true,
        },
        tableHeader: {
          bold: true,
          fontSize: 9,
          margin: [2, 4, 2, 4],
        },
      },
      content,
    };

    return pdfmake.createPdf(docDefinition).getBuffer();
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
}
