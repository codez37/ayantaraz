import { Module } from '@nestjs/common';
import { ConfidenceEngineService } from './confidence-engine.service';
import { EntityExtractorService } from './entity-extractor.service';

@Module({
  providers: [ConfidenceEngineService, EntityExtractorService],
  exports: [ConfidenceEngineService, EntityExtractorService],
})
export class ConfidenceModule {}
