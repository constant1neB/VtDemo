import IconButton from "@mui/material/IconButton";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import { useColorScheme } from "@mui/material/styles";

const ThemeToggleButton = () => {
  const { mode, setMode } = useColorScheme();

  const toggleTheme = () => {
    setMode(mode === "light" ? "dark" : "light");
  };

  const IconComponent = mode === "dark" ? Brightness7Icon : Brightness4Icon;
  const accessibilityLabel = `toggle to ${
    mode === "dark" ? "light" : "dark"
  } theme`;

  if (mode === undefined) {
    return null;
  }

  return (
    <IconButton
      aria-label={accessibilityLabel}
      sx={{ ml: 1 }}
      onClick={toggleTheme}
      color="inherit"
    >
      <IconComponent />
    </IconButton>
  );
};

export default ThemeToggleButton;
