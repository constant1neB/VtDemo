import IconButton from "@mui/material/IconButton";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import { useTheme } from "../contexts/ThemeContext";

const ThemeToggleButton = () => {
  const { mode, toggleTheme } = useTheme();
  const IconComponent = mode === "dark" ? Brightness7Icon : Brightness4Icon;
  const accessibilityLabel = `toggle to ${
    mode === "dark" ? "light" : "dark"
  } theme`;

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
