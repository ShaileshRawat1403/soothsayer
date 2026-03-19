import { Module } from '@nestjs/common';
import { DaxModule } from '../dax/dax.module';
import { WorkflowsService } from './workflows.service';
import { WorkflowsController } from './workflows.controller';

@Module({
  imports: [DaxModule],
  controllers: [WorkflowsController],
  providers: [WorkflowsService],
  exports: [WorkflowsService],
})
export class WorkflowsModule {}
