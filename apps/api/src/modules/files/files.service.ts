import { Injectable } from '@nestjs/common';
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
}
