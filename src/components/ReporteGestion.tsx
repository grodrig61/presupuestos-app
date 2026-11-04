// src/components/ReporteGestion.tsx
// ============================================================================
// COMPONENTE DE REPORTE DE GESTIÓN
// Este componente se encarga de mostrar los gráficos y las métricas (KPIs)
// basados en el historial de presupuestos del usuario.
// ============================================================================

import { useMemo, useState } from 'react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, LabelList
} from 'recharts'
import { formatNumber } from '../lib/utils'
import type { PresupuestoGuardado, Familia } from '../types'

// Definimos las propiedades que recibe el componente desde App.tsx
interface Props {
    historial: PresupuestoGuardado[];
    familias: Familia[];
}

// Paleta de colores que se usarán para pintar las porciones del gráfico de torta
const COLORES_PIE = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#64748b'];

export const ReporteGestion = ({ historial, familias }: Props) => {

    // ESTADO: Controla si el usuario quiere ver la torta agrupada por "Categoría" o por "Rubro"
    const [tipoGrafico, setTipoGrafico] = useState<'categoria' | 'rubro'>('categoria');

    // --------------------------------------------------------------------------
    // 1. CÁLCULO DE KPIs (Indicadores Clave de Rendimiento)
    // --------------------------------------------------------------------------
    // Usamos useMemo para que estos cálculos solo se vuelvan a hacer si el 
    // historial cambia. Si el usuario cambia de pestaña, no se recalcula.
    const kpis = useMemo(() => {
        if (historial.length === 0) return { total: 0, cantidad: 0, promedio: 0 };

        // Sumamos el total de dinero de todos los presupuestos
        const total = historial.reduce((acc, p) => acc + (p.total || 0), 0);
        const cantidad = historial.length;
        // Calculamos el ticket promedio (Total / Cantidad)
        const promedio = total / cantidad;

        return { total, cantidad, promedio };
    }, [historial]);

    // --------------------------------------------------------------------------
    // 2. PREPARACIÓN DE DATOS PARA EL GRÁFICO DE BARRAS (Evolución Mensual)
    // --------------------------------------------------------------------------
    const datosMeses = useMemo(() => {
        const meses: Record<string, number> = {};
        const hoy = new Date();

        // Primero, inicializamos los últimos 6 meses en 0. 
        // Esto asegura que si un mes no tuvo ventas, igual aparezca en el gráfico.
        for (let i = 5; i >= 0; i--) {
            const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
            const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; // Formato YYYY-MM
            const label = d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' }).toUpperCase(); // Ej: "NOV 23"
            meses[clave] = 0;
            meses[`${clave}-label`] = label as any;
        }

        // Luego, recorremos el historial y sumamos el dinero en el mes que corresponde
        historial.forEach(p => {
            const fecha = new Date(p.creado_en);
            const clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
            if (meses[clave] !== undefined) {
                meses[clave] += p.total || 0;
            }
        });

        // Transformamos el objeto en un array que la librería Recharts pueda entender
        return Object.keys(meses)
            .filter(key => !key.includes('-label'))
            .map(clave => ({
                mes: meses[`${clave}-label`],
                total: meses[clave]
            }));
    }, [historial]);

    // --------------------------------------------------------------------------
    // 3. PREPARACIÓN DE DATOS PARA EL GRÁFICO DE TORTA (Distribución)
    // --------------------------------------------------------------------------
    const datosTorta = useMemo(() => {
        const conteo: Record<string, number> = {};

        historial.forEach(p => {
            let nombreItem = '';

            // Buscamos el nombre de la familia (categoría) para usarlo como prefijo o dato principal
            const familia = familias.find(f => f.rubros.some(r => r.id === p.rubro_id));
            const nombreCategoria = p.datos_entrada.familiaNombre || familia?.nombre || 'Otros';

            if (tipoGrafico === 'categoria') {
                // Si el Toggle está en "Categoría", agrupamos solo por la familia
                nombreItem = nombreCategoria;
            } else {
                // Si el Toggle está en "Rubro", concatenamos la jerarquía: "Categoría > Rubro"
                const nombreRubro = p.datos_entrada.rubroNombre || 'Otros';
                nombreItem = `${nombreCategoria} > ${nombreRubro}`;
            }

            // Contamos cuántas veces aparece cada nombre
            if (!conteo[nombreItem]) conteo[nombreItem] = 0;
            conteo[nombreItem] += 1;
        });

        // Transformamos a array y ordenamos de mayor a menor para que el gráfico se vea mejor
        return Object.keys(conteo).map(nombre => ({
            name: nombre,
            value: conteo[nombre]
        })).sort((a, b) => b.value - a.value);
    }, [historial, familias, tipoGrafico]);

    // Si el usuario no tiene presupuestos, mostramos un cartel amigable
    if (historial.length === 0) {
        return (
            <div className="empty-state" style={{ background: 'white', padding: '40px', borderRadius: '12px', marginTop: '20px' }}>
                Todavía no hay datos suficientes para generar un reporte.
            </div>
        )
    }

    // --------------------------------------------------------------------------
    // 4. FUNCIONES AUXILIARES DE FORMATO
    // --------------------------------------------------------------------------

    // Función para abreviar los montos en las barras (ej: $1.2M en lugar de $1.200.000)
    // Evita que el texto se salga del gráfico en pantallas chicas.
    const formatAbreviado = (value: number) => {
        if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
        if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
        return `$${value}`;
    };

    // Componente personalizado para reemplazar la Leyenda clásica de Recharts.
    // Está diseñado para ser 100% responsive: maneja textos largos (wordBreak)
    // y se adapta al ancho del contenedor usando flexWrap.
    const CustomLegend = (props: any) => {
        const { payload } = props;
        return (
            <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: '10px 0 0 0',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '8px 15px'
            }}>
                {payload.map((entry: any, index: number) => (
                    <li key={`item-${index}`} style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        fontSize: '0.75rem',
                        color: 'var(--text)',
                        maxWidth: '100%',
                        textAlign: 'left'
                    }}>
                        {/* El circulito de color */}
                        <span style={{
                            display: 'inline-block',
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: entry.color,
                            marginRight: '6px',
                            marginTop: '3px',
                            flexShrink: 0
                        }}></span>
                        {/* El texto de la leyenda con su cantidad */}
                        <span style={{ wordBreak: 'break-word' }}>
                            <strong>{entry.value}</strong> ({entry.payload.value})
                        </span>
                    </li>
                ))}
            </ul>
        );
    };

    // --------------------------------------------------------------------------
    // 5. RENDERIZADO DEL DASHBOARD
    // --------------------------------------------------------------------------
    return (
        <div>
            {/* SECCIÓN 1: TARJETAS KPI (Totales, Cantidad y Promedio) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                <div className="panel kpi-card">
                    <h4 className="kpi-title">Total Cotizado</h4>
                    <div className="kpi-value" style={{ color: 'var(--primary)' }}>${formatNumber(kpis.total)}</div>
                </div>
                <div className="panel kpi-card">
                    <h4 className="kpi-title">Presupuestos Creados</h4>
                    <div className="kpi-value" style={{ color: 'var(--text)' }}>{kpis.cantidad}</div>
                </div>
                <div className="panel kpi-card">
                    <h4 className="kpi-title">Ticket Promedio</h4>
                    <div className="kpi-value" style={{ color: 'var(--success)' }}>${formatNumber(kpis.promedio)}</div>
                </div>
            </div>

            {/* SECCIÓN 2: GRÁFICOS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>

                {/* GRÁFICO 1: Barras Mensuales */}
                <div className="panel" style={{ padding: '20px' }}>
                    <h3 style={{ marginTop: 0, textAlign: 'center', color: 'var(--text)', fontSize: '1rem' }}>
                        Evolución de Cotizaciones
                    </h3>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={datosMeses} margin={{ top: 30, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="mes" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(value) => `$${value / 1000}k`} />

                                {/* Tooltip para PC: Muestra el monto exacto al pasar el mouse */}
                                <Tooltip
                                    formatter={(value) => [`$${formatNumber(Number(value))}`, 'Cotizado']}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                                />

                                <Bar dataKey="total" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={40}>
                                    {/* LabelList imprime el monto abreviado SIEMPRE arriba de la barra (ideal para celulares) */}
                                    <LabelList
                                        dataKey="total"
                                        position="top"
                                        fill="#64748b"
                                        fontSize={10}
                                        formatter={(value: any) => {
                                            const num = Number(value);
                                            return num > 0 ? formatAbreviado(num) : '';
                                        }}
                                    />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* GRÁFICO 2: Torta Dinámica con Toggle */}
                <div className="panel" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h3 style={{ margin: 0, color: 'var(--text)', fontSize: '1rem' }}>Distribución</h3>

                        {/* Botones para alternar entre Categoría y Rubro */}
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <button className={`btn-toggle ${tipoGrafico === 'categoria' ? 'active' : ''}`} onClick={() => setTipoGrafico('categoria')}>Categorías</button>
                            <button className={`btn-toggle ${tipoGrafico === 'rubro' ? 'active' : ''}`} onClick={() => setTipoGrafico('rubro')}>Rubros</button>
                        </div>
                    </div>

                    <div style={{ width: '100%', height: 320 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={datosTorta}
                                    cx="50%"
                                    cy="45%" // Centrado vertical ligeramente hacia arriba para dejar espacio a la leyenda
                                    innerRadius={55}
                                    outerRadius={85}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {/* Pintamos cada porción con la paleta de colores */}
                                    {datosTorta.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORES_PIE[index % COLORES_PIE.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value) => [`${value} presupuestos`, 'Cantidad']}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                                />

                                {/* Leyenda personalizada que incluye la cantidad y maneja textos largos */}
                                <Legend verticalAlign="bottom" content={<CustomLegend />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    )
}