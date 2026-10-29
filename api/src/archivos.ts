import fs from "fs";
import path from "path";
import multer from "multer";

export const carpetaArchivos = path.join(process.cwd(), "uploads");
fs.mkdirSync(carpetaArchivos, { recursive: true });

const extensiones: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export const subirImagen = multer({
  storage: multer.diskStorage({
    destination: carpetaArchivos,
    filename: (_req, file, callback) => {
      const extension = extensiones[file.mimetype] ?? ".img";
      callback(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${extension}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (extensiones[file.mimetype]) {
      callback(null, true);
      return;
    }
    callback(new Error("Solo se aceptan fotos JPG, PNG o WebP."));
  },
});

export function urlPublica(nombre: string): string {
  return `/api/archivos/${path.basename(nombre)}`;
}

export function borrarSiEsLocal(imagenUrl: string | null | undefined): void {
  if (!imagenUrl?.startsWith("/api/archivos/")) return;
  const ruta = path.join(carpetaArchivos, path.basename(imagenUrl));
  if (fs.existsSync(ruta)) fs.unlinkSync(ruta);
}
