import { CircularProgress, Stack } from "@mui/material";
import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import { Marco } from "./componentes/Marco";
import { CarritoPage } from "./paginas/CarritoPage";
import { CatalogoPage } from "./paginas/CatalogoPage";
import { EntrarPage } from "./paginas/EntrarPage";
import { EspeciePage } from "./paginas/EspeciePage";
import { InventarioPage } from "./paginas/InventarioPage";
import { NuevaEspeciePage } from "./paginas/NuevaEspeciePage";
import { PedidosPage } from "./paginas/PedidosPage";
import { RegistroPage } from "./paginas/RegistroPage";
import { ViveroPage } from "./paginas/ViveroPage";

function SoloAdmin({ children }: { children: ReactNode }) {
  const { usuario, listo } = useAuth();
  if (!listo) {
    return (
      <Stack sx={{ alignItems: "center", py: 8 }}>
        <CircularProgress />
      </Stack>
    );
  }
  if (!usuario) return <Navigate to="/entrar" replace />;
  if (usuario.rol !== "admin") return <Navigate to="/" replace />;
  return children;
}

export function App() {
  return (
    <Routes>
      <Route element={<Marco />}>
        <Route index element={<CatalogoPage />} />
        <Route path="especies/nueva" element={<SoloAdmin><NuevaEspeciePage /></SoloAdmin>} />
        <Route path="especies/:id" element={<EspeciePage />} />
        <Route path="vivero" element={<SoloAdmin><ViveroPage /></SoloAdmin>} />
        <Route path="inventario" element={<SoloAdmin><InventarioPage /></SoloAdmin>} />
        <Route path="pedidos" element={<PedidosPage />} />
        <Route path="carrito" element={<CarritoPage />} />
        <Route path="entrar" element={<EntrarPage />} />
        <Route path="registro" element={<RegistroPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
