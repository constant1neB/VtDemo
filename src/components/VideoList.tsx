import React, {useEffect, useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {deleteVideo, downloadOriginalVideo, downloadVideo, listVideos} from "../api/videoApi";
import {formatDate, formatFileSize} from '../utils/formatters';
import {DataGrid, GridColDef, GridRenderCellParams, GridToolbar, GridValidRowModel} from "@mui/x-data-grid";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import {CircularProgress, Dialog, DialogContent, IconButton, Snackbar, Tooltip, Typography} from "@mui/material";
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import DownloadIcon from '@mui/icons-material/Download';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import VideoSettingsIcon from '@mui/icons-material/VideoSettings';
import CloseIcon from '@mui/icons-material/Close';
import UploadVideo from "./UploadVideo";
import EditVideoDescriptionDialog from "./EditVideoDescriptionDialog";
import ProcessVideoDialog from "./ProcessVideoDialog";
import {VideoResponse, VideoStatus} from "../types";
import {AxiosResponse} from "axios";
import {parseApiError} from '../utils/errorUtils';


interface VideoRowModel extends GridValidRowModel, VideoResponse {
}

type VideoListProps = {
    logOut: () => void;
};

const getStatusChipProps = (status: VideoStatus) => {
    switch (status) {
        case VideoStatus.READY:
            return {
                color: 'success.contrastText',
                backgroundColor: 'success.main',
            };
        case VideoStatus.PROCESSING:
            return {
                color: 'info.contrastText',
                backgroundColor: 'info.main',
            };
        case VideoStatus.FAILED:
            return {
                color: 'error.contrastText',
                backgroundColor: 'error.main',
            };
        case VideoStatus.UPLOADED:
        default:
            return {
                color: 'text.primary',
                backgroundColor: 'action.disabledBackground', // Greyish default
            };
    }
};


const VideoList: React.FC<VideoListProps> = ({logOut}) => {
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
    const [downloadingLatestId, setDownloadingLatestId] = useState<string | null>(null);
    const [downloadingOriginalId, setDownloadingOriginalId] = useState<string | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [currentVideoToEdit, setCurrentVideoToEdit] = useState<VideoResponse | null>(null);
    const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false);
    const [currentVideoToProcess, setCurrentVideoToProcess] = useState<VideoResponse | null>(null);
    const [isPlayerOpen, setIsPlayerOpen] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [isLoadingVideo, setIsLoadingVideo] = useState(false);
    const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

    const queryClient = useQueryClient();

    // Fetch videos using React Query with polling for processing status
    const {data: videos, error, isLoading: isFetchingVideos} = useQuery<VideoResponse[], Error>({
        queryKey: ["videos"],
        queryFn: listVideos,
        staleTime: 1000 * 30, // Data fresh for 30s
        refetchInterval: (query) => {
            const data = query.state.data;
            const isAnyProcessing = data?.some(v => v.status === VideoStatus.PROCESSING) ?? false;
            if (isAnyProcessing) {
                console.log("Polling video status (processing detected)...");
                return 5000; // Poll every 5 seconds
            }
            return false; // Stop polling
        },
        refetchIntervalInBackground: false, // Don't poll if tab inactive
        placeholderData: (previousData) => previousData,
    });

    // --- Delete Mutation ---
    const {mutate: deleteMutate, isPending: isDeleting} = useMutation<
        void,
        Error,
        string
    >({
        mutationFn: async (publicId: string): Promise<void> => {
            await deleteVideo(publicId);
        },
        onSuccess: (_data, publicId) => { // _data is void here
            setSnackbarMessage(`Video (ID: ${publicId.substring(0, 8)}...) deleted.`);
            setSnackbarOpen(true);
            void queryClient.invalidateQueries({queryKey: ["videos"]});
        },
        onError: (error: Error, publicId) => {
            const message = parseApiError(error, `Failed to delete video (ID: ${publicId.substring(0, 8)}...).`);
            setSnackbarMessage(message);
            setSnackbarOpen(true);
        },
    });


    const triggerBlobDownload = (response: AxiosResponse<Blob>, defaultFilename: string) => {
        const url = window.URL.createObjectURL(response.data);
        const link = document.createElement('a');
        link.href = url;
        const contentDisposition = response.headers['content-disposition'];
        let downloadFilename = defaultFilename;
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename\*?=['"]?([^'";]+)['"]?/i);
            if (filenameMatch?.[1]) {
                try {
                    downloadFilename = decodeURIComponent(filenameMatch[1]);
                } catch (decodeError) {
                    console.warn("Could not decode filename:", filenameMatch[1], decodeError);
                    downloadFilename = filenameMatch[1];
                }
            }
        }
        link.setAttribute('download', downloadFilename);
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            console.debug(`Revoked object URL for: ${downloadFilename}`);
        }, 100);
        setSnackbarMessage(`Download started: ${downloadFilename}`);
        setSnackbarOpen(true);
    }

    const handleEdit = (video: VideoResponse) => {
        setCurrentVideoToEdit(video);
        setIsEditDialogOpen(true);
    };

    const handleDownloadLatest = async (publicId: string, status: VideoStatus) => {
        if (status !== VideoStatus.READY && status !== VideoStatus.UPLOADED) {
            setSnackbarMessage("Latest version not ready/available for download.");
            setSnackbarOpen(true);
            return;
        }
        setDownloadingLatestId(publicId);
        setSnackbarMessage(`Preparing latest download...`);
        setSnackbarOpen(true);
        try {
            const response = await downloadVideo(publicId);
            triggerBlobDownload(response, `latest-${publicId.substring(0, 8)}.mp4`);
        } catch (err: unknown) {
            const message = parseApiError(err, `Failed to download latest video`);
            setSnackbarMessage(message);
            setSnackbarOpen(true);
        } finally {
            setDownloadingLatestId(null);
        }
    };
    const handlePlayOriginalClick = async (publicId: string) => {
        if (isLoadingVideo) return;
        setPlayingVideoId(publicId);
        setIsLoadingVideo(true);
        setVideoUrl(null);
        setIsPlayerOpen(false);

        try {
            const response = await downloadOriginalVideo(publicId);

            const url = URL.createObjectURL(response.data);
            setVideoUrl(url);
            setIsPlayerOpen(true);

        } catch (err: unknown) {
            const message = parseApiError(err, `Failed to load original video`);
            setSnackbarMessage(message);
            setSnackbarOpen(true);
        } finally {
            setIsLoadingVideo(false);
            setPlayingVideoId(null);
        }
    };

    const handleClosePlayer = () => {
        setIsPlayerOpen(false);
        if (videoUrl) {
            URL.revokeObjectURL(videoUrl);
            console.debug("Revoked video object URL on close");
        }
        setVideoUrl(null);
    };

    const handleDownloadOriginal = async (publicId: string) => {
        setDownloadingOriginalId(publicId);
        setSnackbarMessage(`Preparing original download...`);
        setSnackbarOpen(true);
        try {
            const response = await downloadOriginalVideo(publicId);
            triggerBlobDownload(response, `original-${publicId.substring(0, 8)}.mp4`);
        } catch (err: unknown) {
            const message = parseApiError(err, `Failed to download original video`);
            setSnackbarMessage(message);
            setSnackbarOpen(true);
        } finally {
            setDownloadingOriginalId(null);
        }
    };

    const handleProcess = (video: VideoResponse) => {
        setCurrentVideoToProcess(video);
        setIsProcessDialogOpen(true);
    };

    const handleDeleteClick = (publicId: string) => {
        if (window.confirm(`Delete video (ID: ${publicId.substring(0, 8)}...)? Cannot be undone.`)) {
            deleteMutate(publicId);
        }
    };

    const handleLogout = () => {
        if (window.confirm("Log out?")) {
            logOut();
        }
    };

    const handleCloseEditDialog = () => {
        setIsEditDialogOpen(false);
        setCurrentVideoToEdit(null);
    };
    const handleCloseProcessDialog = () => {
        setIsProcessDialogOpen(false);
        setCurrentVideoToProcess(null);
    };

    useEffect(() => {
        return () => {
            if (videoUrl) {
                URL.revokeObjectURL(videoUrl);
                console.debug("Revoked video object URL on component unmount");
            }
        };
    }, [videoUrl]);

    const columns: GridColDef<VideoRowModel>[] = [
        {
            field: "playOriginal",
            headerName: "Original",
            width: 90,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params: GridRenderCellParams<VideoRowModel>) => {
                const isLoadingThisVideo = isLoadingVideo && playingVideoId === params.row.publicId;
                return (
                    <Tooltip title="Play Original Video">
                        <span>
                            <IconButton
                                aria-label="play original video"
                                size="medium"
                                onClick={() => handlePlayOriginalClick(params.row.publicId)}
                                disabled={isLoadingThisVideo || isDeleting}
                            >
                                {isLoadingThisVideo ? <CircularProgress size={24}/> : <PlayCircleIcon/>}
                            </IconButton>
                        </span>
                    </Tooltip>
                );
            }
        },
        {
            field: "description", headerName: "Description", flex: 1, minWidth: 250,
            valueGetter: (_value, row) => row.description ?? "---",
            renderCell: (params) => <Box sx={{whiteSpace: 'normal', lineHeight: 'normal', py: 1}}>{params.value}</Box>
        },
        {
            field: "fileSize",
            headerName: "Size",
            width: 120,
            valueFormatter: (v) => formatFileSize(v),
            align: 'center',
            headerAlign: 'center'
        },
        {
            field: "uploadDate",
            headerName: "Uploaded",
            width: 180,
            valueGetter: (_v, row) => row.uploadDate,
            renderCell: (params) => formatDate(params.value),
            align: 'center',
            headerAlign: 'center'
        },
        {
            field: "status",
            headerName: "Status",
            width: 120,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params: GridRenderCellParams<VideoRowModel>) => {
                const chipProps = getStatusChipProps(params.row.status);
                return (
                    <Typography variant="caption" sx={{
                        fontWeight: 'bold',
                        px: 1, py: 0.5, borderRadius: '4px',
                        color: chipProps.color,
                        backgroundColor: chipProps.backgroundColor,
                    }}>
                        {params.row.status}
                    </Typography>
                );
            }
        },
        {
            field: "actions",
            headerName: "Actions",
            width: 220,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params: GridRenderCellParams<VideoRowModel>) => {
                const video = params.row;
                const isDownloadingLatest = downloadingLatestId === video.publicId;
                const isDownloadingOriginal = downloadingOriginalId === video.publicId;
                const isAnyDownloadingForRow = isDownloadingLatest || isDownloadingOriginal;
                const isProcessing = video.status === VideoStatus.PROCESSING;
                const isActionDisabled = isDeleting || isAnyDownloadingForRow || isProcessing;

                const canDownloadLatest = video.status === VideoStatus.READY || video.status === VideoStatus.UPLOADED;
                const canProcess =
                    video.status === VideoStatus.UPLOADED ||
                    video.status === VideoStatus.READY ||
                    video.status === VideoStatus.FAILED;

                return (
                    <Stack direction="row" spacing={0.5} alignItems="center">
                        <Tooltip title="Edit Description">
                            <span>
                                <IconButton aria-label="edit description" size="medium"
                                            onClick={() => handleEdit(video)} disabled={isActionDisabled || isDeleting}>
                                    <EditIcon fontSize="inherit"/>
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title="Download Latest">
                            <span>
                                <IconButton aria-label="download latest video" size="medium"
                                            onClick={() => handleDownloadLatest(video.publicId, video.status)}
                                            disabled={isActionDisabled || !canDownloadLatest || isDeleting}>
                                    {isDownloadingLatest ? <CircularProgress size={20}/> :
                                        <DownloadIcon fontSize="inherit"/>}
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title="Download Original">
                             <span>
                                <IconButton aria-label="download original video" size="medium"
                                            onClick={() => handleDownloadOriginal(video.publicId)}
                                            disabled={isActionDisabled || isDeleting}>
                                    {isDownloadingOriginal ? <CircularProgress size={20}/> :
                                        <CloudDownloadIcon fontSize="inherit"/>}
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title="Edit Video">
                            <span>
                                <IconButton aria-label="process video" size="medium"
                                            onClick={() => handleProcess(video)}
                                            disabled={isActionDisabled || !canProcess || isDeleting}>
                                    <VideoSettingsIcon fontSize="inherit"/>
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title="Delete Video">
                            <span>
                                <IconButton aria-label="delete video" size="medium"
                                            onClick={() => handleDeleteClick(video.publicId)}
                                            disabled={isActionDisabled || isDeleting}>
                                    <DeleteIcon fontSize="inherit"/>
                                </IconButton>
                            </span>
                        </Tooltip>
                    </Stack>
                );
            }
        },
    ];

    // --- Render Logic ---
    if (isFetchingVideos && !videos) { // Initial load
        return <Box sx={{display: 'flex', justifyContent: 'center', mt: 4}}><CircularProgress/></Box>;
    }
    if (error) { // Fetching error
        return <Typography color="error" sx={{mt: 4}}>Error fetching videos: {error.message}</Typography>;
    }
    const videoData = videos ?? []; // Ensure we have an array
    const isGridLoading = isFetchingVideos || isDeleting || !!downloadingLatestId || !!downloadingOriginalId; // Grid overlay loading state

    return (
        <Box sx={{display: 'flex', flexDirection: 'column', height: 'calc(100vh - 150px)', width: '100%'}}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{mb: 2, px: 1}}>
                <Button variant="contained" onClick={() => setIsUploadDialogOpen(true)} disabled={isGridLoading}>Upload
                    New Video</Button>
                <Button variant="outlined" onClick={handleLogout} disabled={isGridLoading}>Log out</Button>
            </Stack>
            <Box sx={{flexGrow: 1, width: '100%'}}>
                <DataGrid
                    rows={videoData}
                    columns={columns}
                    getRowId={(row) => row.publicId}
                    disableRowSelectionOnClick
                    slots={{toolbar: GridToolbar}}
                    initialState={{
                        pagination: {paginationModel: {pageSize: 10, page: 0}},
                        sorting: {sortModel: [{field: 'uploadDate', sort: 'desc'}]},
                        columns: {columnVisibilityModel: {publicId: false}}
                    }}
                    pageSizeOptions={[10, 25, 50]}
                    rowHeight={70}
                    loading={isGridLoading}
                    sx={{
                        border: 0,
                        '& .MuiDataGrid-columnHeaderTitle': {fontWeight: 'bold'}, // Style header titles
                        '& .MuiDataGrid-cell': {
                            display: 'flex',
                            alignItems: 'center',
                            whiteSpace: 'normal !important',
                            wordWrap: 'break-word !important',
                            lineHeight: '1.4 !important',
                            py: 1
                        },
                        '& .MuiDataGrid-actionsCell': {
                            justifyContent: 'center'
                        }
                    }}
                />
            </Box>
            {/* Dialogs */}
            <UploadVideo open={isUploadDialogOpen} handleClose={() => setIsUploadDialogOpen(false)}/>
            {currentVideoToEdit &&
                <EditVideoDescriptionDialog open={isEditDialogOpen} handleClose={handleCloseEditDialog}
                                            video={currentVideoToEdit}/>}
            {currentVideoToProcess &&
                <ProcessVideoDialog open={isProcessDialogOpen} handleClose={handleCloseProcessDialog}
                                    video={currentVideoToProcess}/>}
            <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={() => setSnackbarOpen(false)}
                      message={snackbarMessage} anchorOrigin={{vertical: 'bottom', horizontal: 'center'}}/>
            <Dialog
                open={isPlayerOpen}
                onClose={handleClosePlayer}
                sx={{
                    '& .MuiBackdrop-root': {
                        transition: 'none !important',
                    },
                    '& .MuiDialog-paper': {
                        transition: 'none !important',
                        bgcolor: 'black',
                        margin: 0,
                        maxWidth: '100vw',
                        maxHeight: '100vh',
                        width: 'auto',
                        height: 'auto',
                        boxShadow: 'none',
                        overflow: 'hidden',
                        position: 'relative',
                    }
                }}
            >
                <DialogContent sx={{p: 0, overflow: 'hidden', lineHeight: 0}}>
                    <IconButton
                        aria-label="close video player"
                        onClick={handleClosePlayer}
                        sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            color: 'rgba(255, 255, 255, 0.7)',
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            zIndex: 1301,
                            '&:hover': {
                                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                color: 'white',
                            }
                        }}
                    >
                        <CloseIcon/>
                    </IconButton>

                    {/* Video or Loader */}
                    {videoUrl ? (
                        <video
                            key={videoUrl}
                            src={videoUrl}
                            controls
                            style={{
                                display: 'block',
                                maxWidth: '100vw',
                                maxHeight: '100vh',
                                width: 'auto',
                                height: 'auto',
                                outline: 'none'
                            }}
                            onError={(e) => {
                                console.error("Video playback error:", e);
                                setSnackbarMessage("Error playing video.");
                                setSnackbarOpen(true);
                                handleClosePlayer();
                            }}
                        />
                    ) : (
                        // Centered Spinner if loading
                        <Box sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            width: '200px',
                            height: '200px'
                        }}>
                            {isLoadingVideo && <CircularProgress sx={{color: 'white'}}/>}
                        </Box>
                    )}
                </DialogContent>
            </Dialog>
        </Box>
    );
}

export default VideoList;