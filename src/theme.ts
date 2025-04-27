import { extendTheme } from "@mui/material/styles";
import "@mui/x-data-grid/themeAugmentation";

const neonLime = "#39FF14";
const darkCharcoal = "#1A1A1A";
const paperDark = "#242424";
const royalPurple = "#4a2e78";

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
        root: {},
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
  colorSchemeSelector: '[data-mui-color-scheme="%s"]',
});

export default theme;
