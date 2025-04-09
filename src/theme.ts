import { createTheme } from "@mui/material/styles";
import "@mui/x-data-grid/themeAugmentation";

//Dark theme
const neonLime = "#39FF14";
const darkCharcoal = "#1A1A1A";
const paperDark = "#242424";

//Light theme
export const lightTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1976d2", // Default MUI blue for light theme primary
    },
    // You can customize other light theme colors here if needed
  },
});

// Dark Theme
export const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: neonLime,
    },
    background: {
      default: darkCharcoal,
      paper: paperDark,
    },
    text: {
      primary: "#ffffff", // Ensure text is white/light gray
      secondary: "#aaaaaa",
    },
  },
  components: {
    // Ensure DataGrid looks good in dark mode
    MuiDataGrid: {
      styleOverrides: {
        root: {
          // Optional: Add border if needed for contrast
          // border: `1px solid ${paperDark}`,
        },
      },
    },
    // Style buttons in dialogs to match theme
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: "16px 24px",
        },
      },
    },
  },
});
