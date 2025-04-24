// src/App.tsx
import { useState } from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Login from "./components/Login";
import Register from "./components/Register";
import ResendVerification from "./components/ResendVerification";
import ThemeToggleButton from "./components/ThemeToggleButton";
import Box from "@mui/material/Box";

const queryClient = new QueryClient();

// Define possible view states
type AuthView = "login" | "register" | "resend";

function App() {
    const [currentView] = useState<AuthView>("login");
    const [isAuthenticated] = useState<boolean>(() => {
        // Check initial auth state from sessionStorage
        const token = sessionStorage.getItem("jwt");
        return !!token;
    });

    // Function to render the correct component based on state
    const renderAuthComponent = () => {
        if (isAuthenticated) {
            // Pass setAuth to Login/VideoList so it can trigger logout state change
            return <Login />; // Login component internally handles showing VideoList when authenticated
        }

        switch (currentView) {
            case "register":

                return <Register />;
            case "resend":

                return <ResendVerification />;
            case "login":
            default:

                return <Login />;
        }
    };

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
            <Box component="main" sx={{ mt: 4 }}> {/* Added Box and margin */}
                <QueryClientProvider client={queryClient}>
                    {renderAuthComponent()}
                </QueryClientProvider>
            </Box>
        </Container>
    );
}

export default App;