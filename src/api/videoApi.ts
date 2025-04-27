import axios, {AxiosResponse, InternalAxiosRequestConfig} from "axios";
import {
    AccountCredentials,
    EditOptions,
    RegistrationRequest,
    ResendVerificationRequest,
    UpdateVideoRequest,
    VideoResponse,
    PaginatedVideoResponse
} from "../types";
import { GridPaginationModel, GridSortModel } from '@mui/x-data-grid';

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
                // Define paths that do NOT require authentication
                const publicPaths = [
                    '/api/auth/login',
                    '/api/auth/register',
                    '/api/auth/verify-email',
                    '/api/auth/resend-verification',
                    '/api/auth/logout'
                ];
                // Check if the request URL ends with any of the public paths
                const isPublicPath = publicPaths.some(path => config.url?.endsWith(path));

                if (token && !isPublicPath) {
                    config.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
                    console.debug("Interceptor: Added Auth token to request header for URL:", config.url);
                } else if (isPublicPath) {
                    console.debug("Interceptor: No Auth token needed for public URL:", config.url);
                } else if (!token) {
                    console.debug("Interceptor: No Auth token available for protected URL:", config.url);
                }

                // Set Content-Type to JSON unless it's FormData
                if (!(config.data instanceof FormData)) {
                    // Only set if not already set, to avoid overriding specific content types if needed later
                    config.headers['Content-Type'] ??= 'application/json';
                } else {
                    // For FormData, explicitly remove Content-Type so browser sets it with boundary
                    delete config.headers['Content-Type'];
                }

                return config;
            } catch (error) {
                const normalizedError = error instanceof Error ? error : new Error('Failed to process request configuration');
                console.error("Request configuration error:", normalizedError);
                return Promise.reject(normalizedError);
            }
        },
        (error) => {
            // Handle errors during interceptor setup/execution
            console.error("Request interceptor setup error:", error);
            const normalizedError = error instanceof Error ? error : new Error(error?.message ?? 'Request interceptor setup failed');
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
            console.error("API Response Error Interceptor:", error);
            const normalizedError = axios.isAxiosError(error)
                ? error
                : new Error(error?.message ?? 'Unknown API error');

            if (axios.isAxiosError(error) && error.response) {
                const { status, config } = error.response;
                // Check for 401 Unauthorized on protected routes
                // Make sure it wasn't the login attempt itself that failed with 401
                const isLoginAttempt = config.url?.endsWith('/api/auth/login');

                if (status === 401 && !isLoginAttempt) {
                    console.warn(`Interceptor: Received 401 Unauthorized for ${config.url}. Logging out.`);
                    logoutAction(); // Trigger logout from AuthContext
                }
            }
            // Always reject the promise so the error can be handled by the calling code (e.g., React Query's onError)
            return Promise.reject(normalizedError);
        }
    );
};


// --- Authentication Endpoints ---

export const login = async (creds: AccountCredentials): Promise<AxiosResponse> => {
    // Interceptor handles Content-Type, withCredentials is global
    return apiClient.post(`/api/auth/login`, creds);
};

export const register = async (data: RegistrationRequest): Promise<AxiosResponse> => {
    return apiClient.post(`/api/auth/register`, data);
};

export const resendVerification = async (data: ResendVerificationRequest): Promise<AxiosResponse> => {
    return apiClient.post(`/api/auth/resend-verification`, data);
};

export const logoutUser = async (): Promise<AxiosResponse> => {
    // Interceptor skips adding token for this path
    // withCredentials: true is still needed for the server to SET the clearing cookie
    return apiClient.post('/api/auth/logout', {});
};

// --- Video Endpoints ---

interface ListVideoParams {
    paginationModel: GridPaginationModel; // { page: number, pageSize: number }
    sortModel: GridSortModel; // [{ field: string, sort: 'asc' | 'desc' }]
}

export const listVideos = async (params: ListVideoParams): Promise<PaginatedVideoResponse> => {
    const { page, pageSize } = params.paginationModel;
    const sortParams = new URLSearchParams();
    if (params.sortModel.length > 0) {
        const { field, sort } = params.sortModel[0];
        sortParams.append('sort', `${field},${sort}`);
    } else {
        // Default sort if needed, e.g., by upload date descending
        sortParams.append('sort', 'uploadDate,desc');
    }

    // Construct query parameters for Spring Pageable
    const queryParams = new URLSearchParams({
        page: page.toString(),
        size: pageSize.toString(),
    });

    // Append sort parameters
    sortParams.forEach((value, key) => queryParams.append(key, value));


    const response = await apiClient.get<PaginatedVideoResponse>(`/api/videos?${queryParams.toString()}`);
    console.debug("listVideos API response:", response.data); // Log the response
    return response.data;
};

export const uploadVideo = async (file: File, description: string | null): Promise<VideoResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    if (description !== null && description.trim() !== '') { // Only append if not null/empty
        formData.append("description", description);
    }
    // Interceptor handles Authorization, withCredentials. Interceptor removes Content-Type for FormData.
    const response = await apiClient.post<VideoResponse>(`/api/videos`, formData);
    return response.data;
};

export const downloadVideo = async (publicId: string): Promise<AxiosResponse<Blob>> => {
    return apiClient.get<Blob>(`/api/videos/${publicId}/download`, {
        responseType: "blob",
    });
};

export const downloadOriginalVideo = async (publicId: string): Promise<AxiosResponse<Blob>> => {
    return apiClient.get<Blob>(`/api/videos/${publicId}/download/original`, {
        responseType: "blob",
    });
};


export const updateVideoDescription = async (publicId: string, data: UpdateVideoRequest): Promise<VideoResponse> => {
    const response = await apiClient.put<VideoResponse>(`/api/videos/${publicId}`, data);
    return response.data;
};

export const deleteVideo = async (publicId: string): Promise<AxiosResponse<void>> => { // Correct return type
    return apiClient.delete<void>(`/api/videos/${publicId}`); // Correct return type
};

export const processVideo = async (publicId: string, options: EditOptions): Promise<AxiosResponse<void>> => { // Correct return type
    return apiClient.post<void>(`/api/videos/${publicId}/process`, options); // Correct return type
};

// --- Setup Call (to be called near App root) ---
export const initializeApiClient = (getToken: () => string | null, logoutAction: () => void) => {
    setupRequestInterceptor(getToken);
    setupResponseInterceptor(logoutAction);
};