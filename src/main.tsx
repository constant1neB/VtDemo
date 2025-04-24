// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'; // Import BrowserRouter
import App from './App.tsx';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';
import { AuthProvider } from './context/AuthContext'; // Import AuthProvider
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // Import QueryClient

const queryClient = new QueryClient(); // Create QueryClient instance

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode> {/* Added StrictMode */}
        <ThemeProvider theme={theme}>
            <CssBaseline enableColorScheme />
            <BrowserRouter> {/* Wrap with BrowserRouter */}
                <AuthProvider> {/* Wrap with AuthProvider */}
                    <QueryClientProvider client={queryClient}> {/* Add QueryClientProvider */}
                        <App />
                    </QueryClientProvider>
                </AuthProvider>
            </BrowserRouter>
        </ThemeProvider>
    </React.StrictMode>,
);