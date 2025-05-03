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