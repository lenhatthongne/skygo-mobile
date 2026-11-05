import 'axios';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Do not attach the access token and do not trigger refresh/sign-out on 401. */
    skipAuth?: boolean;
    /** Internal: the request was already retried after a token refresh. */
    _retry?: boolean;
  }
}
