import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

const ZERO_WIDTH_CHARS = /[\u200B-\u200D\u2060\uFEFF]/g;
const ARABIC_PERSIAN_DIGITS: Record<string, string> = {
  '۰': '0',
  '۱': '1',
  '۲': '2',
  '۳': '3',
  '۴': '4',
  '۵': '5',
  '۶': '6',
  '۷': '7',
  '۸': '8',
  '۹': '9',
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
};

@Injectable()
export class PhoneNormalizationPipe implements PipeTransform {
  transform(value: string | { phone: string }): string | { phone: string } {
    const isObject = value !== null && typeof value === 'object';
    let phone = isObject ? value.phone : value;

    if (typeof phone !== 'string') {
      return value;
    }

    // Strip zero-width chars
    phone = phone.replace(ZERO_WIDTH_CHARS, '');

    // Convert Persian/Arabic digits to ASCII
    phone = phone.replace(
      /[۰-۹٠-٩]/g,
      (ch: string) => ARABIC_PERSIAN_DIGITS[ch] || ch,
    );

    // Strip non-digit characters except leading +
    phone = phone.replace(/\D/g, '');

    // Normalize to local format: 09XXXXXXXXX
    // +989123456789 → 09123456789
    // 989123456789 → 09123456789
    // 09123456789 → 09123456789
    if (phone.length === 13 && phone.startsWith('98')) {
      phone = '0' + phone.slice(2);
    } else if (phone.length === 12 && phone.startsWith('98')) {
      phone = '0' + phone.slice(2);
    }

    // Validate: must be 11 digits, starting with 09
    if (phone.length !== 11) {
      throw new BadRequestException(
        `Invalid phone number length: expected 11 digits, got ${phone.length}`,
      );
    }

    if (!phone.startsWith('09')) {
      throw new BadRequestException('Invalid phone number: must start with 09');
    }

    // Validate all remaining chars are digits
    if (!/^\d{11}$/.test(phone)) {
      throw new BadRequestException('Invalid phone number format');
    }

    if (isObject) {
      value.phone = phone;
      return value;
    }
    return phone;
  }
}
