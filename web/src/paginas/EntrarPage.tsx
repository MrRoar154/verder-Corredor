import { Alert, Box, Button, Link, Stack, TextField, Typography } from "@mui/material";
import { useState, type FormEvent } from "react";
import { Link as RouterLink, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ErrorApi } from "../api";
import { useAuth } from "../auth";

export function EntrarPage() {
  const { usuario, listo, entrar } = useAuth();
  const navigate = useNavigate();
  const lugar = useLocation();
  const destino =
    typeof (lugar.state as { desde?: unknown } | null)?.desde === "string" &&
    (lugar.state as { desde: string }).desde.startsWith("/") &&
    !(lugar.state as { desde: string }).desde.startsWith("//")
      ? (lugar.state as { desde: string }).desde
      : "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (listo && usuario) return <Navigate to={destino} replace />;

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setError("");
    setEnviando(true);
    try {
      await entrar({ email: email.trim(), password });
      navigate(destino);
    } catch (fallo) {
      setError(fallo instanceof ErrorApi ? fallo.message : "No se pudo entrar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Box sx={{ maxWidth: 440, mx: "auto" }}>
      <Typography variant="h1" sx={{ fontSize: 40, mb: 1 }}>
        Entrar
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        El catálogo se consulta sin cuenta. Entra para pedir plantas o, si eres administrador, para cargar el vivero.
      </Typography>
      <Stack component="form" spacing={2} onSubmit={enviar}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label="Correo"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(evento) => setEmail(evento.target.value)}
        />
        <TextField
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(evento) => setPassword(evento.target.value)}
        />
        <Button type="submit" variant="contained" disabled={enviando}>
          {enviando ? "Entrando…" : "Entrar"}
        </Button>
      </Stack>
      <Typography sx={{ mt: 2 }}>
        ¿No tienes cuenta?{" "}
        <Link component={RouterLink} to="/registro">
          Crear cuenta
        </Link>
      </Typography>
    </Box>
  );
}
