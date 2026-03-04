import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ListProjectsQueryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  workspaceId: string;
}
