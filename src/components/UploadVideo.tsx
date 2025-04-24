// src/components/UploadVideo.tsx
import {ChangeEvent, useState} from "react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import LinearProgress from "@mui/material/LinearProgress";
import Snackbar from "@mui/material/Snackbar";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import {uploadVideo} from "../api/videoApi";
import {ProblemDetail, VideoResponse} from "../types";
import axios from "axios";

type UploadVideoProps = {
    open: boolean;
    handleClose: () => void;
};

function UploadVideo({open, handleClose}: Readonly<UploadVideoProps>) {
    const queryClient = useQueryClient();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [description, setDescription] = useState<string>("");
    const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
    const [snackbarMessage, setSnackbarMessage] = useState<string>("");

    const {mutate: uploadMutate, isPending: isUploading} = useMutation<
        VideoResponse,
        Error,
        { file: File; description: string | null }
    >({
        mutationFn: (vars) => uploadVideo(vars.file, vars.description), // Call the API function
        onSuccess: () => {
            void queryClient.invalidateQueries({queryKey: ["videos"]}); // Refetch video list
            setSnackbarMessage("Video uploaded successfully!");
            setSnackbarOpen(true);
            resetFormAndClose(); // Close dialog and clear form on success
        },
        onError: (error: Error) => {
            console.error("Upload error:", error);
            let message;
            if (axios.isAxiosError(error) && error.response) {
                const status = error.response.status;
                // Try to parse ProblemDetail
                const problem = error.response.data as ProblemDetail | undefined;
                const detail = problem?.detail ?? error.message;

                if (status === 400) { // Bad Request (Validation)
                    message = `Upload failed: ${detail}`;
                } else if (status === 413) { // Payload Too Large
                    message = `Upload failed: ${detail || 'File size exceeds limit.'}`;
                } else if (status === 401 || status === 403) { // Unauthorized/Forbidden
                    message = "Upload failed: Authentication error.";
                } else { // Other errors (500 etc)
                    message = `Upload failed: ${detail} (Status: ${status})`;
                }
            } else {
                message = `Upload failed: ${error.message}`;
            }
            setSnackbarMessage(message);
            setSnackbarOpen(true);
            // Keep dialog open on error for user to retry or cancel
        },
    });

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            setSelectedFile(event.target.files[0]);
        } else {
            setSelectedFile(null);
        }
    };

    const handleDescriptionChange = (event: ChangeEvent<HTMLInputElement>) => {
        setDescription(event.target.value);
    };

    const handleUpload = () => {
        if (!selectedFile) {
            setSnackbarMessage("Please select a video file (.mp4).");
            setSnackbarOpen(true);
            return;
        }
        // Pass description as null if empty, otherwise the value
        uploadMutate({file: selectedFile, description: description || null});
    };

    const resetFormAndClose = () => {
        setSelectedFile(null);
        setDescription("");
        handleClose(); // Call the passed-in close handler
    };

    return (
        <>
            <Dialog open={open} onClose={resetFormAndClose} maxWidth="sm" fullWidth>
                <DialogTitle>Upload New Video</DialogTitle>
                <DialogContent>
                    <Box sx={{mt: 2}}>
                        <Button
                            variant="contained"
                            component="label" // Makes the button act like a file input label
                            disabled={isUploading}>
                            Choose MP4 File{/**/}
                            <input
                                type="file"
                                hidden
                                accept=".mp4,video/mp4" // Specify accepted types
                                onChange={handleFileChange}
                            />
                        </Button>
                        {selectedFile && (
                            <Typography sx={{display: 'inline', ml: 2}}>
                                {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                            </Typography>
                        )}
                    </Box>
                    <TextField
                        margin="dense"
                        id="description"
                        label="Description (Optional)"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={description}
                        onChange={handleDescriptionChange}
                        disabled={isUploading}
                        multiline
                        rows={3}
                        sx={{mt: 2}}
                    />
                    {isUploading && <LinearProgress sx={{mt: 2}}/>}
                </DialogContent>
                <DialogActions>
                    <Button onClick={resetFormAndClose} disabled={isUploading}>Cancel</Button>
                    <Button onClick={handleUpload} variant="contained" disabled={!selectedFile || isUploading}>
                        Upload
                    </Button>
                </DialogActions>
            </Dialog>
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={4000}
                onClose={() => setSnackbarOpen(false)}
                message={snackbarMessage}
                anchorOrigin={{vertical: 'bottom', horizontal: 'center'}}
            />
        </>
    );
}

export default UploadVideo;