import { Logger } from "@finances/types";

export class ContextLogger implements Logger {
  private logger: Logger;
  public context = "Default";

  public constructor(context: string, logger?: Logger) {
    this.context = context;
    this.logger = logger || console as Logger;
  }

  public newContext(context: string): ContextLogger {
    return new ContextLogger(context, this.logger);
  }

  public setContext(context: string): void {
    this.context = context;
  }

  public error = this.log("error");
  public warn = this.log("warn");
  public info = this.log("info");
  public debug = this.log("debug");

  private log(level: string): (msg: string) => void {
    return (msg: string): void => {
      return this.logger[level](
        `${new Date().toISOString()} [${this.context}] ${msg}`,
      );
    };
  }
}

export class LevelLogger implements Logger {
  private levels: { [key: string]: number } = { debug: 4, error: 1, info: 3, warn: 2 };
  private logger = console as Logger;
  public logLevel = 3;

  public constructor(logLevel: number, logger?: Logger) {
    this.logLevel = typeof logLevel === "number" ? logLevel : this.logLevel;
    this.logger =  logger || this.logger;
  }

  public newLevel(logLevel: number): LevelLogger {
    return new LevelLogger(logLevel, this.logger);
  }

  public setLevel(logLevel: number): void {
    this.logLevel = logLevel;
  }

  public error = this.log("error");
  public warn = this.log("warn");
  public info = this.log("info");
  public debug = this.log("debug");

  private log(level: string): (msg: string) => void {
    return (msg: string): void => {
      if (this.levels[level] > this.logLevel) return;
      return (console as any)[level](msg);
    };
  }
}
