import { Prisma } from "@prisma/client";
import { Router, type Request, type Response } from "express";
import multer from "multer";
import { z } from "zod";
import { borrarSiEsLocal, subirImagen, urlPublica } from "../archivos";
import { exigirAdmin } from "../middleware";
import { prisma } from "../prisma";

export const especiesRouter = Router();

const TAMANO_PAGINA = 12;

const especieEsquema = z.object({
  nombreComun: z.string().trim().min(2, "Escribe el nombre común.").max(120),
  nombreCientifico: z.string().trim().max(160).optional(),
  familia: z.string().trim().max(120).optional(),
  nativa: z.boolean(),
  usos: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  fuentes: z.array(z.string().trim().min(3, "Indica la fuente.").max(800)).min(1, "Indica al menos una fuente.").max(8),
});

const cuidadoEsquema = z.object({
  luz: z.string().trim().max(800).optional(),
  riego: z.string().trim().max(800).optional(),
  suelo: z.string().trim().max(800).optional(),
  trasplante: z.string().trim().max(800).optional(),
  plagas: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  fuente: z.string().trim().max(1000).optional(),
});

type EspecieConCuidado = Prisma.EspecieGetPayload<{ include: { cuidado: true } }>;

function vacioANulo(valor: string | undefined): string | null {
  const limpio = valor?.trim() ?? "";
  return limpio.length > 0 ? limpio : null;
}

function serializar(especie: EspecieConCuidado, precioDesde: number | null = null) {
  return {
    id: especie.id.toString(),
    nombreComun: especie.nombreComun,
    nombreCientifico: especie.nombreCientifico,
    familia: especie.familia,
    nativa: especie.nativa,
    usos: especie.usos,
    fuentes: especie.fuentes,
    imagenUrl: especie.imagenUrl,
    precioDesde,
    disponible: precioDesde !== null,
    cuidado: especie.cuidado
      ? {
          luz: especie.cuidado.luz,
          riego: especie.cuidado.riego,
          suelo: especie.cuidado.suelo,
          trasplante: especie.cuidado.trasplante,
          plagas: especie.cuidado.plagas,
          fuente: especie.cuidado.fuente,
        }
      : null,
  };
}

function escaparLike(valor: string): string {
  return valor.replace(/[\\%_]/g, (caracter) => `\\${caracter}`);
}

async function conDisponibilidad(filas: EspecieConCuidado[]) {
  if (filas.length === 0) return [];
  const grupos = await prisma.existencia.groupBy({
    by: ["especieId"],
    where: { especieId: { in: filas.map((fila) => fila.id) }, cantidad: { gt: 0 } },
    _min: { precioCop: true },
  });
  const precios = new Map<string, number>();
  for (const grupo of grupos) {
    if (grupo._min.precioCop !== null) precios.set(grupo.especieId.toString(), grupo._min.precioCop);
  }
  return filas.map((fila) => serializar(fila, precios.get(fila.id.toString()) ?? null));
}

function idValido(valor: string | string[] | undefined): bigint | null {
  const texto = Array.isArray(valor) ? valor[0] : valor;
  if (!texto || !/^\d+$/.test(texto)) return null;
  try {
    return BigInt(texto);
  } catch {
    return null;
  }
}

especiesRouter.get("/", async (req, res, next) => {
  try {
    if (req.query.lista === "1") {
      const filas = await prisma.especie.findMany({
        select: { id: true, nombreComun: true, nombreCientifico: true },
        orderBy: { nombreComun: "asc" },
        take: 300,
      });
      res.json({
        especies: filas.map((fila) => ({
          id: fila.id.toString(),
          nombreComun: fila.nombreComun,
          nombreCientifico: fila.nombreCientifico,
        })),
      });
      return;
    }

    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const paginaPedida = Number(req.query.page ?? 1);
    const pagina = Number.isInteger(paginaPedida) && paginaPedida > 0 ? paginaPedida : 1;
    const salto = (pagina - 1) * TAMANO_PAGINA;

    if (!q) {
      const [total, filas] = await prisma.$transaction([
        prisma.especie.count(),
        prisma.especie.findMany({
          include: { cuidado: true },
          orderBy: { nombreComun: "asc" },
          skip: salto,
          take: TAMANO_PAGINA,
        }),
      ]);
      res.json({
        total,
        pagina,
        tamano: TAMANO_PAGINA,
        especies: await conDisponibilidad(filas),
      });
      return;
    }

    const patron = escaparLike(q);
    const filtro = Prisma.sql`
      f_unaccent(lower(e.nombre_comun || ' ' || coalesce(e.nombre_cientifico, '')))
      LIKE '%' || f_unaccent(lower(${patron})) || '%' ESCAPE '\\'
    `;
    const totalFilas = await prisma.$queryRaw<{ total: number }[]>`
      SELECT count(*)::int AS total
      FROM especies e
      WHERE ${filtro}
    `;
    const ids = await prisma.$queryRaw<{ id: bigint }[]>`
      SELECT e.id
      FROM especies e
      WHERE ${filtro}
      ORDER BY similarity(
        f_unaccent(lower(e.nombre_comun || ' ' || coalesce(e.nombre_cientifico, ''))),
        f_unaccent(lower(${q}))
      ) DESC, e.nombre_comun ASC
      LIMIT ${TAMANO_PAGINA} OFFSET ${salto}
    `;
    const encontrados = ids.length
      ? await prisma.especie.findMany({
          where: { id: { in: ids.map((fila) => fila.id) } },
          include: { cuidado: true },
        })
      : [];
    const porId = new Map(encontrados.map((especie) => [especie.id.toString(), especie]));
    const ordenados = ids
      .map((fila) => porId.get(fila.id.toString()))
      .filter((especie): especie is EspecieConCuidado => especie !== undefined);

    res.json({
      total: totalFilas[0]?.total ?? 0,
      pagina,
      tamano: TAMANO_PAGINA,
      especies: await conDisponibilidad(ordenados),
    });
  } catch (error) {
    next(error);
  }
});

especiesRouter.get("/:id", async (req, res, next) => {
  try {
    const id = idValido(req.params.id);
    if (id === null) {
      res.status(400).json({ mensaje: "El identificador de la especie no es válido." });
      return;
    }
    const especie = await prisma.especie.findUnique({
      where: { id },
      include: { cuidado: true },
    });
    if (!especie) {
      res.status(404).json({ mensaje: "No encontramos esa especie." });
      return;
    }
    const [conPrecio] = await conDisponibilidad([especie]);
    res.json({ especie: conPrecio });
  } catch (error) {
    next(error);
  }
});

especiesRouter.post("/", exigirAdmin, async (req, res, next) => {
  try {
    const datos = especieEsquema.parse(req.body);
    const especie = await prisma.especie.create({
      data: {
        nombreComun: datos.nombreComun,
        nombreCientifico: vacioANulo(datos.nombreCientifico),
        familia: vacioANulo(datos.familia),
        nativa: datos.nativa,
        usos: datos.usos ?? [],
        fuentes: datos.fuentes,
        cuidado: { create: {} },
      },
      include: { cuidado: true },
    });
    res.status(201).json({ especie: serializar(especie) });
  } catch (error) {
    next(error);
  }
});

especiesRouter.put("/:id", exigirAdmin, async (req, res, next) => {
  try {
    const id = idValido(req.params.id);
    if (id === null) {
      res.status(400).json({ mensaje: "El identificador de la especie no es válido." });
      return;
    }
    const datos = especieEsquema.parse(req.body);
    const especie = await prisma.especie.update({
      where: { id },
      data: {
        nombreComun: datos.nombreComun,
        nombreCientifico: vacioANulo(datos.nombreCientifico),
        familia: vacioANulo(datos.familia),
        nativa: datos.nativa,
        usos: datos.usos ?? [],
        fuentes: datos.fuentes,
      },
      include: { cuidado: true },
    });
    res.json({ especie: serializar(especie) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      res.status(404).json({ mensaje: "No encontramos esa especie." });
      return;
    }
    next(error);
  }
});

especiesRouter.put("/:id/cuidado", exigirAdmin, async (req, res, next) => {
  try {
    const id = idValido(req.params.id);
    if (id === null) {
      res.status(400).json({ mensaje: "El identificador de la especie no es válido." });
      return;
    }
    const datos = cuidadoEsquema.parse(req.body);
    const luz = vacioANulo(datos.luz);
    const riego = vacioANulo(datos.riego);
    const suelo = vacioANulo(datos.suelo);
    const trasplante = vacioANulo(datos.trasplante);
    const plagas = (datos.plagas ?? []).map((plaga) => plaga.trim()).filter(Boolean);
    const fuente = vacioANulo(datos.fuente);
    const hayContenido = Boolean(luz || riego || suelo || trasplante || plagas.length > 0);
    if (hayContenido && !fuente) {
      res.status(400).json({ mensaje: "Indica la fuente de la ficha de cuidado." });
      return;
    }
    const existe = await prisma.especie.findUnique({ where: { id }, select: { id: true } });
    if (!existe) {
      res.status(404).json({ mensaje: "No encontramos esa especie." });
      return;
    }
    await prisma.cuidado.upsert({
      where: { especieId: id },
      create: { especieId: id, luz, riego, suelo, trasplante, plagas, fuente },
      update: { luz, riego, suelo, trasplante, plagas, fuente },
    });
    const especie = await prisma.especie.findUniqueOrThrow({
      where: { id },
      include: { cuidado: true },
    });
    res.json({ especie: serializar(especie) });
  } catch (error) {
    next(error);
  }
});

especiesRouter.post("/:id/imagen", exigirAdmin, (req, res, next) => {
  subirImagen.single("imagen")(req, res, (error: unknown) => {
    if (error) {
      const mensaje =
        error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE"
          ? "La foto pesa más de 10 MB."
          : error instanceof Error
            ? error.message
            : "No se pudo leer la foto.";
      res.status(400).json({ mensaje });
      return;
    }
    guardarImagen(req, res).catch(next);
  });
});

async function guardarImagen(req: Request, res: Response) {
  const id = idValido(req.params.id);
  if (!req.file) {
    res.status(400).json({ mensaje: "Elige una foto JPG, PNG o WebP." });
    return;
  }
  const publica = urlPublica(req.file.filename);
  if (id === null) {
    borrarSiEsLocal(publica);
    res.status(400).json({ mensaje: "El identificador de la especie no es válido." });
    return;
  }
  const anterior = await prisma.especie.findUnique({ where: { id }, select: { imagenUrl: true } });
  if (!anterior) {
    borrarSiEsLocal(publica);
    res.status(404).json({ mensaje: "No encontramos esa especie." });
    return;
  }
  const especie = await prisma.especie.update({
    where: { id },
    data: { imagenUrl: publica },
    include: { cuidado: true },
  });
  if (anterior.imagenUrl && anterior.imagenUrl !== publica) borrarSiEsLocal(anterior.imagenUrl);
  res.json({ especie: serializar(especie) });
}

especiesRouter.delete("/:id/imagen", exigirAdmin, async (req, res, next) => {
  try {
    const id = idValido(req.params.id);
    if (id === null) {
      res.status(400).json({ mensaje: "El identificador de la especie no es válido." });
      return;
    }
    const anterior = await prisma.especie.findUnique({ where: { id }, select: { imagenUrl: true } });
    if (!anterior) {
      res.status(404).json({ mensaje: "No encontramos esa especie." });
      return;
    }
    const especie = await prisma.especie.update({
      where: { id },
      data: { imagenUrl: null },
      include: { cuidado: true },
    });
    borrarSiEsLocal(anterior.imagenUrl);
    res.json({ especie: serializar(especie) });
  } catch (error) {
    next(error);
  }
});

especiesRouter.delete("/:id", exigirAdmin, async (req, res, next) => {
  try {
    const id = idValido(req.params.id);
    if (id === null) {
      res.status(400).json({ mensaje: "El identificador de la especie no es válido." });
      return;
    }
    const anterior = await prisma.especie.findUnique({ where: { id }, select: { imagenUrl: true } });
    await prisma.especie.delete({ where: { id } });
    borrarSiEsLocal(anterior?.imagenUrl);
    res.status(204).send();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      res.status(404).json({ mensaje: "No encontramos esa especie." });
      return;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      res.status(409).json({ mensaje: "No se puede eliminar: la especie ya está en un inventario." });
      return;
    }
    next(error);
  }
});
