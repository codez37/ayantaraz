import { BadRequestException } from '@nestjs/common';
import { PhoneNormalizationPipe } from '../phone-normalization.pipe';

describe('PhoneNormalizationPipe', () => {
  let pipe: PhoneNormalizationPipe;

  beforeEach(() => {
    pipe = new PhoneNormalizationPipe();
  });

  describe('basic normalization', () => {
    it('should pass through a valid 09-prefixed phone', () => {
      expect(pipe.transform('09123456789')).toBe('09123456789');
    });

    it('should strip whitespace and non-digit characters', () => {
      expect(pipe.transform(' 0912 345 6789 ')).toBe('09123456789');
    });

    it('should strip dashes and parentheses', () => {
      expect(pipe.transform('(0912)-345-6789')).toBe('09123456789');
    });
  });

  describe('international format normalization', () => {
    it('should normalize +989XXXXXXXXX to 09XXXXXXXXX', () => {
      expect(pipe.transform('+989123456789')).toBe('09123456789');
    });

    it('should normalize 989XXXXXXXXX (12 digits) to 09XXXXXXXXX', () => {
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

    it('should convert mixed Persian and Arabic digits', () => {
      expect(pipe.transform('۰٩۱۲۳٤٥۶۷٨٩')).toBe('09123456789');
    });

    it('should convert Persian digits with +98 prefix', () => {
      expect(pipe.transform('+۹۸۹۱۲۳۴۵۶۷۸۹')).toBe('09123456789');
    });
  });

  describe('zero-width character stripping', () => {
    it('should strip zero-width spaces (U+200B)', () => {
      expect(pipe.transform('09123\u200B456789')).toBe('09123456789');
    });

    it('should strip zero-width non-joiners (U+200C)', () => {
      expect(pipe.transform('09123\u200C456789')).toBe('09123456789');
    });

    it('should strip zero-width joiners (U+200D)', () => {
      expect(pipe.transform('09123\u200D456789')).toBe('09123456789');
    });

    it('should strip BOM / zero-width no-break space (U+FEFF)', () => {
      expect(pipe.transform('\uFEFF09123456789')).toBe('09123456789');
    });

    it('should strip word joiner (U+2060)', () => {
      expect(pipe.transform('09123\u2060456789')).toBe('09123456789');
    });
  });

  describe('validation errors', () => {
    it('should reject phone with wrong length (too short)', () => {
      expect(() => pipe.transform('0912345678')).toThrow(BadRequestException);
      expect(() => pipe.transform('0912345678')).toThrow(
        /expected 11 digits/i,
      );
    });

    it('should reject phone with wrong length (too long)', () => {
      expect(() => pipe.transform('091234567890')).toThrow(BadRequestException);
    });

    it('should reject phone not starting with 09', () => {
      expect(() => pipe.transform('08123456789')).toThrow(BadRequestException);
      expect(() => pipe.transform('08123456789')).toThrow(/must start with 09/i);
    });

    it('should reject empty string', () => {
      expect(() => pipe.transform('')).toThrow(BadRequestException);
    });
  });

  describe('object input form', () => {
    it('should normalize phone inside an object and return the object', () => {
      const input = { phone: '۰۹۱۲۳۴۵۶۷۸۹' };
      const result = pipe.transform(input);
      expect(result).toEqual({ phone: '09123456789' });
    });

    it('should normalize +98 format inside an object', () => {
      const input = { phone: '+989123456789' };
      const result = pipe.transform(input);
      expect(result).toEqual({ phone: '09123456789' });
    });
  });

  describe('non-string passthrough', () => {
    it('should return value as-is when phone is not a string (number input)', () => {
      expect(pipe.transform(12345 as unknown as string)).toBe(12345);
    });

    it('should return value as-is for null', () => {
      expect(pipe.transform(null as unknown as string)).toBeNull();
    });
  });
});
