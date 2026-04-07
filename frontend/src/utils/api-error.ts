import axios, { type AxiosError } from 'axios';

export interface ApiErrorResponse {
  message: string;
  [key: string]: unknown;
}

export function isApiError(error: unknown): error is AxiosError<ApiErrorResponse> {
  return axios.isAxiosError(error);
}

export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.response?.data?.message ?? error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return '알 수 없는 오류가 발생했습니다.';
}
