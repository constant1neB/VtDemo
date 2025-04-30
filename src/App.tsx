import { Routes, Route, Navigate, Link as RouterLink, useLocation } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';

import Login from './components/Login';
import Register from './components/Register';
import ResendVerification from './components/ResendVerification';
import VideoList from './components/VideoList';
import VideoPlayer from './components/VideoPlayer';
import ThemeToggleButton from './components/ThemeToggleButton';
import { useAuth } from './hooks/useAuth';
import { useEffect } from 'react';
import { initializeApiClient } from './api/videoApi';
import { VideoPlayerProvider, useVideoPlayer } from './context/VideoPlayerContext';


function AppContent() {
    const { logout: authLogout, isAuthenticated } = useAuth();
    const { clearPlayerVideo } = useVideoPlayer();
    const location = useLocation();

    const handleLogout = () => {
        if (window.confirm("Are you sure you want to log out?")) {
            console.log("App.tsx: Coordinating logout...");
            clearPlayerVideo();
            authLogout();
        }
    };

    return (
        <>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        <RouterLink to={isAuthenticated ? "/" : "/login"} style={{ textDecoration: 'none', color: 'inherit' }}>
                            Video Platform
                        </RouterLink>
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                        {isAuthenticated && (
                            <>
                                <Button color="inherit" component={RouterLink} to="/">
                                    Main
                                </Button>
                                <Button color="inherit" component={RouterLink} to="/archive">
                                    Archive
                                </Button>
                                <Button color="inherit" onClick={handleLogout}>
                                    Log out
                                </Button>
                            </>
                        )}
                        <ThemeToggleButton />
                    </Stack>
                </Toolbar>
            </AppBar>

            <Box component="main" sx={{
                flexGrow: 1, display: 'flex', flexDirection: 'column',
                width: '100%', mt: 0, minHeight: 0, p: { xs: 1, sm: 2, md: 3 },
            }}>
                <Routes>
                    {isAuthenticated ? (
                        // --- Authenticated Routes ---
                        <>
                            <Route path="/" element={<VideoPlayer />} />
                            <Route path="/archive" element={<VideoList logOut={handleLogout} />} />
                            <Route path="/login" element={<Navigate to="/" replace />} />
                            <Route path="/register" element={<Navigate to="/" replace />} />
                            <Route path="/resend-verification" element={<Navigate to="/" replace />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </>
                    ) : (
                        // --- Public Routes ---
                        <>
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                            <Route path="/resend-verification" element={<ResendVerification />} />
                            <Route path="*" element={<Navigate to="/login" replace state={{ from: location }} />} />
                        </>
                    )}
                </Routes>
            </Box>
        </>
    );
}


function App() {
    const { token, logout: authLogout } = useAuth(); // Get token and original auth logout

    useEffect(() => {
        // Pass the original auth logout to the initializer
        initializeApiClient(() => token, authLogout);
        console.log("API Client Initialized/Re-initialized.");
    }, [token, authLogout]);


    return (
        <VideoPlayerProvider>
            <Container maxWidth="xl" disableGutters sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                <AppContent />
            </Container>
        </VideoPlayerProvider>
    );
}

export default App;