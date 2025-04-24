import React, { useState } from 'react';
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Snackbar from "@mui/material/Snackbar";
import CircularProgress from "@mui/material/CircularProgress";
import { RegistrationRequest } from '../types';
import { register } from '../api/videoApi';
// Import the helper function
import { parseApiError } from '../utils/errorUtils';

function Register() {
    const [formData, setFormData] = useState<RegistrationRequest>({
        username: '',
        email: '',
        password: '',
        passwordConfirmation: '',
    });
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
    const [snackbarMessage, setSnackbarMessage] = useState<string>("");
    const [isSuccess, setIsSuccess] = useState<boolean>(false); // Track success state

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [event.target.name]: event.target.value });
    };

    const handleRegister = async () => {
        // --- Initial Validations ---
        if (formData.password !== formData.passwordConfirmation) {
            setSnackbarMessage("Passwords do not match.");
            setSnackbarOpen(true);
            return;
        }
        if (!formData.username || !formData.email || !formData.password) {
            setSnackbarMessage("Please fill in all required fields.");
            setSnackbarOpen(true);
            return;
        }

        // --- Reset State for New Attempt ---
        setIsLoading(true);
        setSnackbarMessage("");
        setIsSuccess(false);

        // --- API Call and Handling ---
        try {
            await register(formData); // Call API
            setSnackbarMessage("Registration successful! Please check your email to verify your account.");
            setSnackbarOpen(true);
            setIsSuccess(true); // Set success flag
            setFormData({ username: '', email: '', password: '', passwordConfirmation: '' }); // Clear form on success

        } catch (error: unknown) {
            console.error("Registration error:", error);
            // Use the helper function to parse the error
            const errorMessage = parseApiError(error, "Registration failed: An unexpected error occurred.");
            setSnackbarMessage(errorMessage);
            setSnackbarOpen(true);
            setIsSuccess(false);
        } finally {
            setIsLoading(false);
        }
    };
    // --- End of Refactored handleRegister ---

    // Placeholder navigation back to login
    const handleGoToLogin = () => {
        alert("Navigate back to Login Page (Not Implemented)");
        // Later: Use React Router
    };

    return (
        <Stack spacing={2} alignItems="center" mt={5}>
            <Typography variant="h4" gutterBottom>Register</Typography>
            {isSuccess ? (
                <Typography color="success.main" sx={{ textAlign: 'center', mb: 2 }}>
                    Registration successful! Please check your email to complete verification.
                </Typography>
            ) : (
                <>
                    <TextField
                        name="username" label="Username" required
                        value={formData.username} onChange={handleChange}
                        disabled={isLoading} sx={{ width: '300px' }}
                        autoComplete="username" // Add autocomplete hint
                    />
                    <TextField
                        name="email" label="Email" type="email" required
                        value={formData.email} onChange={handleChange}
                        disabled={isLoading} sx={{ width: '300px' }}
                        autoComplete="email" // Add autocomplete hint
                    />
                    <TextField
                        name="password" label="Password" type="password" required
                        value={formData.password} onChange={handleChange}
                        disabled={isLoading} sx={{ width: '300px' }}
                        autoComplete="new-password" // Add autocomplete hint
                    />
                    <TextField
                        name="passwordConfirmation" label="Confirm Password" type="password" required
                        value={formData.passwordConfirmation} onChange={handleChange}
                        disabled={isLoading} sx={{ width: '300px' }}
                        error={formData.password !== formData.passwordConfirmation && formData.passwordConfirmation !== ''}
                        helperText={formData.password !== formData.passwordConfirmation && formData.passwordConfirmation !== '' ? "Passwords do not match" : ""}
                        autoComplete="new-password" // Add autocomplete hint
                    />
                    <Button
                        variant="contained" color="primary" onClick={handleRegister}
                        disabled={isLoading} sx={{ width: '300px', height: '40px' }}
                    >
                        {isLoading ? <CircularProgress size={24} color="inherit" /> : "Register"}
                    </Button>
                </>
            )}
            <Button size="small" onClick={handleGoToLogin} disabled={isLoading}>
                Back to Login
            </Button>
            <Snackbar
                open={snackbarOpen && !isSuccess} // Only show snackbar if not success message already shown
                autoHideDuration={6000}
                onClose={() => setSnackbarOpen(false)}
                message={snackbarMessage}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            />
        </Stack>
    );
}

export default Register;