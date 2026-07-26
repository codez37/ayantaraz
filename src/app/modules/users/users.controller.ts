import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@prisma/client';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('users')
@UseGuards(RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('profile')
  getProfile(@CurrentUser('id') userId: number) {
    return this.usersService.getProfile(userId);
  }

  @Patch('profile')
  updateProfile(
    @CurrentUser('id') userId: number,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Get()
  @Roles(UserRole.admin)
  listUsers(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.usersService.listUsers(page || 1, limit || 20);
  }

  @Patch(':id/role')
  @Roles(UserRole.admin)
  updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body('role') role: UserRole,
  ) {
    return this.usersService.updateUserRole(id, role);
  }

  @Patch(':id/block')
  @Roles(UserRole.admin)
  blockUser(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.blockUser(id);
  }

  @Patch(':id/unblock')
  @Roles(UserRole.admin)
  unblockUser(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.unblockUser(id);
  }
}
