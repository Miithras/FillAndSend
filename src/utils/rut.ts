/**
 * Limpia caracteres no numéricos excepto 'k' o 'K'
 */
export function limpiarRut(rut: string): string {
  return (rut || '').replace(/[^0-9kK]/g, '').toUpperCase();
}

/**
 * Valida un RUT chileno usando el algoritmo de Módulo 11
 */
export function validarRut(rut: string): boolean {
  const limpio = limpiarRut(rut);
  if (limpio.length < 8) return false;

  const cuerpo = limpio.slice(0, -1);
  const dvIngresado = limpio.slice(-1).toUpperCase();

  let suma = 0;
  let multiplicador = 2;

  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo.charAt(i), 10) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }

  const resto = suma % 11;
  const dvCalculadoNum = 11 - resto;
  let dvCalculado = '';

  if (dvCalculadoNum === 11) dvCalculado = '0';
  else if (dvCalculadoNum === 10) dvCalculado = 'K';
  else dvCalculado = String(dvCalculadoNum);

  return dvIngresado === dvCalculado;
}

/**
 * Formatea un RUT limpio como 12.345.678-9
 */
export function formatearRut(rut: string): string {
  const limpio = limpiarRut(rut);
  if (!limpio) return '';
  if (limpio.length === 1) return limpio;

  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);

  const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${cuerpoFormateado}-${dv}`;
}

export function uid(): string {
  return Math.random().toString(36).substring(2, 9);
}
