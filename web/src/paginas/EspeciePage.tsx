import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { enviarArchivo, ErrorApi, solicitar, type Especie } from "../api";
import { useAuth } from "../auth";
import { FotoPlanta } from "../componentes/FotoPlanta";
import { OfertaVivero } from "../componentes/OfertaVivero";
import { ListaFuentes, TextoConEnlaces } from "../componentes/TextoConEnlaces";
import { fichaVacia, presentarEspecie, separarLista } from "../especies";

export function EspeciePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === "admin";
  const [especie, setEspecie] = useState<Especie | null>(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [cargando, setCargando] = useState(true);

  const [nombreComun, setNombreComun] = useState("");
  const [nombreCientifico, setNombreCientifico] = useState("");
  const [familia, setFamilia] = useState("");
  const [nativa, setNativa] = useState(true);
  const [usos, setUsos] = useState("");
  const [fuenteNombre, setFuenteNombre] = useState("");

  const [luz, setLuz] = useState("");
  const [riego, setRiego] = useState("");
  const [suelo, setSuelo] = useState("");
  const [trasplante, setTrasplante] = useState("");
  const [plagas, setPlagas] = useState("");
  const [fuenteCuidado, setFuenteCuidado] = useState("");
  const [errorCuidado, setErrorCuidado] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState("");
  const [errorFoto, setErrorFoto] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!id) return;
    const controlador = new AbortController();
    setCargando(true);
    setError("");
    solicitar<{ especie: Especie }>(`/api/especies/${id}`, { signal: controlador.signal })
      .then((datos) => setEspecie(datos.especie))
      .catch((fallo: unknown) => {
        if (fallo instanceof DOMException && fallo.name === "AbortError") return;
        setError(fallo instanceof ErrorApi ? fallo.message : "No se pudo abrir la especie.");
      })
      .finally(() => {
        if (!controlador.signal.aborted) setCargando(false);
      });
    return () => controlador.abort();
  }, [id]);

  useEffect(() => {
    if (!especie) return;
    setNombreComun(especie.nombreComun);
    setNombreCientifico(especie.nombreCientifico ?? "");
    setFamilia(especie.familia ?? "");
    setNativa(especie.nativa);
    setUsos(especie.usos.join(", "));
    setFuenteNombre(especie.fuentes.join("\n"));
    setLuz(especie.cuidado?.luz ?? "");
    setRiego(especie.cuidado?.riego ?? "");
    setSuelo(especie.cuidado?.suelo ?? "");
    setTrasplante(especie.cuidado?.trasplante ?? "");
    setPlagas((especie.cuidado?.plagas ?? []).join(", "));
    setFuenteCuidado(especie.cuidado?.fuente ?? "");
  }, [especie]);

  useEffect(() => {
    if (!archivo) {
      setVistaPrevia("");
      return;
    }
    const url = URL.createObjectURL(archivo);
    setVistaPrevia(url);
    return () => URL.revokeObjectURL(url);
  }, [archivo]);

  async function guardarEspecie(evento: FormEvent) {
    evento.preventDefault();
    if (!especie) return;
    const fuentes = fuenteNombre
      .split("\n")
      .map((linea) => linea.trim())
      .filter(Boolean);
    if (fuentes.length === 0) {
      setError("Indica al menos una fuente del nombre.");
      return;
    }
    setGuardando(true);
    setError("");
    setAviso("");
    try {
      const respuesta = await solicitar<{ especie: Especie }>(`/api/especies/${especie.id}`, {
        method: "PUT",
        body: JSON.stringify({
          nombreComun: nombreComun.trim(),
          nombreCientifico: nombreCientifico.trim(),
          familia: familia.trim(),
          nativa,
          usos: separarLista(usos),
          fuentes,
        }),
      });
      setEspecie(respuesta.especie);
      setAviso("Datos de la especie guardados.");
    } catch (fallo) {
      setError(fallo instanceof ErrorApi ? fallo.message : "No se pudo guardar la especie.");
    } finally {
      setGuardando(false);
    }
  }

  async function guardarCuidado(evento: FormEvent) {
    evento.preventDefault();
    if (!especie) return;
    const listaPlagas = separarLista(plagas);
    const hayContenido = [luz, riego, suelo, trasplante].some((valor) => valor.trim()) || listaPlagas.length > 0;
    if (hayContenido && !fuenteCuidado.trim()) {
      setErrorCuidado("Indica la fuente de la ficha de cuidado.");
      return;
    }
    setErrorCuidado("");
    setAviso("");
    setGuardando(true);
    try {
      const respuesta = await solicitar<{ especie: Especie }>(`/api/especies/${especie.id}/cuidado`, {
        method: "PUT",
        body: JSON.stringify({
          luz,
          riego,
          suelo,
          trasplante,
          plagas: listaPlagas,
          fuente: fuenteCuidado.trim(),
        }),
      });
      setEspecie(respuesta.especie);
      setAviso("Ficha de cuidado guardada.");
    } catch (fallo) {
      setErrorCuidado(fallo instanceof ErrorApi ? fallo.message : "No se pudo guardar la ficha.");
    } finally {
      setGuardando(false);
    }
  }

  function elegirFoto(evento: ChangeEvent<HTMLInputElement>) {
    const elegida = evento.target.files?.[0] ?? null;
    setErrorFoto("");
    if (!elegida) {
      setArchivo(null);
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(elegida.type)) {
      setArchivo(null);
      setErrorFoto("Elige una foto JPG, PNG o WebP.");
      return;
    }
    if (elegida.size > 10 * 1024 * 1024) {
      setArchivo(null);
      setErrorFoto("La foto pesa más de 10 MB.");
      return;
    }
    setArchivo(elegida);
  }

  async function guardarFoto(evento: FormEvent) {
    evento.preventDefault();
    if (!especie || !archivo) {
      setErrorFoto("Elige una foto antes de guardarla.");
      return;
    }
    setGuardando(true);
    setErrorFoto("");
    setAviso("");
    try {
      const respuesta = await enviarArchivo<{ especie: Especie }>(`/api/especies/${especie.id}/imagen`, archivo);
      setEspecie(respuesta.especie);
      setArchivo(null);
      setAviso("Foto guardada.");
    } catch (fallo) {
      setErrorFoto(fallo instanceof ErrorApi ? fallo.message : "No se pudo guardar la foto.");
    } finally {
      setGuardando(false);
    }
  }

  async function quitarFoto() {
    if (!especie) return;
    setGuardando(true);
    setErrorFoto("");
    setAviso("");
    try {
      const respuesta = await solicitar<{ especie: Especie }>(`/api/especies/${especie.id}/imagen`, {
        method: "DELETE",
      });
      setEspecie(respuesta.especie);
      setArchivo(null);
      setAviso("Foto quitada.");
    } catch (fallo) {
      setErrorFoto(fallo instanceof ErrorApi ? fallo.message : "No se pudo quitar la foto.");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar() {
    if (!especie) return;
    const confirma = window.confirm(`¿Eliminar ${especie.nombreComun} del catálogo?`);
    if (!confirma) return;
    setGuardando(true);
    setError("");
    try {
      await solicitar<void>(`/api/especies/${especie.id}`, { method: "DELETE" });
      navigate("/");
    } catch (fallo) {
      setError(fallo instanceof ErrorApi ? fallo.message : "No se pudo eliminar la especie.");
      setGuardando(false);
    }
  }

  if (cargando) return <Typography>Cargando ficha…</Typography>;
  if (!especie) return <Alert severity="error">{error || "No encontramos esa especie."}</Alert>;

  const vista = presentarEspecie(especie);
  const vacia = fichaVacia(especie.cuidado) && !especie.cuidado?.fuente;
  const altFoto = `Foto de ${vista.titulo}`;

  return (
    <Stack spacing={4} sx={{ maxWidth: 860 }}>
      <Button component={RouterLink} to="/" startIcon={<ArrowBackIcon />} sx={{ alignSelf: "flex-start" }}>
        Volver al catálogo
      </Button>
      <Stack direction={{ xs: "column", md: "row" }} spacing={3} sx={{ alignItems: { xs: "stretch", md: "flex-start" } }}>
        <Stack spacing={2.5} sx={{ flex: 1, minWidth: 0 }}>
          <Chip
            label={especie.nativa ? "Nativa" : "No marcada como nativa"}
            color={especie.nativa ? "primary" : "default"}
            sx={{ alignSelf: "flex-start" }}
          />
          <Typography variant="h1" sx={{ fontSize: { xs: 36, md: 48 }, fontStyle: vista.faltaNombreComun ? "italic" : "normal" }}>
            {vista.titulo}
          </Typography>
          {vista.faltaNombreComun && (
            <Typography color="text.secondary">Nombre común pendiente de completar.</Typography>
          )}
          {vista.cientifico && (
            <Typography sx={{ fontSize: 20, fontStyle: "italic" }}>{vista.cientifico}</Typography>
          )}
          {especie.familia && <Typography>Familia: {especie.familia}</Typography>}
          {especie.usos.length > 0 && <Typography>Usos: {especie.usos.join(", ")}</Typography>}
          <ListaFuentes titulo="Fuentes del nombre" textos={especie.fuentes} />
        </Stack>
        <Box sx={{ width: { xs: "100%", md: 320 }, flexShrink: 0 }}>
          <FotoPlanta src={vistaPrevia || especie.imagenUrl} alt={altFoto} />
          {esAdmin && (
            <Stack component="form" spacing={1.5} onSubmit={guardarFoto} sx={{ mt: 2 }}>
              <Typography component="label" htmlFor="foto-planta" sx={{ fontWeight: 600 }}>
                Foto de la planta
              </Typography>
              <Box
                component="input"
                id="foto-planta"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={elegirFoto}
                sx={{ font: "inherit", maxWidth: "100%" }}
              />
              <Typography variant="body2" color="text.secondary">
                JPG, PNG o WebP, hasta 10 MB. Así se reconoce la especie en el catálogo.
              </Typography>
              {errorFoto && <Alert severity="error">{errorFoto}</Alert>}
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                <Button type="submit" variant="contained" disabled={guardando || !archivo}>
                  Guardar foto
                </Button>
                {especie.imagenUrl && (
                  <Button type="button" variant="outlined" onClick={quitarFoto} disabled={guardando}>
                    Quitar foto
                  </Button>
                )}
              </Stack>
            </Stack>
          )}
        </Box>
      </Stack>

      <OfertaVivero especieId={especie.id} nombre={vista.titulo} />

      {aviso && <Alert severity="success">{aviso}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}

      <Stack spacing={2.5}>
        <Typography variant="h2" sx={{ fontSize: 28 }}>
          Ficha de cuidado
        </Typography>
        {vacia ? (
          <Alert severity="info">
            Esta ficha todavía no tiene datos de luz, riego, suelo ni plagas. Se completan cuando haya una fuente identificable.
          </Alert>
        ) : (
          <Stack spacing={2} component="dl" sx={{ m: 0 }}>
            <Dato etiqueta="Luz" valor={especie.cuidado?.luz} />
            <Dato etiqueta="Riego" valor={especie.cuidado?.riego} />
            <Dato etiqueta="Suelo" valor={especie.cuidado?.suelo} />
            <Dato etiqueta="Trasplante" valor={especie.cuidado?.trasplante} />
            <Dato
              etiqueta="Plagas"
              valor={especie.cuidado?.plagas.length ? especie.cuidado.plagas.join(", ") : null}
            />
            <Dato etiqueta="Fuente de la ficha" valor={especie.cuidado?.fuente} />
          </Stack>
        )}
      </Stack>

      {esAdmin && (
        <>
          <Divider />
          <Stack component="form" spacing={2} onSubmit={guardarEspecie}>
            <Typography variant="h2" sx={{ fontSize: 28 }}>
              Editar especie
            </Typography>
            <TextField label="Nombre común" required value={nombreComun} onChange={(evento) => setNombreComun(evento.target.value)} />
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
              helperText="Sepáralos con comas."
            />
            <TextField
              label="Fuentes"
              required
              multiline
              minRows={2}
              value={fuenteNombre}
              onChange={(evento) => setFuenteNombre(evento.target.value)}
              helperText="Una fuente por línea. Si pegas un enlace, en la ficha se podrá abrir y copiar."
            />
            <FormControlLabel
              control={<Switch checked={nativa} onChange={(evento) => setNativa(evento.target.checked)} />}
              label="Marcada como nativa"
            />
            <Button type="submit" variant="contained" disabled={guardando} sx={{ alignSelf: "flex-start" }}>
              Guardar especie
            </Button>
          </Stack>

          <Stack component="form" spacing={2} onSubmit={guardarCuidado}>
            <Typography variant="h2" sx={{ fontSize: 28 }}>
              Editar ficha de cuidado
            </Typography>
            {errorCuidado && <Alert severity="error">{errorCuidado}</Alert>}
            <TextField label="Luz" value={luz} onChange={(evento) => setLuz(evento.target.value)} />
            <TextField label="Riego" value={riego} onChange={(evento) => setRiego(evento.target.value)} />
            <TextField label="Suelo" value={suelo} onChange={(evento) => setSuelo(evento.target.value)} />
            <TextField label="Trasplante" value={trasplante} onChange={(evento) => setTrasplante(evento.target.value)} />
            <TextField
              label="Plagas"
              value={plagas}
              onChange={(evento) => setPlagas(evento.target.value)}
              helperText="Sepáralas con comas."
            />
            <TextField
              label="Fuente de la ficha"
              value={fuenteCuidado}
              onChange={(evento) => setFuenteCuidado(evento.target.value)}
              error={Boolean(errorCuidado)}
              helperText={errorCuidado || "Obligatoria si escribes luz, riego, suelo, trasplante o plagas."}
            />
            <Button type="submit" variant="contained" disabled={guardando} sx={{ alignSelf: "flex-start" }}>
              Guardar ficha
            </Button>
          </Stack>

          <Button variant="outlined" color="error" onClick={eliminar} disabled={guardando} sx={{ alignSelf: "flex-start" }}>
            Eliminar especie
          </Button>
        </>
      )}
    </Stack>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | null | undefined }) {
  if (!valor) return null;
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <Typography component="dt" sx={{ fontWeight: 600, mb: 1 }}>
        {etiqueta}
      </Typography>
      <Box component="dd" sx={{ m: 0 }}>
        <TextoConEnlaces texto={valor} />
      </Box>
    </Box>
  );
}
