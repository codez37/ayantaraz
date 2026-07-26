import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ContentService } from './content.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, ContentStatus } from '@prisma/client';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';

@Controller('content')
export class ContentController {
  constructor(private contentService: ContentService) {}

  @Public()
  @Get()
  list(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('visibility') visibility?: string,
    @Query('categoryId') categoryId?: number,
    @Query('search') search?: string,
    @Query('tags') tags?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @CurrentUser('id') userId?: number,
    @CurrentUser('role') userRole?: string,
  ) {
    return this.contentService.list({
      type,
      status,
      visibility,
      categoryId: categoryId ? Number(categoryId) : undefined,
      search,
      tags,
      page,
      limit,
      userId,
      userRole,
    });
  }

  @Public()
  @Get(':slug')
  getBySlug(
    @Param('slug') slug: string,
    @CurrentUser('id') userId?: number,
    @CurrentUser('role') userRole?: string,
  ) {
    return this.contentService.getBySlug(slug, userId, userRole);
  }

  @Post()
  @Roles(UserRole.admin, UserRole.content_manager)
  create(@Body() dto: CreateContentDto, @CurrentUser('id') userId: number) {
    return this.contentService.create(dto, userId);
  }

  @Patch(':id')
  @Roles(UserRole.admin, UserRole.content_manager)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateContentDto,
    @CurrentUser('id') userId: number,
    @CurrentUser('role') userRole: string,
  ) {
    return this.contentService.update(id, dto, userId, userRole);
  }

  @Patch(':id/status')
  @Roles(UserRole.admin, UserRole.content_manager)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: ContentStatus,
    @CurrentUser('id') userId: number,
    @CurrentUser('role') userRole: string,
  ) {
    return this.contentService.updateStatus(id, status, userId, userRole);
  }

  @Delete(':id')
  @Roles(UserRole.admin, UserRole.content_manager)
  archive(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @CurrentUser('role') userRole: string,
  ) {
    return this.contentService.archive(id, userId, userRole);
  }
}
