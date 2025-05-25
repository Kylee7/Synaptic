// Basic Node.js type definitions for development without node_modules
declare global {
  var process: {
    env: Record<string, string | undefined>;
  };

  var Buffer: {
    from(data: string, encoding?: string): Buffer;
    alloc(size: number): Buffer;
  };

  interface Buffer {
    toString(encoding?: string): string;
    length: number;
  }

  interface ErrorConstructor {
    captureStackTrace?(targetObject: any, constructorOpt?: any): void;
  }

  var global: any;
  var console: {
    log: (...args: any[]) => void;
    error: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    info: (...args: any[]) => void;
    debug: (...args: any[]) => void;
  };

  namespace NodeJS {
    interface Timeout {
      ref(): this;
      unref(): this;
    }
  }

  function setInterval(callback: (...args: any[]) => void, ms: number): NodeJS.Timeout;
  function clearInterval(timeoutId: NodeJS.Timeout): void;
  function setTimeout(callback: (...args: any[]) => void, ms: number): NodeJS.Timeout;
  function clearTimeout(timeoutId: NodeJS.Timeout): void;

  var performance: {
    now(): number;
  };
}

// Mock crypto module
declare module 'crypto' {
  export function randomBytes(size: number): Buffer;
  export function pbkdf2(
    password: string,
    salt: Buffer,
    iterations: number,
    keylen: number,
    digest: string,
    callback: (err: Error | null, derivedKey: Buffer) => void
  ): void;
  export function createHash(algorithm: string): {
    update(data: string): any;
    digest(encoding: string): string;
  };
  export function createHmac(algorithm: string, key: Buffer): {
    update(data: string): any;
    digest(encoding: string): string;
  };
  export function createCipher(algorithm: string, key: Buffer): {
    update(data: string, inputEncoding: string, outputEncoding: string): string;
    final(outputEncoding: string): string;
    getAuthTag(): Buffer;
  };
  export function createDecipher(algorithm: string, key: Buffer): {
    setAuthTag(tag: Buffer): void;
    update(data: string, inputEncoding: string, outputEncoding: string): string;
    final(outputEncoding: string): string;
  };
  export function timingSafeEqual(a: Buffer, b: Buffer): boolean;
}

// Mock Express types
declare module 'express' {
  export interface Request {
    body: any;
    params: Record<string, string>;
    query: Record<string, string | string[]>;
    originalUrl: string;
  }

  export interface Response {
    status(code: number): Response;
    json(data: any): Response;
  }

  export interface NextFunction {
    (err?: any): void;
  }

  export interface Application {
    use(...args: any[]): void;
    get(path: string, handler: (req: Request, res: Response) => void): void;
    post(path: string, handler: (req: Request, res: Response) => void): void;
    put(path: string, handler: (req: Request, res: Response) => void): void;
    delete(path: string, handler: (req: Request, res: Response) => void): void;
    listen(port: number, host: string, callback: () => void): any;
  }

  export interface Router {
    get(path: string, handler: (req: Request, res: Response) => void): void;
    post(path: string, handler: (req: Request, res: Response) => void): void;
    put(path: string, handler: (req: Request, res: Response) => void): void;
    delete(path: string, handler: (req: Request, res: Response) => void): void;
  }

  export function Router(): Router;
  export default function express(): Application;
}

// Mock other modules
declare module 'cors' {
  export default function cors(options?: any): any;
}

declare module 'helmet' {
  export default function helmet(): any;
}

declare module 'compression' {
  export default function compression(): any;
}

declare module 'morgan' {
  export default function morgan(format: string): any;
}

// Jest types
declare global {
  var jest: {
    fn(): any;
    setTimeout(timeout: number): void;
    clearAllMocks(): void;
  };

  var afterEach: (fn: () => void) => void;
  var describe: (name: string, fn: () => void) => void;
  var it: (name: string, fn: () => void) => void;
  var expect: (value: any) => any;
}

export {}; 