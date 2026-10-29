import "dotenv/config";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { ZodError } from "zod";
import { carpetaArchivos } from "./archivos";
import { ErrorDeNegocio } from "./errores";
import { adjuntarUsuario } from "./middleware";
import { authRouter } from "./routes/auth";
import { especiesRouter } from "./routes/especies";
import { existenciasRouter } from "./routes/existencias";
import { negocioRouter } from "./routes/negocio";
import { pedidosRouter } from "./routes/pedidos";

const app = express();
const puerto = Number(process.env.PORT ?? 4000);

app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
  }),
);
app.use(express.json());
app.use(adjuntarUsuario);

app.use("/api/archivos", express.static(carpetaArchivos));

app.get("/api/salud", (_req, res) => {
  res.json({ ok: true });
});
app.use("/api/auth", authRouter);
app.use("/api/especies", especiesRouter);
app.use("/api/negocio", negocioRouter);
app.use("/api/existencias", existenciasRouter);
app.use("/api/pedidos", pedidosRouter);

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof ErrorDeNegocio) {
    res.status(error.estado).json({ mensaje: error.message });
    return;
  }
  if (error instanceof ZodError) {
    const errores = error.issues.map((issue) => issue.message);
    res.status(400).json({
      mensaje: errores[0] ?? "Revisa los datos del formulario.",
      errores,
    });
    return;
  }
  console.error(error);
  res.status(500).json({ mensaje: "Error interno del servidor." });
});

app.listen(puerto, () => {
  console.log(`API de VerdeCorredor en http://localhost:${puerto}`);
});
