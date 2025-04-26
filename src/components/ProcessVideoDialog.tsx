import {ChangeEvent, useEffect, useState} from 'react';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';
import TextField, {TextFieldProps} from '@mui/material/TextField';
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

// Type alias for field types
type FieldType = 'startTime' | 'endTime' | 'resolution';

function ProcessVideoDialog({ open, handleClose, video }: Readonly<ProcessVideoDialogProps>) {
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

    // Reset form when dialog opens or video changes
    useEffect(() => {
        if (open) {
            setOptions({
                cutStartTime: null,
                cutEndTime: null,
                mute: false,
                targetResolutionHeight: null,
            });
            setErrors({
                startTime: '',
                endTime: '',
                resolution: '',
            });
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
                return field;
        }
    };

    const handleProcessSuccess = () => {
        showSnackbar(`Video processing started`);
        handleClose();
        void queryClient.invalidateQueries({ queryKey: ['videos'] });
    };

    const handleProcessError = (error: Error, publicId: string) => {
        let message;

        if (axios.isAxiosError(error) && error.response) {
            const { status, data } = error.response;
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
            const errorDetails = Object.entries(problem.errors)
                .map(([field, msg]) => `${field}: ${msg}`)
                .join(', ');
            return `Processing failed: ${errorDetails} (ID: ${publicId})`;
        }
        return `Processing failed: ${problem?.detail ?? 'Invalid options.'} (ID: ${publicId})`;
    };

    const { mutate: processMutate, isPending: isProcessing } = useMutation({
        mutationFn: async ({ publicId, options }: { publicId: string; options: EditOptions }) => {
            await processVideo(publicId, options);
        },
        onSuccess: handleProcessSuccess,
        onError: (error: Error, vars) => handleProcessError(error, vars.publicId),
    });

    const validateNumberInput = (
        value: string,
        field: FieldType,
        minValue: number | null = 0
    ): boolean => {
        if (value === '') {
            updateOptionAndError(field, null, '');
            return true;
        }

        const num = parseFloat(value);
        if (isNaN(num)) {
            const displayName = getFieldDisplayName(field);
            updateOptionAndError(field, null, `${displayName} must be a number.`);
            return false;
        }

        if (minValue !== null && num < minValue) {
            const displayName = getFieldDisplayName(field);
            updateOptionAndError(field, null, `${displayName} must be ${minValue} or greater.`);
            return false;
        }

        updateOptionAndError(field, num, '');
        return true;
    };

    const updateOptionAndError = (
        field: FieldType,
        value: number | null,
        error: string
    ) => {
        const optionField = getOptionFieldName(field);

        setOptions(prev => ({
            ...prev,
            [optionField]: value
        }));

        setErrors(prev => ({
            ...prev,
            [field]: error
        }));
    };

    const handleStartTimeChange = (event: ChangeEvent<HTMLInputElement>) => {
        const isValid = validateNumberInput(event.target.value, 'startTime');
        if (isValid && errors.endTime.includes('greater than Start Time')) {
            validateTimeRange();
        }
    };

    const handleEndTimeChange = (event: ChangeEvent<HTMLInputElement>) => {
        const isValid = validateNumberInput(event.target.value, 'endTime');
        if (isValid) {
            validateTimeRange();
        }
    };

    const handleResolutionChange = (event: ChangeEvent<HTMLInputElement>) => {
        validateNumberInput(event.target.value, 'resolution', 144);
    };

    const validateTimeRange = (): boolean => {
        const { cutStartTime, cutEndTime } = options;

        if (typeof cutStartTime === 'number' && typeof cutEndTime === 'number') {
            if (cutEndTime <= cutStartTime) {
                setErrors(prev => ({
                    ...prev,
                    endTime: 'End Time must be greater than Start Time.'
                }));
                return false;
            }

            if (errors.endTime.includes('greater than Start Time')) {
                setErrors(prev => ({
                    ...prev,
                    endTime: ''
                }));
            }
        }
        return true;
    };

    const handleMuteChange = (event: ChangeEvent<HTMLInputElement>) => {
        setOptions(prev => ({ ...prev, mute: event.target.checked }));
    };

    const showSnackbar = (message: string) => {
        setSnackbar({ open: true, message });
    };

    const handleProcessSubmit = () => {
        if (!video) return;

        const isTimeRangeValid = validateTimeRange();
        const areFieldsValid = Object.values(errors).every(error => !error);

        if (isTimeRangeValid && areFieldsValid) {
            processMutate({ publicId: video.publicId, options });
        } else {
            showSnackbar("Please fix the errors in the form before submitting.");
        }
    };

    type CustomTextFieldProps = Omit<TextFieldProps, 'variant'> & {
        InputProps?: {
            inputProps?: {
                inputMode?: 'numeric' | 'text' | 'decimal' | 'none' | 'tel' | 'url' | 'email' | 'search';
                pattern?: string;
                min?: string;
            };
        };
    };

    const inputProps: Record<FieldType, CustomTextFieldProps> = {
        startTime: {
            id: "cutStartTime",
            label: "Cut Start Time (seconds)",
            value: options.cutStartTime ?? '',
            onChange: handleStartTimeChange,
            error: !!errors.startTime,
            helperText: errors.startTime || "e.g., 10.5 (leave blank for no cut)",
            InputProps: {
                inputProps: {
                    inputMode: 'numeric',
                    pattern: '[0-9]*(.[0-9]+)?',
                }
            }
        },
        endTime: {
            id: "cutEndTime",
            label: "Cut End Time (seconds)",
            value: options.cutEndTime ?? '',
            onChange: handleEndTimeChange,
            error: !!errors.endTime,
            helperText: errors.endTime || "e.g., 60 (leave blank for no cut)",
            InputProps: {
                inputProps: {
                    inputMode: 'numeric',
                    pattern: '[0-9]*(.[0-9]+)?',
                }
            }
        },
        resolution: {
            id: "targetResolutionHeight",
            label: "Target Resolution Height",
            value: options.targetResolutionHeight ?? '',
            onChange: handleResolutionChange,
            error: !!errors.resolution,
            helperText: errors.resolution || "e.g., 720 or 480 (leave blank for original)",
            InputProps: {
                inputProps: {
                    inputMode: 'numeric',
                    pattern: '[0-9]*',
                    min: '144'
                }
            }
        }
    };

    return (
        <>
            <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
                <DialogTitle>Process Video</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Apply editing options. Leave fields blank to keep original values (except Mute).
                    </Typography>
                    <Box component="form" noValidate autoComplete="off" sx={{ mt: 1 }}>
                        <TextField
                            margin="dense"
                            fullWidth
                            variant="outlined"
                            disabled={isProcessing}
                            {...inputProps.startTime}
                        />
                        <TextField
                            margin="dense"
                            fullWidth
                            variant="outlined"
                            disabled={isProcessing}
                            {...inputProps.endTime}
                        />
                        <TextField
                            margin="dense"
                            fullWidth
                            variant="outlined"
                            disabled={isProcessing}
                            {...inputProps.resolution}
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
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                message={snackbar.message}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            />
        </>
    );
}

export default ProcessVideoDialog;