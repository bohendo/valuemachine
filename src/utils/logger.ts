export class Logger {
  private levels: { [key: string]: number } = {
    debug: 4,
    error: 1,
    info: 3,
    warn: 2,
  };
  private context = "Logger";

  public logLevel = 3;

  public constructor(context?: string, logLevel?: number) {
    this.context = typeof context !== "undefined" ? context : this.context;
    this.logLevel =
      typeof logLevel !== "undefined" ? parseInt(logLevel.toString(), 10) : this.logLevel;
  }

  public setLevel(logLevel: number): void {
    this.logLevel = logLevel;
  }

  public setContext(context: string): void {
    this.context = context;
  }

  public newContext(context: string, logLevel?: number): Logger {
    return new Logger(context, logLevel || this.logLevel);
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
    if (this.levels[level] > this.logLevel) return;
    return (console as any)[level](`${level.substring(0, 1).toUpperCase()} [${this.context}] ${msg}`);
  }
}
