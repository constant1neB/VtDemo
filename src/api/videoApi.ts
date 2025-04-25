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
const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'https://localhost:8443'; // Provide a default

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
                // No need to add token for login/register/verify/resend/logout (logout is now public)
                const publicPaths = ['/api/auth/login', '/api/auth/register', '/api/auth/verify-email', '/api/auth/resend-verification', '/api/auth/logout'];
                const isPublicPath = publicPaths.some(path => config.url?.endsWith(path));

                if (token && !isPublicPath) {
                    config.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
                    console.debug("Interceptor: Added Auth token to request headers for URL:", config.url);
                } else {
                    console.debug("Interceptor: No Auth token added for URL:", config.url);
                }
                if (!(config.data instanceof FormData)) {
                    config.headers['Content-Type'] = 'application/json';
                }
                return config;
            } catch (error) {
                const normalizedError = error instanceof Error ? error : new Error('Failed to process request configuration');
                return Promise.reject(normalizedError);
            }
        },
        (error) => {
            console.error("Request interceptor error:", error);
            const normalizedError = error instanceof Error ? error : new Error(error?.message ?? 'Request interceptor failed');
            return Promise.reject(normalizedError);
        }
    );
};

// --- Response Interceptor ---
// Handles global errors, especially 401 for logout
export const setupResponseInterceptor = (logoutAction: () => void) => {
    apiClient.interceptors.response.use(
        (response) => response,
        (error) => {
            console.error("API Response Error:", error);
            const normalizedError = axios.isAxiosError(error)
                ? error
                : new Error(error?.message ?? 'Unknown API error');

            if (axios.isAxiosError(error) && error.response) {
                const { status, config } = error.response;
                // Check for 401 Unauthorized AND ensure it wasn't the logout or login request itself
                if (status === 401 && config.url !== '/api/auth/logout' && config.url !== '/api/auth/login') {
                    console.warn(`Interceptor: Received 401 Unauthorized for ${config.url}. Logging out.`);
                    logoutAction(); // Trigger logout from AuthContext
                } else if (status === 401 && config.url === '/api/auth/logout') {
                    // This case should ideally not happen now since logout is public, but keep check just in case
                    console.warn(`Interceptor: Received 401 for public logout request itself. This shouldn't happen.`);
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

export const logoutUser = async (): Promise<AxiosResponse> => { // Removed token parameter
    // No Authorization header needed as endpoint is now public and skipped by filter
    return apiClient.post('/api/auth/logout', {});
    // withCredentials: true is still needed for the server to SET the clearing cookie
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