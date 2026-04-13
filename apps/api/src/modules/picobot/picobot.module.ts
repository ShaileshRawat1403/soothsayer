import { Module } from '@nestjs/common';
import { PicobotController } from './picobot.controller';
import { PicobotService } from './picobot.service';
import { DaxModule } from '../dax/dax.module';

@Module({
  imports: [DaxModule],
  controllers: [PicobotController],
  providers: [PicobotService],
  exports: [PicobotService],
})
export class PicobotModule {}
