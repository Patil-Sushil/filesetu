import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#6a11cb" },
    secondary: { main: "#2575fc" },
    background: {
      default: "#f7f8fb",
      paper: "#ffffff",
    },
  },
  breakpoints: {
    values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 },
  },
  typography: {
    fontFamily:
      'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h1: { fontSize: "clamp(1.5rem, 2.2vw, 2rem)", fontWeight: 700 },
    h2: { fontSize: "clamp(1.25rem, 1.8vw, 1.75rem)", fontWeight: 700 },
    h3: { fontSize: "clamp(1.1rem, 1.6vw, 1.4rem)", fontWeight: 600 },
    body1: { fontSize: "clamp(0.95rem, 1.1vw, 1rem)" },
    body2: { fontSize: "clamp(0.85rem, 1vw, 0.95rem)" },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: "none", borderRadius: 8, fontWeight: 600 },
      },
    },
    MuiContainer: {
      defaultProps: { maxWidth: "lg" },
    },
  },
});

export default theme;
