import ExcelJS from 'exceljs';
import { AppState, RiskItem } from '../types';
import { DOC_TYPES } from '../config/docTypes';
import { ART_CELLS, CHARLA_CELLS, colToIndex } from '../config/excelMappings';
import { formatearRut } from '../utils/rut';
import { getTodayISODate, formatDateChilean } from './storageService';
import { WORKERS_DB } from '../config/workers';

/**
 * Normaliza nombres para comparación flexible (insensible a mayúsculas, tildes y espacios)
 */
function normalizeName(str: string | null | undefined): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Busca datos de un trabajador por nombre en WORKERS_DB (insensible a tildes y mayúsculas)
 */
function lookupWorker(name: string): { rut?: string; cargo?: string } | undefined {
  const norm = normalizeName(name);
  return WORKERS_DB.find(w => normalizeName(w.nombre) === norm);
}

/**
 * Inserta filas de forma segura en ExcelJS preservando combinaciones existentes,
 * alturas de fila originales y estilos (bordes, fuentes, alineación y fondo).
 */
function safeInsertRows(
  ws: ExcelJS.Worksheet,
  startRow: number,
  count: number,
  templateRowIndex?: number
): void {
  if (count <= 0) return;

  // 1. Capturar snapshot de todas las combinaciones existentes
  const mergeRanges = Object.values((ws as any)._merges || {}).map((range: any) => ({
    top: range.top as number,
    bottom: range.bottom as number,
    left: range.left as number,
    right: range.right as number
  }));

  // 2. Descombinar todo para evitar colisiones internas en ExcelJS
  for (const range of mergeRanges) {
    try {
      ws.unMergeCells(range.top, range.left, range.bottom, range.right);
    } catch {}
  }

  // 3. Insertar las filas vacías
  const emptyRows = Array.from({ length: count }, () => []);
  ws.spliceRows(startRow, 0, ...emptyRows);

  // 4. Desplazar combinaciones que estén en o debajo del punto de inserción y recombinar
  for (const range of mergeRanges) {
    let top = range.top;
    let bottom = range.bottom;
    if (top >= startRow) {
      top += count;
      bottom += count;
    } else if (bottom >= startRow) {
      bottom += count;
    }
    try {
      ws.mergeCells(top, range.left, bottom, range.right);
    } catch {}
  }

  // 5. Clonar formato y altura desde la fila de referencia
  if (templateRowIndex) {
    const actualTmplIdx = templateRowIndex < startRow ? templateRowIndex : templateRowIndex + count;
    const tmplRow = ws.getRow(actualTmplIdx);
    for (let i = 0; i < count; i++) {
      const tgtRow = ws.getRow(startRow + i);
      tgtRow.height = tmplRow.height;
      for (let c = 1; c <= 8; c++) {
        const srcCell = tmplRow.getCell(c);
        const tgtCell = tgtRow.getCell(c);
        if (srcCell.style) {
          tgtCell.style = JSON.parse(JSON.stringify(srcCell.style));
        }
      }
    }
  }
}

function cleanBase64Png(dataUrl: string | null | undefined): string | null {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const trimmed = dataUrl.trim();
  const commaIdx = trimmed.indexOf(',');
  const rawBase64 = (commaIdx !== -1 ? trimmed.substring(commaIdx + 1) : trimmed).replace(/\s+/g, '');
  if (rawBase64.length < 50) return null;
  return `data:image/png;base64,${rawBase64}`;
}

/**
 * Inserta una firma mediante strict twoCellAnchor con editAs: 'oneCell'.
 * Garantiza coordenadas enteras, referencias de medios PNG válidas en OpenXML
 * y evita anclajes de dimensión cero o flotantes para compatibilidad total con
 * visores web de correo (Gmail, Outlook Online, Office 365, Google Sheets).
 */
async function addSignatureTwoCellAnchor(
  workbook: ExcelJS.Workbook,
  ws: ExcelJS.Worksheet,
  dataUrl: string | null | undefined,
  rangeOrCell: string
): Promise<void> {
  const cleanData = cleanBase64Png(dataUrl);
  if (!cleanData) return;

  const rangeAddr = rangeOrCell.includes(':') ? rangeOrCell : `${rangeOrCell}:${rangeOrCell}`;
  const [tlAddr, brAddr] = rangeAddr.split(':');
  const tlCol = tlAddr.match(/[A-Z]+/)?.[0] || 'A';
  const tlRow = parseInt(tlAddr.match(/\d+/)?.[0] || '1', 10);
  const brCol = brAddr.match(/[A-Z]+/)?.[0] || tlCol;
  const brRow = parseInt(brAddr.match(/\d+/)?.[0] || String(tlRow), 10);

  const startColIdx = colToIndex(tlCol);
  const endColIdx = colToIndex(brCol);
  const startRowIdx = tlRow - 1;
  const endRowIdx = brRow;

  // Evitar anclas de dimensión cero o rangos invertidos
  if (endColIdx < startColIdx || endRowIdx <= startRowIdx) return;

  const imgId = workbook.addImage({ base64: cleanData, extension: 'png' });

  ws.addImage(imgId, {
    tl: { col: startColIdx, row: startRowIdx },
    br: { col: endColIdx + 1, row: endRowIdx },
    editAs: 'oneCell'
  } as any);
}

async function addSignatureImage(
  workbook: ExcelJS.Workbook,
  ws: ExcelJS.Worksheet,
  dataUrl: string | null,
  colLetter: string,
  row: number
) {
  return addSignatureTwoCellAnchor(workbook, ws, dataUrl, `${colLetter}${row}`);
}

async function addSignatureImageFit(
  workbook: ExcelJS.Workbook,
  ws: ExcelJS.Worksheet,
  dataUrl: string | null,
  rangeAddr: string
) {
  return addSignatureTwoCellAnchor(workbook, ws, dataUrl, rangeAddr);
}

function writeLeftCell(ws: ExcelJS.Worksheet, addr: string, value: any) {
  if (value === undefined || value === null || value === '') return;
  const cell = ws.getCell(addr);
  cell.value = value;
  cell.alignment = { ...cell.alignment, horizontal: 'left', vertical: 'middle', wrapText: true };
}

function writeCenterCell(ws: ExcelJS.Worksheet, addr: string, value: any) {
  if (value === undefined || value === null || value === '') return;
  const cell = ws.getCell(addr);
  cell.value = value;
  cell.alignment = { ...cell.alignment, horizontal: 'center', vertical: 'middle', wrapText: true };
}

function writeRiskCell(ws: ExcelJS.Worksheet, addr: string, value: any) {
  if (value === undefined || value === null || value === '') return;
  const cell = ws.getCell(addr);
  cell.value = value;
  cell.alignment = { ...cell.alignment, horizontal: 'left', vertical: 'top', wrapText: true };
}

function writeCheckCell(ws: ExcelJS.Worksheet, addr: string, val: string = 'X') {
  const cell = ws.getCell(addr);
  cell.value = val;
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  cell.font = { name: 'Arial', size: 11 };
}

function formatBulletList(items?: string[] | string): string {
  if (!items) return '';
  if (Array.isArray(items)) {
    const cleanItems = items.map(it => String(it).trim()).filter(Boolean);
    if (cleanItems.length === 0) return '';
    return cleanItems.map(it => (it.startsWith('•') ? it : `• ${it}`)).join('\n');
  }
  const str = String(items).trim();
  if (!str) return '';
  if (str.includes('\n')) {
    return str
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
      .map(it => (it.startsWith('•') ? it : `• ${it}`))
      .join('\n');
  }
  return str.startsWith('•') ? str : `• ${str}`;
}

function adjustRiskRowHeight(ws: ExcelJS.Worksheet, rowNumber: number, r: RiskItem) {
  const evs = (Array.isArray(r.eventos) && r.eventos.length > 0)
    ? r.eventos
    : (r.evento ? [r.evento] : []);
  const meds = (Array.isArray(r.medidas) && r.medidas.length > 0)
    ? r.medidas
    : (r.medida ? [r.medida] : []);
  
  const count = Math.max(evs.length, meds.length, 1);
  const row = ws.getRow(rowNumber);
  const currentHeight = row.height || 24;
  // Si hay más de 1 ítem, expandir la altura para que no se oculte texto (18pt por ítem)
  const neededHeight = Math.max(currentHeight, count * 18);
  row.height = neededHeight;
}

async function fillArtWorkbook(state: AppState, workbook: ExcelJS.Workbook, ws: ExcelJS.Worksheet) {
  const doc = DOC_TYPES[state.docType];
  const f = state.form;
  const C = ART_CELLS;

  // Preservar anchos de columna originales de la plantilla
  const originalColWidths = ws.columns.map(c => c.width);

  // Encabezados
  Object.entries(C.header).forEach(([id, addr]) => {
    if (id === 'fecha') {
      const fechaVal = formatDateChilean(f.fecha || getTodayISODate());
      writeCenterCell(ws, addr, fechaVal);
    } else if (f[id]) {
      writeLeftCell(ws, addr, f[id]);
    }
  });

  // I. Verificación previa — grupo 0 (filas 13 a 19)
  (doc.triGroups[0]?.items || []).forEach((item, i) => {
    const row = C.triLeftRows[i];
    if (!row) return;
    const val = state.tri['0:' + item] || 'NA';
    if (val === 'SI') writeCheckCell(ws, 'E' + row);
    else if (val === 'NO') writeCheckCell(ws, 'F' + row);
    else writeCheckCell(ws, 'G' + row);
  });

  // I. Verificación previa — grupo 1 (filas 20 a 29)
  (doc.triGroups[1]?.items || []).forEach((item, i) => {
    const row = C.triRightRows[i];
    if (!row) return;
    const val = state.tri['1:' + item] || 'NA';
    if (val === 'SI') writeCheckCell(ws, 'E' + row);
    else if (val === 'NO') writeCheckCell(ws, 'F' + row);
    else writeCheckCell(ws, 'G' + row);
  });

  // Desplazamiento acumulado global para filas insertadas dinámicamente
  let shift = 0;

  // II. EPP
  Object.entries(C.epp).forEach(([item, [row, col]]) => {
    if (state.multi['0:' + item]) {
      writeCheckCell(ws, col + row);
    }
  });

  // II. EPP — Ítems personalizados (Otro)
  const eppOtroItems = (state.final.eppOtro || '')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);

  if (eppOtroItems.length === 0 && state.multi['0:Otro']) {
    writeCheckCell(ws, 'A46');
  } else if (eppOtroItems.length > 0) {
    writeCheckCell(ws, 'A46');
    writeLeftCell(ws, 'B46', eppOtroItems[0]);

    if (eppOtroItems.length > 1) {
      writeCheckCell(ws, 'E46');
      writeLeftCell(ws, 'F46', eppOtroItems[1]);
    }

    if (eppOtroItems.length > 2) {
      const remaining = eppOtroItems.slice(2);
      const extraRows = Math.ceil(remaining.length / 2);
      safeInsertRows(ws, 47, extraRows, 46);
      for (let i = 0; i < extraRows; i++) {
        const row = 47 + i;
        ws.mergeCells(row, 2, row, 4); // B:D
        ws.mergeCells(row, 6, row, 8); // F:H
        const leftItem = remaining[i * 2];
        const rightItem = remaining[i * 2 + 1];
        if (leftItem) {
          writeCheckCell(ws, `A${row}`);
          writeLeftCell(ws, `B${row}`, leftItem);
        }
        if (rightItem) {
          writeCheckCell(ws, `E${row}`);
          writeLeftCell(ws, `F${row}`, rightItem);
        }
      }
      shift += extraRows;
    }
  }

  // III. Máquinas y/o Vehículos
  Object.entries(C.maquinas).forEach(([item, [baseRow, col]]) => {
    if (state.multi['1:' + item]) {
      writeCheckCell(ws, col + (baseRow + shift));
    }
  });

  const maquinasOtroItems = (state.final.maquinasOtro || '')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
  const maquinasOtroRow = 54 + shift;

  if (maquinasOtroItems.length === 0 && state.multi['1:Otro']) {
    writeCheckCell(ws, 'A' + maquinasOtroRow);
  } else if (maquinasOtroItems.length > 0) {
    writeCheckCell(ws, 'A' + maquinasOtroRow);
    writeLeftCell(ws, 'B' + maquinasOtroRow, maquinasOtroItems[0]);

    if (maquinasOtroItems.length > 1) {
      writeCheckCell(ws, 'D' + maquinasOtroRow);
      writeLeftCell(ws, 'E' + maquinasOtroRow, maquinasOtroItems[1]);
    }

    if (maquinasOtroItems.length > 2) {
      const remaining = maquinasOtroItems.slice(2);
      const extraRows = Math.ceil(remaining.length / 2);
      safeInsertRows(ws, maquinasOtroRow + 1, extraRows, maquinasOtroRow);
      for (let i = 0; i < extraRows; i++) {
        const row = maquinasOtroRow + 1 + i;
        ws.mergeCells(row, 2, row, 3); // B:C
        ws.mergeCells(row, 5, row, 6); // E:F
        const leftItem = remaining[i * 2];
        const rightItem = remaining[i * 2 + 1];
        if (leftItem) {
          writeCheckCell(ws, `A${row}`);
          writeLeftCell(ws, `B${row}`, leftItem);
        }
        if (rightItem) {
          writeCheckCell(ws, `D${row}`);
          writeLeftCell(ws, `E${row}`, rightItem);
        }
      }
      shift += extraRows;
    }
  }

  // IV. Aspectos Ambientales (Checkbox en Col A, Texto en Col B)
  Object.entries(C.aspectos).forEach(([item, baseRow]) => {
    if (state.multi['2:' + item]) {
      writeCheckCell(ws, 'A' + (baseRow + shift));
    }
  });

  // IV. Impactos Ambientales (Checkbox en Col D, Texto en Col E)
  Object.entries(C.impactos).forEach(([item, baseRow]) => {
    if (state.multi['3:' + item]) {
      writeCheckCell(ws, 'D' + (baseRow + shift));
    }
  });

  // IV. Medidas de Control Ambiental (Checkbox en Col G, Texto en Col H)
  Object.entries(C.medidasAmbientales).forEach(([item, baseRow]) => {
    if (state.multi['4:' + item]) {
      writeCheckCell(ws, 'G' + (baseRow + shift));
    }
  });

  // Limpiar espacios en blanco excesivos de la plantilla y asegurar wrapText en columnas de texto B, E, H
  for (let r = 58 + shift; r <= 63 + shift; r++) {
    ['B', 'E', 'H'].forEach(col => {
      const cell = ws.getCell(col + r);
      if (typeof cell.value === 'string') {
        cell.value = cell.value.trim();
      }
      cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    });
  }

  // Manejo dinámico de "Otro" en Sección IV
  const aspectosOtroItems = (state.final.aspectosOtro || '')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
  if (aspectosOtroItems.length === 0 && state.multi['2:Otro']) {
    aspectosOtroItems.push('Otro');
  }

  const impactosOtroItems = (state.final.impactosOtro || '')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
  if (impactosOtroItems.length === 0 && state.multi['3:Otro']) {
    writeCheckCell(ws, 'D' + (61 + shift));
  } else {
    for (let i = 0; i < Math.min(impactosOtroItems.length, 3); i++) {
      const row = 61 + shift + i;
      writeLeftCell(ws, 'E' + row, impactosOtroItems[i]);
      writeCheckCell(ws, 'D' + row, 'X');
    }
  }

  const medidasOtroItems = (state.final.medidasOtro || '')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
  if (medidasOtroItems.length === 0 && state.multi['4:Otro']) {
    writeCheckCell(ws, 'G' + (61 + shift));
  } else {
    for (let i = 0; i < Math.min(medidasOtroItems.length, 3); i++) {
      const row = 61 + shift + i;
      writeLeftCell(ws, 'H' + row, medidasOtroItems[i]);
      writeCheckCell(ws, 'G' + row, 'X');
    }
  }

  const extraAspectos = aspectosOtroItems.length;
  const extraImpactos = Math.max(0, impactosOtroItems.length - 3);
  const extraMedidas = Math.max(0, medidasOtroItems.length - 3);
  const extraSectionIVRows = Math.max(extraAspectos, extraImpactos, extraMedidas);

  if (extraSectionIVRows > 0) {
    const insertAt = 63 + shift + 1;
    safeInsertRows(ws, insertAt, extraSectionIVRows, 63 + shift);
    for (let i = 0; i < extraSectionIVRows; i++) {
      const row = insertAt + i;
      if (i < extraAspectos) {
        writeCheckCell(ws, 'A' + row, 'X');
        writeLeftCell(ws, 'B' + row, aspectosOtroItems[i]);
      }
      if (i < extraImpactos) {
        writeCheckCell(ws, 'D' + row, 'X');
        writeLeftCell(ws, 'E' + row, impactosOtroItems[3 + i]);
      }
      if (i < extraMedidas) {
        writeCheckCell(ws, 'G' + row, 'X');
        writeLeftCell(ws, 'H' + row, medidasOtroItems[3 + i]);
      }
    }
    shift += extraSectionIVRows;
  }

  // V. Actividades de Alto Riesgo
  Object.entries(C.altoRiesgo).forEach(([item, [baseRow, col]]) => {
    if (state.multi['5:' + item] || state.multi['3:' + item]) {
      writeCheckCell(ws, col + (baseRow + shift));
    }
  });

  const altoRiesgoOtroItems = (state.final.altoRiesgoOtro || '')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
  const altoRiesgoOtroRow = 70 + shift;

  if (altoRiesgoOtroItems.length === 0 && (state.multi['5:Otro'] || state.multi['3:Otro'])) {
    writeCheckCell(ws, 'A' + altoRiesgoOtroRow);
  } else if (altoRiesgoOtroItems.length > 0) {
    writeCheckCell(ws, 'A' + altoRiesgoOtroRow);
    writeLeftCell(ws, 'B' + altoRiesgoOtroRow, altoRiesgoOtroItems[0]);

    if (altoRiesgoOtroItems.length > 1) {
      writeCheckCell(ws, 'D' + altoRiesgoOtroRow);
      writeLeftCell(ws, 'E' + altoRiesgoOtroRow, altoRiesgoOtroItems[1]);
    }

    if (altoRiesgoOtroItems.length > 2) {
      const remaining = altoRiesgoOtroItems.slice(2);
      const extraRows = Math.ceil(remaining.length / 2);
      safeInsertRows(ws, altoRiesgoOtroRow + 1, extraRows, altoRiesgoOtroRow);
      for (let i = 0; i < extraRows; i++) {
        const row = altoRiesgoOtroRow + 1 + i;
        ws.mergeCells(row, 2, row, 3); // B:C
        ws.mergeCells(row, 5, row, 7); // E:G
        const leftItem = remaining[i * 2];
        const rightItem = remaining[i * 2 + 1];
        if (leftItem) {
          writeCheckCell(ws, `A${row}`);
          writeLeftCell(ws, `B${row}`, leftItem);
        }
        if (rightItem) {
          writeCheckCell(ws, `D${row}`);
          writeLeftCell(ws, `E${row}`, rightItem);
        }
      }
      shift += extraRows;
    }
  }

  // VI. Análisis de Riesgos en el Trabajo (dinámico con safeInsertRows)
  const riskBaseRow = 75 + shift;
  if (state.risks && state.risks.length > 0) {
    const r0 = state.risks[0];
    const evs0 = (Array.isArray(r0.eventos) && r0.eventos.length > 0) ? r0.eventos : (r0.evento ? [r0.evento] : []);
    const meds0 = (Array.isArray(r0.medidas) && r0.medidas.length > 0) ? r0.medidas : (r0.medida ? [r0.medida] : []);

    if (r0.etapa) writeRiskCell(ws, 'A' + riskBaseRow, r0.etapa);
    if (evs0.length > 0) writeRiskCell(ws, 'C' + riskBaseRow, formatBulletList(evs0));
    if (meds0.length > 0) writeRiskCell(ws, 'F' + riskBaseRow, formatBulletList(meds0));
    adjustRiskRowHeight(ws, riskBaseRow, r0);

    if (state.risks.length > 1) {
      const extraRisks = state.risks.length - 1;
      safeInsertRows(ws, riskBaseRow + 1, extraRisks, riskBaseRow);
      for (let i = 0; i < extraRisks; i++) {
        const row = riskBaseRow + 1 + i;
        ws.mergeCells(`A${row}:B${row}`);
        ws.mergeCells(`C${row}:E${row}`);
        ws.mergeCells(`F${row}:H${row}`);

        const r = state.risks[i + 1];
        const evs = (Array.isArray(r.eventos) && r.eventos.length > 0) ? r.eventos : (r.evento ? [r.evento] : []);
        const meds = (Array.isArray(r.medidas) && r.medidas.length > 0) ? r.medidas : (r.medida ? [r.medida] : []);

        if (r.etapa) writeRiskCell(ws, 'A' + row, r.etapa);
        if (evs.length > 0) writeRiskCell(ws, 'C' + row, formatBulletList(evs));
        if (meds.length > 0) writeRiskCell(ws, 'F' + row, formatBulletList(meds));
        adjustRiskRowHeight(ws, row, r);
      }
      shift += extraRisks;
    }
  }

  // VII. Operarios en terreno presentes (dinámico con safeInsertRows y lookup de RUT / Cargo)
  const operariosBaseRow = 79 + shift;

  if (state.signers.length > 0) {
    const s0 = state.signers[0];
    const w0 = lookupWorker(s0.nombre);
    const rut0 = s0.rut || w0?.rut || '';
    const cargo0 = s0.cargo || (s0 as any)['cargo'] || (s0 as any)['Cargo'] || w0?.cargo || '';
    const tareas0 = s0.tareas || (s0 as any)['tareas'] || (s0 as any)['Tareas asignadas'] || '';

    writeLeftCell(ws, 'B' + operariosBaseRow, s0.nombre);
    writeLeftCell(ws, 'D' + operariosBaseRow, formatearRut(rut0) || rut0);
    writeLeftCell(ws, 'E' + operariosBaseRow, cargo0);
    writeLeftCell(ws, 'G' + operariosBaseRow, tareas0);
    if (s0.firma) {
      ws.getRow(operariosBaseRow).height = Math.max(ws.getRow(operariosBaseRow).height || 0, 32);
      await addSignatureTwoCellAnchor(workbook, ws, s0.firma, `A${operariosBaseRow}`);
    }

    if (state.signers.length > 1) {
      const extraSigners = state.signers.length - 1;
      safeInsertRows(ws, operariosBaseRow + 1, extraSigners, operariosBaseRow);
      for (let i = 0; i < extraSigners; i++) {
        const row = operariosBaseRow + 1 + i;
        ws.mergeCells(`B${row}:C${row}`);
        ws.mergeCells(`E${row}:F${row}`);
        ws.mergeCells(`G${row}:H${row}`);

        const s = state.signers[i + 1];
        const w = lookupWorker(s.nombre);
        const rut = s.rut || w?.rut || '';
        const cargo = s.cargo || (s as any)['cargo'] || (s as any)['Cargo'] || w?.cargo || '';
        const tareas = s.tareas || (s as any)['tareas'] || (s as any)['Tareas asignadas'] || '';

        writeLeftCell(ws, 'B' + row, s.nombre);
        writeLeftCell(ws, 'D' + row, formatearRut(rut) || rut);
        writeLeftCell(ws, 'E' + row, cargo);
        writeLeftCell(ws, 'G' + row, tareas);
        if (s.firma) {
          ws.getRow(row).height = Math.max(ws.getRow(row).height || 0, 32);
          await addSignatureTwoCellAnchor(workbook, ws, s.firma, `A${row}`);
        }
      }
      shift += extraSigners;
    }
  }

  // VIII. Incidentes durante las actividades (filas 83 a 85 + shift)
  const incidentesRow = 83 + shift;
  const incidentList = doc.incidentes?.items || [
    'Incidente Seguridad',
    'Incidente Ambiental',
    'Incidente Calidad',
    'Near Miss',
    'Stop Work'
  ];
  const selectedIncidentes: string[] = [];
  incidentList.forEach(item => {
    if (state.multi['inc:' + item]) {
      selectedIncidentes.push(item);
    }
  });

  if (selectedIncidentes.length > 0) {
    const incidentText = selectedIncidentes.length === 1
      ? selectedIncidentes[0]
      : selectedIncidentes.map(it => `• ${it}`).join('\n');
    const cellA = ws.getCell('A' + incidentesRow);
    cellA.value = incidentText;
    cellA.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    cellA.font = { name: 'Arial', size: selectedIncidentes.length > 2 ? 9 : 10 };
  }

  if (state.final.incidenteDesc) {
    const cellC = ws.getCell('C' + incidentesRow);
    cellC.value = state.final.incidenteDesc;
    cellC.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    cellC.font = { name: 'Arial', size: 10 };
  }

  if (state.final.accionCorrectiva) {
    const cellF = ws.getCell('F' + incidentesRow);
    cellF.value = state.final.accionCorrectiva;
    cellF.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    cellF.font = { name: 'Arial', size: 10 };
  }

  // Ajustar altura de las 3 filas (83, 84, 85 + shift) para asegurar que ningún texto quede cortado
  const descLines = (state.final.incidenteDesc || '').split('\n').length;
  const actionLines = (state.final.accionCorrectiva || '').split('\n').length;
  const incLines = selectedIncidentes.length;
  const maxLines = Math.max(incLines, descLines, actionLines, 3);
  const totalMinHeight = Math.max(50, maxLines * 18);
  const heightPerRow = Math.max(18, Math.ceil(totalMinHeight / 3));

  for (let r = 0; r < 3; r++) {
    const targetRow = ws.getRow(incidentesRow + r);
    targetRow.height = Math.max(targetRow.height || 0, heightPerRow);
  }

  // IX. Visitas en Terreno (filas 88 a 92 + shift)
  Object.entries(C.visitas).forEach(([item, [baseRow, col]]) => {
    if (item !== 'Otro' && (state.multi['6:' + item] || state.multi['4:' + item])) {
      writeCheckCell(ws, col + (baseRow + shift));
    }
  });

  const visitaOtroItems = (state.final.visitaOtro || '')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
  const visitasOtroRow = 92 + shift;

  if (visitaOtroItems.length === 0 && (state.multi['6:Otro'] || state.multi['4:Otro'])) {
    writeCheckCell(ws, 'D' + visitasOtroRow);
  } else if (visitaOtroItems.length > 0) {
    writeCheckCell(ws, 'D' + visitasOtroRow);
    writeLeftCell(ws, 'E' + visitasOtroRow, visitaOtroItems[0]);

    if (visitaOtroItems.length > 1) {
      const remaining = visitaOtroItems.slice(1);
      const extraRows = remaining.length;
      safeInsertRows(ws, visitasOtroRow + 1, extraRows, visitasOtroRow);
      for (let i = 0; i < extraRows; i++) {
        const row = visitasOtroRow + 1 + i;
        ws.mergeCells(row, 2, row, 3); // B:C
        ws.mergeCells(row, 5, row, 6); // E:F
        writeCheckCell(ws, 'D' + row);
        writeLeftCell(ws, 'E' + row, remaining[i]);
      }
      shift += extraRows;
    }
  }

  // X. Eventualidades (fila 95 + shift)
  const eventualidadesRow = 95 + shift;
  if (state.final.eventualidades) writeLeftCell(ws, 'A' + eventualidadesRow, state.final.eventualidades);

  // Footer signature: Firma de Supervisor exactamente en fila anterior (row - 1) a las etiquetas designadas en 102 + shift
  const labelRow = 102 + shift;
  const presenterRow = labelRow - 1;

  if (state.closingSig) {
    const wSup = lookupWorker(state.closingSig.nombre);
    const cargoSup = state.closingSig.cargo || wSup?.cargo || '';

    ws.getRow(presenterRow).height = 45;
    writeCenterCell(ws, 'A' + presenterRow, state.closingSig.nombre);
    if (cargoSup) {
      writeCenterCell(ws, 'D' + presenterRow, cargoSup);
    }
    await addSignatureTwoCellAnchor(workbook, ws, state.closingSig.firma, `F${presenterRow}:H${presenterRow}`);
  }

  // Restaurar anchos de columna originales
  originalColWidths.forEach((w, idx) => {
    if (w !== undefined) ws.getColumn(idx + 1).width = w;
  });
}

async function fillCharlaWorkbook(state: AppState, workbook: ExcelJS.Workbook, ws: ExcelJS.Worksheet) {
  const f = state.form;
  const C = CHARLA_CELLS;

  // Preservar anchos de columna originales de la plantilla
  const originalColWidths = ws.columns.map(c => c.width);

  // Encabezados
  Object.entries(C.header).forEach(([id, addr]) => {
    if (id === 'fecha') {
      const fechaVal = formatDateChilean(f.fecha || getTodayISODate());
      writeCenterCell(ws, addr, fechaVal);
    } else if (f[id]) {
      writeLeftCell(ws, addr, f[id]);
    }
  });

  // Clasificación de temas estándar
  Object.entries(C.clasificacion).forEach(([item, [row, col]]) => {
    if (state.multi['0:' + item]) {
      writeCheckCell(ws, col + row);
    }
  });

  // Temas dinámicos: Reemplazar 'Otro' con el tema personalizado y desplazar/insertar filas para extras manteniendo formatos
  const customTopics = (state.final.clasificacionOtro || '')
    .split(/[\n,;]+/)
    .map(t => t.trim())
    .filter(Boolean);

  let topicShift = 0;
  if (state.multi['0:Otro'] || customTopics.length > 0) {
    writeCheckCell(ws, 'E19');
    if (customTopics.length > 0) {
      writeLeftCell(ws, 'F19', customTopics[0]);
    }

    if (customTopics.length > 1) {
      const extraTopicsCount = customTopics.length - 1;
      safeInsertRows(ws, 20, extraTopicsCount, 19);

      for (let i = 0; i < extraTopicsCount; i++) {
        const rowNum = 20 + i;
        ws.mergeCells(rowNum, 6, rowNum, 8); // F:H
        writeCheckCell(ws, `E${rowNum}`);
        writeLeftCell(ws, `F${rowNum}`, customTopics[i + 1]);
      }
      topicShift = extraTopicsCount;
    }
  }

  // Asistentes y Firmas: emparejar con existentes, reemplazar 'Otro' para nuevos e insertar dinámicamente con firmas en col + 1
  const rosterStartRow = 22 + topicShift;
  const rosterEndRow = 32 + topicShift;

  interface AttendeeSlot {
    row: number;
    nameCell: string;
    sigCol: string;
    originalName: string;
    used: boolean;
  }
  const slots: AttendeeSlot[] = [];

  for (let r = rosterStartRow; r <= rosterEndRow; r++) {
    // Columna 1: Nombre en A (combinada A:C), Firma en D (columna + 1)
    const valCol1 = (ws.getCell(`A${r}`).value || '').toString().trim();
    slots.push({ row: r, nameCell: `A${r}`, sigCol: 'D', originalName: valCol1, used: false });

    // Columna 2: Nombre en E (combinada E:G), Firma en H (columna + 1)
    const valCol2 = (ws.getCell(`E${r}`).value || '').toString().trim();
    slots.push({ row: r, nameCell: `E${r}`, sigCol: 'H', originalName: valCol2, used: false });
  }

  const unplacedSigners: typeof state.signers = [];

  // Paso 1: Match con nombres preexistentes en la plantilla
  for (const s of state.signers) {
    const sNorm = normalizeName(s.nombre);
    const matchedSlot = slots.find(
      slot => !slot.used && normalizeName(slot.originalName) !== 'otro' && normalizeName(slot.originalName) === sNorm
    );
    if (matchedSlot) {
      matchedSlot.used = true;
      if (s.firma) {
        ws.getRow(matchedSlot.row).height = Math.max(ws.getRow(matchedSlot.row).height || 0, 30);
        await addSignatureTwoCellAnchor(workbook, ws, s.firma, `${matchedSlot.sigCol}${matchedSlot.row}`);
      }
    } else {
      unplacedSigners.push(s);
    }
  }

  // Paso 2: Asignar a espacios 'Otro' para nombres no preexistentes
  const remainingSigners: typeof state.signers = [];
  for (const s of unplacedSigners) {
    const otroSlot = slots.find(slot => !slot.used && normalizeName(slot.originalName) === 'otro');
    if (otroSlot) {
      otroSlot.used = true;
      writeLeftCell(ws, otroSlot.nameCell, s.nombre);
      if (s.firma) {
        ws.getRow(otroSlot.row).height = Math.max(ws.getRow(otroSlot.row).height || 0, 30);
        await addSignatureTwoCellAnchor(workbook, ws, s.firma, `${otroSlot.sigCol}${otroSlot.row}`);
      }
    } else {
      remainingSigners.push(s);
    }
  }

  // Paso 3: Inserción dinámica de filas si se supera la capacidad de la plantilla
  let attendeeShift = 0;
  if (remainingSigners.length > 0) {
    const rowsNeeded = Math.ceil(remainingSigners.length / 2);
    const insertPos = rosterEndRow + 1;
    safeInsertRows(ws, insertPos, rowsNeeded, rosterEndRow);

    for (let i = 0; i < rowsNeeded; i++) {
      const rowNum = insertPos + i;
      ws.mergeCells(rowNum, 1, rowNum, 3); // A:C
      ws.mergeCells(rowNum, 5, rowNum, 7); // E:G

      const s1 = remainingSigners[i * 2];
      const s2 = remainingSigners[i * 2 + 1];

      if (s1) {
        writeLeftCell(ws, `A${rowNum}`, s1.nombre);
        if (s1.firma) {
          ws.getRow(rowNum).height = Math.max(ws.getRow(rowNum).height || 0, 30);
          await addSignatureTwoCellAnchor(workbook, ws, s1.firma, `D${rowNum}`);
        }
      }
      if (s2) {
        writeLeftCell(ws, `E${rowNum}`, s2.nombre);
        if (s2.firma) {
          ws.getRow(rowNum).height = Math.max(ws.getRow(rowNum).height || 0, 30);
          await addSignatureTwoCellAnchor(workbook, ws, s2.firma, `H${rowNum}`);
        }
      } else {
        writeLeftCell(ws, `E${rowNum}`, 'Otro');
      }
    }
    attendeeShift = rowsNeeded;
  }

  const totalShift = topicShift + attendeeShift;

  // Mutual y Comentarios finales
  const mutualRow = 34 + totalShift;
  if (state.final.mutual) writeLeftCell(ws, `A${mutualRow}`, state.final.mutual);

  const comentariosRow = 38 + totalShift;
  if (state.final.comentarios) writeLeftCell(ws, `A${comentariosRow}`, state.final.comentarios);

  // Footer signature: Ubicar nombre y firma exactamente una fila arriba (row - 1) de las etiquetas en 45 + totalShift
  const labelRow = 45 + totalShift;
  const presenterRow = labelRow - 1;

  if (state.closingSig) {
    ws.getRow(presenterRow).height = 45;
    writeCenterCell(ws, `A${presenterRow}`, state.closingSig.nombre);
    await addSignatureTwoCellAnchor(workbook, ws, state.closingSig.firma, `E${presenterRow}:H${presenterRow}`);
  }

  // Restaurar anchos de columna originales
  originalColWidths.forEach((w, idx) => {
    if (w !== undefined) ws.getColumn(idx + 1).width = w;
  });
}

export function ensureTriDefaults(state: AppState): AppState {
  const doc = DOC_TYPES[state.docType];
  const newTri = { ...state.tri };

  (doc.triGroups || []).forEach((group, gIdx) => {
    group.items.forEach(item => {
      const key = `${gIdx}:${item}`;
      if (!newTri[key]) {
        newTri[key] = 'NA';
      }
    });
  });

  return { ...state, tri: newTri };
}

export async function buildExcelBlob(rawState: AppState): Promise<Blob> {
  const state = ensureTriDefaults(rawState);
  const doc = DOC_TYPES[state.docType];
  const templateUrl = `./templates/${doc.meta.templateFile}`;

  const response = await fetch(templateUrl);
  if (!response.ok) {
    throw new Error(`No se pudo cargar la plantilla Excel (${doc.meta.templateFile}): HTTP ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  const ws = workbook.worksheets[0];

  if (state.docType === 'charla_inicial') {
    await fillCharlaWorkbook(state, workbook, ws);
  } else {
    await fillArtWorkbook(state, workbook, ws);
  }

  const buf = await workbook.xlsx.writeBuffer();
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function generateExcelFileName(state: AppState): string {
  const doc = DOC_TYPES[state.docType];
  const site = (state.form.usuario || state.form.obra || 'documento').replace(/\s+/g, '_');
  const today = getTodayISODate();
  return `${doc.meta.codigo}_${site}_${today}.xlsx`;
}

export async function downloadOriginalExcel(state: AppState): Promise<void> {
  const blob = await buildExcelBlob(state);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = generateExcelFileName(state);
  a.click();
  URL.revokeObjectURL(url);
}

export async function shareOriginalExcel(state: AppState): Promise<void> {
  const blob = await buildExcelBlob(state);
  const fileName = generateExcelFileName(state);
  const file = new File([blob], fileName, { type: blob.type });
  const doc = DOC_TYPES[state.docType];

  if (navigator.clipboard && state.destinatario) {
    try {
      await navigator.clipboard.writeText(state.destinatario);
    } catch (e) {}
  }

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: doc.label,
      text: `${doc.label} — envíalo a ${state.destinatario || 'jefatura'}`
    });
  } else {
    await downloadOriginalExcel(state);
  }
}
