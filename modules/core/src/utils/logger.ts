import { ILogger } from "../types";

export class Logger implements ILogger {
  public context = "Logger";
  public logger = console as ILogger;

  public constructor(context?: string, logger?: ILogger) {
    this.context = context || this.context;
    this.logger =  logger || this.logger;
  }

  public error(msg: string): void {
    this.log("error", msg);
  }

  public warn(msg: string): void {
    this.log("warn", msg);
  }

  public info(msg: string): void {
    this.log("info", msg);
  }

  public debug(msg: string): void {
    this.log("debug", msg);
  }

  private log(level: string, msg: any): void {
    return this.logger[level](
      `${level.substring(0, 1).toUpperCase()} [${this.context}] ${msg}`,
    );
  }
}
