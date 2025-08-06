import { hashCode } from 'src/utils/hashCode';
import { isArray, isPromise, isString } from 'src/utils/helpers';
import { SafeAnyType } from 'src/utils/safeAny';
import { PromiseReturnType } from 'src/utils/types';

/** types */
export type ApiCallerType = <F extends (data: never) => SafeAnyType>(
  apiFunction: F,
  data?: Parameters<F>[0],
  options?: {
    key?: PromiseMapKeyType | number; // the custom unique key for functions with different parameters
    expectBlob?: boolean;
    domain?: string; // to separate one promise from another
  },
) => Promise<PromiseReturnType<F>>;

export type ApiCallerAbortType = (
  specificPromisesOrKeys?: Promise<SafeAnyType> | PromiseMapKeyType | Promise<SafeAnyType>[] | PromiseMapKeyType[],
  options?: {
    domain?: string;
  },
) => void;

type PromiseMapKeyType = string;

type PromiseMapValueType = { controller: AbortController; promise: Promise<SafeAnyType> };

type PromiseMapType = Map<PromiseMapKeyType, PromiseMapValueType>;
/** end types */

const promiseMap: PromiseMapType = new Map();

const duplicateReasonAbort = Symbol('DuplicateReasonAbort');

const searchByPromise = (searchValue: Promise<SafeAnyType>): PromiseMapKeyType | null => {
  for (let {
    0: key,
    1: { promise },
  } of promiseMap) {
    if (promise === searchValue) {
      return key;
    }
  }

  return null;
};

const getMapKey = ({ domain, key, name }: { name: string; domain?: string; key?: PromiseMapKeyType | number }) =>
  `${domain ? `${domain}_` : ''}${key?.toString() ?? hashCode(name)}`;

/** export */
export const apiCaller: ApiCallerType = (apiFunction, apiArguments, options) => {
  // the unique name of every given function
  // if it is called the second time, it must be canceled
  const pathMapKey = getMapKey({
    domain: options?.domain,
    key: options?.key,
    name: apiFunction.name,
  });

  if (promiseMap.has(pathMapKey)) {
    promiseMap.get(pathMapKey)?.controller.abort(duplicateReasonAbort);
    promiseMap.delete(pathMapKey);
  }

  const controller = new AbortController();

  const promise = new Promise<SafeAnyType>((resolve, reject) => {
    apiFunction
      // (type never) is a tricky way
      .call(null, {
        ...(apiArguments || {}),
        signal: controller.signal,
      } as never)
      .then((response: SafeAnyType) => {
        promiseMap.delete(pathMapKey);

        resolve(response);
      })
      .catch((errorResponse: string | typeof duplicateReasonAbort) => {
        if (errorResponse !== duplicateReasonAbort) {
          promiseMap.delete(pathMapKey);
          reject(errorResponse);
        }
      });
  });

  promiseMap.set(pathMapKey, { controller, promise });

  return promise;
};

export const apiCallerAbort: ApiCallerAbortType = (specificPromisesOrKeys, options) => {
  const strings: PromiseMapKeyType[] = [];

  const promises: Promise<SafeAnyType>[] = [];

  const onAbort = (key: PromiseMapKeyType) => {
    promiseMap.get(key)?.controller.abort('apiCallerAbort');
    promiseMap.delete(key);
  };

  if (isString(specificPromisesOrKeys)) {
    // specificPromisesOrKeys - specific key

    strings.push(specificPromisesOrKeys);
  } else if (isArray(specificPromisesOrKeys)) {
    // specificPromisesOrKeys - specific keys

    specificPromisesOrKeys.forEach((specificPromiseOrKey) => {
      if (isString(specificPromiseOrKey)) {
        strings.push(specificPromiseOrKey);
      } else if (isPromise(specificPromiseOrKey)) {
        promises.push(specificPromiseOrKey);
      }
    });
  } else if (isPromise(specificPromisesOrKeys)) {
    // specificPromisesOrKeys - promise

    promises.push(specificPromisesOrKeys as Promise<SafeAnyType>);
  } else if (specificPromisesOrKeys === undefined) {
    // specificPromisesOrKeys - clear all

    if (options?.domain) {
      // clear the map by domain
      promiseMap.forEach((value, key) => {
        if (key.startsWith(options.domain as string)) {
          value.controller.abort('Manual abort');
          promiseMap.delete(key);
        }
      });
    } else {
      // clear the whole map
      promiseMap.forEach((value) => {
        value.controller.abort('Manual abort');
      });
      promiseMap.clear();
    }
  }

  strings.forEach(onAbort);

  promises.forEach((promise) => {
    const keyMap = searchByPromise(promise);

    if (keyMap) {
      onAbort(keyMap);
    }
  });
};

export const DEV_ONLY_PROMISE_MAP = process.env.NODE_ENV === 'production' ? undefined : promiseMap;
