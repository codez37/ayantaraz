import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Param,
  Delete,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { UploadService } from './upload.service';

@Controller('upload')
export class UploadController {
  constructor(private uploadService: UploadService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Roles(UserRole.admin, UserRole.content_manager)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 200 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowedMimePrefixes = ['video/', 'image/', 'application/pdf'];
        const allowed = allowedMimePrefixes.some((p) =>
          file.mimetype.startsWith(p),
        );
        if (allowed) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(`نوع فایل ${file.mimetype} مجاز نیست`),
            false,
          );
        }
      },
    }),
  )
  uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: number,
  ) {
    if (!file) throw new BadRequestException('فایلی ارسال نشده');
    if (file.size === 0) throw new BadRequestException('فایل خالی است');

    const subdir = file.mimetype.startsWith('video/')
      ? 'videos'
      : file.mimetype.startsWith('image/')
        ? 'thumbnails'
        : 'documents';

    return this.uploadService.saveFile(file, subdir, userId);
  }

  @Delete(':urlPath')
  @Roles(UserRole.admin)
  deleteFile(@Param('urlPath') urlPath: string) {
    this.uploadService.deleteFile(urlPath);
    return { message: 'فایل حذف شد' };
  }
}
