import { Alert, Button, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { ErrorApi, solicitar, type Pedido } from "../api";
import { useAuth } from "../auth";
import { useCarrito } from "../carrito";
import { pesos } from "../pesos";

export function CarritoPage() {
  const { items, cambiarCantidad, quitar, vaciar } = useCarrito();
  const { usuario, listo } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const total = items.reduce((suma, item) => suma + item.precioCop * item.cantidad, 0);

  async function confirmar() {
    setEnviando(true);
    setError("");
    try {
      await solicitar<{ pedido: Pedido }>("/api/pedidos", {
        method: "POST",
        body: JSON.stringify({
          items: items.map((item) => ({ existenciaId: item.existenciaId, cantidad: item.cantidad })),
        }),
      });
      vaciar();
      navigate("/pedidos");
    } catch (fallo) {
      setError(fallo instanceof ErrorApi ? fallo.message : "No se pudo crear el pedido.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Stack spacing={2.5} sx={{ maxWidth: 720 }}>
      <Typography variant="h1" sx={{ fontSize: { xs: 36, md: 44 } }}>
        Pedido
      </Typography>
      {items.length === 0 && (
        <Alert severity="info">
          El pedido está vacío. En el catálogo, abre una especie que el vivero tenga disponible.
        </Alert>
      )}
      {error && <Alert severity="error">{error}</Alert>}
      {items.map((item) => (
        <Stack
          key={item.existenciaId}
          spacing={1.5}
          sx={{ p: 2, borderRadius: 2, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}
        >
          <Typography sx={{ fontWeight: 600 }}>{item.nombre}</Typography>
          <Typography>
            {[item.presentacion, item.tamanoCm ? `${item.tamanoCm} cm` : null].filter(Boolean).join(" · ")} ·{" "}
            {pesos(item.precioCop)} cada una
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" } }}>
            <TextField
              label="Cantidad"
              type="number"
              value={item.cantidad}
              onChange={(evento) => cambiarCantidad(item.existenciaId, Number(evento.target.value))}
              slotProps={{ htmlInput: { min: 1, max: item.disponible } }}
              sx={{ width: { xs: "100%", sm: 140 } }}
            />
            <Button variant="outlined" onClick={() => quitar(item.existenciaId)}>
              Quitar
            </Button>
            <Typography sx={{ fontWeight: 600 }}>{pesos(item.precioCop * item.cantidad)}</Typography>
          </Stack>
        </Stack>
      ))}
      {items.length > 0 && (
        <>
          <Typography variant="h2" sx={{ fontSize: 28 }}>
            Total estimado {pesos(total)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            El total definitivo es el que queda guardado al confirmar, con el precio del inventario en ese momento.
          </Typography>
          {listo && usuario?.rol === "cliente" && (
            <Button variant="contained" onClick={confirmar} disabled={enviando} sx={{ alignSelf: "flex-start" }}>
              {enviando ? "Confirmando…" : "Confirmar pedido"}
            </Button>
          )}
          {listo && !usuario && (
            <Button component={RouterLink} to="/entrar" state={{ desde: "/carrito" }} variant="contained" sx={{ alignSelf: "flex-start" }}>
              Entrar para confirmar
            </Button>
          )}
          {usuario?.rol === "admin" && (
            <Alert severity="info">Esta cuenta administra el vivero. Para comprar, entra como cliente.</Alert>
          )}
        </>
      )}
    </Stack>
  );
}
