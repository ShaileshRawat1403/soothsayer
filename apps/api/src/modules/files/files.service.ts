import { BadRequestException, Injectable } from '@nestjs/common';
import type { Express } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FilesService {
  constructor(private readonly prisma: PrismaService) {}

  // TODO: Implement service methods
  async findAll() {
    return [];
  }

  async findOne(id: string) {
    return { id };
  }

  async parseUploadedFile(file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const name = file.originalname || 'file';
    const ext = name.split('.').pop()?.toLowerCase() || '';
    const mime = file.mimetype || '';
    const supported =
      mime.startsWith('text/') ||
      ['txt', 'md', 'markdown', 'log', 'json', 'yaml', 'yml', 'pdf'].includes(ext) ||
      mime === 'application/pdf';

    if (!supported) {
      throw new BadRequestException('Unsupported file type. Supported: PDF, TXT, MD, LOG, JSON, YAML');
    }

    const rawText = this.extractText(file.buffer, ext, mime);
    const normalized = rawText
      .replace(/\u0000/g, ' ')
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (!normalized) {
      throw new BadRequestException('Could not extract text from file');
    }

    const maxChars = 12000;
    return {
      fileName: name,
      mimeType: mime,
      size: file.size,
      text: normalized.slice(0, maxChars),
      truncated: normalized.length > maxChars,
    };
  }

  private extractText(buffer: Buffer, ext: string, mime: string): string {
    const isPdf = ext === 'pdf' || mime === 'application/pdf';
    if (!isPdf) {
      return buffer.toString('utf8');
    }

    // Best-effort fallback without external PDF parser dependency.
    const latin = buffer.toString('latin1');
    const matches = latin.match(/\(([^()]*)\)/g) || [];
    const extracted = matches
      .map((token) => token.slice(1, -1))
      .map((token) =>
        token
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, ' ')
          .replace(/\\t/g, ' ')
          .replace(/\\\\/g, '\\')
          .replace(/\\\(/g, '(')
          .replace(/\\\)/g, ')'),
      )
      .join('\n');

    if (extracted.trim()) {
      return extracted;
    }

    return latin.replace(/[^\x20-\x7E\n]/g, ' ');
  }
}
