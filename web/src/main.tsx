import { CssBaseline, ThemeProvider } from "@mui/material";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { ProveedorAuth } from "./auth";
import { ProveedorCarrito } from "./carrito";
import { tema } from "./theme";

const raiz = document.getElementById("root");
if (!raiz) throw new Error("No está el nodo root");

createRoot(raiz).render(
  <StrictMode>
    <ThemeProvider theme={tema}>
      <CssBaseline />
      <BrowserRouter>
        <ProveedorAuth>
          <ProveedorCarrito>
            <App />
          </ProveedorCarrito>
        </ProveedorAuth>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
);
