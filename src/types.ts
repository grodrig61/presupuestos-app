// ============================================================================
// DEFINICIÓN DE TIPOS (TYPESCRIPT) - OBRAFÁCIL
// Este archivo centraliza los tipos de datos para que TypeScript nos ayude
// a evitar errores al manejar la información de la base de datos y la app.
// ============================================================================

// Define la estructura de un atributo (campo de medida) en el formulario
export type Atributo = {
    clave: string;
    etiqueta: string;
    tipo: 'numero' | 'select';
    opciones?: string[];
    requerido: boolean
}

// Define la estructura de un costo (precio de material o mano de obra)
export type Costo = {
    clave: string;
    etiqueta: string;
    unidad: string
}

// Define la estructura de un Rubro (ej: Plomería)
export type Rubro = {
    id: string;
    nombre: string;
    atributos: Atributo[];
    costos: Costo[];
    formulas: Record<string, string>
}

// Define la estructura de una Familia (Categoría principal, ej: Instalaciones)
export type Familia = {
    id: string;
    nombre: string;
    rubros: Rubro[]
}

// Define la estructura del Perfil del profesional
export type Perfil = {
    id: string;
    nombre: string;
    cuit: string;
    telefono: string;
    matricula: string;
    logo_url: string
}

// ============================================================================
// NUEVOS TIPOS PARA EL MINI-CRM Y EL CARRITO
// ============================================================================

// Define la estructura de un Cliente en la base de datos (para el autocompletado)
export type Cliente = {
    id: string;
    nombre: string;
    telefono: string;
    domicilio: string;
}

// Define la estructura de un ítem individual dentro del carrito de un presupuesto
export type ItemCarrito = {
    rubro: Rubro;
    valores: Record<string, string>; // Las medidas y precios que cargó el usuario
    resultados: Record<string, number>; // Lo que devolvió el motor de cálculo
}

// Define la estructura de un Presupuesto guardado en el historial
export type PresupuestoGuardado = {
    id: string;
    creado_en: string;
    cliente_nombre: string;
    total: number;
    // OJO: datos_entrada ahora contiene el array 'items' con todo el carrito
    datos_entrada: any;
    resultado_calculo: any;
    rubro_id: string;
    // Campo para el sistema de gestión (Kanban básico)
    estado: 'pendiente' | 'aprobado' | 'rechazado';
}