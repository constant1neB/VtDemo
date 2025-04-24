// src/components/ResendVerification.tsx
import { useState } from 'react';
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Snackbar from "@mui/material/Snackbar";
import CircularProgress from "@mui/material/CircularProgress";
import { ResendVerificationRequest, ProblemDetail } from '../types';
import { resendVerification } from '../api/videoApi';
import axios from 'axios';
import * as React from "react";

function ResendVerification() {
    const [formData, setFormData] = useState<ResendVerificationRequest>({ email: '' });
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
    const [snackbarMessage, setSnackbarMessage] = useState<string>("");
    const [isSubmitted, setIsSubmitted] = useState<boolean>(false); // Track submission

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [event.target.name]: event.target.value });
    };

    const handleSubmit = async () => {
        if (!formData.email) {
            setSnackbarMessage("Please enter your email address.");
            setSnackbarOpen(true);
            return;
        }
        setIsLoading(true);
        setSnackbarMessage("");
        setIsSubmitted(false);

        try {
            await resendVerification(formData); // Call API
            // Always show a generic success message for security (don't confirm/deny email existence)
            setSnackbarMessage("If an account exists for this email and requires verification, a new link has been sent.");
            setSnackbarOpen(true);
            setIsSubmitted(true); // Indicate submission completed
            setFormData({ email: '' }); // Clear form

        } catch (error: unknown) {
            console.error("Resend verification error:", error);
            // Show a generic error message, but log specific details
            let logMessage = "Resend verification failed: An unexpected error occurred.";
            if (axios.isAxiosError(error) && error.response) {
                const status = error.response.status;
                const problem = error.response.data as ProblemDetail | undefined;
                logMessage = `Resend verification failed: ${problem?.detail ?? error.message} (Status: ${status})`;
            } else if (error instanceof Error) {
                logMessage = `Resend verification failed: ${error.message}`;
            }
            console.error(logMessage); // Log detailed error

            // Generic message to user
            setSnackbarMessage("An error occurred while processing your request. Please try again later.");
            setSnackbarOpen(true);
            setIsSubmitted(false);
        } finally {
            setIsLoading(false);
        }
    };

    // Placeholder navigation back to login
    const handleGoToLogin = () => {
        alert("Navigate back to Login Page (Not Implemented)");
        // Later: Use React Router
    };

    return (
        <Stack spacing={2} alignItems="center" mt={5}>
            <Typography variant="h4" gutterBottom>Resend Verification Email</Typography>
            {isSubmitted ? (
                <Typography sx={{ textAlign: 'center', mb: 2 }}>
                    Request submitted. If an account matching that email exists and needs verification, a new email has been sent.
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
                    />
                    <Button
                        variant="contained" color="primary" onClick={handleSubmit}
                        disabled={isLoading} sx={{ width: '300px', height: '40px' }}
                    >
                        {isLoading ? <CircularProgress size={24} color="inherit" /> : "Send Verification Email"}
                    </Button>
                </>
            )}
            <Button size="small" onClick={handleGoToLogin} disabled={isLoading}>
                Back to Login
            </Button>
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={6000}
                onClose={() => setSnackbarOpen(false)}
                message={snackbarMessage}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            />
        </Stack>
    );
}

export default ResendVerification;