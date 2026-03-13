import { HttpErrorResponse } from '@angular/common/http';

/**
 * Extracts a human-readable message from a backend HttpErrorResponse.
 * The API returns: { timestamp, status, error, message, path }
 * Priority: backend message → status-specific fallback → provided default.
 */
export function parseApiError(err: HttpErrorResponse, fallback = 'Something went wrong. Please try again.'): string {
  if (err.error?.message) {
    return err.error.message;
  }
  switch (err.status) {
    case 400: return err.error?.error ?? fallback;
    case 401: return 'Your session has expired. Please log in again.';
    case 403: return 'You do not have permission to perform this action.';
    case 404: return 'The requested resource was not found.';
    case 409: return err.error?.message ?? 'A conflict occurred. Please refresh and try again.';
    case 0:   return 'Unable to reach the server. Check your connection.';
    default:  return fallback;
  }
}
