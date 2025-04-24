import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Snackbar from "@mui/material/Snackbar";
import CircularProgress from "@mui/material/CircularProgress";
import { ResendVerificationRequest } from '../types';
import { resendVerification } from '../api/videoApi';
import { useApiFormSubmit } from '../hooks/useApiFormSubmit';
import { AxiosResponse } from 'axios';

function ResendVerification() {
    const [formData, setFormData] = useState<ResendVerificationRequest>({ email: '' });
    const navigate = useNavigate();

    const {
        isLoading,
        snackbarOpen,
        snackbarMessage,
        isSubmitted,
        handleSubmit: handleApiSubmit,
        closeSnackbar
    } = useApiFormSubmit<ResendVerificationRequest, AxiosResponse>(
        resendVerification,
        {

            successMessage: "If an account exists for this email and requires verification, a new link has been sent.",
            onSuccess: (/* response: AxiosResponse */) => { // Parameter is now typed correctly
                setFormData({ email: '' }); // Clear form on success
            }
        }
    );

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [event.target.name]: event.target.value });
    };

    // Component's submit handler prepares data and calls the hook's handler
    const handleComponentSubmit = () => {
        if (!formData.email) {
            console.warn("Please enter your email address.");
            return;
        }
        void handleApiSubmit(formData); // Call hook's submit function
    };

    return (
        <Stack spacing={2} alignItems="center" mt={5}>
            <Typography variant="h4" gutterBottom>Resend Verification Email</Typography>
            {isSubmitted ? (
                <Typography sx={{ textAlign: 'center', mb: 2 }}>
                    {snackbarMessage}
                </Typography>
            ) : (
                <>
                    <Typography variant="body1" sx={{ textAlign: 'center', mb: 2 }}>
                        Enter your email address below to receive a new verification link.
                    </Typography>
                    <TextField
                        name="email" label="Email" type="email" required
                        value={formData.email} onChange={handleChange}
                        disabled={isLoading} sx={{ width: '300px' }}
                        autoComplete="email"
                    />
                    <Button
                        variant="contained" color="primary" onClick={handleComponentSubmit} // Call component's handler
                        disabled={isLoading} sx={{ width: '300px', height: '40px' }}
                    >
                        {isLoading ? <CircularProgress size={24} color="inherit" /> : "Send Verification Email"}
                    </Button>
                </>
            )}
            <Button size="small" onClick={() => navigate('/login')} disabled={isLoading && !isSubmitted}>
                Back to Login
            </Button>
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={6000}
                onClose={closeSnackbar}
                message={snackbarMessage}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            />
        </Stack>
    );
}

export default ResendVerification;