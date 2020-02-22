export class Logger {
  private levels: { [key: string]: number } = {
    debug: 4,
    error: 1,
    info: 3,
    warn: 2,
  };
  private name = "Logger";

  public logLevel = 3;

  public constructor(name?: string, logLevel?: number) {
    this.name = typeof name !== "undefined" ? name : this.name;
    this.logLevel =
      typeof logLevel !== "undefined" ? parseInt(logLevel.toString(), 10) : this.logLevel;
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
    return (console as any)[level](`[${this.name}] ${msg}`);
  }
}
