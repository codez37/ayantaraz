import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { OrdersService } from './orders.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';

@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 3600000 } })
  @Post()
  create(@Body() dto: CreateOrderDto, @CurrentUser() user?: AuthenticatedUser) {
    return this.ordersService.create(
      {
        courseId: dto.courseId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phoneNumber: dto.phoneNumber,
        note: dto.note,
      },
      user?.id,
    );
  }

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: string,
  ) {
    return this.ordersService.list(user.id, user.role, status);
  }

  @Get(':id')
  getById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.getById(id, user.id, user.role);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.updateStatus(id, dto, user.id, user.role);
  }

  @Patch(':id/assign')
  @Roles(UserRole.admin)
  assign(
    @Param('id', ParseIntPipe) id: number,
    @Body('assignedToId', ParseIntPipe) assignedToId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.assign(id, assignedToId, user.id, user.role);
  }

  @Post(':id/notes')
  addNote(
    @Param('id', ParseIntPipe) id: number,
    @Body('note') note: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.addNote(id, note, user.id, user.role);
  }

  @Get(':id/audit')
  getAuditLog(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.getAuditLog(id, user.id, user.role);
  }

  @Patch(':id/cancel')
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.cancelByUser(id, user.id);
  }
}
