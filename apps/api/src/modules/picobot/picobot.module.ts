import { Module } from '@nestjs/common';
import { PicobotService } from './picobot.service';
import { PicobotController } from './picobot.controller';

@Module({
  controllers: [PicobotController],
  providers: [PicobotService],
  exports: [PicobotService],
})
export class PicobotModule {}
