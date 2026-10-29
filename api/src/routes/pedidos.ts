import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { ErrorDeNegocio } from "../errores";
import { idValido } from "../ids";
import { prisma } from "../prisma";

export const pedidosRouter = Router();

const estados = ["pendiente", "confirmado", "entregado", "cancelado"] as const;
type Estado = (typeof estados)[number];

const siguientes: Record<Estado, Estado[]> = {
  pendiente: ["confirmado", "cancelado"],
  confirmado: ["entregado", "cancelado"],
  entregado: [],
  cancelado: [],
};

const crearEsquema = z.object({
  items: z
    .array(
      z.object({
        existenciaId: z.string().regex(/^\d+$/, "Hay una planta que ya no está en el inventario."),
        cantidad: z.number().int().min(1, "La cantidad debe ser al menos 1.").max(500),
      }),
    )
    .min(1, "El pedido no tiene plantas.")
    .max(30, "El pedido tiene demasiadas líneas."),
});

const estadoEsquema = z.object({
  estado: z.enum(estados),
});

const incluirPedido = {
  cliente: { select: { id: true, nombre: true } },
  negocio: { select: { id: true, nombre: true } },
  items: { orderBy: { id: "asc" as const } },
  historial: { orderBy: { fecha: "asc" as const } },
} satisfies Prisma.PedidoInclude;

type PedidoCompleto = Prisma.PedidoGetPayload<{ include: typeof incluirPedido }>;

function serializar(pedido: PedidoCompleto) {
  return {
    id: pedido.id.toString(),
    estado: pedido.estado,
    totalCop: pedido.totalCop,
    creadoEn: pedido.creadoEn.toISOString(),
    negocio: { id: pedido.negocio.id.toString(), nombre: pedido.negocio.nombre },
    cliente: { id: pedido.cliente.id.toString(), nombre: pedido.cliente.nombre },
    items: pedido.items.map((item) => ({
      id: item.id.toString(),
      existenciaId: item.existenciaId.toString(),
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      precioUnitCop: item.precioUnitCop,
    })),
    historial: pedido.historial.map((paso) => ({
      estado: paso.estado,
      fecha: paso.fecha.toISOString(),
    })),
  };
}

function cuentaDe(req: { usuario?: { id: string; rol: "admin" | "vivero" | "cliente"; nombre: string } }) {
  if (!req.usuario) throw new ErrorDeNegocio("Entra con tu cuenta para continuar.", 401);
  return req.usuario;
}

pedidosRouter.get("/", async (req, res, next) => {
  try {
    const usuario = cuentaDe(req);
    const donde = usuario.rol === "admin" ? {} : { clienteId: BigInt(usuario.id) };
    const pedidos = await prisma.pedido.findMany({
      where: donde,
      include: incluirPedido,
      orderBy: { creadoEn: "desc" },
      take: 50,
    });
    res.json({ pedidos: pedidos.map(serializar) });
  } catch (error) {
    next(error);
  }
});

pedidosRouter.post("/", async (req, res, next) => {
  try {
    const usuario = cuentaDe(req);
    if (usuario.rol !== "cliente") {
      throw new ErrorDeNegocio("Entra con una cuenta de cliente para hacer un pedido.", 403);
    }
    const datos = crearEsquema.parse(req.body);
    const cantidades = new Map<string, number>();
    for (const item of datos.items) {
      cantidades.set(item.existenciaId, (cantidades.get(item.existenciaId) ?? 0) + item.cantidad);
    }
    const clienteId = BigInt(usuario.id);

    const pedido = await prisma.$transaction(async (tx) => {
      const negocio = await tx.negocio.findFirst({ orderBy: { id: "asc" } });
      if (!negocio) throw new ErrorDeNegocio("El vivero todavía no está registrado.", 400);

      const ids = [...cantidades.keys()].map((id) => BigInt(id));
      const existencias = await tx.existencia.findMany({
        where: { id: { in: ids }, negocioId: negocio.id },
        include: { especie: { select: { nombreComun: true } } },
      });
      if (existencias.length !== ids.length) {
        throw new ErrorDeNegocio("Una de las plantas ya no está en el inventario.", 400);
      }

      const lineas = [];
      for (const existencia of existencias) {
        const cantidad = cantidades.get(existencia.id.toString()) ?? 0;
        const baja = await tx.existencia.updateMany({
          where: { id: existencia.id, cantidad: { gte: cantidad } },
          data: { cantidad: { decrement: cantidad } },
        });
        if (baja.count !== 1) {
          throw new ErrorDeNegocio(`No hay suficientes unidades de ${existencia.especie.nombreComun}.`, 409);
        }
        const descripcion = [
          existencia.especie.nombreComun,
          existencia.presentacion,
          existencia.tamanoCm ? `${existencia.tamanoCm} cm` : null,
        ]
          .filter((parte): parte is string => Boolean(parte))
          .join(" · ");
        lineas.push({
          existenciaId: existencia.id,
          descripcion,
          cantidad,
          precioUnitCop: existencia.precioCop,
        });
      }

      const totalCop = lineas.reduce((suma, linea) => suma + linea.precioUnitCop * linea.cantidad, 0);
      if (totalCop > 2_000_000_000) throw new ErrorDeNegocio("El total del pedido es demasiado alto.", 400);

      return tx.pedido.create({
        data: {
          negocioId: negocio.id,
          clienteId,
          estado: "pendiente",
          totalCop,
          items: { create: lineas },
          historial: { create: { estado: "pendiente" } },
        },
        include: incluirPedido,
      });
    });

    res.status(201).json({ pedido: serializar(pedido) });
  } catch (error) {
    next(error);
  }
});

pedidosRouter.patch("/:id/estado", async (req, res, next) => {
  try {
    const usuario = cuentaDe(req);
    const id = idValido(req.params.id);
    if (id === null) throw new ErrorDeNegocio("El identificador del pedido no es válido.", 400);
    const datos = estadoEsquema.parse(req.body);
    const nuevo = datos.estado;

    const pedido = await prisma.$transaction(async (tx) => {
      const actual = await tx.pedido.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!actual) throw new ErrorDeNegocio("No encontramos ese pedido.", 404);
      const esDueno = actual.clienteId === BigInt(usuario.id);
      if (usuario.rol === "cliente" && !esDueno) {
        throw new ErrorDeNegocio("No encontramos ese pedido.", 404);
      }
      if (usuario.rol !== "admin" && usuario.rol !== "cliente") {
        throw new ErrorDeNegocio("No puedes cambiar este pedido.", 403);
      }
      if (usuario.rol === "cliente" && !(actual.estado === "pendiente" && nuevo === "cancelado")) {
        throw new ErrorDeNegocio("Solo puedes cancelar tu pedido mientras esté pendiente.", 403);
      }
      if (!siguientes[actual.estado].includes(nuevo)) {
        throw new ErrorDeNegocio("Ese cambio de estado no está permitido.", 409);
      }

      const cambio = await tx.pedido.updateMany({
        where: { id, estado: actual.estado },
        data: { estado: nuevo },
      });
      if (cambio.count !== 1) throw new ErrorDeNegocio("Ese pedido ya cambió. Recarga la página.", 409);

      if (nuevo === "cancelado") {
        for (const item of actual.items) {
          await tx.existencia.update({
            where: { id: item.existenciaId },
            data: { cantidad: { increment: item.cantidad } },
          });
        }
      }

      await tx.pedidoHistorial.create({ data: { pedidoId: id, estado: nuevo } });
      const fresco = await tx.pedido.findUnique({ where: { id }, include: incluirPedido });
      if (!fresco) throw new ErrorDeNegocio("No encontramos ese pedido.", 404);
      return fresco;
    });

    res.json({ pedido: serializar(pedido) });
  } catch (error) {
    next(error);
  }
});
