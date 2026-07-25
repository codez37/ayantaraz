import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UploadService } from '../upload.service';

jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => Buffer.from('abcd1234', 'hex')),
}));

const fs = require('fs');
const crypto = require('crypto');

describe('UploadService', () => {
  let service: UploadService;

  beforeEach(() => {
    jest.clearAllMocks();
    fs.existsSync.mockReturnValue(true);
    crypto.randomBytes.mockReturnValue(Buffer.from('abcd1234', 'hex'));
    service = new UploadService();
  });

  function makeFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
    return {
      originalname: 'test.jpg',
      mimetype: 'image/jpeg',
      size: 1024,
      buffer: Buffer.from('test-content'),
      ...overrides,
    } as Express.Multer.File;
  }

  describe('saveFile', () => {
    it('should save a valid file and return SavedFile metadata', () => {
      const file = makeFile();
      const result = service.saveFile(file, 'images', 1);

      expect(result.originalName).toBe('test.jpg');
      expect(result.mimeType).toBe('image/jpeg');
      expect(result.size).toBe(1024);
      expect(result.url).toMatch(/^\/uploads\/images\//);
      expect(result.filename).toContain('test');
      expect(result.filename).toContain('abcd1234');
      expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    });

    it('should create subdirectory if it does not exist', () => {
      fs.existsSync.mockReturnValue(false);
      const file = makeFile();
      service.saveFile(file, 'newdir', 1);
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('newdir'),
        { recursive: true },
      );
    });

    it('should preserve file extension in filename', () => {
      const file = makeFile({ originalname: 'report.pdf', mimetype: 'application/pdf' });
      const result = service.saveFile(file, 'docs', 1);
      expect(result.filename).toMatch(/\.pdf$/);
    });

    it('should throw BadRequestException for file exceeding size limit', () => {
      const file = makeFile({ size: 300 * 1024 * 1024 });
      expect(() => service.saveFile(file, 'images', 1)).toThrow(
        BadRequestException,
      );
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid mime type', () => {
      const file = makeFile({ mimetype: 'application/x-msdownload' });
      expect(() => service.saveFile(file, 'images', 1)).toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for empty filename', () => {
      const file = makeFile({ originalname: '' });
      expect(() => service.saveFile(file, 'images', 1)).toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for filename exceeding 255 chars', () => {
      const file = makeFile({ originalname: 'a'.repeat(256) + '.jpg' });
      expect(() => service.saveFile(file, 'images', 1)).toThrow(
        BadRequestException,
      );
    });

    it('should allow video/mp4 mime type', () => {
      const file = makeFile({
        originalname: 'video.mp4',
        mimetype: 'video/mp4',
      });
      const result = service.saveFile(file, 'videos', 1);
      expect(result.mimeType).toBe('video/mp4');
    });

    it('should allow text/plain mime type', () => {
      const file = makeFile({
        originalname: 'notes.txt',
        mimetype: 'text/plain',
      });
      expect(() => service.saveFile(file, 'docs', 1)).not.toThrow();
    });
  });

  describe('deleteFile', () => {
    it('should delete an existing file', () => {
      fs.existsSync.mockReturnValue(true);
      service.deleteFile('/uploads/images/test.jpg');
      expect(fs.unlinkSync).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when file does not exist', () => {
      fs.existsSync.mockReturnValue(false);
      expect(() => service.deleteFile('/uploads/images/missing.jpg')).toThrow(
        NotFoundException,
      );
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('should prevent path traversal via directory components in basename', () => {
      // path.basename strips directory components, so ../../etc/passwd becomes passwd
      // which is then joined under the upload dir — traversal is blocked
      fs.existsSync.mockReturnValue(false);
      expect(() => service.deleteFile('../../../etc/passwd')).toThrow(
        NotFoundException,
      );
    });

    it('should throw Error when unlinkSync fails', () => {
      fs.existsSync.mockReturnValue(true);
      fs.unlinkSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      expect(() => service.deleteFile('/uploads/images/test.jpg')).toThrow(
        'Failed to delete file',
      );
    });
  });

  describe('constructor', () => {
    it('should create upload directory if it does not exist', () => {
      fs.existsSync.mockReturnValue(false);
      new UploadService();
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('uploads'),
        { recursive: true },
      );
    });

    it('should not create upload directory if it already exists', () => {
      fs.existsSync.mockReturnValue(true);
      new UploadService();
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });
});
