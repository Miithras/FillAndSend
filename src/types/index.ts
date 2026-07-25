export type DocTypeId = 'art_mantencion' | 'art_normal' | 'charla_inicial';

export interface FieldDef {
  id: string;
  label: string;
  type: 'text' | 'date' | 'time' | 'email' | 'textarea' | 'select';
  required?: boolean;
  options?: string[];
}

export interface TriGroup {
  title: string;
  items: string[];
}

export interface MultiGroup {
  title: string;
  items: string[];
}

export interface RiskItem {
  etapa: string;
  evento: string;
  medida: string;
}

export interface SignerSchema {
  rutRequired: boolean;
  extra: Array<{ id: string; label: string }>;
}

export interface ClosingConfig {
  enabled: boolean;
  title: string;
  roleField: { id: string; label: string } | null;
}

export interface DocConfig {
  id: DocTypeId;
  label: string;
  accent: string;
  icon: string;
  enabled: boolean;
  desc: string;
  meta: {
    codigo: string;
    version: string;
    fechaVersion: string;
    templateFile: string;
  };
  fields: FieldDef[];
  triGroups: TriGroup[];
  multiGroups: MultiGroup[];
  risks: {
    enabled: boolean;
    title?: string;
    qEtapa?: string;
    qEvento?: string;
    qMedida?: string;
  };
  incidentes: {
    enabled: boolean;
    title?: string;
    items?: string[];
  };
  finalFields: FieldDef[];
  signerSchema: SignerSchema;
  closing: ClosingConfig;
}

export interface Worker {
  nombre: string;
  rut: string;
  cargo: string;
}

export interface Signer {
  id: string;
  nombre: string;
  rut: string;
  firma: string | null;
  timestamp: string | null;
  cargo?: string;
  tareas?: string;
  [key: string]: any;
}

export interface AppState {
  screen: 'select' | 'form' | 'signers' | 'review';
  docType: DocTypeId;
  form: Record<string, string>;
  tri: Record<string, 'SI' | 'NO' | 'NA' | null>;
  multi: Record<string, boolean>;
  risks: RiskItem[];
  final: Record<string, string>;
  signers: Signer[];
  closingSig: {
    nombre: string;
    firma: string;
    timestamp: string;
    [key: string]: any;
  } | null;
  destinatario: string;
  conCopia: string;
  uiOpen: Record<string, boolean>;
  sendStatus: 'idle' | 'sending' | 'sent' | 'error';
  sendError: string | null;
}
