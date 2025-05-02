import React, {useEffect, useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {deleteVideo, downloadOriginalVideo, downloadVideo, listVideos, updateVideoDescription} from "../api/videoApi";
import {formatDate, formatFileSize} from '../utils/formatters';
import {
    DataGrid,
    GridColDef,
    GridPaginationModel,
    GridRenderCellParams,
    GridSortModel,
    GridToolbar,
    GridValidRowModel
} from "@mui/x-data-grid";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import {CircularProgress, Dialog, IconButton, Snackbar, Tooltip, Typography} from "@mui/material";
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import DownloadIcon from '@mui/icons-material/Download';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import VideoSettingsIcon from '@mui/icons-material/VideoSettings';
import CloseIcon from '@mui/icons-material/Close';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ProcessVideoDialog from "./ProcessVideoDialog";
import {PaginatedVideoResponse, UpdateVideoRequest, VideoResponse, VideoStatus} from "../types";
import {AxiosResponse} from "axios";
import {parseApiError} from '../utils/errorUtils';
import {useVideoUpload} from '../hooks/useVideoUpload';

interface VideoRowModel extends GridValidRowModel, VideoResponse {
}

const getStatusChipProps = (status: VideoStatus) => {
    switch (status) {
        case VideoStatus.READY:
            return {color: 'success.contrastText', backgroundColor: 'success.main'};
        case VideoStatus.PROCESSING:
            return {color: 'info.contrastText', backgroundColor: 'info.main'};
        case VideoStatus.FAILED:
            return {color: 'error.contrastText', backgroundColor: 'error.main'};
        case VideoStatus.UPLOADED:
        default:
            return {color: 'text.primary', backgroundColor: 'action.disabledBackground'};
    }
};

const VideoList: React.FC = () => {
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const [downloadingLatestId, setDownloadingLatestId] = useState<string | null>(null);
    const [downloadingOriginalId, setDownloadingOriginalId] = useState<string | null>(null);
    const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false);
    const [currentVideoToProcess, setCurrentVideoToProcess] = useState<VideoResponse | null>(null);
    const [isPlayerOpen, setIsPlayerOpen] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [isLoadingVideo, setIsLoadingVideo] = useState(false);
    const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

    const queryClient = useQueryClient();

    const {fileInputRef, isUploading, handleUploadClick, handleFileChange} = useVideoUpload({
        showSnackbar: (message: string) => {
            setSnackbarMessage(message);
            setSnackbarOpen(true);
        },
    });


    const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
        page: 0,
        pageSize: 10,
    });
    const [sortModel, setSortModel] = useState<GridSortModel>([
        {field: 'uploadDate', sort: 'desc'},
    ]);

    const [queryOptions, setQueryOptions] = useState({
        paginationModel,
        sortModel,
    });

    const {data: pageData, error, isLoading: isFetchingVideos} = useQuery<PaginatedVideoResponse, Error>({
        queryKey: ["videos", queryOptions.paginationModel.page, queryOptions.paginationModel.pageSize, queryOptions.sortModel],
        queryFn: () => listVideos(queryOptions),
        placeholderData: (previousData) => previousData,
        staleTime: 1000 * 15,
        refetchInterval: (query) => {
            const data = query.state.data?.content;
            const isAnyProcessing = data?.some(v => v.status === VideoStatus.PROCESSING) ?? false;
            if (isAnyProcessing) {
                console.log("Polling video status (processing detected)...");
                return 2000;
            }
            return false;
        },
        refetchIntervalInBackground: false,
    });

    useEffect(() => {
        console.log("Pagination or Sort Model Changed:", {paginationModel, sortModel});
        setQueryOptions({paginationModel, sortModel});
    }, [paginationModel, sortModel]);

    const {mutate: updateDescriptionMutate, isPending: isUpdatingDescription} = useMutation<
        VideoResponse,
        Error,
        { publicId: string; data: UpdateVideoRequest }
    >({
        mutationFn: (vars) => updateVideoDescription(vars.publicId, vars.data),
        onSuccess: (updatedVideo) => {
            setSnackbarMessage(`Description updated for video ${updatedVideo.publicId.substring(0, 8)}...`);
            setSnackbarOpen(true);
            void queryClient.invalidateQueries({queryKey: ["videos"]});
        },
        onError: (error: Error, vars) => {
            const message = parseApiError(error, `Failed to update description for video ${vars.publicId.substring(0, 8)}...`);
            setSnackbarMessage(message);
            setSnackbarOpen(true);
        },
    });

    const {mutate: deleteMutate, isPending: isDeleting} = useMutation<
        void,
        Error,
        string
    >({
        mutationFn: async (publicId: string) => {
            await deleteVideo(publicId);
        },
        onSuccess: (_data, publicId) => {
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
            const response = await downloadVideo(publicId); // Use the imported API function
            triggerBlobDownload(response, `latest-${publicId.substring(0, 8)}.mp4`);
        } catch (err: unknown) {
            const message = parseApiError(err, `Failed to download latest video`);
            setSnackbarMessage(message);
            setSnackbarOpen(true);
        } finally {
            setDownloadingLatestId(null);
        }
    };

    const handleEdit = (video: VideoResponse) => {
        if (!video) return;
        const currentDescription = video.description ?? "";
        const newDescription = window.prompt(
            `Enter new description for video (ID: ${video.publicId.substring(0, 8)}...):`,
            currentDescription
        );
        if (newDescription === null || newDescription === currentDescription) {
            console.log("Description edit cancelled or unchanged.");
            return;
        }
        updateDescriptionMutate({publicId: video.publicId, data: {description: newDescription}});
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
                            <IconButton aria-label="play original video" size="medium"
                                        onClick={() => handlePlayOriginalClick(params.row.publicId)}
                                        disabled={isLoadingThisVideo || isDeleting}>
                                {isLoadingThisVideo ? <CircularProgress size={24}/> : <PlayCircleIcon/>}
                            </IconButton>
                        </span>
                    </Tooltip>
                );
            }
        },
        {
            field: "description",
            headerName: "Description",
            flex: 1,
            minWidth: 250,
            valueGetter: (_value, row) => row.description ?? "---",
            renderCell: (params) => <Box sx={{whiteSpace: 'normal', lineHeight: 'normal', py: 1}}>{params.value}</Box>
        },
        {
            field: "editDescription",
            headerName: "Edit",
            width: 60,
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
                const isActionDisabled = isDeleting || isUpdatingDescription || isAnyDownloadingForRow || isProcessing || isUploading;

                return (
                    <Tooltip title="Edit Description">
                        <span>
                            <IconButton
                                aria-label="edit description"
                                size="medium"
                                onClick={() => handleEdit(video)}
                                disabled={isActionDisabled}
                            >
                               <EditIcon fontSize="inherit"/>
                            </IconButton>
                        </span>
                    </Tooltip>
                );
            }
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
            field: "status", headerName: "Status", width: 120, align: 'center', headerAlign: 'center',
            renderCell: (params: GridRenderCellParams<VideoRowModel>) => {
                const chipProps = getStatusChipProps(params.row.status);
                return (
                    <Typography variant="caption" sx={{
                        fontWeight: 'bold',
                        px: 1,
                        py: 0.5,
                        borderRadius: '4px',
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
            width: 190,
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
                const isActionDisabled = isDeleting || isUpdatingDescription || isAnyDownloadingForRow || isProcessing || isUploading; // Include isUploading

                const canDownloadLatest = video.status === VideoStatus.READY || video.status === VideoStatus.UPLOADED;
                const canProcess = video.status === VideoStatus.UPLOADED || video.status === VideoStatus.READY || video.status === VideoStatus.FAILED;

                return (
                    <Stack direction="row" spacing={0.5} alignItems="center">
                        <Tooltip title="Download Latest">
                            <span>
                                <IconButton aria-label="download latest video"
                                            size="medium"
                                            onClick={() => handleDownloadLatest(video.publicId, video.status)}
                                            disabled={!(!isActionDisabled && canDownloadLatest)}>
                                    {isDownloadingLatest ?
                                        <CircularProgress size={20}/> :
                                        <DownloadIcon fontSize="inherit"/>
                                    }
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title="Download Original">
                            <span>
                                <IconButton aria-label="download original video"
                                            size="medium"
                                            onClick={() => handleDownloadOriginal(video.publicId)}
                                            disabled={isActionDisabled}>
                                    {isDownloadingOriginal ?
                                        <CircularProgress size={20}/> :
                                        <CloudDownloadIcon fontSize="inherit"/>
                                    }
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title="Edit Video">
                            <span>
                                <IconButton aria-label="process video" size="medium"
                                            onClick={() => handleProcess(video)}
                                            disabled={!(!isActionDisabled && canProcess)}>
                                    <VideoSettingsIcon fontSize="inherit"/>
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title="Delete Video">
                            <span>
                                <IconButton aria-label="delete video" size="medium"
                                            onClick={() => handleDeleteClick(video.publicId)}
                                            disabled={isActionDisabled}>
                                    <DeleteIcon fontSize="inherit"/>
                                </IconButton>
                            </span>
                        </Tooltip>
                    </Stack>
                );
            }
        },
    ];

    const rowCount = pageData?.totalElements ?? 0;

    const isGridInitiallyLoading = isFetchingVideos && !pageData;
    const isGridVisuallyLoading = isFetchingVideos || isDeleting || isUploading;

    if (isGridInitiallyLoading) {
        return <Box sx={{display: 'flex', justifyContent: 'center', mt: 4}}><CircularProgress/></Box>;
    }
    if (error) {
        return <Typography color="error" sx={{mt: 4}}>Error fetching videos: {error.message}</Typography>;
    }

    return (
        <Box sx={{display: 'flex', flexDirection: 'column', height: 'calc(100vh - 150px)', width: '100%'}}>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} hidden accept=".mp4,video/mp4"/>

            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{mb: 2, px: 1}}>
                <Button
                    variant="contained"
                    onClick={handleUploadClick}
                    disabled={isGridVisuallyLoading}
                    startIcon={isUploading ? <CircularProgress size={20} color="inherit"/> : <UploadFileIcon/>}>
                    Upload New Video
                </Button>
            </Stack>

            <Box sx={{flexGrow: 1, width: '100%'}}>
                <DataGrid
                    rows={pageData?.content ?? []}
                    columns={columns}
                    getRowId={(row) => row.publicId}
                    loading={isGridVisuallyLoading}
                    paginationMode="server"
                    rowCount={rowCount}
                    paginationModel={paginationModel}
                    onPaginationModelChange={setPaginationModel}
                    pageSizeOptions={[10, 25, 50]}
                    sortingMode="server"
                    sortModel={sortModel}
                    onSortModelChange={setSortModel}
                    disableRowSelectionOnClick
                    slots={{toolbar: GridToolbar}}
                    slotProps={{
                        toolbar: {
                            showQuickFilter: true,
                            sx: {
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                paddingTop: 1,
                                paddingLeft: 1,
                                paddingRight: 1,
                                paddingBottom: 0,
                            },
                        },
                    }}
                    initialState={{
                        columns: {columnVisibilityModel: {publicId: false}}
                    }}
                    rowHeight={70}
                    sx={{
                        border: 0,
                        '& .MuiDataGrid-columnHeaderTitle': {fontWeight: 'bold'},
                        '& .MuiDataGrid-cell': {
                            display: 'flex',
                            alignItems: 'center',
                            whiteSpace: 'normal !important',
                            wordWrap: 'break-word !important',
                            lineHeight: '1.4 !important',
                            py: 1
                        },
                        '& .MuiDataGrid-actionsCell': {justifyContent: 'center'}
                    }}
                />
            </Box>

            {currentVideoToProcess &&
                <ProcessVideoDialog open={isProcessDialogOpen} handleClose={handleCloseProcessDialog}
                                    video={currentVideoToProcess}/>}
            <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={() => setSnackbarOpen(false)}
                      message={snackbarMessage} anchorOrigin={{vertical: 'bottom', horizontal: 'center'}}/>
            <Dialog
                open={isPlayerOpen}
                onClose={handleClosePlayer}
                maxWidth={false}
                transitionDuration={0}
                hideBackdrop={true}
                disablePortal={true}
                disableScrollLock={true}
                slotProps={{
                    paper: {
                        style: {
                            backgroundColor: '#000',
                            borderRadius: '4px',
                            overflow: 'hidden',
                            margin: 0,
                            padding: 0,
                            transition: 'none'
                        }
                    },
                    backdrop: {
                        style: {
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            transition: 'none'
                        }
                    },
                    transition: {
                        appear: false,
                        timeout: 0
                    }
                }}
                style={{transition: 'none'}}
            >
                <Box sx={{position: 'relative', transition: 'none'}}>
                    <IconButton
                        aria-label="close video player"
                        onClick={handleClosePlayer}
                        sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            zIndex: 1,
                            color: 'white',
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            transition: 'none',
                            '&:hover': {
                                backgroundColor: 'rgba(0,0,0,0.7)',
                                transition: 'none'
                            }
                        }}
                    >
                        <CloseIcon/>
                    </IconButton>

                    {videoUrl ? (
                        <Box sx={{position: 'relative', '&:focus': {outline: 'none'}}}>
                            <video
                                key={videoUrl}
                                src={videoUrl}
                                controls
                                autoPlay
                                playsInline
                                disablePictureInPicture
                                controlsList="nodownload nofullscreen nopictureinpicture"
                                style={{display: 'block', maxHeight: '90vh', maxWidth: '90vw'}}
                                onError={() => {
                                    setSnackbarMessage("Error loading video");
                                    setSnackbarOpen(true);
                                    handleClosePlayer();
                                }}
                            />
                        </Box>
                    ) : (
                        <Box sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            width: '200px',
                            height: '200px',
                            transition: 'none'
                        }}>
                            {isLoadingVideo && <CircularProgress sx={{color: 'white', transition: 'none'}}/>}
                        </Box>
                    )}
                </Box>
            </Dialog>
        </Box>
    );
}

export default VideoList;