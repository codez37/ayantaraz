import { Controller, Get, Query } from '@nestjs/common';
import { AuditService } from './audit.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('audit')
@Roles(UserRole.admin)
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  list(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
  ) {
    return this.auditService.list(page || 1, limit || 50, {
      action,
      entityType,
    });
  }
}
