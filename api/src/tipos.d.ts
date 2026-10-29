declare module "express-serve-static-core" {
  interface Request {
    usuario?: {
      id: string;
      rol: "admin" | "vivero" | "cliente";
      nombre: string;
    };
  }
}

export {};
