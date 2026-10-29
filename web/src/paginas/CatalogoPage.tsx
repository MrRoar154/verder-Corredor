import SearchIcon from "@mui/icons-material/Search";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState, type FormEvent } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { ErrorApi, solicitar, type PaginaEspecies } from "../api";
import { useAuth } from "../auth";
import { FotoPlanta } from "../componentes/FotoPlanta";
import { tieneEnlace } from "../enlaces";
import { presentarEspecie } from "../especies";
import { pesos } from "../pesos";

export function CatalogoPage() {
  const { usuario } = useAuth();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const pagina = Math.max(1, Number(params.get("page") ?? 1) || 1);
  const [borrador, setBorrador] = useState(q);
  const [datos, setDatos] = useState<PaginaEspecies | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setBorrador(q);
  }, [q]);

  useEffect(() => {
    const controlador = new AbortController();
    const consulta = new URLSearchParams();
    if (q) consulta.set("q", q);
    consulta.set("page", String(pagina));
    setCargando(true);
    setError("");
    solicitar<PaginaEspecies>(`/api/especies?${consulta.toString()}`, { signal: controlador.signal })
      .then(setDatos)
      .catch((fallo: unknown) => {
        if (fallo instanceof DOMException && fallo.name === "AbortError") return;
        setError(fallo instanceof ErrorApi ? fallo.message : "No se pudo cargar el catálogo.");
      })
      .finally(() => {
        if (!controlador.signal.aborted) setCargando(false);
      });
    return () => controlador.abort();
  }, [q, pagina]);

  function buscar(evento: FormEvent) {
    evento.preventDefault();
    const siguientes = new URLSearchParams();
    const texto = borrador.trim();
    if (texto) siguientes.set("q", texto);
    setParams(siguientes);
  }

  const total = datos?.total ?? 0;
  const tamano = datos?.tamano ?? 12;
  const desde = total === 0 ? 0 : (pagina - 1) * tamano + 1;
  const hasta = Math.min(pagina * tamano, total);
  const haySiguiente = pagina * tamano < total;

  function irAPagina(siguiente: number) {
    const paramsNuevos = new URLSearchParams(params);
    paramsNuevos.set("page", String(siguiente));
    setParams(paramsNuevos);
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h1" sx={{ fontSize: { xs: 36, md: 48 }, lineHeight: 1.15 }}>
          Catálogo de especies
        </Typography>
        <Typography sx={{ mt: 1, maxWidth: 680, color: "text.secondary" }}>
          Nombres del corredor y de Villavicencio. La búsqueda ignora tildes y mayúsculas.
          {usuario?.rol === "admin"
            ? " Como administrador puedes cargar el vivero, el inventario y las fichas."
            : " Si una especie está disponible, entra con tu cuenta para pedirla."}
        </Typography>
      </Box>

      <Box component="form" onSubmit={buscar} sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        <TextField
          label="Buscar por nombre común o científico"
          value={borrador}
          onChange={(evento) => setBorrador(evento.target.value)}
          helperText="Por ejemplo: guacimo, ocobo o Tabebuia."
          fullWidth
          sx={{ flex: "1 1 280px" }}
        />
        <Button type="submit" variant="contained" startIcon={<SearchIcon />} sx={{ alignSelf: "flex-start" }}>
          Buscar
        </Button>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      {cargando && (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }} aria-live="polite">
          <CircularProgress size={22} />
          <Typography>Cargando especies…</Typography>
        </Stack>
      )}

      {!cargando && datos && datos.especies.length === 0 && (
        <Alert severity="info">Ninguna especie coincide con esa búsqueda.</Alert>
      )}

      {!cargando && datos && datos.especies.length > 0 && (
        <>
          <Typography variant="body2" color="text.secondary">
            {desde}–{hasta} de {total}
          </Typography>
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" },
            }}
          >
            {datos.especies.map((especie) => {
              const vista = presentarEspecie(especie);
              return (
                <Card key={especie.id} variant="outlined" sx={{ borderColor: "divider", overflow: "hidden" }}>
                  <CardActionArea component={RouterLink} to={`/especies/${especie.id}`} sx={{ height: "100%", alignItems: "stretch" }}>
                    {especie.imagenUrl && <FotoPlanta src={especie.imagenUrl} alt={`Foto de ${vista.titulo}`} alto={180} />}
                    <CardContent>
                      <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                        <Chip
                          size="small"
                          label={especie.nativa ? "Nativa" : "No marcada como nativa"}
                          color={especie.nativa ? "primary" : "default"}
                        />
                      </Stack>
                      <Typography
                        variant="h2"
                        sx={{ fontSize: 26, fontStyle: vista.faltaNombreComun ? "italic" : "normal" }}
                      >
                        {vista.titulo}
                      </Typography>
                      {vista.faltaNombreComun && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          Nombre común pendiente de completar
                        </Typography>
                      )}
                      {vista.cientifico && (
                        <Typography variant="body1" sx={{ mt: 0.5, fontStyle: "italic" }}>
                          {vista.cientifico}
                        </Typography>
                      )}
                      {especie.disponible && especie.precioDesde !== null && (
                        <Typography sx={{ mt: 1, fontWeight: 600 }}>Disponible desde {pesos(especie.precioDesde)}</Typography>
                      )}
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 2, lineHeight: 1.5 }}>
                        {especie.fuentes[0] && tieneEnlace(especie.fuentes[0])
                          ? "La fuente tiene un enlace. Ábrelo dentro de la ficha."
                          : especie.fuentes[0]}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              );
            })}
          </Box>
          {total > tamano && (
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" disabled={pagina <= 1} onClick={() => irAPagina(pagina - 1)}>
                Anterior
              </Button>
              <Button variant="outlined" disabled={!haySiguiente} onClick={() => irAPagina(pagina + 1)}>
                Siguiente
              </Button>
            </Stack>
          )}
        </>
      )}
    </Stack>
  );
}
