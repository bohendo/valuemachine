// https://github.com/microsoft/TypeScript/issues/3192#issuecomment-261720275
export const enumify = <
  T extends {[index: string]: U},
  U extends string
>(x: T): T => x;

export interface ILogger {
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}
