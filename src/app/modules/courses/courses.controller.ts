import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { CreateCourseDto } from './dto/create-course.dto';

@Controller('courses')
export class CoursesController {
  constructor(private coursesService: CoursesService) {}

  @Public()
  @Get()
  list(@CurrentUser('id') userId?: number) {
    return this.coursesService.list(userId);
  }

  @Get('my')
  myCourses(@CurrentUser('id') userId: number) {
    return this.coursesService.myCourses(userId);
  }

  @Public()
  @Get(':slug')
  getBySlug(@Param('slug') slug: string, @CurrentUser('id') userId?: number) {
    return this.coursesService.getBySlug(slug, userId);
  }

  @Post()
  @Roles(UserRole.admin, UserRole.content_manager)
  create(@Body() dto: CreateCourseDto, @CurrentUser('id') userId: number) {
    return this.coursesService.create(dto, userId);
  }

  @Public()
  @Get('video/:id')
  getVideo(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId?: number,
  ) {
    return this.coursesService.getVideo(id, userId);
  }
}
