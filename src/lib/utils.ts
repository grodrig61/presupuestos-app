// src/lib/utils.ts

// Formatea números a formato moneda (puntos de miles, comas para decimales)
export const formatNumber = (num: number) => {
    return num.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Limpia los nombres técnicos del JSON (ej: CANO -> CAÑO)
export const formatearNombreMaterial = (clave: string) => {
    return clave
        .replace(/_/g, ' ')
        .toUpperCase()
        .replace(/CANO/g, 'CAÑO')
        .replace(/TEES/g, 'UNIONES EN T')
        .replace(/CODOS/g, 'CURVAS (CODOS)')
}

// Busca el costo asociado a un resultado para calcular subtotales
export const buscarPrecioCercano = (claveResultado: string, costos: any[]) => {
    return costos.find(c => {
        const keyLimpia = c.clave.replace('precio_', '')
        const claveSingular = claveResultado.replace(/s_/g, '_').replace(/s$/, '')
        return claveResultado.includes(keyLimpia) || claveSingular.includes(keyLimpia)
    })
}