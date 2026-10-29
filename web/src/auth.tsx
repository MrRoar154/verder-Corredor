import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { guardarToken, leerTokenGuardado, solicitar, type Usuario } from "./api";

type Credenciales = { email: string; password: string };

type AuthContexto = {
  usuario: Usuario | null;
  listo: boolean;
  entrar: (datos: Credenciales) => Promise<void>;
  registrar: (datos: Credenciales & { nombre: string; consentimiento: boolean }) => Promise<void>;
  salir: () => void;
};

const Contexto = createContext<AuthContexto | null>(null);

export function ProveedorAuth({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    let activo = true;
    if (!leerTokenGuardado()) {
      setListo(true);
      return;
    }
    solicitar<{ usuario: Usuario }>("/api/auth/yo")
      .then((datos) => {
        if (activo) setUsuario(datos.usuario);
      })
      .catch(() => {
        guardarToken(null);
      })
      .finally(() => {
        if (activo) setListo(true);
      });
    return () => {
      activo = false;
    };
  }, []);

  const valor = useMemo<AuthContexto>(
    () => ({
      usuario,
      listo,
      async entrar(datos) {
        const respuesta = await solicitar<{ token: string; usuario: Usuario }>("/api/auth/login", {
          method: "POST",
          body: JSON.stringify(datos),
        });
        guardarToken(respuesta.token);
        setUsuario(respuesta.usuario);
      },
      async registrar(datos) {
        const respuesta = await solicitar<{ token: string; usuario: Usuario }>("/api/auth/registro", {
          method: "POST",
          body: JSON.stringify(datos),
        });
        guardarToken(respuesta.token);
        setUsuario(respuesta.usuario);
      },
      salir() {
        guardarToken(null);
        setUsuario(null);
      },
    }),
    [usuario, listo],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAuth(): AuthContexto {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error("useAuth debe usarse dentro de ProveedorAuth");
  return contexto;
}
