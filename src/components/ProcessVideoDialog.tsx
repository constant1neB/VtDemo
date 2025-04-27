import {ChangeEvent, useEffect, useState} from 'react';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';
import TextField, {TextFieldProps} from '@mui/material/TextField'; // Keep TextFieldProps import
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Box from '@mui/material/Box';
import Snackbar from '@mui/material/Snackbar';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import {processVideo} from '../api/videoApi';
import {EditOptions, ProblemDetail, VideoResponse} from '../types';
import axios from 'axios';

type ProcessVideoDialogProps = {
    open: boolean;
    handleClose: () => void;
    video: VideoResponse | null;
};

type FieldType = 'startTime' | 'endTime' | 'resolution';

type CustomTextFieldProps = Omit<TextFieldProps, 'variant'> & {
    inputProps?: {
        inputMode?: 'numeric' | 'text' | 'decimal' | 'none' | 'tel' | 'url' | 'email' | 'search';
        pattern?: string;
        min?: string | number;
        step?: string | number;
    };
};

function ProcessVideoDialog({open, handleClose, video}: Readonly<ProcessVideoDialogProps>) {
    const queryClient = useQueryClient();
    const [options, setOptions] = useState<EditOptions>({
        cutStartTime: null,
        cutEndTime: null,
        mute: false,
        targetResolutionHeight: null,
    });
    const [errors, setErrors] = useState({
        startTime: '',
        endTime: '',
        resolution: '',
    });
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: "",
    });

    useEffect(() => {
        if (open) {
            setOptions({cutStartTime: null, cutEndTime: null, mute: false, targetResolutionHeight: null});
            setErrors({startTime: '', endTime: '', resolution: ''});
        }
    }, [open, video]);

    const getFieldDisplayName = (field: FieldType): string => {
        switch (field) {
            case 'startTime':
                return 'Start Time';
            case 'endTime':
                return 'End Time';
            case 'resolution':
                return 'Resolution Height';
            default:
                return field;
        }
    };

    const getOptionFieldName = (field: FieldType): keyof EditOptions => {
        switch (field) {
            case 'startTime':
                return 'cutStartTime';
            case 'endTime':
                return 'cutEndTime';
            case 'resolution':
                return 'targetResolutionHeight';
            default:
                return field as keyof EditOptions;
        }
    };

    const handleProcessSuccess = () => {
        showSnackbar(`Video processing started`);
        handleClose();
        void queryClient.invalidateQueries({queryKey: ['videos']});
    };

    const handleProcessError = (error: Error, publicId: string) => {
        let message;
        if (axios.isAxiosError(error) && error.response) {
            const {status, data} = error.response;
            const problem = data as ProblemDetail | undefined;
            switch (status) {
                case 400:
                    message = get400ErrorMessage(problem, publicId);
                    break;
                case 403:
                    message = `Processing failed: Permission denied. (ID: ${publicId})`;
                    break;
                case 404:
                    message = `Processing failed: Video not found. (ID: ${publicId})`;
                    break;
                case 409:
                    message = `Processing failed: ${problem?.detail ?? 'Video is already processing or in a conflicting state.'} (ID: ${publicId})`;
                    break;
                default:
                    message = `Processing failed: ${problem?.detail ?? error.message} (Status: ${status}) (ID: ${publicId})`;
            }
        } else {
            message = `Processing failed: ${error.message} (ID: ${publicId})`;
        }
        showSnackbar(message);
    };

    const get400ErrorMessage = (problem: ProblemDetail | undefined, publicId: string) => {
        if (problem?.errors && Object.keys(problem.errors).length > 0) {
            const errorDetails = Object.entries(problem.errors).map(([field, msg]) => `${field}: ${msg}`).join(', ');
            return `Processing failed: ${errorDetails} (ID: ${publicId})`;
        }
        return `Processing failed: ${problem?.detail ?? 'Invalid options.'} (ID: ${publicId})`;
    };

    const {mutate: processMutate, isPending: isProcessing} = useMutation({
        mutationFn: async ({publicId, options}: { publicId: string; options: EditOptions }) => {
            await processVideo(publicId, options);
        },
        onSuccess: handleProcessSuccess,
        onError: (error: Error, vars) => handleProcessError(error, vars.publicId),
    });

    const validateNumberInput = (value: string, field: FieldType, minValue: number | null = 0): boolean => {
        const optionField = getOptionFieldName(field);
        let error = '';
        let parsedValue: number | null = null;

        if (value === '') {
            parsedValue = null;
            error = '';
        } else {
            const num = parseFloat(value);
            if (isNaN(num)) {
                error = `${getFieldDisplayName(field)} must be a number.`;
            } else if (minValue !== null && num < minValue) {
                error = `${getFieldDisplayName(field)} must be ${minValue} or greater.`;
                parsedValue = num; // Keep number in state
            } else {
                parsedValue = num;
                error = '';
            }
        }
        setOptions(prev => ({...prev, [optionField]: parsedValue}));
        setErrors(prev => ({...prev, [field]: error}));
        return error === '';
    };

    const handleStartTimeChange = (event: ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        const isValidFormat = validateNumberInput(value, 'startTime');
        if (isValidFormat || value === '' || !isNaN(parseFloat(value))) {
            const newStartTime = value === '' ? null : parseFloat(value);
            validateTimeRange(newStartTime, options.cutEndTime ?? null);
        }
    };

    const handleEndTimeChange = (event: ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        const isValidFormat = validateNumberInput(event.target.value, 'endTime');
        if (isValidFormat || value === '' || !isNaN(parseFloat(value))) {
            const newEndTime = value === '' ? null : parseFloat(value);
            validateTimeRange(options.cutStartTime ?? null, newEndTime);
        }
    };

    const handleResolutionChange = (event: ChangeEvent<HTMLInputElement>) => {
        validateNumberInput(event.target.value, 'resolution', 144);
    };

    const validateTimeRange = (currentStartTime: number | null, currentEndTime: number | null): boolean => {
        let isValid = true;
        let newEndTimeError = '';
        if (typeof currentStartTime === 'number' && typeof currentEndTime === 'number') {
            if (currentEndTime <= currentStartTime) {
                newEndTimeError = 'End Time must be greater than Start Time.';
                isValid = false;
            }
        }
        setErrors(prev => ({...prev, endTime: newEndTimeError}));
        return isValid;
    };

    const handleMuteChange = (event: ChangeEvent<HTMLInputElement>) => {
        setOptions(prev => ({...prev, mute: event.target.checked}));
    };

    const showSnackbar = (message: string) => {
        setSnackbar({open: true, message});
    };

    const handleProcessSubmit = () => {
        if (!video) return;
        const isStartTimeValid = validateNumberInput(String(options.cutStartTime ?? ''), 'startTime');
        const isEndTimeValid = validateNumberInput(String(options.cutEndTime ?? ''), 'endTime');
        const isResolutionValid = validateNumberInput(String(options.targetResolutionHeight ?? ''), 'resolution', 144);
        const isTimeRangeValid = validateTimeRange(options.cutStartTime ?? null, options.cutEndTime ?? null);

        if (isStartTimeValid && isEndTimeValid && isResolutionValid && isTimeRangeValid) {
            console.log("Submitting options:", options);
            const finalOptions: EditOptions = {
                cutStartTime: options.cutStartTime ?? null,
                cutEndTime: options.cutEndTime ?? null,
                mute: options.mute,
                targetResolutionHeight: options.targetResolutionHeight ?? null,
            };
            processMutate({publicId: video.publicId, options: finalOptions});
        } else {
            showSnackbar("Please fix the errors in the form before submitting.");
        }
    };

    const inputProps: Record<FieldType, CustomTextFieldProps> = {
        startTime: {
            id: "cutStartTime",
            label: "Cut Start Time (seconds)",
            value: options.cutStartTime ?? '',
            onChange: handleStartTimeChange,
            error: !!errors.startTime,
            helperText: errors.startTime || "(leave blank for no cut)",
            inputProps: {inputMode: 'decimal', step: '0.1'}
        },
        endTime: {
            id: "cutEndTime",
            label: "Cut End Time (seconds)",
            value: options.cutEndTime ?? '',
            onChange: handleEndTimeChange,
            error: !!errors.endTime,
            helperText: errors.endTime || "(leave blank for no cut)",
            inputProps: {inputMode: 'decimal', step: '0.1'}
        },
        resolution: {
            id: "targetResolutionHeight",
            label: "Target Resolution Height",
            value: options.targetResolutionHeight ?? '',
            onChange: handleResolutionChange,
            error: !!errors.resolution,
            helperText: errors.resolution || "(leave blank for original)",
            inputProps: {inputMode: 'numeric', pattern: '[0-9]*', min: '144'}
        }
    };

    return (
        <>
            <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
                <DialogTitle>Process Video</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
                        Apply editing options. Leave fields blank to keep original values (except Mute).
                    </Typography>
                    <Box component="form" noValidate autoComplete="off" sx={{mt: 1}}>
                        <TextField margin="dense" fullWidth variant="outlined"
                                   disabled={isProcessing} {...inputProps.startTime} />
                        <TextField margin="dense" fullWidth variant="outlined"
                                   disabled={isProcessing} {...inputProps.endTime} />
                        <TextField margin="dense" fullWidth variant="outlined"
                                   disabled={isProcessing} {...inputProps.resolution} />
                        <FormControlLabel
                            control={<Checkbox checked={options.mute} onChange={handleMuteChange} name="mute"
                                               disabled={isProcessing}/>} label="Mute Audio"
                            sx={{mt: 1, display: 'block'}}/>
                        {isProcessing && <CircularProgress size={24} sx={{display: 'block', margin: '10px auto'}}/>}
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
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar(prev => ({...prev, open: false}))}
                message={snackbar.message}
                anchorOrigin={{vertical: 'bottom', horizontal: 'center'}}
            />
        </>
    );
}

export default ProcessVideoDialog;