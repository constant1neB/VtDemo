import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "./theme";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ThemeProvider theme={theme}>
    <CssBaseline enableColorScheme />
    <App />
  </ThemeProvider>
);
