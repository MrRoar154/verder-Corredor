import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export type Rol = "admin" | "vivero" | "cliente";

function secretoJwt(): string {
  const secreto = process.env.JWT_SECRET;
  if (!secreto) {
    throw new Error("Falta JWT_SECRET en el entorno.");
  }
  return secreto;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function verificarPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function firmarToken(usuario: { id: bigint; rol: Rol; nombre: string }): string {
  return jwt.sign({ rol: usuario.rol, nombre: usuario.nombre }, secretoJwt(), {
    subject: usuario.id.toString(),
    expiresIn: "7d",
  });
}

export function leerToken(token: string): { id: string; rol: Rol; nombre: string } {
  const payload = jwt.verify(token, secretoJwt());
  if (typeof payload === "string" || !payload.sub || typeof payload.nombre !== "string") {
    throw new Error("Token incompleto");
  }
  const rol = payload.rol;
  if (rol !== "admin" && rol !== "vivero" && rol !== "cliente") {
    throw new Error("Rol desconocido");
  }
  return { id: payload.sub, rol, nombre: payload.nombre };
}
