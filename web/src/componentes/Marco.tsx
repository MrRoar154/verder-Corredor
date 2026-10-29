import YardIcon from "@mui/icons-material/Yard";
import { AppBar, Box, Button, Container, Stack, Toolbar, Typography } from "@mui/material";
import { Link as RouterLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth";
import { useCarrito } from "../carrito";

export function Marco() {
  const { usuario, listo, salir } = useAuth();
  const { items } = useCarrito();
  const unidades = items.reduce((suma, item) => suma + item.cantidad, 0);

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: "#14532D" }}>
        <Toolbar sx={{ gap: 1, minHeight: 64, flexWrap: "wrap" }}>
          <Button
            component={RouterLink}
            to="/"
            color="inherit"
            startIcon={<YardIcon />}
            sx={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 22, px: 1.5 }}
          >
            VerdeCorredor
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <Button component={RouterLink} to="/" color="inherit">
            Catálogo
          </Button>
          {listo && usuario?.rol === "admin" && (
            <Button component={RouterLink} to="/vivero" color="inherit">
              Vivero
            </Button>
          )}
          {listo && usuario?.rol === "admin" && (
            <Button component={RouterLink} to="/inventario" color="inherit">
              Inventario
            </Button>
          )}
          {listo && usuario && (
            <Button component={RouterLink} to="/pedidos" color="inherit">
              Pedidos
            </Button>
          )}
          {unidades > 0 && (
            <Button component={RouterLink} to="/carrito" color="inherit">
              Carrito ({unidades})
            </Button>
          )}
          {listo && usuario?.rol === "admin" && (
            <Button component={RouterLink} to="/especies/nueva" color="inherit">
              Nueva especie
            </Button>
          )}
          {listo && usuario ? (
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Typography variant="body2" sx={{ display: { xs: "none", sm: "block" } }}>
                {usuario.nombre}
              </Typography>
              <Button color="inherit" onClick={salir}>
                Salir
              </Button>
            </Stack>
          ) : (
            listo && (
              <Button component={RouterLink} to="/entrar" color="inherit">
                Entrar
              </Button>
            )
          )}
        </Toolbar>
      </AppBar>
      <Container component="main" maxWidth="lg" sx={{ flex: 1, py: { xs: 3, md: 5 }, px: { xs: 2, sm: 3 } }}>
        <Outlet />
      </Container>
    </Box>
  );
}
