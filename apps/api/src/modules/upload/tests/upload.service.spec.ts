import { Test, TestingModule } from '@nestjs/testing';
import { UploadService } from '../upload.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('fs');

describe('UploadService', () => {
  let service: UploadService;
  let files: Record<string, boolean>;

  const mockedFs = fs as jest.Mocked<typeof fs>;

  beforeEach(async () => {
    files = {};
    mockedFs.existsSync.mockImplementation(
      (p: fs.PathLike) => !!files[String(p)],
    );
    mockedFs.mkdirSync.mockImplementation((p: fs.PathLike) => {
      files[String(p)] = true;
      return undefined;
    });
    mockedFs.writeFileSync.mockImplementation(((p: string) => {
      files[String(p)] = true;
      return undefined;
    }) as any);
    mockedFs.unlinkSync.mockImplementation(((p: string) => {
      delete files[String(p)];
      return undefined;
    }) as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [UploadService],
    }).compile();
    service = module.get<UploadService>(UploadService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const makeFile = (
    overrides: Partial<Express.Multer.File> = {},
  ): Express.Multer.File =>
    ({
      buffer: Buffer.from('hello'),
      originalname: 'test.png',
      mimetype: 'image/png',
      size: 5,
      ...overrides,
    }) as any;

  describe('saveFile', () => {
    it('should validate, write the file and return a saved-file descriptor', () => {
      const result = service.saveFile(makeFile(), 'images', 1);
      expect(result.url).toMatch(
        /^\/uploads\/images\/test_\d+_[a-f0-9]+\.png$/,
      );
      expect(result.filename).toMatch(/^test_\d+_[a-f0-9]+\.png$/);
      expect(result.originalName).toBe('test.png');
      expect(result.size).toBe(5);
      expect(result.mimeType).toBe('image/png');
      expect(mockedFs.writeFileSync).toHaveBeenCalled();
    });

    it('should create the target subdirectory when it does not exist', () => {
      service.saveFile(makeFile(), 'docs', 1);
      expect(mockedFs.mkdirSync).toHaveBeenCalled();
    });

    it('should reject a file exceeding the size limit', () => {
      expect(() =>
        service.saveFile(
          makeFile({ size: 201 * 1024 * 1024, originalname: 'big.png' }),
          'images',
          1,
        ),
      ).toThrow(BadRequestException);
      expect(mockedFs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should reject a disallowed mime type', () => {
      expect(() =>
        service.saveFile(
          makeFile({
            mimetype: 'application/x-msdownload',
            originalname: 'mal.exe',
          }),
          'images',
          1,
        ),
      ).toThrow(BadRequestException);
    });

    it('should reject a filename longer than 255 characters', () => {
      expect(() =>
        service.saveFile(
          makeFile({ originalname: 'a'.repeat(256) + '.png' }),
          'images',
          1,
        ),
      ).toThrow(BadRequestException);
    });

    it('should reject an empty filename', () => {
      expect(() =>
        service.saveFile(makeFile({ originalname: '' }), 'images', 1),
      ).toThrow(BadRequestException);
    });
  });

  describe('deleteFile', () => {
    it('should delete an existing file within the upload directory', () => {
      const uploadDir = (service as any).uploadDir as string;
      const filename = 'report_123_abcd.pdf';
      const targetPath = path.join(uploadDir, filename);
      files[targetPath] = true;

      service.deleteFile(filename);
      expect(mockedFs.unlinkSync).toHaveBeenCalledWith(targetPath);
      expect(files[targetPath]).toBeUndefined();
    });

    it('should throw NotFoundException when the file does not exist', () => {
      expect(() => service.deleteFile('missing.png')).toThrow(
        NotFoundException,
      );
      expect(mockedFs.unlinkSync).not.toHaveBeenCalled();
    });

    it('should resolve the path against the upload directory only', () => {
      const uploadDir = (service as any).uploadDir as string;
      const targetPath = path.join(uploadDir, 'doc.pdf');
      files[targetPath] = true;

      service.deleteFile('/uploads/images/doc.pdf');
      expect(mockedFs.unlinkSync).toHaveBeenCalledWith(targetPath);
    });
  });
});
