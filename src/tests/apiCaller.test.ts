import { apiCaller, apiCallerAbort, DEV_ONLY_PROMISE_MAP as rawPromiseMap } from 'src/index';
import { SafeAnyType } from 'src/utils/safeAny';

// it exists for the test environment
const DEV_PROMISE_MAP = rawPromiseMap!;

jest.spyOn(console, 'error').mockImplementation(() => {});

const getPromise = (response: SafeAnyType, delay?: number) =>
  delay
    ? jest.fn(() => new Promise((resolve) => setTimeout(() => resolve(response), delay)))
    : jest.fn().mockResolvedValue(response);

describe('apiCaller', () => {
  afterEach(() => {
    jest.clearAllMocks();
    apiCallerAbort();
  });

  it('should call the API function and return a response', () => {
    const response = {
      data: { result: 'success' },
      isSuccess: true,
      errors: [],
      totalCount: 1,
    };

    const mockApiFunction = getPromise(response);

    apiCaller(mockApiFunction).then((result) => {
      expect(DEV_PROMISE_MAP.size).toEqual(0);

      expect(mockApiFunction).toHaveBeenCalledTimes(1);

      expect(result).toEqual(response);
    });

    expect(DEV_PROMISE_MAP.size).toEqual(1);
  });

  describe('abort', () => {
    const response = {
      data: { result: 'success' },
      isSuccess: true,
      errors: [],
      totalCount: 1,
    };

    it('all', () => {
      const mockApiFunction = getPromise(response, 1000);

      apiCaller(mockApiFunction)
        .then((response) => {
          expect(response).not.toHaveBeenCalled();
        })
        .catch((error) => {
          expect(error).not.toHaveBeenCalled();
        });

      expect(DEV_PROMISE_MAP.size).toEqual(1);

      apiCallerAbort();

      expect(DEV_PROMISE_MAP.size).toEqual(0);
    });

    it('all by domain', () => {
      const mockApiFunction = getPromise(response, 1000);

      const anotherDomainsNumber = 5;

      apiCaller(mockApiFunction, {}, { domain: 'thisDomain' })
        .then((response) => {
          expect(response).not.toHaveBeenCalled();
        })
        .catch((error) => {
          expect(error).not.toHaveBeenCalled();
        });

      // another domain
      for (let i = 0; i < anotherDomainsNumber; i++) {
        apiCaller(getPromise(response, 10000), {}, { domain: `anotherDomain_${i}` });
      }

      expect(DEV_PROMISE_MAP.size).toEqual(anotherDomainsNumber + 1);

      apiCallerAbort(undefined, { domain: 'thisDomain' });

      expect(DEV_PROMISE_MAP.size).toEqual(anotherDomainsNumber);
    });

    it('by key', () => {
      const mockApiFunction = getPromise(response, 1000);

      const promiseKey = 'customKey';

      apiCaller(mockApiFunction, {}, { key: promiseKey });

      expect(DEV_PROMISE_MAP.size).toEqual(1);

      apiCallerAbort(promiseKey);

      expect(DEV_PROMISE_MAP.size).toEqual(0);
    });

    it('by keys', () => {
      const differentPromisesNumber = 5;

      for (let i = 0; i < differentPromisesNumber; i++) {
        const mockApiFunction = getPromise(response, 1000);

        const promiseKey = `customKey++__${i}`;

        apiCaller(mockApiFunction, {}, { key: promiseKey });
      }

      expect(DEV_PROMISE_MAP.size).toEqual(differentPromisesNumber);

      apiCallerAbort(new Array(differentPromisesNumber).fill(0).map((_, i) => `customKey++__${i}`));

      expect(DEV_PROMISE_MAP.size).toEqual(0);
    });

    it('by an inappropriate keys', () => {
      const differentPromisesNumber = 5;

      for (let i = 0; i < differentPromisesNumber; i++) {
        const mockApiFunction = getPromise(response, 1000);

        const promiseKey = `customKey++__${i}`;

        apiCaller(mockApiFunction, {}, { key: promiseKey });
      }

      expect(DEV_PROMISE_MAP.size).toEqual(differentPromisesNumber);

      // this doesn't abort anything
      apiCallerAbort(new Array(differentPromisesNumber).fill(0).map((_, i) => `${i}__890890aVNNBMM~@#%`));

      expect(DEV_PROMISE_MAP.size).toEqual(differentPromisesNumber);
    });

    it('by promise', () => {
      const mockApiFunction = getPromise(response, 1000);

      const promise = apiCaller(mockApiFunction);

      expect(DEV_PROMISE_MAP.size).toEqual(1);

      apiCallerAbort(promise);

      expect(DEV_PROMISE_MAP.size).toEqual(0);
    });

    it('by promises', () => {
      const differentPromisesNumber = 5;

      const promises = [];

      for (let i = 0; i < differentPromisesNumber; i++) {
        const mockApiFunction = getPromise(response, 1000);

        // each promise should be unique in this case
        const promiseKey = `+_${i}`;

        promises.push(apiCaller(mockApiFunction, {}, { key: promiseKey }));
      }

      expect(DEV_PROMISE_MAP.size).toEqual(differentPromisesNumber);

      apiCallerAbort(promises);

      expect(DEV_PROMISE_MAP.size).toEqual(0);
    });
  });
});
