import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const CLAVE = "verdecorredor.carrito";

export type ItemCarrito = {
  existenciaId: string;
  especieId: string;
  nombre: string;
  presentacion: string;
  tamanoCm: number | null;
  precioCop: number;
  cantidad: number;
  disponible: number;
};

type CarritoContexto = {
  items: ItemCarrito[];
  agregar: (item: ItemCarrito) => "agregado" | "tope";
  cambiarCantidad: (existenciaId: string, cantidad: number) => void;
  quitar: (existenciaId: string) => void;
  vaciar: () => void;
};

const Contexto = createContext<CarritoContexto | null>(null);

function leer(): ItemCarrito[] {
  try {
    const texto = localStorage.getItem(CLAVE);
    if (!texto) return [];
    const datos: unknown = JSON.parse(texto);
    if (!Array.isArray(datos)) return [];
    return datos.filter((item): item is ItemCarrito => {
      if (!item || typeof item !== "object") return false;
      const fila = item as ItemCarrito;
      return typeof fila.existenciaId === "string" && typeof fila.cantidad === "number" && fila.cantidad > 0;
    });
  } catch {
    return [];
  }
}

export function ProveedorCarrito({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ItemCarrito[]>(leer);

  useEffect(() => {
    localStorage.setItem(CLAVE, JSON.stringify(items));
  }, [items]);

  const valor = useMemo<CarritoContexto>(
    () => ({
      items,
      agregar(item) {
        const indice = items.findIndex((fila) => fila.existenciaId === item.existenciaId);
        if (indice === -1) {
          const cantidad = Math.min(item.cantidad, item.disponible);
          if (cantidad < 1) return "tope";
          setItems([...items, { ...item, cantidad }]);
          return "agregado";
        }
        const actual = items[indice];
        const suma = Math.min(actual.cantidad + item.cantidad, item.disponible);
        if (suma === actual.cantidad) return "tope";
        const copia = [...items];
        copia[indice] = { ...item, cantidad: suma };
        setItems(copia);
        return "agregado";
      },
      cambiarCantidad(existenciaId, cantidad) {
        if (!Number.isInteger(cantidad)) return;
        setItems((previos) =>
          previos.flatMap((fila) => {
            if (fila.existenciaId !== existenciaId) return [fila];
            const tope = Math.min(Math.max(1, cantidad), fila.disponible);
            return [{ ...fila, cantidad: tope }];
          }),
        );
      },
      quitar(existenciaId) {
        setItems((previos) => previos.filter((fila) => fila.existenciaId !== existenciaId));
      },
      vaciar() {
        setItems([]);
      },
    }),
    [items],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useCarrito(): CarritoContexto {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error("useCarrito debe usarse dentro de ProveedorCarrito");
  return contexto;
}
