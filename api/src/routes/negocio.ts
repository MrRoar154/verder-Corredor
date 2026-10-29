import { Router } from "express";
import { z } from "zod";
import { vacioANulo } from "../ids";
import { exigirAdmin } from "../middleware";
import { prisma } from "../prisma";

export const negocioRouter = Router();

const negocioEsquema = z.object({
  nombre: z.string().trim().min(2, "Escribe el nombre del vivero.").max(120),
  sector: z.string().trim().max(80).optional(),
  telefono: z.string().trim().max(30).optional(),
});

function serializar(negocio: { id: bigint; nombre: string; tipo: string; sector: string | null; telefono: string | null }) {
  return {
    id: negocio.id.toString(),
    nombre: negocio.nombre,
    tipo: negocio.tipo,
    sector: negocio.sector,
    telefono: negocio.telefono,
  };
}

negocioRouter.get("/", async (_req, res, next) => {
  try {
    const negocio = await prisma.negocio.findFirst({ orderBy: { id: "asc" } });
    res.json({ negocio: negocio ? serializar(negocio) : null });
  } catch (error) {
    next(error);
  }
});

negocioRouter.put("/", exigirAdmin, async (req, res, next) => {
  try {
    const datos = negocioEsquema.parse(req.body);
    const actual = await prisma.negocio.findFirst({ orderBy: { id: "asc" } });
    const campos = {
      nombre: datos.nombre,
      tipo: "vivero",
      sector: vacioANulo(datos.sector),
      telefono: vacioANulo(datos.telefono),
    };
    const negocio = actual
      ? await prisma.negocio.update({ where: { id: actual.id }, data: campos })
      : await prisma.negocio.create({ data: campos });
    res.json({ negocio: serializar(negocio) });
  } catch (error) {
    next(error);
  }
});
