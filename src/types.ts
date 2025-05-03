// --- Authentication ---
export type AccountCredentials = {
  username: string;
  password: string;
};

export type RegistrationRequest = {
  username: string;
  email: string;
  password: string;
  passwordConfirmation: string;
};

export type ResendVerificationRequest = {
  email: string;
};

// --- Video Management ---

// --- Backend Response Structures ---
export interface Pageable {
  pageNumber: number;
  pageSize: number;
  sort: {
    sorted: boolean;
    unsorted: boolean;
    empty: boolean;
  };
  offset: number;
  paged: boolean;
  unpaged: boolean;
}

export interface PaginatedResponse<T> {
  content: T[]; // The actual data for the current page
  pageable: Pageable;
  totalPages: number;
  totalElements: number; // IMPORTANT for DataGrid rowCount
  last: boolean;
  size: number;
  number: number; // Current page number (0-indexed)
  sort: {
    sorted: boolean;
    unsorted: boolean;
    empty: boolean;
  };
  numberOfElements: number; // Number of elements on the current page
  first: boolean;
  empty: boolean;
}

// Specific type for video list response
export type PaginatedVideoResponse = PaginatedResponse<VideoResponse>;

// Matches backend Video.java VideoStatus enum
export enum VideoStatus {
  UPLOADED = "UPLOADED",
  PROCESSING = "PROCESSING",
  READY = "READY",
  FAILED = "FAILED",
}

// Corresponds to backend VideoResponse DTO + Status
// NOTE: Added 'status' and 'uploadDate' based on Video.java and likely need
// Adjust if backend VideoResponse DTO is different
export type VideoResponse = {
  publicId: string; // Changed from Long to number for TS
  description: string | null; // Allow null description
  fileSize: number; // Changed from Long to number
  status: VideoStatus; // Added based on Video.java entity
  uploadDate: string; // ISO 8601 string from Instant
  duration: number | null; // Added based on Video.java
};

export type UpdateVideoRequest = {
  description: string | null; // Allow null description
};

// --- Video Processing ---
export type EditOptions = {
  cutStartTime?: number | null; // Use number | null for optional fields
  cutEndTime?: number | null;
  mute: boolean; // Required
  targetResolutionHeight?: number | null;
};

// --- Error Handling ---

// Basic structure for RFC 7807 Problem Details
export type ProblemDetail = {
  type?: string; // URL to problem type definition
  title?: string; // Short, human-readable summary
  status?: number; // HTTP status code
  detail?: string; // Human-readable explanation
  instance?: string; // URI identifying the specific occurrence
  timestamp?: string; // ISO 8601 timestamp
  errors?: Record<string, string>; // Optional map for validation errors
};