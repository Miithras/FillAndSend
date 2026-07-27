import ExcelJS from 'exceljs';
import { AppState } from '../types';
import { DOC_TYPES } from '../config/docTypes';
import { ART_CELLS, CHARLA_CELLS, colToIndex } from '../config/excelMappings';
import { formatearRut } from '../utils/rut';

async function addSignatureImage(workbook: ExcelJS.Workbook, ws: ExcelJS.Worksheet, dataUrl: string | null, colLetter: string, row: number) {
  if (!dataUrl) return;
  const imgId = workbook.addImage({ base64: dataUrl, extension: 'png' });
  ws.addImage(imgId, {
    tl: { col: colToIndex(colLetter), row: row - 1 },
    ext: { width: 90, height: 32 }
  } as any);
}

async function addSignatureImageFit(workbook: ExcelJS.Workbook, ws: ExcelJS.Worksheet, dataUrl: string | null, rangeAddr: string) {
  if (!dataUrl) return;
  const [tlAddr, brAddr] = rangeAddr.split(':');
  const tlCol = tlAddr.match(/[A-Z]+/)?.[0] || 'A';
  const tlRow = parseInt(tlAddr.match(/\d+/)?.[0] || '1', 10);
  const brCol = brAddr.match(/[A-Z]+/)?.[0] || 'B';
  const brRow = parseInt(brAddr.match(/\d+/)?.[0] || '1', 10);

  const imgId = workbook.addImage({ base64: dataUrl, extension: 'png' });
  ws.addImage(imgId, {
    tl: { col: colToIndex(tlCol), row: tlRow - 1 },
    br: { col: colToIndex(brCol) + 1, row: brRow }
  } as any);
}

function writeLeftCell(ws: ExcelJS.Worksheet, addr: string, value: any) {
  if (value === undefined || value === null || value === '') return;
  const cell = ws.getCell(addr);
  cell.value = value;
  cell.alignment = { ...cell.alignment, horizontal: 'left', vertical: 'middle', wrapText: true };
}

function writeTriCell(ws: ExcelJS.Worksheet, addr: string, val?: string | null) {
  const cell = ws.getCell(addr);
  const cleanVal = val || 'NA'; // Requisito 8: por defecto N/A si no está seleccionado

  if (cleanVal === 'SI') {
    cell.value = 'SI';
    cell.alignment = { ...cell.alignment, horizontal: 'left', vertical: 'middle' };
  } else if (cleanVal === 'NO') {
    cell.value = 'NO';
    cell.alignment = { ...cell.alignment, horizontal: 'center', vertical: 'middle' };
  } else {
    cell.value = 'N/A';
    cell.alignment = { ...cell.alignment, horizontal: 'right', vertical: 'middle' };
  }
}

async function fillArtWorkbook(state: AppState, workbook: ExcelJS.Workbook, ws: ExcelJS.Worksheet) {
  const doc = DOC_TYPES[state.docType];
  const f = state.form;
  const C = ART_CELLS;

  Object.entries(C.header).forEach(([id, addr]) => {
    if (f[id]) writeLeftCell(ws, addr, f[id]);
  });

  // I. Verificación previa — grupo 0 (columna izquierda)
  (doc.triGroups[0]?.items || []).forEach((item, i) => {
    const row = C.triLeftRowStart + i;
    const val = state.tri['0:' + item];
    // Borrar celda H si contenía Marcas viejas X y usar celda J limpia
    ws.getCell('H' + row).value = '';
    writeTriCell(ws, 'J' + row, val);
  });

  // I. Verificación previa — grupo 1 (columna derecha)
  (doc.triGroups[1]?.items || []).forEach((item, i) => {
    const row = C.triRightRows[i];
    if (!row) return;
    const val = state.tri['1:' + item];
    writeTriCell(ws, 'T' + row, val);
  });

  Object.entries(C.epp).forEach(([item, [row, col]]) => {
    if (state.multi['0:' + item]) ws.getCell(col + row).value = 'X';
  });
  Object.entries(C.altoRiesgo).forEach(([item, [row, col]]) => {
    if (state.multi['3:' + item]) ws.getCell(col + row).value = 'X';
  });
  Object.entries(C.aspectos).forEach(([item, row]) => {
    if (state.multi['2:' + item]) ws.getCell('E' + row).value = 'X';
  });
  Object.entries(C.visitas).forEach(([item, [row, col]]) => {
    if (state.multi['4:' + item]) ws.getCell(col + row).value = 'X';
  });
  Object.entries(C.incidentes).forEach(([item, row]) => {
    if (state.multi['inc:' + item]) ws.getCell('B' + row).value = 'X';
  });

  if (state.final.incidenteDesc) writeLeftCell(ws, C.incidenteDesc, state.final.incidenteDesc);
  if (state.final.accionCorrectiva) writeLeftCell(ws, C.accionCorrectiva, state.final.accionCorrectiva);
  if (state.final.eventualidades) writeLeftCell(ws, C.eventualidades, state.final.eventualidades);

  // Operarios roster
  let nextExtraRow = C.operariosExtraStart;
  for (const s of state.signers) {
    const R = C.operariosRoster;
    let targetRow: number | null = null;

    for (let r = R.startRow; r <= R.endRow; r++) {
      const cellName = (ws.getCell(R.nombreCol + r).value || '').toString().trim().toLowerCase();
      if (cellName && cellName === s.nombre.trim().toLowerCase()) {
        targetRow = r;
        break;
      }
    }

    if (!targetRow) {
      targetRow = nextExtraRow++;
      writeLeftCell(ws, R.nombreCol + targetRow, s.nombre);
      writeLeftCell(ws, R.rutCol + targetRow, formatearRut(s.rut));
      writeLeftCell(ws, R.cargoCol + targetRow, s.cargo || '');
    }

    writeLeftCell(ws, R.tareasCol + targetRow, s.tareas || '');
    await addSignatureImage(workbook, ws, s.firma, R.firmaCol, targetRow);
  }

  if (state.closingSig) {
    writeLeftCell(ws, C.cierre.nombre, state.closingSig.nombre);
    if (state.closingSig.cargo) writeLeftCell(ws, C.cierre.cargo, state.closingSig.cargo);
    await addSignatureImageFit(workbook, ws, state.closingSig.firma, C.cierre.firmaRange);
  }
}

async function fillCharlaWorkbook(state: AppState, workbook: ExcelJS.Workbook, ws: ExcelJS.Worksheet) {
  const f = state.form;
  const C = CHARLA_CELLS;

  Object.entries(C.header).forEach(([id, addr]) => {
    if (f[id]) writeLeftCell(ws, addr, f[id]);
  });
  Object.entries(C.clasificacion).forEach(([item, [row, col]]) => {
    if (state.multi['0:' + item]) ws.getCell(col + row).value = 'X';
  });
  if (state.final.mutual) writeLeftCell(ws, C.mutual, state.final.mutual);
  if (state.final.comentarios) writeLeftCell(ws, C.comentarios, state.final.comentarios);

  const cols = [C.participantesRoster.col1, C.participantesRoster.col2];
  let extraRow = C.participantesRoster.col1.endRow + 1;

  for (const s of state.signers) {
    let placed = false;
    for (const colDef of cols) {
      for (let r = colDef.startRow; r <= colDef.endRow; r++) {
        const cellName = (ws.getCell(colDef.nombreCol + r).value || '').toString().trim().toLowerCase();
        if (cellName && cellName === s.nombre.trim().toLowerCase()) {
          await addSignatureImage(workbook, ws, s.firma, colDef.firmaCol, r);
          placed = true;
          break;
        }
      }
      if (placed) break;
    }
    if (!placed) {
      writeLeftCell(ws, C.participantesRoster.col1.nombreCol + extraRow, s.nombre);
      await addSignatureImage(workbook, ws, s.firma, C.participantesRoster.col1.firmaCol, extraRow);
      extraRow++;
    }
  }

  if (state.closingSig) {
    writeLeftCell(ws, C.cierre.nombre, state.closingSig.nombre);
    await addSignatureImageFit(workbook, ws, state.closingSig.firma, C.cierre.firmaRange);
  }
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
  const dateStr = state.form.fecha || 'sin_fecha';
  return `${doc.meta.codigo}_${site}_${dateStr}.xlsx`;
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
