import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToClass } from 'class-transformer';
import * as sanitizeHtml from 'sanitize-html';
import * as xss from 'xss';

@Injectable()
export class InputSanitizationPipe implements PipeTransform<any> {
  private readonly xssFilter = new xss.FilterXSS({
    whiteList: {
      ...xss.getDefaultWhiteList(),
      a: ['href', 'title', 'target'],
      img: ['src', 'alt', 'width', 'height'],
      p: ['class', 'style'],
      div: ['class', 'style'],
      span: ['class', 'style'],
    },
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style'],
  });

  async transform(value: any, { metatype }: any) {
    if (!metatype || !this.toValidate(metatype)) {
      return this.sanitizeValue(value);
    }

    const object = plainToClass(metatype, value);
    const errors: ValidationError[] = await validate(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });

    if (errors.length > 0) {
      const errorMessages = errors.map(error => ({
        property: error.property,
        constraints: error.constraints,
      }));
      throw new BadRequestException({
        message: 'Validation failed',
        errors: errorMessages,
      });
    }

    return this.sanitizeValue(object);
  }

  private toValidate(metatype: any): boolean {
    const types: any[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private sanitizeValue(value: any): any {
    if (value === null || value === undefined) return value;

    if (typeof value === 'string') {
      return this.sanitizeString(value);
    }

    if (Array.isArray(value)) {
      return value.map(item => this.sanitizeValue(item));
    }

    if (typeof value === 'object') {
      const result: any = {};
      for (const key in value) {
        result[key] = this.sanitizeValue(value[key]);
      }
      return result;
    }

    return value;
  }

  private sanitizeString(value: string): string {
    // First pass: XSS filtering
    let sanitized = this.xssFilter.process(value);

    // Second pass: HTML sanitization
    sanitized = sanitizeHtml(sanitized, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'p', 'div', 'span']),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        a: ['href', 'title', 'target'],
        img: ['src', 'alt', 'width', 'height'],
      },
      allowedIframeHostnames: [],
      disallowedTagsMode: 'discard',
    });

    // Third pass: Remove any remaining script tags
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Fourth pass: Remove any remaining event handlers
    sanitized = sanitized.replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '');

    return sanitized.trim();
  }
}
