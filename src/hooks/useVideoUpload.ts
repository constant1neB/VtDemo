import { useRef, ChangeEvent, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { uploadVideo } from '../api/videoApi';
import { ProblemDetail, VideoResponse } from '../types';

interface UseVideoUploadOptions {
    onSuccess?: (data: VideoResponse, file: File) => void;
    onError?: (error: Error, file: File) => void;
    showSnackbar: (message: string) => void;
}

export function useVideoUpload({ onSuccess, onError, showSnackbar }: UseVideoUploadOptions) {
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { mutate: uploadMutate, isPending: isUploading } = useMutation<
        VideoResponse,
        Error,
        { file: File; description: string | null },
        unknown
    >({
        mutationFn: (vars) => uploadVideo(vars.file, vars.description),
        onSuccess: (data, variables) => {
            void queryClient.invalidateQueries({ queryKey: ["videos"] }); // Always refetch list
            const successMessage = `Video '${variables.file.name}' uploaded successfully! (ID: ${data.publicId.substring(0, 8)}...)`;
            showSnackbar(successMessage);
            if (onSuccess) {
                onSuccess(data, variables.file);
            }
        },
        onError: (error: Error, variables) => {
            console.error("Upload error:", error);
            let message;
            if (axios.isAxiosError(error) && error.response) {
                const status = error.response.status;
                const problem = error.response.data as ProblemDetail | undefined;
                const detail = problem?.detail ?? error.message;

                if (status === 400) {
                    message = `Upload failed (Invalid File): ${detail}`;
                } else if (status === 413) {
                    message = `Upload failed (Too Large): ${detail || 'File size exceeds limit.'}`;
                } else if (status === 401 || status === 403) {
                    message = "Upload failed: Authentication error.";
                } else {
                    message = `Upload failed: ${detail} (Status: ${status})`;
                }
            } else {
                message = `Upload failed: ${error.message}`;
            }
            showSnackbar(message);
            if (onError) {
                onError(error, variables.file);
            }
        },
    });

    const handleUploadClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            uploadMutate({ file: file, description: null });
        }
        if (event.target) {
            event.target.value = '';
        }
    }, [uploadMutate]);

    return {
        fileInputRef,
        isUploading,
        handleUploadClick,
        handleFileChange,
    };
}