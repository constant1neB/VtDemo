import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Login from "./components/Login";
import ThemeToggleButton from "./components/ThemeToggleButton";

const queryClient = new QueryClient();

function App() {
  return (
    <Container maxWidth="xl" sx={{ pt: 2 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Car Shop
          </Typography>
          <ThemeToggleButton />
        </Toolbar>
      </AppBar>
      <br />
      <QueryClientProvider client={queryClient}>
        <Login />
      </QueryClientProvider>
    </Container>
  );
}

export default App;
