export const ART_CELLS = {
  header: {
    supervisor: 'G4',
    movil: 'R4',
    usuario: 'F5',
    cliente: 'E6',
    fecha: 'R6',
    tipoTarea: 'G7',
    idTrabajo: 'E9',
    direccionObra: 'E10'
  },
  triLeftRowStart: 14,
  triRightRows: [10, 11, 12, 13, 14, 15, 16, 17, 19, 20],
  epp: {
    'Casco de Seguridad Dieléctrico': [22, 'B'], 'Barbiquejo de 3 puntas': [23, 'B'], 'Linterna frontal': [24, 'B'],
    'Zapatos de Seguridad Dieléctricos': [25, 'B'], 'Lentes de Seguridad': [26, 'B'], 'Guantes de Cabritilla': [27, 'B'],
    'Guantes de Nitrilo': [28, 'B'], 'Guantes de Anti-vibración': [29, 'B'], 'Protección Auditiva': [31, 'B'],
    'Careta Dieléctrica': [22, 'H'], 'Esclavina Ignífuga': [23, 'H'], 'Guantes Dieléctricos': [24, 'H'],
    'Guantes Protector de Dieléctricos': [25, 'H'], 'Ropa Ignífuga': [26, 'H'], 'Detector de Tensión personal': [27, 'H'],
    'Manta Dieléctrica': [28, 'H'], 'Tarjeta de bloqueo y/o candado': [29, 'H'], 'Arnés de Seguridad': [30, 'H'],
    'Amortiguador de impacto': [31, 'H'], 'Cabo de vida': [22, 'O'], 'Careta Facial': [23, 'O'], 'Careta para soldar': [24, 'O'],
    'Coleto de Cuero': [25, 'O'], 'Chaleco Reflectante': [26, 'O'], 'Legionario': [27, 'O'], 'Protector solar': [28, 'O'],
    'Barreras (cinta, conos, barras)': [29, 'O']
  } as Record<string, [number, string]>,

  altoRiesgo: {
    'Conducción de Vehículos': [44, 'B'], 'Carga suspendida / Izaje': [45, 'B'], 'Trabajos de otras Empresas': [46, 'B'],
    'Trabajos en Altura (sobre 1,5 mts.)': [44, 'H'], 'Espacios confinados y/o cerrados': [45, 'H'], 'Maquinaria en movimiento': [46, 'H'],
    'Trabajos en Caliente': [44, 'O'], 'Electricidad': [45, 'O']
  } as Record<string, [number, string]>,

  aspectos: {
    'Derrames': 37, 'Aguas Servidas': 38, 'Escombros': 39, 'Emisión de Polvo': 40, 'Despuntes de PVC': 41, 'Restos de Cables': 42
  } as Record<string, number>,

  visitas: {
    'Gerente General': [145, 'B'], 'Jefe de Operaciones': [146, 'B'], 'Supervisor General': [147, 'B'],
    'Experto en Prevención RAYCA': [145, 'H'], 'Experto en Prevención CLIENTE': [146, 'H'], 'Experto en Prevención USUARIO': [147, 'H'],
    'Área Proyecto': [145, 'O'], 'Gestor Técnico Cliente': [146, 'O'], 'Encargado de Mantención de cliente o usuario': [147, 'O'],
    'Otro': [148, 'B']
  } as Record<string, [number, string]>,

  incidentes: {
    'Incidente Seguridad': 137, 'Incidente Ambiental': 138, 'Incidente Calidad': 139, 'Near Miss': 140, 'Stop Work': 141
  } as Record<string, number>,

  incidenteDesc: 'F137',
  accionCorrectiva: 'F142',
  eventualidades: 'A151',
  operariosRoster: { startRow: 117, endRow: 134, nombreCol: 'C', rutCol: 'F', cargoCol: 'I', tareasCol: 'L', firmaCol: 'R' },
  operariosExtraStart: 135,
  cierre: { nombre: 'A155', cargo: 'J155', firmaRange: 'M155:T155' }
};

export const CHARLA_CELLS = {
  header: {
    instructor: 'F4', usuario: 'E5', fecha: 'Q5', cliente: 'E6', horaInicio: 'J6', horaTermino: 'R6', tema: 'A8'
  },
  clasificacion: {
    'Orientación en Prevención de Riesgos': [12, 'C'], 'Elementos de Protección Personal': [13, 'C'],
    'Uso y buen uso de equipos y herramientas': [14, 'C'], 'Análisis de Riesgos en el Trabajo': [15, 'C'],
    'Normas de Seguridad': [16, 'C'], 'Prevención y Amago de Incendios': [17, 'C'], 'Análisis de Accidentes': [18, 'C'],
    'Primeros Auxilios': [19, 'C'], 'Exposición a Riesgos Eléctricos': [12, 'K'], 'Exposición a Riesgos Específicos': [13, 'K'],
    'Trabajo en Altura Física y Geográfica': [14, 'K'], 'Manejo Manual de Carga': [15, 'K'], 'Medio Ambiente': [16, 'K'],
    'Manejo y Almacenamiento de Materiales': [17, 'K'], 'Aspectos Legales': [18, 'K']
  } as Record<string, [number, string]>,
  participantesRoster: {
    col1: { startRow: 23, endRow: 32, nombreCol: 'B', firmaCol: 'F' },
    col2: { startRow: 23, endRow: 31, nombreCol: 'K', firmaCol: 'Q' }
  },
  mutual: 'A34',
  comentarios: 'A39',
  cierre: { nombre: 'A43', firmaRange: 'N39:T42' }
};

export function colToIndex(colStr: string): number {
  let index = 0;
  for (let i = 0; i < colStr.length; i++) {
    index = index * 26 + colStr.charCodeAt(i) - 64;
  }
  return index - 1;
}
