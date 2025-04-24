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
        const detail = problem?.detail ?? error.message; // Fallback to Axios error message if detail is missing

        if (status === 400) {
            const validationErrors = problem?.errors;
            if (validationErrors && typeof validationErrors === 'object' && Object.keys(validationErrors).length > 0) {
                // Avoid nested template literal: Build the error string parts first
                const errorMessages = Object.entries(validationErrors)
                    .map(([field, msg]) => `${field}: ${msg}`); // Create "field: message" strings
                return `Validation failed: ${errorMessages.join(', ')}`; // Join them
            } else {
                // Use detail if available, otherwise a generic 400 message
                return `Registration failed: ${detail ?? 'Invalid input.'}`;
            }
        } else if (status === 409) {
            return `Registration failed: ${detail ?? 'Username or email already exists or is pending verification.'}`;
        } else {
            // For other HTTP errors, include status and detail/message
            return `Registration failed: ${detail} (Status: ${status})`;
        }
    } else if (error instanceof Error) {
        // Handle standard JavaScript errors
        return `Operation failed: ${error.message}`;
    }
    // Fallback for unknown error types
    return defaultMessage;
}