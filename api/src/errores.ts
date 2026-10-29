export class ErrorDeNegocio extends Error {
  estado: number;

  constructor(mensaje: string, estado: number) {
    super(mensaje);
    this.name = "ErrorDeNegocio";
    this.estado = estado;
  }
}
