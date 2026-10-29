import { Alert, Button, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { ErrorApi, solicitar, type Existencia } from "../api";
import { useAuth } from "../auth";
import { useCarrito } from "../carrito";
import { pesos } from "../pesos";

export function OfertaVivero({ especieId, nombre }: { especieId: string; nombre: string }) {
  const { usuario, listo } = useAuth();
  const { agregar } = useCarrito();
  const [negocio, setNegocio] = useState<{ id: string; nombre: string } | null>(null);
  const [filas, setFilas] = useState<Existencia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [cantidades, setCantidades] = useState<Record<string, string>>({});

  useEffect(() => {
    const controlador = new AbortController();
    setCargando(true);
    solicitar<{ negocio: { id: string; nombre: string } | null; existencias: Existencia[] }>(
      `/api/existencias?especieId=${especieId}`,
      { signal: controlador.signal },
    )
      .then((datos) => {
        setNegocio(datos.negocio);
        setFilas(datos.existencias);
      })
      .catch((fallo: unknown) => {
        if (fallo instanceof DOMException && fallo.name === "AbortError") return;
        setError(fallo instanceof ErrorApi ? fallo.message : "No se pudo ver la disponibilidad.");
      })
      .finally(() => {
        if (!controlador.signal.aborted) setCargando(false);
      });
    return () => controlador.abort();
  }, [especieId]);

  function pedir(fila: Existencia) {
    const texto = cantidades[fila.id] ?? "1";
    const cantidad = Number(texto);
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      setAviso("");
      setError("Escribe cuántas unidades quieres.");
      return;
    }
    const resultado = agregar({
      existenciaId: fila.id,
      especieId: fila.especieId,
      nombre,
      presentacion: fila.presentacion,
      tamanoCm: fila.tamanoCm,
      precioCop: fila.precioCop,
      cantidad,
      disponible: fila.cantidad,
    });
    setError("");
    setAviso(
      resultado === "agregado"
        ? "Quedó en el pedido. Puedes seguir mirando el catálogo o confirmarlo en el carrito."
        : "No hay más unidades disponibles de esa presentación.",
    );
  }

  if (cargando) return <Typography>Revisando si el vivero tiene esta especie…</Typography>;
  if (error && filas.length === 0) return <Alert severity="error">{error}</Alert>;

  return (
    <Stack spacing={2}>
      <Typography variant="h2" sx={{ fontSize: 28 }}>
        Disponible en el vivero
      </Typography>
      {aviso && <Alert severity={aviso.startsWith("No hay") ? "warning" : "success"}>{aviso}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      {!negocio && (
        <Alert severity="info">
          El vivero todavía no está registrado, así que esta especie no se puede pedir.
          {usuario?.rol === "admin" && " Regístralo en Vivero."}
        </Alert>
      )}
      {negocio && filas.length === 0 && (
        <Alert severity="info">
          {negocio.nombre} todavía no tiene {nombre} en inventario.
          {usuario?.rol === "admin" && " Cárgala en Inventario."}
        </Alert>
      )}
      {filas.map((fila) => {
        const detalle = [fila.presentacion, fila.tamanoCm ? `${fila.tamanoCm} cm` : null, fila.ubicacion]
          .filter(Boolean)
          .join(" · ");
        return (
          <Stack
            key={fila.id}
            spacing={1.5}
            sx={{ p: 2, borderRadius: 2, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}
          >
            <Typography sx={{ fontWeight: 600 }}>{detalle}</Typography>
            <Typography>
              {pesos(fila.precioCop)} · {fila.cantidad > 0 ? `${fila.cantidad} disponibles` : "Agotada"}
            </Typography>
            {fila.cantidad > 0 && listo && usuario?.rol === "cliente" && (
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" } }}>
                <TextField
                  label="Cantidad"
                  type="number"
                  value={cantidades[fila.id] ?? "1"}
                  onChange={(evento) => setCantidades((previas) => ({ ...previas, [fila.id]: evento.target.value }))}
                  slotProps={{ htmlInput: { min: 1, max: fila.cantidad } }}
                  sx={{ width: { xs: "100%", sm: 140 } }}
                />
                <Button variant="contained" onClick={() => pedir(fila)}>
                  Agregar al pedido
                </Button>
              </Stack>
            )}
            {fila.cantidad > 0 && listo && !usuario && (
              <Button
                component={RouterLink}
                to="/entrar"
                state={{ desde: `/especies/${especieId}` }}
                variant="contained"
                sx={{ alignSelf: "flex-start" }}
              >
                Entrar para pedir
              </Button>
            )}
            {fila.cantidad > 0 && usuario?.rol === "admin" && (
              <Typography variant="body2" color="text.secondary">
                Para comprar, entra con una cuenta de cliente. El inventario se edita en Inventario.
              </Typography>
            )}
          </Stack>
        );
      })}
    </Stack>
  );
}
