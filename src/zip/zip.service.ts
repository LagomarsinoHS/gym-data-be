import { Injectable } from '@nestjs/common';
import JSZip from 'jszip';

export type ZipEntry = {
  filename: string;
  buffer: Buffer;
};

@Injectable()
export class ZipService {
  async buildZip(entries: ZipEntry[]): Promise<Buffer> {
    const zip = new JSZip();
    for (const entry of entries) {
      zip.file(entry.filename, entry.buffer);
    }
    return zip.generateAsync({ type: 'nodebuffer' });
  }
}
