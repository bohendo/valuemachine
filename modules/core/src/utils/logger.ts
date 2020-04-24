import { ILogger } from "../types";

export class ContextLogger implements ILogger {
  private logger: ILogger;
  public context = "Default";

  public constructor(context: string, logger?: ILogger) {
    this.context = context;
    this.logger = logger || console as ILogger;
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
        `${level.substring(0, 1).toUpperCase()} [${this.context}] ${msg}`,
      );
    };
  }
}

export class LevelLogger implements ILogger {
  private levels: { [key: string]: number } = { debug: 4, error: 1, info: 3, warn: 2 };
  private logger = console as ILogger;
  public logLevel = 3;

  public constructor(logLevel: number, logger?: ILogger) {
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
