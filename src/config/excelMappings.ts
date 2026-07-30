export const ART_CELLS = {
  header: {
    supervisor: 'D4',
    movil: 'H4',
    usuario: 'D5',
    cliente: 'B6',
    fecha: 'H6',
    tipoTarea: 'A7',
    idTrabajo: 'B10',
    direccionObra: 'C11'
  },
  triLeftRows: [13, 14, 15, 16, 17, 18, 19],
  triRightRows: [20, 21, 22, 23, 24, 25, 26, 27, 28, 29],
  epp: {
    'Casco de Seguridad Dieléctrico': [32, 'A'], 'Barbiquejo de 3 puntas': [33, 'A'], 'Linterna frontal': [34, 'A'],
    'Zapatos de Seguridad Dieléctricos': [35, 'A'], 'Lentes de Seguridad': [36, 'A'], 'Guantes de Cabritilla': [37, 'A'],
    'Guantes de Nitrilo': [38, 'A'], 'Guantes de Anti-vibración': [39, 'A'], 'Protección Respiratoria': [40, 'A'],
    'Protección Auditiva': [41, 'A'], 'Cabo de vida': [42, 'A'], 'Careta Facial': [43, 'A'], 'Careta para soldar': [44, 'A'],
    'Coleto de Cuero': [45, 'A'], 'Careta Dieléctrica': [32, 'E'], 'Esclavina Ignífuga': [33, 'E'],
    'Guantes Dieléctricos': [34, 'E'], 'Guantes Protector de Dieléctricos': [35, 'E'], 'Ropa Ignífuga': [36, 'E'],
    'Detector de Tensión personal': [37, 'E'], 'Manta Dieléctrica': [38, 'E'], 'Tarjeta de bloqueo y/o candado': [39, 'E'],
    'Arnés de Seguridad': [40, 'E'], 'Amortiguador de impacto': [41, 'E'], 'Chaleco Reflectante': [42, 'E'],
    'Legionario': [43, 'E'], 'Protector solar': [44, 'E'], 'Barreras (cinta, conos, barras)': [45, 'E']
  } as Record<string, [number, string]>,

  altoRiesgo: {
    'Conducción de Vehículos': [66, 'A'], 'Carga suspendida / Izaje': [67, 'A'], 'Trabajos de otras Empresas': [68, 'A'],
    'Trabajos en caliente': [69, 'A'], 'Trabajos en Altura (sobre 1,5 mts.)': [66, 'D'], 'Espacios confinados y/o cerrados': [67, 'D'],
    'Maquinaria en movimiento': [68, 'D'], 'Electricidad': [69, 'D']
  } as Record<string, [number, string]>,

  aspectos: {
    'Derrames': 58, 'Aguas Servidas': 59, 'Escombros': 60, 'Emisión de Polvo': 61, 'Despuntes de PVC': 62, 'Restos de Cables': 63
  } as Record<string, number>,

  visitas: {
    'Gerente General': [88, 'A'], 'Área Proyecto': [89, 'A'], 'Experto en Prevención CLIENTE': [90, 'A'],
    'Supervisor General': [91, 'A'], 'Encargado de Mantención de cliente o usuario': [92, 'A'],
    'Experto en Prevención RAYCA': [88, 'D'], 'Jefe de Operaciones': [89, 'D'], 'Gestor Técnico Cliente': [90, 'D'],
    'Experto en Prevención USUARIO': [91, 'D'], 'Otro': [92, 'D']
  } as Record<string, [number, string]>,

  incidentes: {
    'Incidente Seguridad': 83, 'Incidente Ambiental': 84, 'Incidente Calidad': 85, 'Near Miss': 86, 'Stop Work': 87
  } as Record<string, number>,

  incidenteDesc: 'C82',
  accionCorrectiva: 'F82',
  eventualidades: 'A94',
  operariosRoster: { startRow: 79, endRow: 85, firmaCol: 'A', nombreCol: 'B', rutCol: 'D', cargoCol: 'E', tareasCol: 'G' },
  operariosExtraStart: 80,
  cierre: { nombre: 'A102', cargo: 'D102', firmaRange: 'F102:H102' }
};

export const CHARLA_CELLS = {
  header: {
    instructor: 'D4', usuario: 'D5', fecha: 'H4', cliente: 'B6', horaInicio: 'F6', horaTermino: 'H6', tema: 'A8'
  },
  clasificacion: {
    'Orientación en Prevención de Riesgos': [12, 'A'], 'Elementos de Protección Personal': [13, 'A'],
    'Uso y buen uso de equipos y herramientas': [14, 'A'], 'Análisis de Riesgos en el Trabajo': [15, 'A'],
    'Normas de Seguridad': [16, 'A'], 'Prevención y Amago de Incendios': [17, 'A'], 'Análisis de Accidentes': [18, 'A'],
    'Primeros Auxilios': [19, 'A'], 'Exposición a Riesgos Eléctricos': [12, 'E'], 'Exposición a Riesgos Específicos': [13, 'E'],
    'Trabajo en Altura Física y Geográfica': [14, 'E'], 'Manejo Manual de Carga': [15, 'E'], 'Medio Ambiente': [16, 'E'],
    'Manejo y Almacenamiento de Materiales': [17, 'E'], 'Aspectos Legales': [18, 'E']
  } as Record<string, [number, string]>,
  participantesRoster: {
    col1: { startRow: 22, endRow: 32, nombreCol: 'A', firmaCol: 'D' },
    col2: { startRow: 22, endRow: 32, nombreCol: 'E', firmaCol: 'H' }
  },
  mutual: 'A34',
  comentarios: 'A38',
  cierre: { nombre: 'A41', firmaRange: 'F41:H41' }
};

export function colToIndex(colStr: string): number {
  let index = 0;
  for (let i = 0; i < colStr.length; i++) {
    index = index * 26 + colStr.charCodeAt(i) - 64;
  }
  return index - 1;
}
