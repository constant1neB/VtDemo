import React, {createContext, ReactNode, useCallback, useMemo, useState} from 'react';
import {logoutUser} from '../api/videoApi';

export interface AuthContextType {
    token: string | null;
    isAuthenticated: boolean;
    login: (newToken: string) => void;
    logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({children}) => {
    const [token, setToken] = useState<string | null>(null);

    const login = useCallback((newToken: string) => {
        const formattedToken = newToken.startsWith('Bearer ') ? newToken : `Bearer ${newToken}`;
        setToken(formattedToken);
        console.log("AuthContext: Token set in memory.");
    }, []);

    const logout = useCallback(() => {
        setToken(null); // Clear token from frontend state immediately
        console.log("AuthContext: Token removed from memory.");

        // Call the dedicated backend logout function (no token needed anymore)
        logoutUser() // Call without parameters
            .then(response => {
                console.log("AuthContext: Backend logout successful (public endpoint).", response.status);
            })
            .catch(error => {
                // Log error, but don't prevent frontend logout state change
                console.error("AuthContext: Backend logout call failed (public endpoint):", error.response?.data ?? error.message);
            })
            .finally(() => {
                console.log("AuthContext: Reloading page after logout attempt.");
                window.location.reload();
            });

    }, []);

    const isAuthenticated = useMemo(() => !!token, [token]);

    const value = useMemo(() => ({
        token,
        isAuthenticated,
        login,
        logout,
    }), [token, isAuthenticated, login, logout]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};