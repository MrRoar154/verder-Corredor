import { Alert, Button, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useState, type FormEvent } from "react";
import { ErrorApi, solicitar, type Negocio } from "../api";

export function ViveroPage() {
  const [nombre, setNombre] = useState("");
  const [sector, setSector] = useState("");
  const [telefono, setTelefono] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [existe, setExiste] = useState(false);

  useEffect(() => {
    const controlador = new AbortController();
    solicitar<{ negocio: Negocio | null }>("/api/negocio", { signal: controlador.signal })
      .then((datos) => {
        if (!datos.negocio) return;
        setExiste(true);
        setNombre(datos.negocio.nombre);
        setSector(datos.negocio.sector ?? "");
        setTelefono(datos.negocio.telefono ?? "");
      })
      .catch((fallo: unknown) => {
        if (fallo instanceof DOMException && fallo.name === "AbortError") return;
        setError(fallo instanceof ErrorApi ? fallo.message : "No se pudo cargar el vivero.");
      })
      .finally(() => {
        if (!controlador.signal.aborted) setCargando(false);
      });
    return () => controlador.abort();
  }, []);

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    setGuardando(true);
    setError("");
    setAviso("");
    try {
      const respuesta = await solicitar<{ negocio: Negocio }>("/api/negocio", {
        method: "PUT",
        body: JSON.stringify({ nombre: nombre.trim(), sector: sector.trim(), telefono: telefono.trim() }),
      });
      setExiste(true);
      setNombre(respuesta.negocio.nombre);
      setAviso("Datos del vivero guardados. Ya puedes cargar el inventario.");
    } catch (fallo) {
      setError(fallo instanceof ErrorApi ? fallo.message : "No se pudo guardar el vivero.");
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) return <Typography>Cargando vivero…</Typography>;

  return (
    <Stack component="form" spacing={2} onSubmit={guardar} sx={{ maxWidth: 560 }}>
      <Typography variant="h1" sx={{ fontSize: { xs: 36, md: 44 } }}>
        {existe ? "Datos del vivero" : "Registrar el vivero"}
      </Typography>
      <Typography color="text.secondary">
        Este es el vivero que vende las plantas del catálogo. El nombre, el sector y el teléfono los escribes tú.
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {aviso && <Alert severity="success">{aviso}</Alert>}
      <TextField label="Nombre del vivero" required value={nombre} onChange={(evento) => setNombre(evento.target.value)} />
      <TextField
        label="Sector"
        value={sector}
        onChange={(evento) => setSector(evento.target.value)}
        helperText="Barrio o zona de Villavicencio, si ya la conoces."
      />
      <TextField label="Teléfono" value={telefono} onChange={(evento) => setTelefono(evento.target.value)} />
      <Button type="submit" variant="contained" disabled={guardando} sx={{ alignSelf: "flex-start" }}>
        {guardando ? "Guardando…" : "Guardar vivero"}
      </Button>
    </Stack>
  );
}
