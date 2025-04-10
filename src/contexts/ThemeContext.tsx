import React, {
  createContext,
  useState,
  useMemo,
  useContext,
  ReactNode,
  useEffect, // Import useEffect
} from "react";
import { ThemeProvider as MuiThemeProvider, CssBaseline } from "@mui/material";
import { lightTheme, darkTheme } from "../theme";

type ThemeMode = "light" | "dark";

// Define a key for localStorage
const THEME_STORAGE_KEY = "themeMode";

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface CustomThemeProviderProps {
  children: ReactNode;
}

// Helper function to get the initial theme mode
const getInitialMode = (): ThemeMode => {
  try {
    const storedMode = localStorage.getItem(THEME_STORAGE_KEY);
    // Check if the stored value is valid
    if (storedMode === "light" || storedMode === "dark") {
      return storedMode;
    }
  } catch (error) {
    console.error("Could not read theme from localStorage", error);
  }
  // Default to 'light' if nothing valid is stored or if localStorage fails
  return "light";
};

export const CustomThemeProvider: React.FC<CustomThemeProviderProps> = ({
  children,
}) => {
  // Initialize state by reading from localStorage
  const [mode, setMode] = useState<ThemeMode>(getInitialMode);

  // Function to toggle the theme mode AND save to localStorage
  const toggleTheme = () => {
    setMode((prevMode) => {
      const newMode = prevMode === "light" ? "dark" : "light";
      try {
        // Save the *new* mode to localStorage
        localStorage.setItem(THEME_STORAGE_KEY, newMode);
      } catch (error) {
        console.error("Could not save theme to localStorage", error);
      }
      return newMode;
    });
  };

  // Select the theme based on the current mode
  const theme = useMemo(
    () => (mode === "light" ? lightTheme : darkTheme),
    [mode]
  );

  // Memoize the context value
  const contextValue = useMemo(() => ({ mode, toggleTheme }), [mode]); // toggleTheme doesn't change, but including mode ensures context updates if needed

  // Optional: Effect to update localStorage if the state was somehow changed externally
  // (Usually not needed with the current setup but good practice)
  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      console.error("Could not sync theme to localStorage", error);
    }
  }, [mode]);

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

// Custom hook remains the same
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a CustomThemeProvider");
  }
  return context;
};
