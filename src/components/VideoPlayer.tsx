import React, { useState, useRef, useEffect, ChangeEvent, useCallback } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';

// Icons
import UploadFileIcon from '@mui/icons-material/UploadFile';
import MicOffIcon from '@mui/icons-material/MicOff';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import AspectRatioIcon from '@mui/icons-material/AspectRatio';
import DownloadIcon from '@mui/icons-material/Download';

import { uploadVideo, processVideo, downloadVideo, listVideos } from '../api/videoApi';
import { VideoResponse, EditOptions, VideoStatus, PaginatedVideoResponse } from '../types';
import { parseApiError } from '../utils/errorUtils';
import { AxiosResponse } from 'axios';
import { useVideoPlayer } from '../context/VideoPlayerContext'; // Import the custom hook

const getStatusStyle = (status: VideoStatus | undefined) => {
    switch (status) {
        case VideoStatus.READY: return { color: 'green' };
        case VideoStatus.FAILED: return { color: 'red' };
        default: return { color: 'inherit' };
    }
};

const VideoPlayer: React.FC = () => {
    const { uploadedVideoMeta, videoUrl, currentFile, setPlayerVideo, clearPlayerVideo } = useVideoPlayer();

    console.log("--- Rendering VideoPlayer ---");
    console.log("Context Meta:", uploadedVideoMeta);
    console.log("Context File:", currentFile ? currentFile.name : null);
    console.log("Context URL:", videoUrl);

    const queryClient = useQueryClient();
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [processingType, setProcessingType] = useState<'mute' | 'cut' | 'resize' | null>(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: "" });

    // Refs
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);


    // --- Snackbar ---
    const showSnackbar = useCallback((message: string) => {
        setSnackbar({ open: true, message });
    }, []);

    // --- Polling for Status Update ---
    const { data: currentVideoDataFromPoll } = useQuery<
        PaginatedVideoResponse, Error, VideoResponse | undefined, Readonly<unknown[]>
    >({
        queryKey: ['videoStatusPoll', uploadedVideoMeta?.publicId],
        queryFn: async () => {
            if (!uploadedVideoMeta?.publicId) {
                console.debug("Polling skipped: No processing video ID.");
                return Promise.resolve({ content: [], pageable: { pageNumber: 0, pageSize: 0, offset: 0, paged: false, unpaged: true, sort: { sorted: false, unsorted: true, empty: true } }, totalPages: 0, totalElements: 0, last: true, size: 0, number: 0, sort: { sorted: false, unsorted: true, empty: true }, numberOfElements: 0, first: true, empty: true });
            }
            console.debug(`Polling status for ${uploadedVideoMeta.publicId}...`);
            return listVideos({ paginationModel: { page: 0, pageSize: 10 }, sortModel: [{ field: 'uploadDate', sort: 'desc' }] });
        },
        enabled: !!uploadedVideoMeta && uploadedVideoMeta.status === VideoStatus.PROCESSING,
        refetchInterval: 3000,
        select: (data) => data.content.find(v => v.publicId === uploadedVideoMeta?.publicId),
        retry: 1,
        refetchOnWindowFocus: false,
    });

    // Effect to update CONTEXT state when polled data shows status change
    useEffect(() => {
        if (currentVideoDataFromPoll && uploadedVideoMeta && currentVideoDataFromPoll.publicId === uploadedVideoMeta.publicId) {
            if (uploadedVideoMeta.status === VideoStatus.PROCESSING && currentVideoDataFromPoll.status !== VideoStatus.PROCESSING) {
                console.log(`Status updated via polling for ${currentVideoDataFromPoll.publicId}: ${currentVideoDataFromPoll.status}`);
                setPlayerVideo(currentVideoDataFromPoll, null); // Pass null for file to keep existing one in context
                if (currentVideoDataFromPoll.status === VideoStatus.READY) {
                    showSnackbar(`Video processing finished. Ready for download.`);
                } else if (currentVideoDataFromPoll.status === VideoStatus.FAILED) {
                    showSnackbar(`Video processing failed.`);
                }
            }
            else if (uploadedVideoMeta.status !== currentVideoDataFromPoll.status) {
                setPlayerVideo(currentVideoDataFromPoll, null); // Pass null for file to keep existing one in context
            }
        }
    }, [currentVideoDataFromPoll, uploadedVideoMeta, showSnackbar, setPlayerVideo]);

    // --- Mutations ---
    const { mutate: uploadMutate, isPending: isUploading } = useMutation<
        VideoResponse, Error, { file: File }
    >({
        mutationFn: (vars) => uploadVideo(vars.file, null),
        onSuccess: (data, vars) => {
            setPlayerVideo(data, vars.file); // Set meta, file, and URL in context
            showSnackbar(`Video '${data.publicId.substring(0, 8)}...' uploaded successfully.`);
        },
        onError: (error: Error) => {
            const message = parseApiError(error, "Upload failed.");
            showSnackbar(message);
            clearPlayerVideo();
        },
    });
    const { mutate: processMutate } = useMutation<
        void, Error, { publicId: string; options: EditOptions; type: 'mute' | 'cut' | 'resize' }
    >({
        mutationFn: async (vars) => {
            setIsProcessing(true);
            setProcessingType(vars.type);
            if (uploadedVideoMeta) {
                const optimisticMeta = { ...uploadedVideoMeta, status: VideoStatus.PROCESSING };
                setPlayerVideo(optimisticMeta, null); // Update meta, keep file/URL
            }
            await processVideo(vars.publicId, vars.options);
        },
        onSuccess: (_data, vars) => {
            showSnackbar(`Processing (${vars.type}) started for video ${vars.publicId.substring(0, 8)}...`);
            void queryClient.invalidateQueries({ queryKey: ['videoStatusPoll', vars.publicId] });
        },
        onError: (error: Error, vars) => {
            const message = parseApiError(error, `Processing (${vars.type}) failed for video ${vars.publicId.substring(0, 8)}...`);
            showSnackbar(message);
            if (uploadedVideoMeta) {
                const revertedMeta = { ...uploadedVideoMeta, status: VideoStatus.UPLOADED }; // Revert status
                setPlayerVideo(revertedMeta, null); // Update meta, keep file/URL
            }
            void queryClient.invalidateQueries({ queryKey: ['videoStatusPoll', vars.publicId] });
        },
        onSettled: () => {
            setIsProcessing(false);
            setProcessingType(null);
        },
    });
    const { mutate: downloadMutate, isPending: isDownloading } = useMutation<
        { blob: Blob, filename: string }, Error, { publicId: string }
    >({
        mutationFn: async (vars) => {
            const response = await downloadVideo(vars.publicId);
            const filename = getFilenameFromResponse(response, `processed-${vars.publicId.substring(0, 8)}.mp4`);
            return { blob: response.data, filename };
        },
        onSuccess: (data) => {
            triggerBlobDownload(data.blob, data.filename);
            showSnackbar(`Download started: ${data.filename}`);
        },
        onError: (error: Error, vars) => {
            const message = parseApiError(error, `Download failed for video ${vars.publicId.substring(0, 8)}...`);
            showSnackbar(message);
        },
    });

    // --- Helper Functions ---
    const getFilenameFromResponse = (response: AxiosResponse<Blob>, defaultFilename: string): string => {
        const contentDisposition = response.headers['content-disposition'];
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename\*?=['"]?([^'";]+)['"]?/i);
            if (filenameMatch?.[1]) {
                try { return decodeURIComponent(filenameMatch[1]); }
                catch (decodeError) { console.warn("Could not decode filename:", filenameMatch[1], decodeError); return filenameMatch[1]; }
            }
        }
        return defaultFilename;
    };
    const triggerBlobDownload = (blob: Blob, filename: string) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            console.debug(`Revoked object URL for: ${filename}`);
        }, 150);
    };

    // --- Event Handlers ---
    const handleUploadClick = () => { fileInputRef.current?.click(); };
    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) { uploadMutate({ file }); }
        if (event.target) { event.target.value = ''; }
    };
    const getCutTimes = useCallback((): { startTime: number; endTime: number } | null => {
        const startTimeStr = window.prompt("Enter cut start time (seconds, e.g., 0):", "0");
        if (startTimeStr === null) return null;
        const startTime = parseFloat(startTimeStr);
        if (isNaN(startTime) || startTime < 0) { showSnackbar("Invalid start time. Must be a non-negative number."); return null; }
        const endTimeStr = window.prompt(`Enter cut end time (seconds, must be > ${startTime}):`);
        if (endTimeStr === null) return null;
        const endTime = parseFloat(endTimeStr);
        if (isNaN(endTime) || endTime <= startTime) { showSnackbar("Invalid end time. Must be a number greater than start time."); return null; }
        return { startTime, endTime };
    }, [showSnackbar]);
    const getResizeHeight = useCallback((): number | null => {
        const heightStr = window.prompt("Enter target vertical resolution (e.g., 720, 480):", "480");
        if (heightStr === null) return null;
        const height = parseInt(heightStr, 10);
        if (isNaN(height) || height < 144) { showSnackbar("Invalid resolution. Must be a number (e.g., 144 or higher)."); return null; }
        return height;
    }, [showSnackbar]);
    const handleEditAction = useCallback((type: 'mute' | 'cut' | 'resize') => {
        if (!uploadedVideoMeta?.publicId || isProcessing) return;
        let options: EditOptions | null = null;
        switch (type) {
            case 'mute': options = { mute: true }; break;
            case 'cut': { const times = getCutTimes(); if (!times) return; options = { cutStartTime: times.startTime, cutEndTime: times.endTime, mute: false }; break; }
            case 'resize': { const height = getResizeHeight(); if (height === null) return; options = { targetResolutionHeight: height, mute: false }; break; }
            default: console.error("Invalid edit action type:", type); return;
        }
        processMutate({ publicId: uploadedVideoMeta.publicId, options, type });
    }, [uploadedVideoMeta, isProcessing, processMutate, getCutTimes, getResizeHeight]);
    const handleDownload = useCallback(() => {
        if (!uploadedVideoMeta?.publicId || uploadedVideoMeta.status !== VideoStatus.READY || isProcessing || isDownloading) { console.warn("Download prerequisites not met."); return; }
        downloadMutate({ publicId: uploadedVideoMeta.publicId });
    }, [uploadedVideoMeta, isProcessing, isDownloading, downloadMutate]);


    // --- Render Logic ---
    const currentStatus = uploadedVideoMeta?.status;
    const statusStyle = getStatusStyle(currentStatus);
    const canProcess = !!uploadedVideoMeta && !isProcessing && !isUploading && currentStatus !== VideoStatus.PROCESSING;
    const canDownload = !!uploadedVideoMeta && currentStatus === VideoStatus.READY && !isProcessing && !isUploading && !isDownloading;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3, gap: 3, width: '100%', flexGrow: 1 }}>

            <Paper elevation={3} sx={{ width: '100%', maxWidth: '800px', aspectRatio: '16/9', bgcolor: 'action.disabledBackground', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                {videoUrl ? (
                    <video
                        ref={videoRef}
                        key={videoUrl}
                        src={videoUrl}
                        controls
                        style={{ maxWidth: '100%', maxHeight: '100%', display: 'block' }}
                        preload="metadata"
                        onError={(e) => {
                            console.error("HTML Video Element Error:", e);
                            showSnackbar("Error loading video source.");
                        }}
                    />
                ) : (
                    <Typography variant="h6" color="text.secondary">
                        {isUploading ? 'Uploading...' : 'Upload a video to start'}
                    </Typography>
                )}
            </Paper>

            {uploadedVideoMeta && (
                <Typography variant="caption" sx={{ mt: -2, mb: 1 }}>
                    Status: <strong style={statusStyle}>
                    {currentStatus ?? 'N/A'}
                    {currentStatus === VideoStatus.PROCESSING && <CircularProgress size={12} color="inherit" sx={{ ml: 1 }} />}
                </strong>
                    {uploadedVideoMeta.publicId && ` (ID: ${uploadedVideoMeta.publicId.substring(0, 8)}...)`}
                </Typography>
            )}

            <Stack direction="row" spacing={{ xs: 1, sm: 2 }} justifyContent="center" sx={{ width: '100%', maxWidth: '800px', flexWrap: 'wrap' }}>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} hidden accept=".mp4,video/mp4"/>
                <Tooltip title="Upload New Video"><span><Button variant="contained" startIcon={isUploading ? <CircularProgress size={20} color="inherit" /> : <UploadFileIcon />} onClick={handleUploadClick} disabled={isUploading || isProcessing}>Upload</Button></span></Tooltip>
                <Tooltip title="Mute Audio"><span><IconButton aria-label="mute video" onClick={() => handleEditAction('mute')} disabled={!canProcess || processingType === 'mute'} color="primary">{isProcessing && processingType === 'mute' ? <CircularProgress size={24} /> : <MicOffIcon />}</IconButton></span></Tooltip>
                <Tooltip title="Cut Video"><span><IconButton aria-label="cut video" onClick={() => handleEditAction('cut')} disabled={!canProcess || processingType === 'cut'} color="primary">{isProcessing && processingType === 'cut' ? <CircularProgress size={24} /> : <ContentCutIcon />}</IconButton></span></Tooltip>
                <Tooltip title="Resize Video"><span><IconButton aria-label="resize video" onClick={() => handleEditAction('resize')} disabled={!canProcess || processingType === 'resize'} color="primary">{isProcessing && processingType === 'resize' ? <CircularProgress size={24} /> : <AspectRatioIcon />}</IconButton></span></Tooltip>
                <Tooltip title={canDownload ? "Download Processed Video" : "Video not ready for download"}><span><Button variant="contained" startIcon={isDownloading ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />} onClick={handleDownload} disabled={!canDownload} color="secondary">Download</Button></span></Tooltip>
            </Stack>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                message={snackbar.message}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            />
        </Box>
    );
};

export default VideoPlayer;