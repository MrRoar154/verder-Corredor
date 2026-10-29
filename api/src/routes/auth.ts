import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { firmarToken, hashPassword, verificarPassword } from "../auth";
import { prisma } from "../prisma";

export const authRouter = Router();

const registroEsquema = z.object({
  nombre: z.string().trim().min(2, "Escribe tu nombre.").max(80),
  email: z.string().trim().email("Escribe un correo válido.").max(120),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres.")
    .max(72, "La contraseña es demasiado larga."),
  consentimiento: z
    .boolean()
    .refine((valor) => valor, "Acepta el tratamiento de datos para crear la cuenta."),
});

const loginEsquema = z.object({
  email: z.string().trim().email("Escribe un correo válido."),
  password: z.string().min(1, "Escribe la contraseña."),
});

function usuarioPublico(usuario: {
  id: bigint;
  nombre: string;
  email: string;
  rol: "admin" | "vivero" | "cliente";
}) {
  return {
    id: usuario.id.toString(),
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
  };
}

authRouter.post("/registro", async (req, res, next) => {
  try {
    const datos = registroEsquema.parse(req.body);
    const email = datos.email.toLowerCase();
    const passwordHash = await hashPassword(datos.password);
    const usuario = await prisma.usuario.create({
      data: {
        nombre: datos.nombre,
        email,
        passwordHash,
        rol: "cliente",
        consentimientoAt: new Date(),
      },
    });
    const token = firmarToken(usuario);
    res.status(201).json({ token, usuario: usuarioPublico(usuario) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      res.status(409).json({ mensaje: "Ese correo ya tiene una cuenta." });
      return;
    }
    next(error);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const datos = loginEsquema.parse(req.body);
    const usuario = await prisma.usuario.findUnique({
      where: { email: datos.email.toLowerCase() },
    });
    const claveValida = usuario ? await verificarPassword(datos.password, usuario.passwordHash) : false;
    if (!usuario || !claveValida) {
      res.status(401).json({ mensaje: "Correo o contraseña incorrectos." });
      return;
    }
    const token = firmarToken(usuario);
    res.json({ token, usuario: usuarioPublico(usuario) });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/yo", async (req, res) => {
  if (!req.usuario) {
    res.status(401).json({ mensaje: "Entra con tu cuenta para continuar." });
    return;
  }
  const usuario = await prisma.usuario.findUnique({
    where: { id: BigInt(req.usuario.id) },
  });
  if (!usuario) {
    res.status(401).json({ mensaje: "La sesión no es válida. Vuelve a entrar." });
    return;
  }
  res.json({ usuario: usuarioPublico(usuario) });
});
