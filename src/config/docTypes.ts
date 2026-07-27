import { DocConfig, DocTypeId } from '../types';

export const DOC_TYPES: Record<DocTypeId, DocConfig> = {
  charla_inicial: {
    id: 'charla_inicial',
    label: 'Charla Inicial',
    accent: '#2FB894',
    icon: '🗣️',
    enabled: true,
    desc: 'Charla de seguridad inicial (5 minutos) — REG-010',
    meta: { codigo: 'REG-010', version: '06', fechaVersion: '03.06.2025', templateFile: 'REG-010.xlsx' },
    fields: [
      { id: 'instructor', label: 'Nombre de quién dictó la charla', type: 'text', required: true },
      { id: 'usuario', label: 'Lugar/Obra', type: 'text', required: true },
      { id: 'fecha', label: 'Fecha', type: 'date', required: true },
      { id: 'cliente', label: 'Cliente', type: 'text' },
      { id: 'horaInicio', label: 'Hora Inicio', type: 'time' },
      { id: 'horaTermino', label: 'Hora Término', type: 'time' },
      { id: 'tema', label: 'Tema Tratado', type: 'textarea', required: true }
    ],
    triGroups: [],
    multiGroups: [
      {
        title: 'Clasificación del tema',
        items: [
          'Orientación en Prevención de Riesgos', 'Elementos de Protección Personal', 'Uso y buen uso de equipos y herramientas',
          'Análisis de Riesgos en el Trabajo', 'Normas de Seguridad', 'Prevención y Amago de Incendios', 'Análisis de Accidentes',
          'Primeros Auxilios', 'Exposición a Riesgos Eléctricos', 'Exposición a Riesgos Específicos',
          'Trabajo en Altura Física y Geográfica', 'Manejo Manual de Carga', 'Medio Ambiente',
          'Manejo y Almacenamiento de Materiales', 'Aspectos Legales'
        ]
      }
    ],
    risks: { enabled: false },
    incidentes: { enabled: false },
    finalFields: [
      { id: 'mutual', label: 'Mutual de Seguridad o Centro Asistencial más cercano', type: 'text' },
      { id: 'comentarios', label: 'Comentarios, observaciones o sugerencias', type: 'textarea' }
    ],
    signerSchema: { rutRequired: false, extra: [] },
    closing: { enabled: true, title: 'Firma de quién dictó la charla', roleField: null }
  },

  art_normal: {
    id: 'art_normal',
    label: 'ART Normal',
    accent: '#F5C400',
    icon: '⚠️',
    enabled: true,
    desc: 'Análisis de Riesgos en el Trabajo — General (REG-009_A)',
    meta: { codigo: 'REG-009_A', version: '06', fechaVersion: '03.06.2025', templateFile: 'REG-009_A.xlsx' },
    fields: [
      { id: 'supervisor', label: 'Nombre del Supervisor o Encargado', type: 'text', required: true },
      { id: 'movil', label: 'Móvil', type: 'text' },
      { id: 'usuario', label: 'Lugar/Obra', type: 'text', required: true },
      { id: 'cliente', label: 'Cliente', type: 'text', required: true },
      { id: 'fecha', label: 'Fecha', type: 'date', required: true },
      { id: 'tipoTarea', label: 'Tipo de Tarea / Actividad', type: 'textarea', required: true },
      { id: 'idTrabajo', label: 'ID de Trabajo', type: 'text' },
      { id: 'direccionObra', label: 'Nombre y Dirección de Obra', type: 'text' }
    ],
    triGroups: [
      {
        title: 'I. Verificación previa — pasos analizados',
        items: [
          'Entrega de área por parte de Enel X a Colaborador', 'Se realizó autochequeo', 'Se realizó charla de seguridad',
          'Se realizó ART', 'Se realizó registro de actividades complejas', 'Se aplicó entrega de área inmediata',
          'Se aplicó las 5 reglas de oro para trabajos eléctricos'
        ]
      },
      {
        title: 'I. Verificación previa — temas tratados con el equipo',
        items: [
          'Política de Stop Work', 'Preparación del área de trabajo', 'Riesgo Caída de Altura', 'Riesgo Obras Civiles (Calicatas)',
          'Riesgo Eléctrico', 'Riesgo de caída de objetos', 'Riesgo en espacios confinados', 'Riesgo de Tránsito',
          'Los colaboradores conocen los métodos de trabajo seguro', 'Chequeo de equipo de sujeción de cargas'
        ]
      }
    ],
    multiGroups: [
      {
        title: 'II. EPP y Elementos de Seguridad requeridos',
        items: [
          'Casco de Seguridad Dieléctrico', 'Barbiquejo de 3 puntas', 'Linterna frontal', 'Zapatos de Seguridad Dieléctricos',
          'Lentes de Seguridad', 'Guantes de Cabritilla', 'Guantes de Nitrilo', 'Guantes de Anti-vibración', 'Protección Auditiva',
          'Careta Dieléctrica', 'Esclavina Ignífuga', 'Guantes Dieléctricos', 'Guantes Protector de Dieléctricos', 'Ropa Ignífuga',
          'Detector de Tensión personal', 'Manta Dieléctrica', 'Tarjeta de bloqueo y/o candado', 'Arnés de Seguridad',
          'Amortiguador de impacto', 'Cabo de vida', 'Careta Facial', 'Careta para soldar', 'Coleto de Cuero', 'Chaleco Reflectante',
          'Legionario', 'Protector solar', 'Barreras (cinta, conos, barras)'
        ]
      },
      {
        title: 'III. Máquinas y/o Vehículos a utilizar',
        items: [
          'Camión Pluma', 'Alzahombre', 'Brazo Articulado', 'Grúa Horquilla', 'Traspaleta', 'Placa Compactadora', 'Cango',
          'Trompo', 'Testiguera', 'Tronzadora'
        ]
      },
      {
        title: 'IV. Aspectos Ambientales identificados',
        items: ['Derrames', 'Aguas Servidas', 'Escombros', 'Emisión de Polvo', 'Despuntes de PVC', 'Restos de Cables']
      },
      {
        title: 'V. Actividades de Alto Riesgo',
        items: [
          'Conducción de Vehículos', 'Trabajos en Altura (sobre 1,5 mts.)', 'Trabajos en Caliente', 'Carga suspendida / Izaje',
          'Espacios confinados y/o cerrados', 'Electricidad', 'Trabajos de otras Empresas', 'Maquinaria en movimiento'
        ]
      },
      {
        title: 'IX. Visitas en Terreno',
        items: [
          'Gerente General', 'Jefe de Operaciones', 'Supervisor General', 'Experto en Prevención RAYCA',
          'Experto en Prevención CLIENTE', 'Experto en Prevención USUARIO', 'Área Proyecto', 'Gestor Técnico Cliente',
          'Encargado de Mantención de cliente o usuario'
        ]
      }
    ],
    risks: {
      enabled: true,
      title: 'VI. Análisis de Riesgos en el Trabajo',
      qEtapa: '¿Qué voy a hacer? (etapa del trabajo)',
      qEvento: '¿Cómo me podría accidentar?',
      qMedida: '¿Qué haré para evitarlo?'
    },
    incidentes: {
      enabled: true,
      title: 'VIII. Incidentes durante las actividades',
      items: ['Incidente Seguridad', 'Incidente Ambiental', 'Incidente Calidad', 'Near Miss', 'Stop Work']
    },
    finalFields: [
      { id: 'eventualidades', label: 'X. Eventualidades', type: 'textarea' }
    ],
    signerSchema: {
      rutRequired: true,
      extra: [{ id: 'cargo', label: 'Cargo' }, { id: 'tareas', label: 'Tareas Asignadas' }]
    },
    closing: {
      enabled: true,
      title: 'Cierre — Supervisor o Encargado',
      roleField: { id: 'cargo', label: 'Cargo' }
    }
  },

  art_mantencion: {
    id: 'art_mantencion',
    label: 'ART Mantención',
    accent: '#FF7A45',
    icon: '🔧',
    enabled: true,
    desc: 'Análisis de Riesgos en el Trabajo — Mantención (REG-009_B)',
    meta: { codigo: 'REG-009_B', version: '06', fechaVersion: '03.06.2025', templateFile: 'REG-009_B.xlsx' },
    fields: [
      { id: 'supervisor', label: 'Nombre del Supervisor o Encargado', type: 'text', required: true },
      { id: 'movil', label: 'Móvil', type: 'text' },
      { id: 'usuario', label: 'Lugar/Obra', type: 'text', required: true },
      { id: 'cliente', label: 'Cliente', type: 'text', required: true },
      { id: 'fecha', label: 'Fecha', type: 'date', required: true },
      { id: 'tipoTarea', label: 'Tipo de Tarea / Actividad', type: 'textarea', required: true },
      { id: 'idTrabajo', label: 'ID de Trabajo', type: 'text' },
      { id: 'direccionObra', label: 'Nombre y Dirección de Obra', type: 'text' }
    ],
    triGroups: [
      {
        title: 'I. Verificación previa — pasos analizados',
        items: [
          'Entrega de área por parte de Enel X a Colaborador', 'Se realizó autochequeo', 'Se realizó charla de seguridad',
          'Se realizó ART', 'Se realizó registro de actividades complejas', 'Se aplicó entrega de área inmediata',
          'Se aplicó las 5 reglas de oro para trabajos eléctricos'
        ]
      },
      {
        title: 'I. Verificación previa — temas tratados con el equipo',
        items: [
          'Política de Stop Work', 'Preparación del área de trabajo', 'Riesgo Caída de Altura', 'Riesgo Obras Civiles (Calicatas)',
          'Riesgo Eléctrico', 'Riesgo de caída de objetos', 'Riesgo en espacios confinados', 'Riesgo de Tránsito',
          'Los colaboradores conocen los métodos de trabajo seguro', 'Chequeo de equipo de sujeción de cargas'
        ]
      }
    ],
    multiGroups: [
      {
        title: 'II. EPP y Elementos de Seguridad requeridos',
        items: [
          'Casco de Seguridad Dieléctrico', 'Barbiquejo de 3 puntas', 'Linterna frontal', 'Zapatos de Seguridad Dieléctricos',
          'Lentes de Seguridad', 'Guantes de Cabritilla', 'Guantes de Nitrilo', 'Guantes de Anti-vibración', 'Protección Auditiva',
          'Careta Dieléctrica', 'Esclavina Ignífuga', 'Guantes Dieléctricos', 'Guantes Protector de Dieléctricos', 'Ropa Ignífuga',
          'Detector de Tensión personal', 'Manta Dieléctrica', 'Tarjeta de bloqueo y/o candado', 'Arnés de Seguridad',
          'Amortiguador de impacto', 'Cabo de vida', 'Careta Facial', 'Careta para soldar', 'Coleto de Cuero', 'Chaleco Reflectante',
          'Legionario', 'Protector solar', 'Barreras (cinta, conos, barras)'
        ]
      },
      {
        title: 'III. Máquinas y/o Vehículos a utilizar',
        items: [
          'Camión Pluma', 'Alzahombre', 'Brazo Articulado', 'Grúa Horquilla', 'Traspaleta', 'Placa Compactadora', 'Cango',
          'Trompo', 'Testiguera', 'Tronzadora'
        ]
      },
      {
        title: 'IV. Aspectos Ambientales identificados',
        items: ['Derrames', 'Aguas Servidas', 'Escombros', 'Emisión de Polvo', 'Despuntes de PVC', 'Restos de Cables']
      },
      {
        title: 'V. Actividades de Alto Riesgo',
        items: [
          'Conducción de Vehículos', 'Trabajos en Altura (sobre 1,5 mts.)', 'Trabajos en Caliente', 'Carga suspendida / Izaje',
          'Espacios confinados y/o cerrados', 'Electricidad', 'Trabajos de otras Empresas', 'Maquinaria en movimiento'
        ]
      },
      {
        title: 'IX. Visitas en Terreno',
        items: [
          'Gerente General', 'Jefe de Operaciones', 'Supervisor General', 'Experto en Prevención RAYCA',
          'Experto en Prevención CLIENTE', 'Experto en Prevención USUARIO', 'Área Proyecto', 'Gestor Técnico Cliente',
          'Encargado de Mantención de cliente o usuario'
        ]
      }
    ],
    risks: {
      enabled: true,
      title: 'VI. Análisis de Riesgos en el Trabajo',
      qEtapa: '¿Qué voy a hacer? (etapa del trabajo)',
      qEvento: '¿Cómo me podría accidentar?',
      qMedida: '¿Qué haré para evitarlo?'
    },
    incidentes: {
      enabled: true,
      title: 'VIII. Incidentes durante las actividades',
      items: ['Incidente Seguridad', 'Incidente Ambiental', 'Incidente Calidad', 'Near Miss', 'Stop Work']
    },
    finalFields: [
      { id: 'eventualidades', label: 'X. Eventualidades', type: 'textarea' }
    ],
    signerSchema: {
      rutRequired: true,
      extra: [{ id: 'cargo', label: 'Cargo' }, { id: 'tareas', label: 'Tareas Asignadas' }]
    },
    closing: {
      enabled: true,
      title: 'Cierre — Supervisor o Encargado',
      roleField: { id: 'cargo', label: 'Cargo' }
    }
  }
};
