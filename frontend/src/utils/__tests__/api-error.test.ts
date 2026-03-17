import { describe, it, expect } from 'vitest';
import { isApiError, getErrorMessage } from '../api-error';
import { AxiosError, AxiosHeaders } from 'axios';

describe('api-error utilities', () => {
  describe('isApiError', () => {
    it('returns true for AxiosError instances', () => {
      const error = new AxiosError('test error');
      expect(isApiError(error)).toBe(true);
    });

    it('returns false for regular Error instances', () => {
      const error = new Error('test error');
      expect(isApiError(error)).toBe(false);
    });

    it('returns false for non-error values', () => {
      expect(isApiError('string')).toBe(false);
      expect(isApiError(null)).toBe(false);
      expect(isApiError(undefined)).toBe(false);
      expect(isApiError(42)).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    it('returns API response message for AxiosError with response data', () => {
      const error = new AxiosError('Request failed');
      error.response = {
        data: { message: '자재코드가 존재하지 않습니다.' },
        status: 400,
        statusText: 'Bad Request',
        headers: new AxiosHeaders(),
        config: { headers: new AxiosHeaders() },
      };
      expect(getErrorMessage(error)).toBe('자재코드가 존재하지 않습니다.');
    });

    it('returns AxiosError message when no response data message', () => {
      const error = new AxiosError('Network Error');
      expect(getErrorMessage(error)).toBe('Network Error');
    });

    it('returns Error message for regular errors', () => {
      const error = new Error('Something went wrong');
      expect(getErrorMessage(error)).toBe('Something went wrong');
    });

    it('returns default message for unknown error types', () => {
      expect(getErrorMessage('string error')).toBe('알 수 없는 오류가 발생했습니다.');
      expect(getErrorMessage(null)).toBe('알 수 없는 오류가 발생했습니다.');
      expect(getErrorMessage(42)).toBe('알 수 없는 오류가 발생했습니다.');
    });
  });
});
