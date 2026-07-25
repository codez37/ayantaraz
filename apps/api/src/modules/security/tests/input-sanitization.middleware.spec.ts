import { BadRequestException } from '@nestjs/common';
import { InputSanitizationMiddleware } from '../input-sanitization.middleware';

describe('InputSanitizationMiddleware', () => {
  let middleware: InputSanitizationMiddleware;

  beforeEach(() => {
    middleware = new InputSanitizationMiddleware();
  });

  const run = (req: Record<string, unknown>) => {
    const next = jest.fn();
    middleware.use(req as any, {} as any, next);
    return next;
  };

  describe('string sanitization', () => {
    it('should trim whitespace from string values', () => {
      const req = { body: { name: '  hello  ' } };
      run(req);
      expect(req.body.name).toBe('hello');
    });

    it('should strip null bytes from string values', () => {
      const req = { body: { name: 'hel\x00lo' } };
      run(req);
      expect(req.body.name).toBe('hello');
    });

    it('should strip dollar-prefixed variable patterns', () => {
      const req = { body: { name: 'price$amount end' } };
      run(req);
      expect(req.body.name).toBe('price end');
    });
  });

  describe('nested structures', () => {
    it('should sanitize nested object string values', () => {
      const req = { body: { user: { name: '  ali  ' } } };
      run(req);
      expect(req.body.user.name).toBe('ali');
    });

    it('should sanitize string values inside arrays', () => {
      const req = { body: { tags: ['  a  ', 'b'] } };
      run(req);
      expect(req.body.tags).toEqual(['a', 'b']);
    });

    it('should sanitize objects nested inside arrays', () => {
      const req = { body: { items: [{ label: '  x  ' }] } };
      run(req);
      expect(req.body.items[0].label).toBe('x');
    });

    it('should sanitize query and params alongside body', () => {
      const req = {
        body: { a: '  1  ' },
        query: { b: '  2  ' },
        params: { c: '  3  ' },
      };
      run(req);
      expect(req.body.a).toBe('1');
      expect(req.query.b).toBe('2');
      expect(req.params.c).toBe('3');
    });
  });

  describe('clean input', () => {
    it('should call next() for clean input', () => {
      const next = run({ body: { name: 'ali' } });
      expect(next).toHaveBeenCalled();
    });

    it('should call next() when body is absent', () => {
      const next = run({});
      expect(next).toHaveBeenCalled();
    });
  });

  describe('SQL injection detection', () => {
    it('should reject SQL comment markers', () => {
      expect(() => run({ body: { q: '1 -- comment' } })).toThrow(
        BadRequestException,
      );
    });

    it('should reject a semicolon payload', () => {
      expect(() => run({ body: { q: 'a;b' } })).toThrow(BadRequestException);
    });

    it('should reject DROP keyword payload', () => {
      expect(() => run({ body: { q: 'DROP TABLE users' } })).toThrow(
        BadRequestException,
      );
    });

    it('should reject UNION-based payload', () => {
      expect(() => run({ body: { q: '1 UNION SELECT password' } })).toThrow(
        BadRequestException,
      );
    });

    it('should reject OR 1=1 tautology', () => {
      expect(() => run({ body: { q: 'admin OR 1=1' } })).toThrow(
        BadRequestException,
      );
    });
  });

  describe('XSS detection', () => {
    it('should reject <script> tags', () => {
      expect(() => run({ body: { bio: '<script>alert(1)</script>' } })).toThrow(
        BadRequestException,
      );
    });

    it('should reject javascript: URI scheme', () => {
      expect(() => run({ body: { url: 'javascript:alert(1)' } })).toThrow(
        BadRequestException,
      );
    });

    it('should reject inline event handlers (on*=)', () => {
      expect(() => run({ body: { html: '<img onload=alert(1)>' } })).toThrow(
        BadRequestException,
      );
    });

    it('should reject <iframe> tags', () => {
      expect(() =>
        run({ body: { html: '<iframe src="x"></iframe>' } }),
      ).toThrow(BadRequestException);
    });
  });
});
