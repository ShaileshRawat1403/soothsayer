import { Module } from '@nestjs/common';
import { DaxController } from './dax.controller';
import { DaxService } from './dax.service';

@Module({
  controllers: [DaxController],
  providers: [DaxService],
  exports: [DaxService],
})
export class DaxModule {}
