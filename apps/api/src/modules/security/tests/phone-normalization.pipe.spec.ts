import { BadRequestException } from '@nestjs/common';
import { PhoneNormalizationPipe } from '../phone-normalization.pipe';

describe('PhoneNormalizationPipe', () => {
  let pipe: PhoneNormalizationPipe;

  beforeEach(() => {
    pipe = new PhoneNormalizationPipe();
  });

  describe('basic normalization', () => {
    it('should keep a valid 09-prefixed number unchanged', () => {
      expect(pipe.transform('09123456789')).toBe('09123456789');
    });

    it('should strip non-digit characters except leading +', () => {
      expect(pipe.transform('0912-345-6789')).toBe('09123456789');
      expect(pipe.transform('0912 345 6789')).toBe('09123456789');
    });

    it('should convert +98 international format to local 09 format', () => {
      expect(pipe.transform('+989123456789')).toBe('09123456789');
    });

    it('should convert 98-prefixed 12-digit number to local 09 format', () => {
      expect(pipe.transform('989123456789')).toBe('09123456789');
    });
  });

  describe('Persian/Arabic digit conversion', () => {
    it('should convert Persian digits to ASCII', () => {
      expect(pipe.transform('۰۹۱۲۳۴۵۶۷۸۹')).toBe('09123456789');
    });

    it('should convert Arabic-Indic digits to ASCII', () => {
      expect(pipe.transform('٠٩١٢٣٤٥٦٧٨٩')).toBe('09123456789');
    });

    it('should handle mixed Persian/Arabic and ASCII digits', () => {
      expect(pipe.transform('09۱۲۳۴۵۶۷۸۹')).toBe('09123456789');
    });
  });

  describe('zero-width character stripping', () => {
    it('should strip zero-width characters', () => {
      const withZwc = '09\u200B1234\u200C5678\u200D9';
      expect(pipe.transform(withZwc)).toBe('09123456789');
    });

    it('should strip BOM and word joiner characters', () => {
      const withBom = '\uFEFF09123456789\u2060';
      expect(pipe.transform(withBom)).toBe('09123456789');
    });
  });

  describe('object input handling', () => {
    it('should normalize the phone field of an object and return the object', () => {
      const input: { phone: string } = { phone: '+989123456789' };
      const result = pipe.transform(input);
      expect(result).toBe(input);
      expect((result as { phone: string }).phone).toBe('09123456789');
    });

    it('should return the value unchanged when phone is not a string', () => {
      const input = { phone: 12345 } as unknown as { phone: string };
      expect(pipe.transform(input)).toBe(input);
    });
  });

  describe('validation errors', () => {
    it('should reject a number that is too short', () => {
      expect(() => pipe.transform('0912345678')).toThrow(BadRequestException);
      expect(() => pipe.transform('0912345678')).toThrow(
        /Invalid phone number length/,
      );
    });

    it('should reject a number that is too long', () => {
      expect(() => pipe.transform('091234567890')).toThrow(BadRequestException);
    });

    it('should reject a number not starting with 09', () => {
      expect(() => pipe.transform('08123456789')).toThrow(BadRequestException);
      expect(() => pipe.transform('08123456789')).toThrow(/must start with 09/);
    });
  });
});
