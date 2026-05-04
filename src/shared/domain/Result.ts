export type Result<T, E = Error> = Success<T> | Failure<E>;

export class Success<T> {
    readonly isSuccess = true;
    readonly isFailure = false;
    constructor(readonly value: T) {}
}

export class Failure<E> {
    readonly isSuccess = false;
    readonly isFailure = true;
    constructor(readonly error: E) {}
}

export const ok = <T, E = Error>(value: T): Result<T, E> => new Success(value);
export const fail = <T, E = Error>(error: E): Result<T, E> => new Failure(error);
