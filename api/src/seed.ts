import "dotenv/config";
import { hashPassword } from "./auth";
import { prisma } from "./prisma";

const NOMBRES_CORMACARENA = [
  "Ocobo",
  "Algarrobo",
  "Balso",
  "Guácimo",
  "Yopo",
  "Flor amarillo",
  "Caracolí",
  "Matarratón",
  "Cedro rosado",
  "Gualanday",
  "Cañafístula",
];

const CIENTIFICOS_NODO = [
  "Ceiba pentandra",
  "Hymenaea courbaril",
  "Tabebuia rosea",
  "Brownea ariza",
  "Cecropia peltata",
  "Anacardium excelsum",
  "Crescentia cujete",
];

async function main() {
  const password = process.env.ADMIN_PASSWORD ?? "Admin12345";
  const passwordHash = await hashPassword(password);
  await prisma.usuario.upsert({
    where: { email: "admin@verdecorredor.local" },
    update: { passwordHash, rol: "admin", nombre: "Administrador VerdeCorredor" },
    create: {
      nombre: "Administrador VerdeCorredor",
      email: "admin@verdecorredor.local",
      passwordHash,
      rol: "admin",
      consentimientoAt: new Date(),
    },
  });

  const existentes = await prisma.especie.count();
  if (existentes > 0) {
    console.log(`El catálogo ya tiene ${existentes} especies. No se volvió a sembrar.`);
    return;
  }

  for (const nombre of NOMBRES_CORMACARENA) {
    await prisma.especie.create({
      data: {
        nombreComun: nombre,
        nativa: true,
        fuentes: ["Cormacarena, citada por Villavo Noticias (2022)"],
        cuidado: { create: {} },
      },
    });
  }

  for (const cientifico of CIENTIFICOS_NODO) {
    await prisma.especie.create({
      data: {
        nombreComun: cientifico,
        nombreCientifico: cientifico,
        nativa: true,
        fuentes: ["Molina Prieto y Vargas Garzón (2007), Revista Nodo"],
        cuidado: { create: {} },
      },
    });
  }

  console.log(`Semilla lista: ${NOMBRES_CORMACARENA.length + CIENTIFICOS_NODO.length} especies.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
