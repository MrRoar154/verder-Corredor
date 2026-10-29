# VerdeCorredor

Aplicación web para el catálogo de especies de los viveros del Corredor Ecológico de Villavicencio. Permite crear una cuenta, buscar especies, editar fichas de cuidado, registrar un vivero, cargar inventario y hacer pedidos.

El documento de aula editable está en `VerdeCorredor-Proyecto-de-Aula.docx`.

## Qué necesitas

- Node.js 22
- Docker, para PostgreSQL 16

## Cómo arrancarla

En la raíz del proyecto:

```bash
docker compose up -d
```

En `api/`:

```bash
npm install
npx prisma generate
npm run db:preparar
npm run dev
```

En `web/`, en otra terminal:

```bash
npm install
npm run dev
```

Abre http://localhost:5173

La API queda en http://localhost:4000. La base usa el puerto local **54329**.

## Cuentas

Quien se registra entra como cliente. Puede consultar el catálogo y, cuando haya inventario, armar un pedido. El catálogo también se puede ver sin cuenta.

El administrador registra el vivero, carga precios y cantidades, y cambia el estado de los pedidos (pendiente, confirmado, entregado o cancelado). Esos datos no vienen sembrados: se escriben en las pantallas Vivero, Inventario y Pedidos.

Para crear especies, fichas, el vivero y el inventario, entra con el administrador de la semilla:

- Correo: `admin@verdecorredor.local`
- Contraseña: `Admin12345`

La semilla trae nombres comunes citados a partir de Cormacarena y nombres científicos de la Revista Nodo. Luz, riego, suelo y plagas quedan vacíos a propósito. El administrador puede subir una foto JPG, PNG o WebP de hasta 10 MB en la ficha de cada especie.

## Abrir la base de datos

PostgreSQL no se abre en el navegador. El enlace del puerto en Docker (por ejemplo `localhost:54329`) se ve muerto porque el navegador espera una página y la base habla otro protocolo. El contenedor sí está bien si Docker lo marca como healthy.

Conéctala desde un programa de bases de datos (DBeaver, pgAdmin o la extensión de PostgreSQL en Cursor) con estos datos:

- Host: `localhost`
- Puerto: `54329`
- Base de datos: `verdecorredor`
- Usuario: `verdecorredor`
- Contraseña: `verdecorredor`

El puerto es **54329**, no 5432. Desde la terminal también puedes entrar así:

```bash
docker exec -it corredor_ecologico-db-1 psql -U verdecorredor -d verdecorredor
```

## Volver a sembrar

`npm run db:seed` dentro de `api/` actualiza la contraseña del administrador. Si el catálogo ya tiene especies, no las duplica.
