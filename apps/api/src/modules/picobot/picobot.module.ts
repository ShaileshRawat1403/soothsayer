import { Module } from '@nestjs/common';
import { PicobotController } from './picobot.controller';
import { PicobotService } from './picobot.service';

@Module({
  controllers: [PicobotController],
  providers: [PicobotService],
  exports: [PicobotService],
})
export class PicobotModule {}
