import { useState } from 'react';
import { parseApiError } from '../utils/errorUtils';

type ApiFunction<TData, TResponse> = (data: TData) => Promise<TResponse>;

interface UseApiFormSubmitOptions<TResponse> {
    onSuccess?: (response: TResponse) => void; // Optional success callback
    successMessage?: string; // Optional generic success message
}

interface UseApiFormSubmitReturn<TData, TResponse> {
    isLoading: boolean;
    snackbarOpen: boolean;
    snackbarMessage: string;
    isSubmitted: boolean; // Generic 'submitted' flag (can mean success or handled error)
    handleSubmit: (data: TData) => Promise<void>;
    closeSnackbar: () => void;
    _marker?: TResponse;
}

/**
 * Custom hook to handle the common logic for submitting forms that call an API.
 * Manages loading state, snackbar feedback, and success/error handling.
 *
 * @param apiFunction The async function to call for the API request.
 * @param options Configuration options like onSuccess callback and success message.
 */
export function useApiFormSubmit<TData, TResponse>(
    apiFunction: ApiFunction<TData, TResponse>,
    options: UseApiFormSubmitOptions<TResponse> = {}
): UseApiFormSubmitReturn<TData, TResponse> {
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
    const [snackbarMessage, setSnackbarMessage] = useState<string>("");
    const [isSubmitted, setIsSubmitted] = useState<boolean>(false); // Tracks if submission attempt finished

    const { onSuccess, successMessage } = options;

    const closeSnackbar = () => {
        setSnackbarOpen(false);
    };

    const handleSubmit = async (data: TData): Promise<void> => {
        setIsLoading(true);
        setSnackbarMessage("");
        setIsSubmitted(false); // Reset submitted state on new attempt

        try {
            const response = await apiFunction(data); // Call the provided API function
            setSnackbarMessage(successMessage ?? "Operation successful!"); // Use provided or default message
            setSnackbarOpen(true);
            setIsSubmitted(true); // Mark as submitted (successfully)

            // Call the onSuccess callback if provided
            if (onSuccess) {
                onSuccess(response);
            }

        } catch (error: unknown) {
            console.error("API Form Submit Error:", error);
            // Use the helper function to parse the error
            const errorMessage = parseApiError(error); // Use default message from parser if needed
            setSnackbarMessage(errorMessage);
            setSnackbarOpen(true);
            setIsSubmitted(true); // Mark as submitted (even on error, the attempt finished)
            // Do not call onSuccess on error
        } finally {
            setIsLoading(false);
        }
    };

    return {
        isLoading,
        snackbarOpen,
        snackbarMessage,
        isSubmitted,
        handleSubmit,
        closeSnackbar,
    };
}