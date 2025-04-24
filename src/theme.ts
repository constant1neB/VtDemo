import { extendTheme } from "@mui/material/styles";
import "@mui/x-data-grid/themeAugmentation";

const neonLime = "#39FF14";
const darkCharcoal = "#1A1A1A";
const paperDark = "#242424";
const royalPurple = "#7851a9";

const theme = extendTheme({
  cssVarPrefix: "mui",
  colorSchemes: {
    light: {
      palette: {
        primary: {
          main: royalPurple,
        },
      },
    },
    dark: {
      palette: {
        primary: {
          main: neonLime,
        },
        background: {
          default: darkCharcoal,
          paper: paperDark,
        },
        text: {
          primary: "#ffffff",
          secondary: "#aaaaaa",
        },
      },
    },
  },
  components: {
    MuiDataGrid: {
      styleOverrides: {
        root: {}, // Keep empty or add specific styles
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: "16px 24px",
        },
      },
    },
  },
  colorSchemeSelector: '[data-mui-color-scheme="%s"]', // Instructs to use data attribute
});

export default theme;
