import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Snackbar from "@mui/material/Snackbar";
import CircularProgress from "@mui/material/CircularProgress";
import { RegistrationRequest } from '../types';
import { register } from '../api/videoApi';
import { useApiFormSubmit } from '../hooks/useApiFormSubmit';
import { AxiosResponse } from 'axios';

function Register() {
    const [formData, setFormData] = useState<RegistrationRequest>({
        username: '',
        email: '',
        password: '',
        passwordConfirmation: '',
    });

    const navigate = useNavigate();

    const {
        isLoading,
        snackbarOpen,
        snackbarMessage,
        isSubmitted: isSuccess,
        handleSubmit: handleApiSubmit,
        closeSnackbar
    } = useApiFormSubmit<RegistrationRequest, AxiosResponse>(
        register,
        {
            successMessage: "Registration successful! Please check your email to verify your account.",
            onSuccess: () => {
                setFormData({ username: '', email: '', password: '', passwordConfirmation: '' });
            }
        }
    );

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [event.target.name]: event.target.value });
    };

    const handleRegisterSubmit = () => {
        if (formData.password !== formData.passwordConfirmation) {
            console.warn("Passwords do not match");
            return;
        }
        if (!formData.username || !formData.email || !formData.password) {
            console.warn("Please fill in all required fields.");
            return;
        }

        void handleApiSubmit(formData);
    };

    return (
        <Stack spacing={2} alignItems="center" mt={5}>
            <Typography variant="h4" gutterBottom>Register</Typography>
            {isSuccess ? (
                <Typography color="success.main" sx={{ textAlign: 'center', mb: 2 }}>
                    {snackbarMessage}
                </Typography>
            ) : (
                <>
                    <TextField
                        name="username" label="Username" required
                        value={formData.username} onChange={handleChange}
                        disabled={isLoading} sx={{ width: '300px' }}
                        autoComplete="username"
                    />
                    <TextField
                        name="email" label="Email" type="email" required
                        value={formData.email} onChange={handleChange}
                        disabled={isLoading} sx={{ width: '300px' }}
                        autoComplete="email"
                    />
                    <TextField
                        name="password" label="Password" type="password" required
                        value={formData.password} onChange={handleChange}
                        disabled={isLoading} sx={{ width: '300px' }}
                        autoComplete="new-password"
                    />
                    <TextField
                        name="passwordConfirmation" label="Confirm Password" type="password" required
                        value={formData.passwordConfirmation} onChange={handleChange}
                        disabled={isLoading} sx={{ width: '300px' }}
                        error={formData.password !== formData.passwordConfirmation && formData.passwordConfirmation !== ''}
                        helperText={formData.password !== formData.passwordConfirmation && formData.passwordConfirmation !== '' ? "Passwords do not match" : ""}
                        autoComplete="new-password"
                    />
                    <Button
                        variant="contained" color="primary" onClick={handleRegisterSubmit} // Call the component's submit handler
                        disabled={isLoading} sx={{ width: '300px', height: '40px' }}
                    >
                        {isLoading ? <CircularProgress size={24} color="inherit" /> : "Register"}
                    </Button>
                </>
            )}
            <Button size="small" onClick={() => navigate('/login')} disabled={isLoading && !isSuccess}>
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

export default Register;