import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  FormHelperText,
  Link,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState, type FormEvent } from "react";
import { Link as RouterLink, Navigate, useNavigate } from "react-router-dom";
import { ErrorApi } from "../api";
import { useAuth } from "../auth";

export function RegistroPage() {
  const { usuario, listo, registrar } = useAuth();
  const navigate = useNavigate();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consentimiento, setConsentimiento] = useState(false);
  const [error, setError] = useState("");
  const [errorConsentimiento, setErrorConsentimiento] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (listo && usuario) return <Navigate to="/" replace />;

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!consentimiento) {
      setErrorConsentimiento("Acepta el tratamiento de datos para crear la cuenta.");
      return;
    }
    setError("");
    setErrorConsentimiento("");
    setEnviando(true);
    try {
      await registrar({
        nombre: nombre.trim(),
        email: email.trim(),
        password,
        consentimiento: true,
      });
      navigate("/");
    } catch (fallo) {
      setError(fallo instanceof ErrorApi ? fallo.message : "No se pudo crear la cuenta.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Box sx={{ maxWidth: 480, mx: "auto" }}>
      <Typography variant="h1" sx={{ fontSize: 40, mb: 1 }}>
        Crear cuenta
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        La cuenta nueva entra como cliente. Con ella puedes armar un pedido cuando el vivero tenga plantas disponibles.
      </Typography>
      <Stack component="form" spacing={2} onSubmit={enviar}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label="Nombre"
          autoComplete="name"
          required
          value={nombre}
          onChange={(evento) => setNombre(evento.target.value)}
          helperText="Así te vamos a mostrar en la barra."
        />
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
          autoComplete="new-password"
          required
          value={password}
          onChange={(evento) => setPassword(evento.target.value)}
          helperText="Al menos 8 caracteres."
          slotProps={{ htmlInput: { minLength: 8 } }}
        />
        <Box>
          <FormControlLabel
            control={
              <Checkbox
                checked={consentimiento}
                onChange={(evento) => {
                  setConsentimiento(evento.target.checked);
                  setErrorConsentimiento("");
                }}
              />
            }
            label="Acepto el tratamiento de mi nombre y correo para usar VerdeCorredor (Ley 1581 de 2012)."
          />
          {errorConsentimiento && <FormHelperText error>{errorConsentimiento}</FormHelperText>}
        </Box>
        <Button type="submit" variant="contained" disabled={enviando}>
          {enviando ? "Creando cuenta…" : "Crear cuenta"}
        </Button>
      </Stack>
      <Typography sx={{ mt: 2 }}>
        ¿Ya tienes cuenta?{" "}
        <Link component={RouterLink} to="/entrar">
          Entrar
        </Link>
      </Typography>
    </Box>
  );
}
