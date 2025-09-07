import { useQueryCache } from '@pinia/colada';

export const cache = useQueryCache();

export function withOnSuccess<TArgs extends unknown[], TReturn>(
  apiCall: (...args: TArgs) => Promise<TReturn>,
  onSuccess: (ret: TReturn, ...args: TArgs) => void,
) {
  return (...args: TArgs) =>
    apiCall(...args).then((ret) => {
      onSuccess(ret, ...args);
      return ret;
    });
}
