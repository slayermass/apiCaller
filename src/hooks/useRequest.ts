import { useCallback } from 'react';

import { ApiCallerAbortType, ApiCallerType, apiCaller, apiCallerAbort } from 'src/apiCaller';

export type ApiRequestCallerType = {
  abort: ApiCallerAbortType;
  apiCaller: ApiCallerType;
};

export const useRequest = (data?: { domain?: string }): ApiRequestCallerType => {
  const domain = data?.domain || 'useRequest';

  const apiCallerLocal: ApiCallerType = useCallback(
    (apiFunction, apiArguments, options) => apiCaller(apiFunction, apiArguments, { domain, ...options }),
    [domain],
  );

  const abort = useCallback(() => apiCallerAbort(undefined, { domain }), [domain]);

  return { abort, apiCaller: apiCallerLocal };
};
