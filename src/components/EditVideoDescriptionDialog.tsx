import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Snackbar from '@mui/material/Snackbar';
import CircularProgress from '@mui/material/CircularProgress';
import { updateVideoDescription } from '../api/videoApi';
import { VideoResponse, UpdateVideoRequest } from '../types';
import {parseApiError} from "../utils/errorUtils.ts";

type EditVideoDescriptionDialogProps = {
    open: boolean;
    handleClose: () => void;
    video: VideoResponse | null;
};

function EditVideoDescriptionDialog({ open, handleClose, video }: Readonly<EditVideoDescriptionDialogProps>) {
    const queryClient = useQueryClient();
    const [description, setDescription] = useState<string>('');
    const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
    const [snackbarMessage, setSnackbarMessage] = useState<string>("");

    // Update local state when the video prop changes (dialog opens)
    useEffect(() => {
        if (video) {
            setDescription(video.description ?? ''); // Set initial description
        } else {
            setDescription(''); // Reset if no video
        }
    }, [video, open]); // Depend on video and open state

    const { mutate: updateMutate, isPending: isUpdating } = useMutation<
        VideoResponse,
        Error,
        { publicId: string; data: UpdateVideoRequest }
    >({
        mutationFn: (vars) => updateVideoDescription(vars.publicId, vars.data),
        onSuccess: async () => {
            setSnackbarMessage(`Description updated`);
            setSnackbarOpen(true);

            try {
                // Await the invalidation to ensure it completes
                await queryClient.invalidateQueries({
                    queryKey: ['videos'],
                    refetchType: 'active', // Only refetch active queries
                });
                // Optionally update single item cache if needed:
                // queryClient.setQueryData(['videos', updatedVideo.id], updatedVideo);
            } catch (error) {
                console.error('Error invalidating queries:', error);
                setSnackbarMessage('Description updated but failed to refresh the list');
                setSnackbarOpen(true);
            } finally {
                handleClose();
            }
        },
        onError: (error: Error) => {
            console.error(`Error updating description for video ID ${video?.publicId}:`, error);
            const message = parseApiError(error, `Update failed`);
            setSnackbarMessage(message);
            setSnackbarOpen(true);
        },
    });

    const handleDescriptionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setDescription(event.target.value);
    };

    const handleSave = () => {
        if (!video?.publicId) return;
        updateMutate({ publicId: video.publicId, data: { description } });
    };

    return (
        <>
            <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
                <DialogTitle>Edit Description</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="description"
                        label="Video Description"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={description}
                        onChange={handleDescriptionChange}
                        disabled={isUpdating}
                        multiline
                        rows={4}
                        sx={{ mt: 1 }}
                    />
                    {isUpdating && <CircularProgress size={24} sx={{ display: 'block', margin: '10px auto' }} />}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} disabled={isUpdating}>Cancel</Button>
                    <Button onClick={handleSave} variant="contained" disabled={isUpdating}>
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={4000}
                onClose={() => setSnackbarOpen(false)}
                message={snackbarMessage}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            />
        </>
    );
}

export default EditVideoDescriptionDialog;