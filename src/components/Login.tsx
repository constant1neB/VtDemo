import React, { useState } from "react";
import axios from 'axios';
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";
import Snackbar from "@mui/material/Snackbar";
import Typography from "@mui/material/Typography"; // For placeholders
import CircularProgress from "@mui/material/CircularProgress"; // For loading state

// Import API functions and types
import { login } from "../api/videoApi";
import {AccountCredentials, ProblemDetail} from "../types";

// Placeholder for the authenticated view component
import VideoList from "./VideoList"; // We'll create this later

function Login() {
  const [user, setUser] = useState<AccountCredentials>({
    username: "",
    password: "",
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    // Check initial auth state from sessionStorage
    const token = sessionStorage.getItem("jwt");
    return !!token; // Convert token presence to boolean
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>("");

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
        sessionStorage.setItem("jwt", jwtToken); // Store the token
        setIsAuthenticated(true);
        // No need to manually handle __Secure-Fgp cookie, browser does it
      } else {
        // This case shouldn't happen if backend sends token correctly on 200
        console.error("Login successful but no JWT token received in header.");
        setSnackbarMessage("Login failed: Token missing in response.");
        setSnackbarOpen(true);
        setIsAuthenticated(false); // Ensure auth state is false
      }
    } catch (error: unknown) {
      // Axios error (status non-2xx) or network error
      console.error("Login error:", error);
      setIsAuthenticated(false); // Ensure auth state is false on error
      sessionStorage.removeItem("jwt"); // Clear any potentially stale token

      let message = "Login failed: An unexpected error occurred.";
      // Check if it's an Axios error with a response
      if (axios.isAxiosError(error) && error.response) {
        const status = error.response.status;
        if (status === 401) {
          message = "Login failed: Invalid username or password.";
        } else if (status === 403) {
          // Assuming 403 might mean 'not verified' based on UserDetailsServiceImpl
          message = "Login failed: Account not verified. Please check your email.";
        } else {
          // Try to get detail from ProblemDetail if backend sends it
          const problem = error.response.data as ProblemDetail | undefined;
          message = `Login failed: ${problem?.detail ?? error.message} (Status: ${status})`;
        }
      } else if (error instanceof Error) {
        message = `Login failed: ${error.message}`;
      }
      setSnackbarMessage(message);
      setSnackbarOpen(true);
    } finally {
      setIsLoading(false);
    }
  };


  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      sessionStorage.removeItem("jwt");
      setIsAuthenticated(false);
      setUser({ username: "", password: "" }); // Clear user fields
      // Optionally: Clear React Query cache if needed
      // queryClient.clear();
    }
  };

  // --- Placeholder buttons for Register/Resend ---
  const handleGoToRegister = () => {
    alert("Navigate to Registration Page (Not Implemented)");
    // Later: Use React Router or state to show Register component
  };

  const handleGoToResend = () => {
    alert("Navigate to Resend Verification Page (Not Implemented)");
    // Later: Use React Router or state to show Resend component
  };
  // --- End Placeholders ---


  if (isAuthenticated) {
    // Render the main application view for authenticated users
    // Replace the placeholder div with the actual VideoList component later
    // return <div><Typography variant="h5">Authenticated! Video List Goes Here</Typography><Button onClick={handleLogout}>Log out</Button></div>;
    return <VideoList logOut={handleLogout} />; // Use VideoList directly
  } else {
    // Render the login form
    return (
        <Stack spacing={2} alignItems="center" mt={5}> {/* Added more top margin */}
          <Typography variant="h4" gutterBottom>Login</Typography>
          <TextField
              name="username"
              label="Username"
              value={user.username}
              onChange={handleChange}
              disabled={isLoading}
              sx={{ width: '300px' }} // Set a fixed width
          />
          <TextField
              type="password"
              name="password"
              label="Password"
              value={user.password}
              onChange={handleChange}
              disabled={isLoading}
              sx={{ width: '300px' }} // Set a fixed width
          />
          <Button
              variant="contained" // Changed to contained for primary action
              color="primary"
              onClick={handleLogin}
              disabled={isLoading}
              sx={{ width: '300px', height: '40px' }} // Set width and height
          >
            {isLoading ? <CircularProgress size={24} color="inherit" /> : "Login"}
          </Button>

          {/* Placeholder Links/Buttons */}
          <Stack direction="row" spacing={1} mt={2}>
            <Button size="small" onClick={handleGoToRegister} disabled={isLoading}>Register</Button>
            <Button size="small" onClick={handleGoToResend} disabled={isLoading}>Resend Verification</Button>
          </Stack>

          <Snackbar
              open={snackbarOpen}
              autoHideDuration={6000} // Longer duration for errors
              onClose={() => setSnackbarOpen(false)}
              message={snackbarMessage}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} // Center snackbar
          />
        </Stack>
    );
  }
}

// Need to import axios to use isAxiosError

export default Login;