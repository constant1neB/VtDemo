import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Box from '@mui/material/Box';
import Snackbar from '@mui/material/Snackbar';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { processVideo } from '../api/videoApi';
import { VideoResponse, EditOptions, ProblemDetail } from '../types';
import axios from 'axios';

type ProcessVideoDialogProps = {
    open: boolean;
    handleClose: () => void;
    video: VideoResponse | null;
};

function ProcessVideoDialog({ open, handleClose, video }: Readonly<ProcessVideoDialogProps>) {
    const queryClient = useQueryClient();
    const [options, setOptions] = useState<EditOptions>({
        cutStartTime: null,
        cutEndTime: null,
        mute: false,
        targetResolutionHeight: null,
    });
    const [startTimeError, setStartTimeError] = useState<string>('');
    const [endTimeError, setEndTimeError] = useState<string>('');
    const [resolutionError, setResolutionError] = useState<string>('');

    const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
    const [snackbarMessage, setSnackbarMessage] = useState<string>("");

    // Reset form when dialog opens or video changes
    useEffect(() => {
        if (open) {
            setOptions({
                cutStartTime: null,
                cutEndTime: null,
                mute: false,
                targetResolutionHeight: null,
            });
            setStartTimeError('');
            setEndTimeError('');
            setResolutionError('');
        }
    }, [open, video]);

    const { mutate: processMutate, isPending: isProcessing } = useMutation<
        void,
        Error,
        { id: number; options: EditOptions }
    >({
        mutationFn: async (vars): Promise<void> => {
            await processVideo(vars.id, vars.options);
        },
        onSuccess: (_, vars) => {
            setSnackbarMessage(`Video processing started for ID: ${vars.id}. Status will update soon.`);
            setSnackbarOpen(true);
            void queryClient.invalidateQueries({ queryKey: ['videos'] });
            handleClose();
        },
        onError: (error: Error, vars) => {
            console.error(`Error starting processing for video ID ${vars.id}:`, error);
            let message = `Processing failed: ${error.message} (ID: ${vars.id})`;
            const videoIdMsg = `(ID: ${vars.id})`;

            if (axios.isAxiosError(error) && error.response) {
                const status = error.response.status;
                const problem = error.response.data as ProblemDetail | undefined;

                if (status === 400) {
                    const errors = problem?.errors;
                    if (errors && Object.keys(errors).length > 0) {
                        const errorDetails = Object.entries(errors)
                            .map(([field, msg]) => `${field}: ${msg}`)
                            .join(', ');
                        message = `Processing failed: ${errorDetails} ${videoIdMsg}`;
                    } else {
                        message = `Processing failed: ${problem?.detail ?? 'Invalid options.'} ${videoIdMsg}`;
                    }
                } else if (status === 409) {
                    message = `Processing failed: ${problem?.detail ?? 'Video is already processing or in a conflicting state.'} ${videoIdMsg}`;
                } else if (status === 403) {
                    message = `Processing failed: Permission denied. ${videoIdMsg}`;
                } else if (status === 404) {
                    message = `Processing failed: Video not found. ${videoIdMsg}`;
                } else {
                    message = `Processing failed: ${problem?.detail ?? error.message} (Status: ${status}) ${videoIdMsg}`;
                }
            }

            setSnackbarMessage(message);
            setSnackbarOpen(true);
        },
    });

    const validateAndSetNumber = (
        value: string,
        setter: (val: number | null) => void,
        errorSetter: (msg: string) => void,
        fieldName: string,
        minValue: number | null = 0
    ): boolean => {
        errorSetter('');
        if (value === '') {
            setter(null);
            return true;
        }
        const num = parseFloat(value);
        if (isNaN(num)) {
            errorSetter(`${fieldName} must be a number.`);
            setter(null);
            return false;
        }
        if (minValue !== null && num < minValue) {
            errorSetter(`${fieldName} must be ${minValue} or greater.`);
            setter(null);
            return false;
        }
        setter(num);
        return true;
    };


    const handleStartTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const valid = validateAndSetNumber(event.target.value, (val) => setOptions(prev => ({...prev, cutStartTime: val})), setStartTimeError, "Start Time");
        if (valid && endTimeError.includes('greater than Start Time')) {
            validateTimes();
        }
    };

    const handleEndTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const valid = validateAndSetNumber(event.target.value, (val) => setOptions(prev => ({...prev, cutEndTime: val})), setEndTimeError, "End Time");
        if (valid) {
            validateTimes();
        }
    };

    const handleResolutionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        validateAndSetNumber(event.target.value, (val) => setOptions(prev => ({...prev, targetResolutionHeight: val})), setResolutionError, "Resolution Height", 144);
    };

    const handleMuteChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setOptions(prev => ({ ...prev, mute: event.target.checked }));
    };

    const validateTimes = (): boolean => {
        const startTime = options.cutStartTime;
        const endTime = options.cutEndTime;

        if (endTimeError.includes('greater than Start Time')) {
            setEndTimeError('');
        }

        if (typeof startTime === 'number' && typeof endTime === 'number' && endTime <= startTime) {
            setEndTimeError('End Time must be greater than Start Time.');
            return false;
        }
        if (typeof startTime === 'number' && typeof endTime === 'number' && endTime > startTime) {
            setEndTimeError('');
        }
        return true;
    };


    const handleProcessSubmit = () => {
        if (!video) return;
        const timesValid = validateTimes();
        const individualFieldsValid = !startTimeError && !endTimeError && !resolutionError;

        if (timesValid && individualFieldsValid) {
            processMutate({ id: video.id, options });
        } else {
            setSnackbarMessage("Please fix the errors in the form before submitting.");
            setSnackbarOpen(true);
        }
    };

    // No need for separate prop variables anymore

    return (
        <>
            <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
                <DialogTitle>Process Video (ID: {video?.id})</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Apply editing options. Leave fields blank to keep original values (except Mute).
                    </Typography>
                    <Box component="form" noValidate autoComplete="off" sx={{ mt: 1 }}>
                        <TextField
                            margin="dense"
                            id="cutStartTime"
                            label="Cut Start Time (seconds)"
                            type="number"
                            fullWidth
                            variant="outlined"
                            value={options.cutStartTime ?? ''}
                            onChange={handleStartTimeChange}
                            disabled={isProcessing}
                            error={!!startTimeError}
                            helperText={startTimeError || "e.g., 10.5 (leave blank for no cut)"}
                            // Use slotProps.htmlInput
                            slotProps={{
                                htmlInput: {
                                    inputMode: 'numeric',
                                    pattern: '[0-9]*(.[0-9]+)?',
                                    // step: '0.1' // Optional step
                                }
                            }}
                        />
                        <TextField
                            margin="dense"
                            id="cutEndTime"
                            label="Cut End Time (seconds)"
                            type="number"
                            fullWidth
                            variant="outlined"
                            value={options.cutEndTime ?? ''}
                            onChange={handleEndTimeChange}
                            disabled={isProcessing}
                            error={!!endTimeError}
                            helperText={endTimeError || "e.g., 60 (leave blank for no cut)"}
                            // Use slotProps.htmlInput
                            slotProps={{
                                htmlInput: {
                                    inputMode: 'numeric',
                                    pattern: '[0-9]*(.[0-9]+)?',
                                    // step: '0.1' // Optional step
                                }
                            }}
                        />
                        <TextField
                            margin="dense"
                            id="targetResolutionHeight"
                            label="Target Resolution Height"
                            type="number"
                            fullWidth
                            variant="outlined"
                            value={options.targetResolutionHeight ?? ''}
                            onChange={handleResolutionChange}
                            disabled={isProcessing}
                            error={!!resolutionError}
                            helperText={resolutionError || "e.g., 720 or 480 (leave blank for original)"}
                            // Use slotProps.htmlInput
                            slotProps={{
                                htmlInput: {
                                    inputMode: 'numeric',
                                    pattern: '[0-9]*',
                                    min: '144' // HTML5 min attribute
                                }
                            }}
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={options.mute}
                                    onChange={handleMuteChange}
                                    name="mute"
                                    disabled={isProcessing}
                                />
                            }
                            label="Mute Audio"
                            sx={{ mt: 1, display: 'block' }}
                        />
                        {isProcessing && <CircularProgress size={24} sx={{ display: 'block', margin: '10px auto' }} />}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} disabled={isProcessing}>Cancel</Button>
                    <Button onClick={handleProcessSubmit} variant="contained" disabled={isProcessing}>
                        Start Processing
                    </Button>
                </DialogActions>
            </Dialog>
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={6000}
                onClose={() => setSnackbarOpen(false)}
                message={snackbarMessage}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            />
        </>
    );
}

export default ProcessVideoDialog;