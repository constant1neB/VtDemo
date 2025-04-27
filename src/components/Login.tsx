import React, {useEffect, useState} from "react";
import axios from 'axios';
import {useNavigate, useSearchParams} from 'react-router-dom';
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";
import Snackbar from "@mui/material/Snackbar";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";

import { login } from "../api/videoApi";
import { AccountCredentials } from "../types";
import { useAuth } from '../hooks/useAuth';
import { parseApiError } from '../utils/errorUtils';

function Login() {
  const [user, setUser] = useState<AccountCredentials>({
    username: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>("");
  const [searchParams, setSearchParams] = useSearchParams();


  const navigate = useNavigate();
  const auth = useAuth();

    useEffect(() => {
        const verified = searchParams.get('verified');
        const error = searchParams.get('error');

        if (verified === 'true') {
            setSnackbarMessage("Email successfully verified! You can now log in.");
            setSnackbarOpen(true);
            navigate('/login', { replace: true });
        } else if (error === 'verification_failed') {
            setSnackbarMessage("Verification failed: Invalid or expired token. Please try again or resend verification.");
            setSnackbarOpen(true);
            navigate('/login', { replace: true });
        }
        setSearchParams({}, { replace: true });
    }, [searchParams, navigate, setSearchParams]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUser({ ...user, [event.target.name]: event.target.value });
  };

  const handleLogin = async () => {
    if (!user.username || !user.password) {
      setSnackbarMessage("Please enter username and password");
      setSnackbarOpen(true);
      return;
    }
    setIsLoading(true);
    setSnackbarMessage(""); // Clear previous messages

    try {
      const response = await login(user); // Call the API function

      // Axios successful response (status 2xx)
      const jwtToken = response.headers["authorization"]; // Headers are lowercase

      if (jwtToken) {
        auth.login(jwtToken); // Use context login function to store token in memory
        navigate('/', { replace: true }); // Navigate to home page on success
        // No need to manually handle __Secure-Fgp cookie, browser does it
      } else {
        // This case shouldn't happen if backend sends token correctly on 200
        console.error("Login successful but no JWT token received in header.");
        setSnackbarMessage("Login failed: Token missing in response.");
        setSnackbarOpen(true);
        // Ensure auth state remains logged out via context
      }
    } catch (error: unknown) {
      // Axios error (status non-2xx) or network error
      console.error("Login error:", error);

      let message = parseApiError(error, "Login failed: An unexpected error occurred.");

      // Customize message specifically for 403 (not verified) if needed
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        message = "Login failed: Account not verified. Please check your email or resend verification.";
      }

      setSnackbarMessage(message);
      setSnackbarOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
      <Stack spacing={2} alignItems="center" mt={5}>
        <Typography variant="h4" gutterBottom>Login</Typography>
        <TextField
            name="username"
            label="Username"
            value={user.username}
            onChange={handleChange}
            disabled={isLoading}
            sx={{ width: '300px' }}
            autoComplete="username"
        />
        <TextField
            type="password"
            name="password"
            label="Password"
            value={user.password}
            onChange={handleChange}
            disabled={isLoading}
            sx={{ width: '300px' }}
            autoComplete="current-password"
        />
        <Button
            variant="contained"
            color="primary"
            onClick={handleLogin}
            disabled={isLoading}
            sx={{ width: '300px', height: '40px' }} // Set width and height
        >
          {isLoading ? <CircularProgress size={24} color="inherit" /> : "Login"}
        </Button>

        {/* Use navigate for links */}
        <Stack direction="row" spacing={1} mt={2}>
          <Button size="small" onClick={() => navigate('/register')} disabled={isLoading}>Register</Button>
          <Button size="small" onClick={() => navigate('/resend-verification')} disabled={isLoading}>Resend Verification</Button>
        </Stack>

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

export default Login;