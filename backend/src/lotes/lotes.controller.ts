import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { LotesService } from './lotes.service';

@Controller('lotes')
export class LotesController {
  constructor(private readonly lotesService: LotesService) {}

  @Public()
  @Get()
  async listar() {
    return this.lotesService.listar();
  }
}

