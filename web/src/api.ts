const CLAVE_TOKEN = "verdecorredor.token";

export type Rol = "admin" | "vivero" | "cliente";

export type Usuario = {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
};

export type Cuidado = {
  luz: string | null;
  riego: string | null;
  suelo: string | null;
  trasplante: string | null;
  plagas: string[];
  fuente: string | null;
};

export type Especie = {
  id: string;
  nombreComun: string;
  nombreCientifico: string | null;
  familia: string | null;
  nativa: boolean;
  usos: string[];
  fuentes: string[];
  imagenUrl: string | null;
  precioDesde: number | null;
  disponible: boolean;
  cuidado: Cuidado | null;
};

export type EspecieLista = {
  id: string;
  nombreComun: string;
  nombreCientifico: string | null;
};

export type Negocio = {
  id: string;
  nombre: string;
  tipo: string;
  sector: string | null;
  telefono: string | null;
};

export type Existencia = {
  id: string;
  especieId: string;
  nombreComun: string;
  nombreCientifico: string | null;
  presentacion: string;
  tamanoCm: number | null;
  precioCop: number;
  cantidad: number;
  stockMinimo: number;
  ubicacion: string | null;
};

export type EstadoPedido = "pendiente" | "confirmado" | "entregado" | "cancelado";

export type Pedido = {
  id: string;
  estado: EstadoPedido;
  totalCop: number;
  creadoEn: string;
  negocio: { id: string; nombre: string };
  cliente: { id: string; nombre: string };
  items: {
    id: string;
    existenciaId: string;
    descripcion: string;
    cantidad: number;
    precioUnitCop: number;
  }[];
  historial: { estado: EstadoPedido; fecha: string }[];
};

export type PaginaEspecies = {
  total: number;
  pagina: number;
  tamano: number;
  especies: Especie[];
};

export class ErrorApi extends Error {
  estado: number;

  constructor(mensaje: string, estado: number) {
    super(mensaje);
    this.estado = estado;
  }
}

export function leerTokenGuardado(): string | null {
  return localStorage.getItem(CLAVE_TOKEN);
}

export function guardarToken(token: string | null): void {
  if (token) localStorage.setItem(CLAVE_TOKEN, token);
  else localStorage.removeItem(CLAVE_TOKEN);
}

export async function enviarArchivo<T>(ruta: string, archivo: File): Promise<T> {
  const token = leerTokenGuardado();
  const cuerpo = new FormData();
  cuerpo.append("imagen", archivo);
  const headers = new Headers();
  headers.set("Accept", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const respuesta = await fetch(ruta, { method: "POST", body: cuerpo, headers });
  const datos = (await respuesta.json().catch(() => ({}))) as { mensaje?: string };
  if (!respuesta.ok) {
    throw new ErrorApi(datos.mensaje ?? "No se pudo subir la foto.", respuesta.status);
  }
  return datos as T;
}

export async function solicitar<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const token = leerTokenGuardado();
  const headers = new Headers(opciones.headers);
  headers.set("Accept", "application/json");
  if (opciones.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const respuesta = await fetch(ruta, { ...opciones, headers });
  if (respuesta.status === 204) return undefined as T;

  const datos = (await respuesta.json().catch(() => ({}))) as { mensaje?: string };
  if (!respuesta.ok) {
    throw new ErrorApi(datos.mensaje ?? "No se pudo completar la acción.", respuesta.status);
  }
  return datos as T;
}
