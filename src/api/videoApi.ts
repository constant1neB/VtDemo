import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import {
    AccountCredentials,
    EditOptions,
    RegistrationRequest,
    ResendVerificationRequest,
    UpdateVideoRequest,
    VideoResponse,
} from "../types";


const API_BASE_URL = import.meta.env.VITE_API_URL;

/**
 * Creates Axios configuration for authenticated requests.
 * Crucially includes `withCredentials: true` to send HttpOnly cookies.
 */
const getAuthConfig = (): AxiosRequestConfig => {
    const token = sessionStorage.getItem("jwt");
    return {
        headers: {
            Authorization: token,
            "Content-Type": "application/json",
        },
        withCredentials: true,
    };
};

/**
 * Creates Axios configuration for MULTIPART authenticated requests.
 */
const getAuthUploadConfig = (): AxiosRequestConfig => {
    const token = sessionStorage.getItem("jwt");
    return {
        headers: {
            Authorization: token,
        },
        withCredentials: true,
    };
};

// --- Authentication Endpoints ---

/**
 * Attempts to log in a user.
 * Returns the full AxiosResponse to allow access to headers (like Authorization).
 */
export const login = async (
    creds: AccountCredentials
): Promise<AxiosResponse> => { // Return full response
    return axios.post(`${API_BASE_URL}/api/auth/login`, creds, {
        headers: { "Content-Type": "application/json" },
        // No auth token needed for login itself, but backend might set cookies
        withCredentials: true, // Send any existing cookies, receive new Set-Cookie
    });
};

/**
 * Registers a new user.
 */
export const register = async (
    data: RegistrationRequest
): Promise<AxiosResponse> => { // Expecting 201 or error
    return axios.post(`${API_BASE_URL}/api/auth/register`, data, {
        headers: { "Content-Type": "application/json" },
        withCredentials: true, // Important if registration flow involves cookies
    });
};

/**
 * Requests resending the verification email.
 */
export const resendVerification = async (
    data: ResendVerificationRequest
): Promise<AxiosResponse> => { // Expecting 202 or error
    return axios.post(`${API_BASE_URL}/api/auth/resend-verification`, data, {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
    });
};

// verifyEmail is typically handled by navigating to the link, backend handles the GET request.

// --- Video Endpoints ---

/**
 * Lists videos for the authenticated user.
 */
export const listVideos = async (): Promise<VideoResponse[]> => {
    const response = await axios.get<VideoResponse[]>( // Assuming backend returns array directly, adjust if nested
        `${API_BASE_URL}/api/videos`,
        getAuthConfig()
    );
    return response.data;
};

/**
 * Uploads a video file and its description.
 */
export const uploadVideo = async (
    file: File,
    description: string | null // Allow null description
): Promise<VideoResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    if (description !== null) { // Only append if not null
        formData.append("description", description);
    }

    const response = await axios.post<VideoResponse>(
        `${API_BASE_URL}/api/videos`,
        formData,
        getAuthUploadConfig() // Use multipart config
    );
    return response.data;
};

/**
 * Gets details for a specific video.
 */
export const getVideoDetails = async (id: number): Promise<VideoResponse> => {
    const response = await axios.get<VideoResponse>(
        `${API_BASE_URL}/api/videos/${id}`,
        getAuthConfig()
    );
    return response.data;
};

/**
 * Downloads a video file. Returns the raw AxiosResponse containing the Blob.
 */
export const downloadVideo = async (id: number): Promise<AxiosResponse<Blob>> => {
    return axios.get<Blob>(`${API_BASE_URL}/api/videos/${id}/download`, {
        ...getAuthConfig(), // Spread auth config
        responseType: "blob", // <-- IMPORTANT for downloading files
    });
};

/**
 * Updates a video's description.
 */
export const updateVideoDescription = async (
    id: number,
    data: UpdateVideoRequest
): Promise<VideoResponse> => {
    const response = await axios.put<VideoResponse>(
        `${API_BASE_URL}/api/videos/${id}`,
        data,
        getAuthConfig()
    );
    return response.data;
};

/**
 * Deletes a video. Expects 204 No Content on success.
 */
export const deleteVideo = async (id: number): Promise<AxiosResponse> => {
    return axios.delete(`${API_BASE_URL}/api/videos/${id}`, getAuthConfig());
};

/**
 * Starts the video processing job. Expects 202 Accepted on success.
 */
export const processVideo = async (
    id: number,
    options: EditOptions
): Promise<AxiosResponse> => {
    return axios.post(
        `${API_BASE_URL}/api/videos/${id}/process`,
        options,
        getAuthConfig()
    );
};