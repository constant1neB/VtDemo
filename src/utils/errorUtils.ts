import axios from 'axios';
import { ProblemDetail } from '../types';

/**
 * Parses various error types from API calls into a user-friendly string.
 * Specifically handles Axios errors with ProblemDetail responses.
 */
export function parseApiError(error: unknown, defaultMessage: string = "An unexpected error occurred."): string {
    if (axios.isAxiosError(error) && error.response) {
        const status = error.response.status;
        const problem = error.response.data as ProblemDetail | undefined;
        const detail = problem?.detail ?? error.message;

        switch (status) {
            case 400: { // Bad Request (often validation)
                const validationErrors = problem?.errors;
                if (validationErrors && typeof validationErrors === 'object' && Object.keys(validationErrors).length > 0) {
                    const errorMessages = Object.entries(validationErrors)
                        .map(([field, msg]) => `${field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: ${msg}`)
                        .join('. ');
                    return `Validation failed: ${errorMessages}.`;
                }
                return `Operation failed: ${detail ?? 'Invalid input.'} (Status: ${status})`;
            }

            case 401:
                return `Authentication failed: ${detail ?? 'Please check credentials or log in.'}`;

            case 403:
                return `Forbidden: ${detail ?? 'You do not have permission.'}`;

            case 404:
                return `Not Found: ${detail ?? 'Resource not found.'}`;

            case 409:
                return `Conflict: ${detail ?? 'Operation could not be completed due to a conflict.'}`;

            case 413:
                return `Failed: ${detail ?? 'File size exceeds limit.'}`;

            default:
                return `Operation failed: ${detail ?? 'Server error.'} (Status: ${status})`;
        }
    } else if (error instanceof Error) {
        return `Operation failed: ${error.message}`;
    }
    return defaultMessage;
}