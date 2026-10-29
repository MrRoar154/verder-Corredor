import { createTheme } from "@mui/material/styles";

export const tema = createTheme({
  palette: {
    primary: { main: "#15803D", contrastText: "#FFFFFF" },
    text: { primary: "#14532D", secondary: "#475569" },
    background: { default: "#F0FDF4", paper: "#FFFFFF" },
    error: { main: "#B91C1C" },
    divider: "#BBF7D0",
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", sans-serif',
    h1: { fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 600 },
    h2: { fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 600 },
    button: { fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: "#F0FDF4" },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: 44,
          textTransform: "none",
          "@media (prefers-reduced-motion: reduce)": { transition: "none" },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: { minWidth: 44, minHeight: 44 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          transition: "box-shadow 200ms ease",
          "@media (prefers-reduced-motion: reduce)": { transition: "none" },
        },
      },
    },
  },
});
