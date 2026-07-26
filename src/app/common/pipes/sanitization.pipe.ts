import { PipeTransform, Injectable } from '@nestjs/common';

@Injectable()
export class SanitizationPipe implements PipeTransform {
  transform(value: unknown): unknown {
    if (typeof value === 'string') {
      return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
        .replace(/javascript\s*:/gi, '')
        .trim();
    }
    if (typeof value === 'object' && value !== null) {
      const obj = value as Record<string, unknown>;
      for (const key of Object.keys(obj)) {
        if (typeof obj[key] === 'string') {
          obj[key] = this.transform(obj[key]);
        }
      }
      return obj;
    }
    return value;
  }
}
