// src/types.ts

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

// --- Frontend Specific ---

// Used internally after fetching download blob
export type VideoDownloadDetails = {
  blob: Blob;
  filename: string;
  mimeType: string;
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