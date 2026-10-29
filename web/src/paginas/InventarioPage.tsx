import { Alert, Button, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useState, type FormEvent } from "react";
import { Link as RouterLink } from "react-router-dom";
import { ErrorApi, solicitar, type EspecieLista, type Existencia } from "../api";
import { pesos } from "../pesos";

type Borrador = {
  especieId: string;
  presentacion: string;
  tamano: string;
  precio: string;
  cantidad: string;
  minimo: string;
  ubicacion: string;
};

const vacio: Borrador = {
  especieId: "",
  presentacion: "",
  tamano: "",
  precio: "",
  cantidad: "",
  minimo: "",
  ubicacion: "",
};

function entero(valor: string): number | null {
  if (!/^\d+$/.test(valor.trim())) return null;
  return Number(valor.trim());
}

export function InventarioPage() {
  const [especies, setEspecies] = useState<EspecieLista[]>([]);
  const [filas, setFilas] = useState<Existencia[]>([]);
  const [negocio, setNegocio] = useState<{ id: string; nombre: string } | null>(null);
  const [borrador, setBorrador] = useState<Borrador>(vacio);
  const [editando, setEditando] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  function cargar() {
    return Promise.all([
      solicitar<{ especies: EspecieLista[] }>("/api/especies?lista=1"),
      solicitar<{ negocio: { id: string; nombre: string } | null; existencias: Existencia[] }>("/api/existencias"),
    ]).then(([lista, stock]) => {
      setEspecies(lista.especies);
      setNegocio(stock.negocio);
      setFilas(stock.existencias);
    });
  }

  useEffect(() => {
    const controlador = new AbortController();
    setCargando(true);
    Promise.all([
      solicitar<{ especies: EspecieLista[] }>("/api/especies?lista=1", { signal: controlador.signal }),
      solicitar<{ negocio: { id: string; nombre: string } | null; existencias: Existencia[] }>("/api/existencias", {
        signal: controlador.signal,
      }),
    ])
      .then(([lista, stock]) => {
        setEspecies(lista.especies);
        setNegocio(stock.negocio);
        setFilas(stock.existencias);
      })
      .catch((fallo: unknown) => {
        if (fallo instanceof DOMException && fallo.name === "AbortError") return;
        setError(fallo instanceof ErrorApi ? fallo.message : "No se pudo cargar el inventario.");
      })
      .finally(() => {
        if (!controlador.signal.aborted) setCargando(false);
      });
    return () => controlador.abort();
  }, []);

  function campo<K extends keyof Borrador>(clave: K, valor: Borrador[K]) {
    setBorrador((previo) => ({ ...previo, [clave]: valor }));
  }

  function empezarEdicion(fila: Existencia) {
    setEditando(fila.id);
    setError("");
    setAviso("");
    setBorrador({
      especieId: fila.especieId,
      presentacion: fila.presentacion,
      tamano: fila.tamanoCm ? String(fila.tamanoCm) : "",
      precio: String(fila.precioCop),
      cantidad: String(fila.cantidad),
      minimo: String(fila.stockMinimo),
      ubicacion: fila.ubicacion ?? "",
    });
  }

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    const precio = entero(borrador.precio);
    const cantidad = entero(borrador.cantidad);
    const tamano = borrador.tamano.trim() ? entero(borrador.tamano) : null;
    const minimo = borrador.minimo.trim() ? entero(borrador.minimo) : 0;
    if (!borrador.especieId) {
      setError("Elige una especie.");
      return;
    }
    if (precio === null || cantidad === null || (borrador.tamano.trim() !== "" && tamano === null) || (borrador.minimo.trim() !== "" && minimo === null)) {
      setError("Precio, cantidad y tamaño deben ser números enteros.");
      return;
    }
    setGuardando(true);
    setError("");
    setAviso("");
    const cuerpo = {
      especieId: borrador.especieId,
      presentacion: borrador.presentacion.trim(),
      tamanoCm: tamano,
      precioCop: precio,
      cantidad,
      stockMinimo: minimo,
      ubicacion: borrador.ubicacion.trim(),
    };
    try {
      if (editando) {
        await solicitar(`/api/existencias/${editando}`, { method: "PUT", body: JSON.stringify(cuerpo) });
        setAviso("Existencia actualizada.");
      } else {
        await solicitar("/api/existencias", { method: "POST", body: JSON.stringify(cuerpo) });
        setAviso("Planta agregada al inventario.");
      }
      setEditando(null);
      setBorrador(vacio);
      await cargar();
    } catch (fallo) {
      setError(fallo instanceof ErrorApi ? fallo.message : "No se pudo guardar la existencia.");
    } finally {
      setGuardando(false);
    }
  }

  async function quitar(fila: Existencia) {
    const confirma = window.confirm(`¿Quitar ${fila.nombreComun} (${fila.presentacion}) del inventario?`);
    if (!confirma) return;
    setGuardando(true);
    setError("");
    setAviso("");
    try {
      await solicitar(`/api/existencias/${fila.id}`, { method: "DELETE" });
      if (editando === fila.id) {
        setEditando(null);
        setBorrador(vacio);
      }
      setAviso("Existencia quitada.");
      await cargar();
    } catch (fallo) {
      setError(fallo instanceof ErrorApi ? fallo.message : "No se pudo quitar la existencia.");
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) return <Typography>Cargando inventario…</Typography>;

  if (!negocio) {
    return (
      <Stack spacing={2} sx={{ maxWidth: 640 }}>
        <Typography variant="h1" sx={{ fontSize: { xs: 36, md: 44 } }}>
          Inventario
        </Typography>
        <Alert severity="info">Primero registra el vivero. Sin ese dato no hay dónde guardar las plantas.</Alert>
        <Button component={RouterLink} to="/vivero" variant="contained" sx={{ alignSelf: "flex-start" }}>
          Ir al vivero
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={3} sx={{ maxWidth: 760 }}>
      <Typography variant="h1" sx={{ fontSize: { xs: 36, md: 44 } }}>
        Inventario de {negocio.nombre}
      </Typography>
      <Typography color="text.secondary">
        Cada fila es una presentación: bolsa, matera u otra forma de vender la planta, con su precio y cuántas hay.
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {aviso && <Alert severity="success">{aviso}</Alert>}

      <Stack component="form" spacing={2} onSubmit={guardar}>
        <Typography variant="h2" sx={{ fontSize: 24 }}>
          {editando ? "Editar existencia" : "Agregar al inventario"}
        </Typography>
        <TextField
          select
          label="Especie"
          required
          value={borrador.especieId}
          onChange={(evento) => campo("especieId", evento.target.value)}
        >
          <MenuItem value="">Elige una especie</MenuItem>
          {especies.map((especie) => (
            <MenuItem key={especie.id} value={especie.id}>
              {especie.nombreComun}
              {especie.nombreCientifico ? ` (${especie.nombreCientifico})` : ""}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Presentación"
          required
          value={borrador.presentacion}
          onChange={(evento) => campo("presentacion", evento.target.value)}
          helperText="Por ejemplo: bolsa, matera o raíz desnuda."
        />
        <TextField
          label="Tamaño en cm"
          value={borrador.tamano}
          onChange={(evento) => campo("tamano", evento.target.value)}
          helperText="Opcional. Déjalo vacío si no aplica."
        />
        <TextField
          label="Precio en pesos"
          required
          value={borrador.precio}
          onChange={(evento) => campo("precio", evento.target.value)}
        />
        <TextField
          label="Cantidad disponible"
          required
          value={borrador.cantidad}
          onChange={(evento) => campo("cantidad", evento.target.value)}
        />
        <TextField
          label="Cantidad mínima"
          value={borrador.minimo}
          onChange={(evento) => campo("minimo", evento.target.value)}
          helperText="Aviso cuando queden estas unidades o menos. 0 desactiva el aviso."
        />
        <TextField
          label="Ubicación en el vivero"
          value={borrador.ubicacion}
          onChange={(evento) => campo("ubicacion", evento.target.value)}
        />
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
          <Button type="submit" variant="contained" disabled={guardando}>
            {editando ? "Guardar cambios" : "Agregar"}
          </Button>
          {editando && (
            <Button
              type="button"
              variant="outlined"
              onClick={() => {
                setEditando(null);
                setBorrador(vacio);
              }}
            >
              Cancelar edición
            </Button>
          )}
        </Stack>
      </Stack>

      {filas.length === 0 && <Alert severity="info">Todavía no hay plantas en el inventario.</Alert>}
      {filas.map((fila) => {
        const bajo = fila.stockMinimo > 0 && fila.cantidad <= fila.stockMinimo;
        const detalle = [fila.presentacion, fila.tamanoCm ? `${fila.tamanoCm} cm` : null, fila.ubicacion]
          .filter(Boolean)
          .join(" · ");
        return (
          <Stack
            key={fila.id}
            spacing={1}
            sx={{ p: 2, borderRadius: 2, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}
          >
            <Typography variant="h2" sx={{ fontSize: 22 }}>
              {fila.nombreComun}
            </Typography>
            {fila.nombreCientifico && (
              <Typography sx={{ fontStyle: "italic" }}>{fila.nombreCientifico}</Typography>
            )}
            <Typography>{detalle}</Typography>
            <Typography>
              {pesos(fila.precioCop)} · {fila.cantidad} disponibles
              {bajo ? " · Por debajo del mínimo" : ""}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={() => empezarEdicion(fila)} disabled={guardando}>
                Editar
              </Button>
              <Button variant="outlined" color="error" onClick={() => quitar(fila)} disabled={guardando}>
                Quitar
              </Button>
            </Stack>
          </Stack>
        );
      })}
    </Stack>
  );
}
