import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listVideos, deleteVideo, downloadVideo } from "../api/videoApi";
import { formatFileSize, formatDuration, formatDate } from '../utils/formatters';
import {
    DataGrid,
    GridColDef,
    GridRenderCellParams,
    GridToolbar,
    GridValidRowModel
} from "@mui/x-data-grid";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import { Snackbar, Chip, CircularProgress, Typography, IconButton } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import DownloadIcon from "@mui/icons-material/Download";
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import UploadVideo from "./UploadVideo";
import EditVideoDescriptionDialog from "./EditVideoDescriptionDialog";
import ProcessVideoDialog from "./ProcessVideoDialog";
import { VideoResponse, VideoStatus } from "../types";
import { AxiosResponse } from "axios";
import { parseApiError } from '../utils/errorUtils';


interface VideoRowModel extends GridValidRowModel, VideoResponse {}

type VideoListProps = {
    logOut?: () => void;
};

function VideoList({ logOut }: Readonly<VideoListProps>) {
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
    const [downloadingId, setDownloadingId] = useState<number | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [currentVideoToEdit, setCurrentVideoToEdit] = useState<VideoResponse | null>(null);
    const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false);
    const [currentVideoToProcess, setCurrentVideoToProcess] = useState<VideoResponse | null>(null);

    const queryClient = useQueryClient();

    // Fetch videos using React Query
    const { data: videos, error, isLoading} = useQuery<VideoResponse[], Error>({
        queryKey: ["videos"],
        queryFn: listVideos,
        staleTime: 1000 * 60, // Data considered stale after 1 minute
        refetchInterval: 1000 * 15, // Refetch every 15 seconds (adjust as needed)
        // Keep previous data while refetching for smoother UI
        placeholderData: (previousData) => previousData,
    });

    // --- Delete Mutation ---
    const { mutate: deleteMutate, isPending: isDeleting } = useMutation<
        void, // Explicitly void as we wrap the call
        Error,
        number // Pass video ID
    >({
        // Wrap the API call to match the expected void return type
        mutationFn: async (id: number) => {
            await deleteVideo(id);
        },
        onSuccess: (_, deletedVideoId) => {
            setSnackbarMessage(`Video ID ${deletedVideoId} deleted successfully.`);
            setSnackbarOpen(true);
            // Invalidate queries - explicitly ignore promise
            void queryClient.invalidateQueries({ queryKey: ["videos"] });
        },
        onError: (error: Error, deletedVideoId) => {
            console.error(`Error deleting video ID ${deletedVideoId}:`, error);
            // Use the centralized error parser
            const message = parseApiError(error, `Failed to delete video ID ${deletedVideoId}.`);
            setSnackbarMessage(message);
            setSnackbarOpen(true);
        },
    });

    // --- Action Handlers ---
    const handleEdit = (video: VideoResponse) => {
        setCurrentVideoToEdit(video);
        setIsEditDialogOpen(true);
    };

    const handleDownload = async (id: number, status: VideoStatus, filename: string | null) => {
        if (status !== VideoStatus.READY && status !== VideoStatus.UPLOADED) {
            setSnackbarMessage("Video is not ready or available for download.");
            setSnackbarOpen(true);
            return;
        }

        setDownloadingId(id);
        setSnackbarMessage(`Preparing download for video ID: ${id}...`);
        setSnackbarOpen(true);

        try {
            const response: AxiosResponse<Blob> = await downloadVideo(id);
            const url = window.URL.createObjectURL(response.data);
            const link = document.createElement('a');
            link.href = url;

            // --- Improved Filename Logic ---
            const contentDisposition = response.headers['content-disposition'];
            let downloadFilename = `video-${id}.mp4`; // Default fallback

            if (contentDisposition) {
                // More robust regex to handle quotes and potential variations
                const filenameMatch = contentDisposition.match(/filename\*?=['"]?([^'";]+)['"]?/i);
                if (filenameMatch?.[1]) {
                    // Decode URI component for potentially encoded filenames (e.g., UTF-8)
                    try {
                        downloadFilename = decodeURIComponent(filenameMatch[1]);
                    } catch (decodeError) {
                        console.warn("Could not decode filename from Content-Disposition:", filenameMatch[1], decodeError);
                        // Fallback to raw value if decoding fails
                        downloadFilename = filenameMatch[1];
                    }
                }
            } else if (filename) {
                // Sanitize filename from DB if content-disposition is missing
                downloadFilename = filename.replace(/[^a-z0-9._-]/gi, '_').replace(/_{2,}/g, '_');
            }
            // --- End Improved Filename Logic ---

            link.setAttribute('download', downloadFilename);
            document.body.appendChild(link);
            link.click(); // Start download

            // Cleanup after click event loop finishes
            setTimeout(() => {
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                console.debug(`Revoked object URL for video ID ${id}`);
            }, 100); // Small delay ensures download starts

            setSnackbarMessage(`Download started for: ${downloadFilename}`);
            setSnackbarOpen(true);

        } catch (err: unknown) {
            console.error(`Error downloading video ID ${id}:`, err);
            // Use the centralized error parser
            const message = parseApiError(err, `Failed to download video ID ${id}.`);
            setSnackbarMessage(message);
            setSnackbarOpen(true);
        } finally {
            setDownloadingId(null);
        }
    };

    const handleProcess = (video: VideoResponse) => {
        if (video.status !== VideoStatus.READY && video.status !== VideoStatus.UPLOADED) {
            setSnackbarMessage("Video cannot be processed in its current state.");
            setSnackbarOpen(true);
            return;
        }
        setCurrentVideoToProcess(video);
        setIsProcessDialogOpen(true);
    };

    const handleDelete = (id: number, description: string | null) => {
        const videoLabel = description ? `"${description}" (ID: ${id})` : `Video ID: ${id}`;
        if (window.confirm(`Are you sure you want to delete ${videoLabel}? This action cannot be undone.`)) {
            deleteMutate(id);
        }
    };
    // --- End Action Handlers ---

    // --- Close Dialog Handlers ---
    const handleCloseEditDialog = () => {
        setIsEditDialogOpen(false);
        setCurrentVideoToEdit(null);
    };
    const handleCloseProcessDialog = () => {
        setIsProcessDialogOpen(false);
        setCurrentVideoToProcess(null);
    };
    // --- End Close Dialog Handlers ---

    // Define DataGrid Columns using the specific row model type
    const columns: GridColDef<VideoRowModel>[] = [
        { field: "id", headerName: "ID", width: 70 },
        {
            field: "description",
            headerName: "Description",
            width: 250,
            valueGetter: (_value, row) => row.description ?? "---", // Access via row
            // Use GridRenderCellParams with the correct Row type and expected Value type
            renderCell: (params: GridRenderCellParams<VideoRowModel, string>) => (
                // params.value should now be correctly typed as string | null
                // Box children needs ReactNode, string is valid
                <Box sx={{ whiteSpace: 'normal', lineHeight: 'normal', py: 1 }}>
                    {params.value}
                </Box>
            )
        },
        {
            field: "status",
            headerName: "Status",
            width: 120,
            // Use GridRenderCellParams; Value type is VideoStatus | undefined
            renderCell: (params: GridRenderCellParams<VideoRowModel, VideoStatus | undefined>) => {
                const status = params.value; // Get status from params.value (derived from field)
                let color: "default" | "warning" | "success" | "error" | "info" = "default";
                switch (status) {
                    case VideoStatus.PROCESSING: color = "warning"; break;
                    case VideoStatus.READY: color = "success"; break;
                    case VideoStatus.FAILED: color = "error"; break;
                    case VideoStatus.UPLOADED: color = "info"; break;
                }
                // Chip label expects ReactNode, string is valid.
                return <Chip label={status ? String(status) : 'UNKNOWN'} color={color} size="small" />;
            }
        },
        {
            field: "fileSize",
            headerName: "Size",
            width: 110,
            valueFormatter: (value: number | null | undefined) => formatFileSize(value), // Type value explicitly
        },
        {
            field: "duration",
            headerName: "Duration",
            width: 100,
            valueFormatter: (value: number | null | undefined) => formatDuration(value), // Type value explicitly
        },
        {
            field: "uploadDate",
            headerName: "Uploaded",
            width: 180,
            // valueGetter is often safer than valueFormatter for complex types if direct field access is needed
            valueGetter: (_value, row) => row.uploadDate, // Access via row
            renderCell: (params: GridRenderCellParams<VideoRowModel, string | null | undefined>) => formatDate(params.value) // Format the value
        },
        { field: "generatedFilename", headerName: "Filename (Internal)", width: 200 },
        {
            field: "actions",
            headerName: "Actions",
            width: 200,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            // Use GridRenderCellParams with the Row type. Value type doesn't matter here.
            renderCell: (params: GridRenderCellParams<VideoRowModel>) => {
                const video = params.row; // Get the full video object
                const isCurrentDownloading = downloadingId === video.id;
                const canDownload = video.status === VideoStatus.READY || video.status === VideoStatus.UPLOADED;
                const canProcess = video.status === VideoStatus.UPLOADED || video.status === VideoStatus.READY;
                // Disable actions if deleting *any* video or downloading *this* video
                const isActionDisabled = isDeleting || isCurrentDownloading;

                return (
                    <Stack direction="row" spacing={0.5}>
                        <IconButton
                            aria-label="edit description" size="small" title="Edit Description"
                            onClick={() => handleEdit(video)}
                            disabled={isActionDisabled}
                        >
                            <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                            aria-label="download video" size="small" title="Download Video"
                            disabled={isActionDisabled || !canDownload}
                            onClick={() => handleDownload(video.id, video.status, video.generatedFilename)}
                        >
                            {isCurrentDownloading ? <CircularProgress size={20} /> : <DownloadIcon fontSize="small" />}
                        </IconButton>
                        <IconButton
                            aria-label="process video" size="small" title="Process/Edit Video"
                            disabled={isActionDisabled || !canProcess}
                            onClick={() => handleProcess(video)}
                        >
                            <PlayCircleOutlineIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                            aria-label="delete video" size="small" title="Delete Video"
                            onClick={() => handleDelete(video.id, video.description)}
                            disabled={isActionDisabled} // Disable if any delete is pending
                        >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Stack>
                );
            }
        },
    ];

    // --- Render Logic ---
    if (isLoading && !videos) { // Show loading only if there's no previous data
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }
    if (error) {
        return <Typography color="error" sx={{ mt: 4 }}>Error fetching videos: {error.message}</Typography>;
    }
    // Handle case where fetching succeeded but returned no data or videos is undefined/null
    if (!videos) {
        return <Typography sx={{ mt: 4 }}>No videos found or could not load data.</Typography>;
    }

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 150px)',
            width: '100%'
        }}>
            <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 2, px: 1 }}
            >
                <Button
                    variant="contained"
                    onClick={() => setIsUploadDialogOpen(true)}
                    disabled={isDeleting || !!downloadingId}
                >
                    Upload New Video
                </Button>
                {logOut &&
                    <Button
                        variant="outlined"
                        onClick={logOut}
                        disabled={isDeleting || !!downloadingId}
                    >
                        Log out
                    </Button>
                }
            </Stack>

            <Box sx={{ flex: 1 }}>
                <DataGrid
                    rows={videos}
                    columns={columns}
                    getRowId={(row) => row.id}
                    disableRowSelectionOnClick={true}
                    slots={{ toolbar: GridToolbar }}
                    initialState={{
                        pagination: {
                            paginationModel: { pageSize: 10, page: 0 },
                        },
                        sorting: {
                            sortModel: [{ field: 'uploadDate', sort: 'desc' }],
                        },
                    }}
                    pageSizeOptions={[10, 25, 50]}
                    rowHeight={70}
                    sx={{
                        border: 0,
                        '& .MuiDataGrid-columnHeaderTitleContainer': {
                            justifyContent: 'flex-start',
                        },
                        '& .MuiDataGrid-columnHeaderTitle': {
                            overflow: 'visible',
                            lineHeight: 'normal',
                            whiteSpace: 'normal',
                            fontWeight: 'bold',
                        },
                        '& .MuiDataGrid-cell': {
                            whiteSpace: 'normal !important',
                            wordWrap: 'break-word !important',
                            lineHeight: '1.4 !important',
                            alignItems: 'center',
                            py: 1,
                        },
                        '& .MuiDataGrid-cell[data-field="description"]': {
                            alignItems: 'flex-start',
                        },
                    }}
                    loading={isLoading || isDeleting || !!downloadingId}
                />
            </Box>

            {/* Dialogs */}
            <UploadVideo
                open={isUploadDialogOpen}
                handleClose={() => setIsUploadDialogOpen(false)}
            />

            {/* Conditional rendering prevents passing null video */}
            {currentVideoToEdit && (
                <EditVideoDescriptionDialog
                    open={isEditDialogOpen}
                    handleClose={handleCloseEditDialog}
                    video={currentVideoToEdit}
                />
            )}

            {currentVideoToProcess && (
                <ProcessVideoDialog
                    open={isProcessDialogOpen}
                    handleClose={handleCloseProcessDialog}
                    video={currentVideoToProcess}
                />
            )}

            {/* Snackbar */}
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={4000}
                onClose={() => setSnackbarOpen(false)}
                message={snackbarMessage}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            />
        </Box>
    );
}

export default VideoList;