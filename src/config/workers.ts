import { Worker } from '../types';

export const WORKERS_DB: Worker[] = [
  { nombre: 'Nicolás Antonio Riquelme Camus', rut: '18718406-1', cargo: 'Jefe de Operaciones' },
  { nombre: 'Cristopher Alexander Pérez Duyvestein', rut: '19428998-7', cargo: 'Ingeniero Proyectista' },
  { nombre: 'Luis Alfredo Gómez Olea', rut: '13075709-K', cargo: 'Técnico en Terreno' },
  { nombre: 'René Antonio Valenzuela Fuentes', rut: '12493325-0', cargo: 'Supervisor y Téc. en Terreno' },
  { nombre: 'Mauricio Ignacio San Martín Opazo', rut: '19228823-1', cargo: 'Supervisor en terreno y administrativo' },
  { nombre: 'Vicente Alejandro Muñoz Tirado', rut: '21849746-5', cargo: 'Técnico en Terreno' },
  { nombre: 'Cristian Humberto Caamaño Saavedra', rut: '15442154-8', cargo: 'Técnico en Terreno' },
  { nombre: 'Krishna Camila Figueroa Iturra', rut: '20642879-1', cargo: 'Técnico en Terreno' },
  { nombre: 'Bastian Andres Muñoz Silva', rut: '20448293-4', cargo: 'Ayudante Eléctrico' },
  { nombre: 'Isan Eros Villalobos Becerra', rut: '18976776-5', cargo: 'Ayudante Eléctrico' },
  { nombre: 'Carlos Eduardo Castillo Reyes', rut: '19693703-K', cargo: 'Ayudante Eléctrico' },
  { nombre: 'Ruben Carlos Jobre Miranda', rut: '18541148-6', cargo: 'Jefe SST - MA' },
  { nombre: 'Miguel Alejandro Ramírez Alarcón', rut: '19500321-1', cargo: 'Jefe de Proyectos' },
  { nombre: 'Cristóbal Ignacio Peña Roa', rut: '20225360-1', cargo: 'Proyectista Eléctrico' },
  { nombre: 'Rafael Alexis Garcia Figueroa', rut: '14056529-6', cargo: 'Gerente General' },
  { nombre: 'Duvan Maximiliano Pineda Rivera', rut: '19561125-4', cargo: 'Ayudante Eléctrico' },
  { nombre: 'Juan Felipe Reyes Molina', rut: '20783901-9', cargo: 'Ayudante Eléctrico' },
  { nombre: 'Ariel Fernando Bravo Bruna', rut: '16518607-9', cargo: 'Ayudante Eléctrico' }
];

export function findWorker(name: string): Worker | undefined {
  const n = (name || '').trim().toLowerCase();
  return WORKERS_DB.find(w => w.nombre.toLowerCase() === n);
}
