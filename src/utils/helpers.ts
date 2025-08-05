import { SafeAnyType } from 'src/utils/safeAny';

export const isPromise = (value: SafeAnyType) => value instanceof Promise;

export const isString = (value: SafeAnyType) => typeof value === 'string' || value instanceof String;

export const isArray = (value: SafeAnyType) => Array.isArray(value);
