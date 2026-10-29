import { Alert, Button, Chip, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { ErrorApi, solicitar, type EstadoPedido, type Pedido } from "../api";
import { useAuth } from "../auth";
import { fechaLocal, pesos } from "../pesos";

const etiqueta: Record<EstadoPedido, string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export function PedidosPage() {
  const { usuario, listo } = useAuth();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);

  function cargar() {
    return solicitar<{ pedidos: Pedido[] }>("/api/pedidos").then((datos) => setPedidos(datos.pedidos));
  }

  useEffect(() => {
    if (!listo || !usuario) return;
    const controlador = new AbortController();
    setCargando(true);
    solicitar<{ pedidos: Pedido[] }>("/api/pedidos", { signal: controlador.signal })
      .then((datos) => setPedidos(datos.pedidos))
      .catch((fallo: unknown) => {
        if (fallo instanceof DOMException && fallo.name === "AbortError") return;
        setError(fallo instanceof ErrorApi ? fallo.message : "No se pudieron cargar los pedidos.");
      })
      .finally(() => {
        if (!controlador.signal.aborted) setCargando(false);
      });
    return () => controlador.abort();
  }, [listo, usuario]);

  async function cambiar(pedido: Pedido, estado: EstadoPedido) {
    if (estado === "cancelado") {
      const confirma = window.confirm("¿Cancelar este pedido? Las plantas vuelven al inventario.");
      if (!confirma) return;
    }
    setOcupado(pedido.id);
    setError("");
    setAviso("");
    try {
      await solicitar(`/api/pedidos/${pedido.id}/estado`, {
        method: "PATCH",
        body: JSON.stringify({ estado }),
      });
      setAviso("Pedido actualizado.");
      await cargar();
    } catch (fallo) {
      setError(fallo instanceof ErrorApi ? fallo.message : "No se pudo actualizar el pedido.");
    } finally {
      setOcupado(null);
    }
  }

  if (!listo) return <Typography>Cargando sesión…</Typography>;
  if (!usuario) return <Navigate to="/entrar" state={{ desde: "/pedidos" }} replace />;
  if (cargando) return <Typography>Cargando pedidos…</Typography>;

  const esAdmin = usuario.rol === "admin";

  return (
    <Stack spacing={2.5} sx={{ maxWidth: 760 }}>
      <Typography variant="h1" sx={{ fontSize: { xs: 36, md: 44 } }}>
        {esAdmin ? "Pedidos del vivero" : "Mis pedidos"}
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {aviso && <Alert severity="success">{aviso}</Alert>}
      {pedidos.length === 0 && (
        <Alert severity="info">
          {esAdmin ? "Todavía no hay pedidos." : "Todavía no has hecho un pedido."}
        </Alert>
      )}
      {pedidos.map((pedido) => (
        <Stack
          key={pedido.id}
          spacing={1.5}
          sx={{ p: 2, borderRadius: 2, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
            <Typography sx={{ fontWeight: 600 }}>Pedido {pedido.id}</Typography>
            <Chip label={etiqueta[pedido.estado]} color={pedido.estado === "cancelado" ? "default" : "primary"} />
          </Stack>
          <Typography color="text.secondary">
            {fechaLocal(pedido.creadoEn)}
            {esAdmin ? ` · ${pedido.cliente.nombre}` : ` · ${pedido.negocio.nombre}`}
          </Typography>
          {pedido.items.map((item) => (
            <Typography key={item.id}>
              {item.cantidad} × {item.descripcion} · {pesos(item.precioUnitCop)}
            </Typography>
          ))}
          <Typography sx={{ fontWeight: 600 }}>Total {pesos(pedido.totalCop)}</Typography>
          <Stack component="ol" spacing={0.5} sx={{ m: 0, pl: 2 }}>
            {pedido.historial.map((paso, indice) => (
              <Typography key={`${paso.fecha}-${indice}`} component="li" variant="body2">
                {etiqueta[paso.estado]} · {fechaLocal(paso.fecha)}
              </Typography>
            ))}
          </Stack>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
            {esAdmin && pedido.estado === "pendiente" && (
              <Button variant="contained" disabled={ocupado === pedido.id} onClick={() => cambiar(pedido, "confirmado")}>
                Confirmar
              </Button>
            )}
            {esAdmin && pedido.estado === "confirmado" && (
              <Button variant="contained" disabled={ocupado === pedido.id} onClick={() => cambiar(pedido, "entregado")}>
                Marcar entregado
              </Button>
            )}
            {esAdmin && (pedido.estado === "pendiente" || pedido.estado === "confirmado") && (
              <Button variant="outlined" color="error" disabled={ocupado === pedido.id} onClick={() => cambiar(pedido, "cancelado")}>
                Cancelar
              </Button>
            )}
            {!esAdmin && pedido.estado === "pendiente" && (
              <Button variant="outlined" color="error" disabled={ocupado === pedido.id} onClick={() => cambiar(pedido, "cancelado")}>
                Cancelar pedido
              </Button>
            )}
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
}
