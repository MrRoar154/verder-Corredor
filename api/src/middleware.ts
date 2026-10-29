import type { NextFunction, Request, Response } from "express";
import { leerToken } from "./auth";

export function adjuntarUsuario(req: Request, res: Response, next: NextFunction): void {
  const encabezado = req.header("authorization");
  if (!encabezado?.startsWith("Bearer ")) {
    next();
    return;
  }
  try {
    req.usuario = leerToken(encabezado.slice("Bearer ".length));
    next();
  } catch {
    res.status(401).json({ mensaje: "La sesión no es válida. Vuelve a entrar." });
  }
}

export function exigirAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.usuario) {
    res.status(401).json({ mensaje: "Entra con tu cuenta para continuar." });
    return;
  }
  if (req.usuario.rol !== "admin") {
    res.status(403).json({ mensaje: "Solo el administrador puede hacer este cambio." });
    return;
  }
  next();
}
