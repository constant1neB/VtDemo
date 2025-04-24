/**
 * Formats file size in bytes into a human-readable string (KB, MB, GB).
 * @param bytes - The file size in bytes.
 * @param decimals - Number of decimal places (default is 2).
 * @returns Formatted file size string or 'N/A' if input is invalid.
 */
export function formatFileSize(bytes: number | null | undefined, decimals = 2): string {
    if (bytes === null || bytes === undefined || isNaN(bytes) || bytes < 0) {
        return 'N/A';
    }
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Formats duration in seconds into a human-readable string (HH:MM:SS or MM:SS).
 * @param totalSeconds - The duration in seconds.
 * @returns Formatted duration string or 'N/A' if input is invalid.
 */
export function formatDuration(totalSeconds: number | null | undefined): string {
    if (totalSeconds === null || totalSeconds === undefined || isNaN(totalSeconds) || totalSeconds < 0) {
        return 'N/A';
    }

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60); // Use floor to ignore fractions for simple display

    // Pad with leading zeros
    const paddedMinutes = String(minutes).padStart(2, '0');
    const paddedSeconds = String(seconds).padStart(2, '0');

    if (hours > 0) {
        const paddedHours = String(hours).padStart(2, '0');
        return `${paddedHours}:${paddedMinutes}:${paddedSeconds}`;
    } else {
        return `${paddedMinutes}:${paddedSeconds}`;
    }
    // Optional: Handle milliseconds if needed
    // const milliseconds = Math.round((totalSeconds - Math.floor(totalSeconds)) * 1000);
    // if (milliseconds > 0) return `${baseFormat}.${String(milliseconds).padStart(3, '0')}`;
}


/**
 * Formats an ISO date string into a more readable format (e.g., "Oct 27, 2023, 10:30 AM").
 * @param dateString - The date string in ISO 8601 format.
 * @returns Formatted date string or 'N/A' if input is invalid.
 */
export function formatDate(dateString: string | null | undefined): string {
    if (!dateString) {
        return 'N/A';
    }

    try {
        const date = new Date(dateString);
        // Check if the date is valid after parsing
        if (isNaN(date.getTime())) {
            return 'Invalid Date';
        }

        // Use Intl.DateTimeFormat for locale-aware formatting
        const options: Intl.DateTimeFormatOptions = {
            year: 'numeric',
            month: 'short', // e.g., Oct
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit', // e.g., 05
            // Optional: Add timeZoneName: 'short' if needed
        };
        return new Intl.DateTimeFormat(undefined, options).format(date); // undefined uses browser's default locale
        // Alternative simple format: return date.toLocaleString();
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return 'Invalid Date';
    }
}