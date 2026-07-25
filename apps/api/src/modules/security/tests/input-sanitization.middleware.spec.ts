import { BadRequestException } from '@nestjs/common';
import { InputSanitizationMiddleware } from '../input-sanitization.middleware';

describe('InputSanitizationMiddleware', () => {
  let middleware: InputSanitizationMiddleware;

  beforeEach(() => {
    middleware = new InputSanitizationMiddleware();
  });

  function makeReq(overrides: {
    body?: unknown;
    query?: unknown;
    params?: unknown;
  }) {
    return {
      body: overrides.body ?? {},
      query: overrides.query ?? {},
      params: overrides.params ?? {},
    } as any;
  }

  function run(req: any): { nextCalled: boolean; error: unknown } {
    let nextCalled = false;
    let error: unknown = null;
    const res = {} as any;
    try {
      middleware.use(req, res, () => {
        nextCalled = true;
      });
    } catch (e) {
      error = e;
    }
    return { nextCalled, error };
  }

  describe('happy path', () => {
    it('should call next() for clean input', () => {
      const req = makeReq({ body: { name: 'ali' } });
      const { nextCalled, error } = run(req);
      expect(error).toBeNull();
      expect(nextCalled).toBe(true);
    });

    it('should trim whitespace from string values', () => {
      const req = makeReq({ body: { name: '  ali  ' } });
      run(req);
      expect(req.body.name).toBe('ali');
    });

    it('should remove null bytes from strings', () => {
      const req = makeReq({ body: { name: 'al\x00i' } });
      run(req);
      expect(req.body.name).toBe('ali');
    });

    it('should remove variable interpolation patterns ($var)', () => {
      const req = makeReq({ body: { input: 'hello $name world' } });
      run(req);
      expect(req.body.input).toBe('hello  world');
    });

    it('should handle empty body/query/params gracefully', () => {
      const req = makeReq({});
      const { nextCalled, error } = run(req);
      expect(error).toBeNull();
      expect(nextCalled).toBe(true);
    });
  });

  describe('recursive sanitization', () => {
    it('should sanitize nested objects', () => {
      const req = makeReq({
        body: { user: { name: '  ali  ', city: 'tehr\x00an' } },
      });
      run(req);
      expect(req.body.user.name).toBe('ali');
      expect(req.body.user.city).toBe('tehran');
    });

    it('should sanitize arrays of strings', () => {
      const req = makeReq({
        body: { tags: ['  a  ', 'b\x00'] },
      });
      run(req);
      expect(req.body.tags).toEqual(['a', 'b']);
    });

    it('should sanitize arrays of objects', () => {
      const req = makeReq({
        body: {
          items: [{ name: '  x  ' }, { name: 'y' }],
        },
      });
      run(req);
      expect(req.body.items[0].name).toBe('x');
      expect(req.body.items[1].name).toBe('y');
    });

    it('should sanitize deeply nested structures', () => {
      const req = makeReq({
        body: {
          level1: {
            level2: {
              arr: ['  deep  '],
              str: '  nested  ',
            },
          },
        },
      });
      run(req);
      expect(req.body.level1.level2.arr[0]).toBe('deep');
      expect(req.body.level1.level2.str).toBe('nested');
    });

    it('should preserve non-string values (numbers, booleans)', () => {
      const req = makeReq({
        body: { age: 30, active: true, name: '  ali  ' },
      });
      run(req);
      expect(req.body.age).toBe(30);
      expect(req.body.active).toBe(true);
      expect(req.body.name).toBe('ali');
    });

    it('should sanitize query parameters', () => {
      const req = makeReq({ query: { search: '  test  ' } });
      run(req);
      expect(req.query.search).toBe('test');
    });

    it('should sanitize route params', () => {
      const req = makeReq({ params: { slug: '  my-slug  ' } });
      run(req);
      expect(req.params.slug).toBe('my-slug');
    });
  });

  describe('SQL injection detection', () => {
    const sqlInjectionPayloads = [
      '1; DROP TABLE users',
      '1 /* comment */',
      "1 UNION SELECT * FROM users",
      "'; EXEC xp_cmdshell('dir')--",
      '1 AND 1=1',
      '1 OR 1=1',
      "WAITFOR DELAY '0:0:5'",
      'INSERT INTO users VALUES(1)',
      'UPDATE users SET role=admin',
      'DELETE FROM users',
      'TRUNCATE TABLE logs',
      'ALTER TABLE users ADD col INT',
      'CREATE TABLE hack(id INT)',
      '1 # comment',
    ];

    sqlInjectionPayloads.forEach((payload) => {
      it(`should reject SQL injection: "${payload.substring(0, 30)}"`, () => {
        const req = makeReq({ body: { input: payload } });
        const { nextCalled, error } = run(req);
        expect(nextCalled).toBe(false);
        expect(error).toBeInstanceOf(BadRequestException);
      });
    });
  });

  describe('XSS detection', () => {
    const xssPayloads = [
      '<script>alert(1)</script>',
      '<script src="evil.js"></script>',
      'javascript:alert(1)',
      '<img src=x onerror=alert(1)>',
      '<iframe src="evil.html"></iframe>',
      '<object data="evil.swf"></object>',
      '<body onload=alert(1)>',
    ];

    xssPayloads.forEach((payload) => {
      it(`should reject XSS: "${payload.substring(0, 30)}"`, () => {
        const req = makeReq({ body: { input: payload } });
        const { nextCalled, error } = run(req);
        expect(nextCalled).toBe(false);
        expect(error).toBeInstanceOf(BadRequestException);
      });
    });
  });

  describe('safe input that should pass', () => {
    const safeInputs = [
      'hello world',
      'مالیات بر درآمد',
      'user@example.com',
      '09123456789',
      'normal text with no issues',
      'قیمت: 50000 تومان',
    ];

    safeInputs.forEach((input) => {
      it(`should allow safe input: "${input.substring(0, 30)}"`, () => {
        const req = makeReq({ body: { input } });
        const { nextCalled, error } = run(req);
        expect(error).toBeNull();
        expect(nextCalled).toBe(true);
      });
    });
  });
});
