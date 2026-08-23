/**
 * Utilidades de sanitización y validación de seguridad para ART Digital
 */

/**
 * Escapa caracteres especiales de HTML para prevenir ataques XSS
 */
export function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Limpia y previene inyecciones CRLF (\r, \n) en cabeceras de correo o campos de una sola línea
 */
export function sanitizeHeaderValue(val: string | null | undefined): string {
  if (!val) return '';
  return String(val).replace(/[\r\n]+/g, ' ').trim();
}

/**
 * Valida si un string tiene formato válido de correo electrónico
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(email.trim());
}

/**
 * Parsea y sanitiza una lista de correos separados por comas o punto y coma
 */
export function sanitizeEmailList(rawList: string | null | undefined): string[] {
  if (!rawList) return [];
  return rawList
    .split(/[,;]+/)
    .map(email => sanitizeHeaderValue(email))
    .filter(email => isValidEmail(email));
}

/**
 * Sanitiza texto general limitando su longitud y eliminando caracteres de control peligrosos
 */
export function sanitizeTextInput(text: string | null | undefined, maxLength: number = 2000): string {
  if (!text) return '';
  // Remover caracteres de control nulos o no imprimibles
  const cleaned = String(text).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  return cleaned.slice(0, maxLength).trim();
}
