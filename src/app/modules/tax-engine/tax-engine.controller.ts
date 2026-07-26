import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { RateLimitTier } from '../security/decorators';
import { TaxQueryDto } from './dto/tax-query.dto';
import { ResetSessionDto } from './dto/reset-session.dto';
import { TaxEngineService } from './tax-engine.service';
import { StateManagerService } from './session/state-manager.service';
import { PersianSearchEngineService } from './search/persian-search-engine.service';

@Controller('tax-engine')
export class TaxEngineController {
  constructor(
    private readonly stateManager: StateManagerService,
    private readonly taxEngineService: TaxEngineService,
    private readonly searchEngine: PersianSearchEngineService,
  ) {}

  @Public()
  @RateLimitTier('tax_engine')
  @Post('start')
  @HttpCode(HttpStatus.OK)
  async startSession() {
    const session = await this.stateManager.createSession();
    return {
      sessionId: session.id,
      message:
        'سلام! به موتور هوشمند مالیاتی خوش آمدید. هر سوالی درباره قانون مالیاتهای مستقیم دارید بپرسید.',
      step: session.step,
    };
  }

  @Public()
  @RateLimitTier('tax_engine')
  @Post('query')
  @HttpCode(HttpStatus.OK)
  async query(@Body() dto: TaxQueryDto) {
    return this.taxEngineService.processQuery(dto.sessionId, dto.message);
  }

  @Public()
  @RateLimitTier('default')
  @Get('articles/:id')
  async getArticle(@Param('id') id: string) {
    const article = await this.searchEngine.getArticleById(Number(id));
    if (!article) {
      throw new NotFoundException('ماده قانونی یافت نشد');
    }
    return article;
  }

  @Public()
  @RateLimitTier('tax_engine')
  @Post('reset')
  @HttpCode(HttpStatus.OK)
  async resetSession(@Body() dto: ResetSessionDto) {
    await this.stateManager.resetSession(dto.sessionId);
    const newSession = await this.stateManager.createSession();
    return {
      sessionId: newSession.id,
      message: 'جلسه با موفقیت بازنشانی شد.',
      step: newSession.step,
    };
  }
}
