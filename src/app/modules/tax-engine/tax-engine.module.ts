import { Module } from '@nestjs/common';
import { TaxEngineController } from './tax-engine.controller';
import { TaxEngineAdminController } from './tax-engine-admin.controller';
import { TaxEngineService } from './tax-engine.service';
import { PersianSearchEngineService } from './search/persian-search-engine.service';
import { QueryRouterService } from './router/query-router.service';
import { TaxComputeEngineService } from './compute/tax-compute-engine.service';
import { StateManagerService } from './session/state-manager.service';
import { ResponseFormatterService } from './response/response-formatter.service';
import { ConfidenceModule } from './confidence/confidence.module';
import { ConfidenceEngineService } from './confidence/confidence-engine.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfidenceModule],
  controllers: [TaxEngineController, TaxEngineAdminController],
  providers: [
    TaxEngineService,
    PersianSearchEngineService,
    QueryRouterService,
    TaxComputeEngineService,
    StateManagerService,
    ResponseFormatterService,
    ConfidenceEngineService,
  ],
  exports: [TaxEngineService],
})
export class TaxEngineModule {}
