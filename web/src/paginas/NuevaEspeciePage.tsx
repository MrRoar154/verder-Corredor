import { Alert, Button, FormControlLabel, Stack, Switch, TextField, Typography } from "@mui/material";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ErrorApi, solicitar, type Especie } from "../api";
import { separarLista } from "../especies";

export function NuevaEspeciePage() {
  const navigate = useNavigate();
  const [nombreComun, setNombreComun] = useState("");
  const [nombreCientifico, setNombreCientifico] = useState("");
  const [familia, setFamilia] = useState("");
  const [nativa, setNativa] = useState(true);
  const [usos, setUsos] = useState("");
  const [fuente, setFuente] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!fuente.trim()) {
      setError("Indica la fuente de donde sale el nombre.");
      return;
    }
    setError("");
    setEnviando(true);
    try {
      const respuesta = await solicitar<{ especie: Especie }>("/api/especies", {
        method: "POST",
        body: JSON.stringify({
          nombreComun: nombreComun.trim(),
          nombreCientifico: nombreCientifico.trim(),
          familia: familia.trim(),
          nativa,
          usos: separarLista(usos),
          fuentes: [fuente.trim()],
        }),
      });
      navigate(`/especies/${respuesta.especie.id}`);
    } catch (fallo) {
      setError(fallo instanceof ErrorApi ? fallo.message : "No se pudo guardar la especie.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Stack spacing={2} component="form" onSubmit={enviar} sx={{ maxWidth: 640 }}>
      <Typography variant="h1" sx={{ fontSize: 40 }}>
        Nueva especie
      </Typography>
      <Typography color="text.secondary">
        Agrega un nombre con su fuente. La ficha de luz y riego se completa en la página de la especie, y solo si hay de dónde citarla.
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <TextField
        label="Nombre común"
        required
        value={nombreComun}
        onChange={(evento) => setNombreComun(evento.target.value)}
        helperText="Si todavía no lo tienes, escribe el nombre científico y lo marcas después."
      />
      <TextField
        label="Nombre científico"
        value={nombreCientifico}
        onChange={(evento) => setNombreCientifico(evento.target.value)}
      />
      <TextField label="Familia" value={familia} onChange={(evento) => setFamilia(evento.target.value)} />
      <TextField
        label="Usos"
        value={usos}
        onChange={(evento) => setUsos(evento.target.value)}
        helperText="Opcional. Separa los usos con comas."
      />
      <TextField
        label="Fuente"
        required
        value={fuente}
        onChange={(evento) => setFuente(evento.target.value)}
        helperText="Libro, artículo o vivero del que sale el nombre."
      />
      <FormControlLabel
        control={<Switch checked={nativa} onChange={(evento) => setNativa(evento.target.checked)} />}
        label="Marcada como nativa"
      />
      <Button type="submit" variant="contained" disabled={enviando} sx={{ alignSelf: "flex-start" }}>
        {enviando ? "Guardando…" : "Guardar especie"}
      </Button>
    </Stack>
  );
}
