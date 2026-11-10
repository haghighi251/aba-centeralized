export type Result<T, E> = Ok<T> | Err<E>;

export class Ok<T> {
  public constructor(public readonly value: T) {}

  public isOk(): this is Ok<T> {
    return true;
  }

  public isErr(): boolean {
    return false;
  }
}

export class Err<E> {
  public constructor(public readonly error: E) {}

  public isOk(): boolean {
    return false;
  }

  public isErr(): this is Err<E> {
    return true;
  }
}

/**
 * Construct a new Ok result value.
 */
export const ok = <T>(value: T): Ok<T> => new Ok(value);

/**
 * Construct a new Err result value.
 */
export const err = <E>(error: E): Err<E> => new Err(error);
