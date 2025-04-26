import React, { useState } from "react"; // Added React import
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listVideos, deleteVideo, downloadVideo } from "../api/videoApi"; // API calls use configured client
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
import { Snackbar, CircularProgress, Typography, IconButton } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import DownloadIcon from "@mui/icons-material/Download";
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import UploadVideo from "./UploadVideo";
import EditVideoDescriptionDialog from "./EditVideoDescriptionDialog";
import ProcessVideoDialog from "./ProcessVideoDialog";
import { VideoResponse, VideoStatus } from "../types";
import { AxiosResponse } from "axios";
import { parseApiError } from '../utils/errorUtils'; // Import error parser


interface VideoRowModel extends GridValidRowModel, VideoResponse {}

type VideoListProps = {
    logOut: () => void; // Changed prop name to be more explicit
};

// Use React.FC for component definition with props
const VideoList: React.FC<VideoListProps> = ({ logOut }) => {
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
    const { data: videos, error, isLoading } = useQuery<VideoResponse[], Error>({
        queryKey: ["videos"],
        queryFn: listVideos,
        staleTime: 1000 * 60,
        placeholderData: (previousData) => previousData,
    });

    // --- Delete Mutation ---
    const { mutate: deleteMutate, isPending: isDeleting } = useMutation<
        void,
        Error,
        number
    >({
        mutationFn: async (id: number) => {
            await deleteVideo(id); // Uses the configured apiClient
        },
        onSuccess: () => {
            setSnackbarMessage(`Video deleted successfully.`);
            setSnackbarOpen(true);
            void queryClient.invalidateQueries({ queryKey: ["videos"] });
        },
        onError: () => {
            const message = parseApiError(`Failed to delete video.`);
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

        setSnackbarMessage(`Preparing download`);
        setSnackbarOpen(true);

        try {
            // Uses the configured apiClient
            const response: AxiosResponse<Blob> = await downloadVideo(id);
            const url = window.URL.createObjectURL(response.data);
            const link = document.createElement('a');
            link.href = url;

            const contentDisposition = response.headers['content-disposition'];
            let downloadFilename = `video-${id}.mp4`; // Default fallback

            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename\*?=['"]?([^'";]+)['"]?/i);
                if (filenameMatch?.[1]) {
                    try {
                        downloadFilename = decodeURIComponent(filenameMatch[1]);
                    } catch (decodeError) {
                        console.warn("Could not decode filename from Content-Disposition:", filenameMatch[1], decodeError);
                        downloadFilename = filenameMatch[1];
                    }
                }
            } else if (filename) {
                downloadFilename = filename.replace(/[^a-z0-9._-]/gi, '_').replace(/_{2,}/g, '_');
            }

            link.setAttribute('download', downloadFilename);
            document.body.appendChild(link);
            link.click();

            setTimeout(() => {
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                console.debug(`Revoked object URL for video ID ${id}`);
            }, 100);

            setSnackbarMessage(`Download started for: ${downloadFilename}`);
            setSnackbarOpen(true);

        } catch (err: unknown) {
            console.error(`Error downloading video ID ${id}:`, err);
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

    const handleDelete = (id: number) => {
        if (window.confirm(`Are you sure you want to delete this video? This action cannot be undone.`)) {
            deleteMutate(id);
        }
    };

    const handleLogout = () => {
        if (window.confirm("Are you sure you want to log out?")) {
            logOut();
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

    // Define DataGrid Columns (same as before, just ensure types match VideoRowModel)
    const columns: GridColDef<VideoRowModel>[] = [
        {
            field: "description",
            headerName: "Description",
            flex: 1,
            minWidth: 250,
            valueGetter: (_value, row) => row.description ?? "---",
            renderCell: (params: GridRenderCellParams<VideoRowModel, string>) => (
                <Box sx={{ whiteSpace: 'normal', lineHeight: 'normal', py: 1 }}>
                    {params.value}
                </Box>
            )
        },
        {
            field: "fileSize",
            headerName: "Size",
            width: 110,
            valueFormatter: (value: number | null | undefined) => formatFileSize(value),
        },
        {
            field: "duration",
            headerName: "Duration",
            width: 100,
            valueFormatter: (value: number | null | undefined) => formatDuration(value),
        },
        {
            field: "uploadDate",
            headerName: "Uploaded",
            width: 180,
            valueGetter: (_value, row) => row.uploadDate,
            renderCell: (params: GridRenderCellParams<VideoRowModel, string | null | undefined>) => formatDate(params.value)
        },
        {
            field: "actions",
            headerName: "Actions",
            width: 180,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            renderCell: (params: GridRenderCellParams<VideoRowModel>) => {
                const video = params.row;
                const isCurrentDownloading = downloadingId === video.id;
                const canDownload = video.status === VideoStatus.READY || video.status === VideoStatus.UPLOADED;
                const canProcess = video.status === VideoStatus.UPLOADED || video.status === VideoStatus.READY;
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
                            onClick={() => handleDelete(video.id)}
                            disabled={isActionDisabled}
                        >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Stack>
                );
            }
        },
    ];

    // --- Render Logic ---
    if (isLoading && !videos) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }
    if (error) {
        return <Typography color="error" sx={{ mt: 4 }}>Error fetching videos: {error.message}</Typography>;
    }
    if (!videos) {
        return <Typography sx={{ mt: 4 }}>No videos found or could not load data.</Typography>;
    }

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 150px)', // Adjust height as needed
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
                <Button
                    variant="outlined"
                    onClick={handleLogout}
                    disabled={isDeleting || !!downloadingId}
                >
                    Log out
                </Button>
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
                        '& .MuiDataGrid-columnHeaderTitleContainer': { justifyContent: 'flex-start' },
                        '& .MuiDataGrid-columnHeaderTitle': { overflow: 'visible', lineHeight: 'normal', whiteSpace: 'normal', fontWeight: 'bold' },
                        '& .MuiDataGrid-cell': { whiteSpace: 'normal !important', wordWrap: 'break-word !important', lineHeight: '1.4 !important', alignItems: 'center', py: 1 },
                        '& .MuiDataGrid-cell[data-field="description"]': { alignItems: 'flex-start' },
                    }}
                    loading={isLoading || isDeleting || !!downloadingId}
                />
            </Box>

            {/* Dialogs */}
            <UploadVideo
                open={isUploadDialogOpen}
                handleClose={() => setIsUploadDialogOpen(false)}
            />
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