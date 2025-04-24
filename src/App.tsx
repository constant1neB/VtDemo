// src/App.tsx
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';

import Login from './components/Login';
import Register from './components/Register';
import ResendVerification from './components/ResendVerification';
import VideoList from './components/VideoList'; // Assuming VideoList is the main authenticated view
import ThemeToggleButton from './components/ThemeToggleButton';
import { useAuth } from './hooks/useAuth';
import { useEffect } from 'react';
import { initializeApiClient } from './api/videoApi';

// Component to handle protected routes
function ProtectedRoute() {
    const { isAuthenticated } = useAuth();
    console.log("ProtectedRoute check: isAuthenticated =", isAuthenticated); // Debug log
    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

// Component to handle routes accessible only when logged out
function PublicOnlyRoute() {
    const { isAuthenticated } = useAuth();
    console.log("PublicOnlyRoute check: isAuthenticated =", isAuthenticated); // Debug log
    return !isAuthenticated ? <Outlet /> : <Navigate to="/" replace />;
}


function App() {
    const { token, logout } = useAuth(); // Get token and logout

    // Initialize the API client when the component mounts or auth state changes
    useEffect(() => {
        // Pass functions to get token and perform logout
        initializeApiClient(() => token, logout);
        console.log("API Client Initialized/Re-initialized.");
    }, [token, logout]);

    return (
        <Container maxWidth="xl" sx={{ pt: 2 }}>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        Video Platform
                    </Typography>
                    <ThemeToggleButton />
                </Toolbar>
            </AppBar>
            <Box component="main" sx={{ mt: 4 }}>
                <Routes>
                    {/* Routes accessible only when logged OUT */}
                    <Route element={<PublicOnlyRoute />}>
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/resend-verification" element={<ResendVerification />} />
                    </Route>

                    {/* Routes accessible only when logged IN */}
                    <Route element={<ProtectedRoute />}>
                        {/* Pass logout function to VideoList */}
                        <Route path="/" element={<VideoList logOut={logout} />} />
                        {/* Add other protected routes here */}
                    </Route>

                    {/* Redirect root based on auth state (handled by Protected/Public routes now) */}
                    {/* Fallback for unmatched routes (optional) */}
                    <Route path="*" element={<Navigate to="/" replace />} />

                </Routes>
            </Box>
        </Container>
    );
}

export default App;