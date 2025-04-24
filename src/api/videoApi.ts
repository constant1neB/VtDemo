// src/api/videoApi.ts
import axios, {AxiosResponse, InternalAxiosRequestConfig} from "axios";
import {
    AccountCredentials,
    EditOptions,
    RegistrationRequest,
    ResendVerificationRequest,
    UpdateVideoRequest,
    VideoResponse,
} from "../types";

// --- Centralized Axios Instance ---
const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'; // Provide a default

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true, // IMPORTANT: Send cookies (like the fingerprint)
});

// --- Request Interceptor ---
// Injects the JWT from memory (if available) into requests
export const setupRequestInterceptor = (getToken: () => string | null) => {
    apiClient.interceptors.request.use(
        (config: InternalAxiosRequestConfig) => {
            try {
                const token = getToken();
                if (token && !config.url?.endsWith('/login') && !config.url?.endsWith('/register') && !config.url?.endsWith('/resend-verification')) {
                    // Ensure token includes "Bearer " prefix
                    config.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
                    console.debug("Interceptor: Added Auth token to request headers for URL:", config.url);
                } else {
                    console.debug("Interceptor: No Auth token added for URL:", config.url);
                }
                // Set Content-Type for non-FormData requests
                if (!(config.data instanceof FormData)) {
                    config.headers['Content-Type'] = 'application/json';
                }
                return config;
            } catch (error) {
                // Convert any synchronous errors to rejected promises
                const normalizedError = error instanceof Error
                    ? error
                    : new Error('Failed to process request configuration');
                return Promise.reject(normalizedError);
            }
        },
        (error) => {
            console.error("Request interceptor error:", error);
            // Ensure we reject with an Error object
            const normalizedError = error instanceof Error
                ? error
                : new Error(error?.message ?? 'Request interceptor failed');
            return Promise.reject(normalizedError);
        }
    );
};

// --- Response Interceptor ---
// Handles global errors, especially 401 for logout
export const setupResponseInterceptor = (logoutAction: () => void) => {
    apiClient.interceptors.response.use(
        (response) => response, // Pass through successful responses
        (error) => {
            console.error("API Response Error:", error);

            // Ensure we have a proper Error object
            const normalizedError = axios.isAxiosError(error)
                ? error
                : new Error(error?.message ?? 'Unknown API error');

            if (axios.isAxiosError(error) && error.response) {
                const { status, config } = error.response;
                // Check for 401 Unauthorized
                if (status === 401 && config.url !== '/api/auth/login') { // Avoid logout loop on login failure
                    console.warn("Interceptor: Received 401 Unauthorized. Logging out.");
                    logoutAction(); // Trigger logout from AuthContext
                }
            }

            return Promise.reject(normalizedError);
        }
    );
};


// --- Authentication Endpoints ---
// Use the apiClient instance

export const login = async (creds: AccountCredentials): Promise<AxiosResponse> => {
    // Login doesn't need Authorization header, interceptor skips it
    // withCredentials is set globally on apiClient
    return apiClient.post(`/api/auth/login`, creds);
};

export const register = async (data: RegistrationRequest): Promise<AxiosResponse> => {
    return apiClient.post(`/api/auth/register`, data);
};

export const resendVerification = async (data: ResendVerificationRequest): Promise<AxiosResponse> => {
    return apiClient.post(`/api/auth/resend-verification`, data);
};

// --- Video Endpoints ---
// Use the apiClient instance - interceptor adds token automatically

export const listVideos = async (): Promise<VideoResponse[]> => {
    const response = await apiClient.get<VideoResponse[]>(`/api/videos`);
    return response.data;
};

export const uploadVideo = async (file: File, description: string | null): Promise<VideoResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    if (description !== null) {
        formData.append("description", description);
    }
    // Interceptor handles Authorization, withCredentials. We just need to ensure Content-Type is NOT set for FormData.
    const response = await apiClient.post<VideoResponse>(`/api/videos`, formData, {
        headers: {
            'Content-Type': undefined // Let Axios set multipart boundary
        }
    });
    return response.data;
};

export const getVideoDetails = async (id: number): Promise<VideoResponse> => {
    const response = await apiClient.get<VideoResponse>(`/api/videos/${id}`);
    return response.data;
};

export const downloadVideo = async (id: number): Promise<AxiosResponse<Blob>> => {
    return apiClient.get<Blob>(`/api/videos/${id}/download`, {
        responseType: "blob",
    });
};

export const updateVideoDescription = async (id: number, data: UpdateVideoRequest): Promise<VideoResponse> => {
    const response = await apiClient.put<VideoResponse>(`/api/videos/${id}`, data);
    return response.data;
};

export const deleteVideo = async (id: number): Promise<AxiosResponse> => {
    return apiClient.delete(`/api/videos/${id}`);
};

export const processVideo = async (id: number, options: EditOptions): Promise<AxiosResponse> => {
    return apiClient.post(`/api/videos/${id}/process`, options);
};

// --- Setup Call (to be called near App root) ---
export const initializeApiClient = (getToken: () => string | null, logoutAction: () => void) => {
    setupRequestInterceptor(getToken);
    setupResponseInterceptor(logoutAction);
};