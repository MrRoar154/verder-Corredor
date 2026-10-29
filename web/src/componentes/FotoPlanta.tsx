import YardIcon from "@mui/icons-material/Yard";
import { Box, Stack, Typography } from "@mui/material";

export function FotoPlanta({
  src,
  alt,
  alto = 280,
}: {
  src: string | null;
  alt: string;
  alto?: number;
}) {
  if (!src) {
    return (
      <Stack
        spacing={1}
        sx={{
          width: "100%",
          height: alto,
          borderRadius: 2,
          border: "1px dashed",
          borderColor: "divider",
          bgcolor: "background.paper",
          alignItems: "center",
          justifyContent: "center",
          color: "text.secondary",
          px: 2,
          textAlign: "center",
        }}
      >
        <YardIcon />
        <Typography variant="body2">Sin foto todavía</Typography>
      </Stack>
    );
  }

  return (
    <Box
      component="img"
      src={src}
      alt={alt}
      sx={{
        width: "100%",
        height: alto,
        objectFit: "cover",
        borderRadius: 2,
        display: "block",
        bgcolor: "background.paper",
      }}
    />
  );
}
