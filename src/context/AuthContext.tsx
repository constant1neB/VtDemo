// src/context/AuthContext.tsx
import React, { createContext, useState, useMemo, useCallback, ReactNode } from 'react';

// Define the shape of the context data
export interface AuthContextType {
    token: string | null;
    isAuthenticated: boolean;
    login: (newToken: string) => void;
    logout: () => void;
}

// Create the context with an initial undefined value
// Exporting the context itself is fine according to the rule
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Export ONLY the AuthProvider component from this file
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [token, setToken] = useState<string | null>(null);

    const login = useCallback((newToken: string) => {
        const formattedToken = newToken.startsWith('Bearer ') ? newToken : `Bearer ${newToken}`;
        setToken(formattedToken);
        console.log("AuthContext: Token set in memory.");
    }, []);

    const logout = useCallback(() => {
        setToken(null);
        console.log("AuthContext: Token removed from memory.");
    }, []);

    const isAuthenticated = useMemo(() => !!token, [token]);

    // Memoize the context value to prevent unnecessary re-renders
    const value = useMemo(() => ({
        token,
        isAuthenticated,
        login,
        logout,
    }), [token, isAuthenticated, login, logout]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};