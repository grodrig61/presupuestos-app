// src/types.ts
export type Atributo = { clave: string; etiqueta: string; tipo: 'numero' | 'select'; opciones?: string[]; requerido: boolean }
export type Costo = { clave: string; etiqueta: string; unidad: string }
export type Rubro = { id: string; nombre: string; atributos: Atributo[]; costos: Costo[]; formulas: Record<string, string> }
export type Familia = { id: string; nombre: string; rubros: Rubro[] }
export type Perfil = { id: string; nombre: string; cuit: string; telefono: string; matricula: string; logo_url: string }
export type PresupuestoGuardado = { id: string; creado_en: string; cliente_nombre: string; total: number; datos_entrada: any; resultado_calculo: any; rubro_id: string; }