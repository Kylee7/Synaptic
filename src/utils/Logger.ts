export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  module: string;
  message: string;
  data?: any;
  error?: Error;
}

export class Logger {
  private module: string;
  private logLevel: LogLevel;
  private logEntries: LogEntry[] = [];
  private maxEntries: number = 1000;

  constructor(module: string, logLevel: LogLevel = LogLevel.INFO) {
    this.module = module;
    this.logLevel = logLevel;
  }

  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, error?: Error | any): void {
    this.log(LogLevel.ERROR, message, undefined, error instanceof Error ? error : undefined);
  }

  private log(level: LogLevel, message: string, data?: any, error?: Error): void {
    if (level < this.logLevel) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      module: this.module,
      message,
      data,
      error
    };

    this.logEntries.push(entry);

    // Keep only the last maxEntries
    if (this.logEntries.length > this.maxEntries) {
      this.logEntries = this.logEntries.slice(-this.maxEntries);
    }

    // Output to console
    this.outputToConsole(entry);
  }

  private outputToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const levelName = LogLevel[entry.level];
    const prefix = `[${timestamp}] [${levelName}] [${entry.module}]`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(prefix, entry.message, entry.data || '');
        break;
      case LogLevel.INFO:
        console.info(prefix, entry.message, entry.data || '');
        break;
      case LogLevel.WARN:
        console.warn(prefix, entry.message, entry.data || '');
        break;
      case LogLevel.ERROR:
        console.error(prefix, entry.message, entry.error || entry.data || '');
        break;
    }
  }

  getEntries(level?: LogLevel): LogEntry[] {
    if (level !== undefined) {
      return this.logEntries.filter(entry => entry.level >= level);
    }
    return [...this.logEntries];
  }

  clear(): void {
    this.logEntries = [];
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }
} 