import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ConsultationService } from './consultation.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { UpdateConsultationStatusDto } from './dto/update-consultation-status.dto';
import { Public } from '../../common/decorators/public.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';

@Controller('consultation')
export class ConsultationController {
  constructor(private consultationService: ConsultationService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 3600000 } })
  @Post()
  create(
    @Body() dto: CreateConsultationDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.consultationService.create(
      {
        subject: dto.subject,
        message: dto.message,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phoneNumber: dto.phoneNumber,
        preferredTime: dto.preferredTime,
      },
      user?.id,
    );
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.consultationService.list(user.id, user.role);
  }

  @Get(':id')
  getById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.consultationService.getById(id, user.id, user.role);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateConsultationStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.consultationService.updateStatus(id, dto, user.id, user.role);
  }

  @Patch(':id/assign')
  @Roles(UserRole.admin, UserRole.consultant)
  assign(
    @Param('id', ParseIntPipe) id: number,
    @Body('assignedToId', ParseIntPipe) assignedToId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.consultationService.assign(
      id,
      assignedToId,
      user.id,
      user.role,
    );
  }

  @Post(':id/notes')
  addNote(
    @Param('id', ParseIntPipe) id: number,
    @Body('note') note: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.consultationService.addNote(id, note, user.id, user.role);
  }

  @Get(':id/audit')
  getAuditLog(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.consultationService.getAuditLog(id, user.id, user.role);
  }
}
