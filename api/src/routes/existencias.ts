import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { ErrorDeNegocio } from "../errores";
import { idValido, vacioANulo } from "../ids";
import { exigirAdmin } from "../middleware";
import { prisma } from "../prisma";

export const existenciasRouter = Router();

const existenciaEsquema = z.object({
  especieId: z.string().regex(/^\d+$/, "Elige una especie del catálogo."),
  presentacion: z.string().trim().min(2, "Escribe la presentación. Por ejemplo: bolsa.").max(80),
  tamanoCm: z.number().int().min(1, "El tamaño debe ser de al menos 1 cm.").max(2000).nullable().optional(),
  precioCop: z.number().int().min(0, "El precio no puede ser negativo.").max(5_000_000, "El precio pasa de $ 5.000.000."),
  cantidad: z.number().int().min(0, "La cantidad no puede ser negativa.").max(100_000),
  stockMinimo: z.number().int().min(0).max(100_000).optional(),
  ubicacion: z.string().trim().max(120).optional(),
});

type Fila = Prisma.ExistenciaGetPayload<{ include: { especie: { select: { nombreComun: true; nombreCientifico: true } } } }>;

function serializar(fila: Fila) {
  return {
    id: fila.id.toString(),
    especieId: fila.especieId.toString(),
    nombreComun: fila.especie.nombreComun,
    nombreCientifico: fila.especie.nombreCientifico,
    presentacion: fila.presentacion,
    tamanoCm: fila.tamanoCm,
    precioCop: fila.precioCop,
    cantidad: fila.cantidad,
    stockMinimo: fila.stockMinimo,
    ubicacion: fila.ubicacion,
  };
}

async function viveroActual() {
  const negocio = await prisma.negocio.findFirst({ orderBy: { id: "asc" } });
  if (!negocio) throw new ErrorDeNegocio("Primero registra el vivero.", 400);
  return negocio;
}

async function buscarRepetida(negocioId: bigint, especieId: bigint, presentacion: string, tamanoCm: number | null, excepto?: bigint) {
  return prisma.existencia.findFirst({
    where: {
      negocioId,
      especieId,
      presentacion,
      tamanoCm,
      ...(excepto ? { NOT: { id: excepto } } : {}),
    },
  });
}

existenciasRouter.get("/", async (req, res, next) => {
  try {
    const negocio = await prisma.negocio.findFirst({ orderBy: { id: "asc" } });
    const especieId = typeof req.query.especieId === "string" && req.query.especieId ? idValido(req.query.especieId) : undefined;
    if (typeof req.query.especieId === "string" && req.query.especieId && especieId === null) {
      res.status(400).json({ mensaje: "El identificador de la especie no es válido." });
      return;
    }
    if (!negocio) {
      res.json({ negocio: null, existencias: [] });
      return;
    }
    const esAdmin = req.usuario?.rol === "admin";
    const filas = await prisma.existencia.findMany({
      where: {
        negocioId: negocio.id,
        ...(especieId ? { especieId } : {}),
        ...(esAdmin ? {} : { cantidad: { gt: 0 } }),
      },
      include: { especie: { select: { nombreComun: true, nombreCientifico: true } } },
      orderBy: [{ especie: { nombreComun: "asc" } }, { presentacion: "asc" }],
    });
    res.json({
      negocio: { id: negocio.id.toString(), nombre: negocio.nombre },
      existencias: filas.map(serializar),
    });
  } catch (error) {
    next(error);
  }
});

existenciasRouter.post("/", exigirAdmin, async (req, res, next) => {
  try {
    const datos = existenciaEsquema.parse(req.body);
    const negocio = await viveroActual();
    const especieId = BigInt(datos.especieId);
    const especie = await prisma.especie.findUnique({ where: { id: especieId }, select: { id: true } });
    if (!especie) throw new ErrorDeNegocio("Esa especie no está en el catálogo.", 404);
    const tamanoCm = datos.tamanoCm ?? null;
    const repetida = await buscarRepetida(negocio.id, especieId, datos.presentacion, tamanoCm);
    if (repetida) {
      throw new ErrorDeNegocio("Ya existe esa presentación para la especie. Edítala en lugar de crearla otra vez.", 409);
    }
    const fila = await prisma.existencia.create({
      data: {
        negocioId: negocio.id,
        especieId,
        presentacion: datos.presentacion,
        tamanoCm,
        precioCop: datos.precioCop,
        cantidad: datos.cantidad,
        stockMinimo: datos.stockMinimo ?? 0,
        ubicacion: vacioANulo(datos.ubicacion),
      },
      include: { especie: { select: { nombreComun: true, nombreCientifico: true } } },
    });
    res.status(201).json({ existencia: serializar(fila) });
  } catch (error) {
    next(error);
  }
});

existenciasRouter.put("/:id", exigirAdmin, async (req, res, next) => {
  try {
    const id = idValido(req.params.id);
    if (id === null) throw new ErrorDeNegocio("El identificador no es válido.", 400);
    const datos = existenciaEsquema.parse(req.body);
    const negocio = await viveroActual();
    const actual = await prisma.existencia.findFirst({ where: { id, negocioId: negocio.id } });
    if (!actual) throw new ErrorDeNegocio("No encontramos esa existencia.", 404);
    const especieId = BigInt(datos.especieId);
    const especie = await prisma.especie.findUnique({ where: { id: especieId }, select: { id: true } });
    if (!especie) throw new ErrorDeNegocio("Esa especie no está en el catálogo.", 404);
    const tamanoCm = datos.tamanoCm ?? null;
    const repetida = await buscarRepetida(negocio.id, especieId, datos.presentacion, tamanoCm, id);
    if (repetida) {
      throw new ErrorDeNegocio("Ya existe esa presentación para la especie.", 409);
    }
    const fila = await prisma.existencia.update({
      where: { id },
      data: {
        especieId,
        presentacion: datos.presentacion,
        tamanoCm,
        precioCop: datos.precioCop,
        cantidad: datos.cantidad,
        stockMinimo: datos.stockMinimo ?? 0,
        ubicacion: vacioANulo(datos.ubicacion),
      },
      include: { especie: { select: { nombreComun: true, nombreCientifico: true } } },
    });
    res.json({ existencia: serializar(fila) });
  } catch (error) {
    next(error);
  }
});

existenciasRouter.delete("/:id", exigirAdmin, async (req, res, next) => {
  try {
    const id = idValido(req.params.id);
    if (id === null) throw new ErrorDeNegocio("El identificador no es válido.", 400);
    const negocio = await viveroActual();
    const actual = await prisma.existencia.findFirst({ where: { id, negocioId: negocio.id } });
    if (!actual) throw new ErrorDeNegocio("No encontramos esa existencia.", 404);
    const usada = await prisma.pedidoItem.count({ where: { existenciaId: id } });
    if (usada > 0) {
      throw new ErrorDeNegocio("No se puede quitar: ya está en un pedido. Déjala en cantidad 0.", 409);
    }
    await prisma.existencia.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
