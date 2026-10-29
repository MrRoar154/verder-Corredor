import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { Box, Button, Link, Stack, Typography } from "@mui/material";
import { useState } from "react";
import { partirEnlaces } from "../enlaces";

export function TextoConEnlaces({ texto }: { texto: string }) {
  const trozos = partirEnlaces(texto);
  return (
    <Stack spacing={1.25} sx={{ userSelect: "text" }}>
      {trozos.map((trozo, indice) =>
        trozo.tipo === "enlace" ? (
          <EnlaceExterno key={`${trozo.valor}-${indice}`} url={trozo.valor} />
        ) : (
          trozo.valor.trim() && (
            <Typography key={`${indice}-${trozo.valor.slice(0, 12)}`} sx={{ lineHeight: 1.6, overflowWrap: "anywhere" }}>
              {trozo.valor}
            </Typography>
          )
        ),
      )}
    </Stack>
  );
}

function EnlaceExterno({ url }: { url: string }) {
  const [aviso, setAviso] = useState("");

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setAviso("Enlace copiado.");
    } catch {
      setAviso("Selecciona el enlace de arriba y cópialo con Ctrl+C.");
    }
  }

  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 2,
        bgcolor: "#F0FDF4",
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Link
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        sx={{ display: "inline", overflowWrap: "anywhere", userSelect: "text", fontWeight: 600 }}
      >
        {url}
      </Link>
      <Stack direction="row" spacing={1} sx={{ mt: 1.25, flexWrap: "wrap" }}>
        <Button
          component="a"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          variant="contained"
          size="small"
          startIcon={<OpenInNewIcon />}
        >
          Abrir
        </Button>
        <Button variant="outlined" size="small" startIcon={<ContentCopyIcon />} onClick={copiar}>
          Copiar
        </Button>
      </Stack>
      {aviso && (
        <Typography variant="body2" sx={{ mt: 1 }} role="status">
          {aviso}
        </Typography>
      )}
    </Box>
  );
}

export function ListaFuentes({ titulo, textos }: { titulo: string; textos: string[] }) {
  if (textos.length === 0) return null;
  return (
    <Stack spacing={1.5} component="section">
      <Typography variant="h2" sx={{ fontSize: 22 }}>
        {titulo}
      </Typography>
      <Stack component="ul" spacing={1.5} sx={{ listStyle: "none", m: 0, p: 0 }}>
        {textos.map((texto) => (
          <Box
            component="li"
            key={texto}
            sx={{
              p: 2,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
            }}
          >
            <TextoConEnlaces texto={texto} />
          </Box>
        ))}
      </Stack>
    </Stack>
  );
}
