import { SafeAnyType } from 'src/utils/safeAny';

type Awaited<T> = T extends PromiseLike<infer U> ? Awaited<U> : T;

/** get a return type of promise */
export type PromiseReturnType<T extends (...args: SafeAnyType) => SafeAnyType> =
  Awaited<ReturnType<T>>;
