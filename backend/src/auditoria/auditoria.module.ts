import { Module } from '@nestjs/common';
import { AuditoriaController } from './auditoria.controller';
import { AuditoriaControllerService } from './auditoria.controller.service';
import { AuthUtilsService } from '../common/auth-utils.service';

@Module({
  controllers: [AuditoriaController],
  providers: [AuditoriaControllerService, AuthUtilsService],
})
export class AuditoriaModule {}
