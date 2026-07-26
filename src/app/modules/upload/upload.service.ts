import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface SavedFile {
  url: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  path: string;
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly uploadDir = path.join(process.cwd(), 'uploads');
  private readonly maxFileSize = 200 * 1024 * 1024;
  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/json',
    'video/mp4',
    'video/webm',
  ];

  constructor() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
      this.logger.log(`Created upload directory at ${this.uploadDir}`);
    }
  }

  saveFile(
    file: Express.Multer.File,
    subdir: string,
    userId: number,
  ): SavedFile {
    this.logger.log(`Uploading file: ${file.originalname} by user ${userId}`);
    this.validateFile(file);

    const targetDir = path.join(this.uploadDir, subdir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const basename = path.basename(file.originalname, ext);
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(4).toString('hex');
    const filename = `${basename}_${timestamp}_${randomString}${ext}`;
    const filePath = path.join(targetDir, filename);

    fs.writeFileSync(filePath, file.buffer);
    this.logger.debug(`File saved to ${filePath}`);

    const url = `/uploads/${subdir}/${filename}`;
    return {
      url,
      filename,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      path: filePath,
    };
  }

  deleteFile(urlPath: string): void {
    this.logger.log(`Deleting upload: ${urlPath}`);
    const filePath = path.join(this.uploadDir, path.basename(urlPath));
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(path.resolve(this.uploadDir))) {
      throw new BadRequestException('Invalid file path');
    }
    if (!fs.existsSync(resolvedPath)) {
      this.logger.warn(`File not found: ${resolvedPath}`);
      throw new NotFoundException('File not found');
    }
    try {
      fs.unlinkSync(resolvedPath);
      this.logger.debug(`File deleted from filesystem: ${resolvedPath}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete file: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new Error('Failed to delete file');
    }
  }

  private validateFile(file: Express.Multer.File): void {
    if (file.size > this.maxFileSize) {
      this.logger.warn(
        `File too large: ${file.originalname} (${file.size} bytes)`,
      );
      throw new BadRequestException(
        `File size exceeds maximum limit of ${this.maxFileSize / 1024 / 1024}MB`,
      );
    }
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      const allowedPrefixes = ['video/', 'image/', 'application/pdf'];
      const allowed = allowedPrefixes.some((p) => file.mimetype.startsWith(p));
      if (!allowed) {
        this.logger.warn(
          `Invalid mime type: ${file.mimetype} for file ${file.originalname}`,
        );
        throw new BadRequestException(
          `Invalid file type. Allowed types: images, videos, PDF`,
        );
      }
    }
    if (!file.originalname || file.originalname.length > 255) {
      this.logger.warn(`Invalid filename: ${file.originalname}`);
      throw new BadRequestException('Invalid filename');
    }
  }
}
