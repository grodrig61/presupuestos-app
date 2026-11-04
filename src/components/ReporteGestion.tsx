// src/components/ReporteGestion.tsx
import { useMemo, useState } from 'react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, LabelList
} from 'recharts'
import { formatNumber } from '../lib/utils'
// Importamos los tipos necesarios
import type { PresupuestoGuardado, Familia, Rubro } from '../types'

interface Props {
    historial: PresupuestoGuardado[];
    familias: Familia[];
}

const COLORES_PIE = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#64748b'];

export const ReporteGestion = ({ historial, familias }: Props) => {
    const [tipoGrafico, setTipoGrafico] = useState<'categoria' | 'rubro'>('categoria');

    // 1. CÁLCULO DE KPIs
    const kpis = useMemo(() => {
        if (historial.length === 0) return { total: 0, cantidad: 0, promedio: 0 };
        const total = historial.reduce((acc, p) => acc + (p.total || 0), 0);
        const cantidad = historial.length;
        const promedio = total / cantidad;
        return { total, cantidad, promedio };
    }, [historial]);

    // 2. DATOS PARA EL GRÁFICO DE BARRAS
    const datosMeses = useMemo(() => {
        const meses: Record<string, number> = {};
        const hoy = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
            const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' }).toUpperCase();
            meses[clave] = 0;
            meses[`${clave}-label`] = label as any;
        }
        historial.forEach(p => {
            const fecha = new Date(p.creado_en);
            const clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
            if (meses[clave] !== undefined) meses[clave] += p.total || 0;
        });
        return Object.keys(meses)
            .filter(key => !key.includes('-label'))
            .map(clave => ({ mes: meses[`${clave}-label`], total: meses[clave] }));
    }, [historial]);

    // 3. DATOS PARA EL GRÁFICO DE TORTA
    const datosTorta = useMemo(() => {
        const conteo: Record<string, number> = {};
        historial.forEach(p => {
            let nombreItem = '';

            // Tipado explícito para evitar errores
            const familia = familias.find((f: Familia) => f.rubros.some((r: Rubro) => r.id === p.rubro_id));
            const nombreCategoria = p.datos_entrada.familiaNombre || familia?.nombre || 'Otros';

            if (tipoGrafico === 'categoria') {
                nombreItem = nombreCategoria;
            } else {
                const nombreRubro = p.datos_entrada.rubroNombre || 'Otros';
                nombreItem = `${nombreCategoria} > ${nombreRubro}`;
            }
            if (!conteo[nombreItem]) conteo[nombreItem] = 0;
            conteo[nombreItem] += 1;
        });
        return Object.keys(conteo).map(nombre => ({ name: nombre, value: conteo[nombre] })).sort((a, b) => b.value - a.value);
    }, [historial, familias, tipoGrafico]);

    if (historial.length === 0) {
        return (
            <div className="empty-state" style={{ background: 'white', padding: '40px', borderRadius: '12px', marginTop: '20px' }}>
                Todavía no hay datos suficientes para generar un reporte.
            </div>
        )
    }

    const formatAbreviado = (value: number) => {
        if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
        if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
        return `$${value}`;
    };

    const CustomLegend = (props: any) => {
        const { payload } = props;
        return (
            <ul style={{
                listStyle: 'none', padding: 0, margin: '10px 0 0 0',
                display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 15px'
            }}>
                {payload.map((entry: any, index: number) => (
                    <li key={`item-${index}`} style={{
                        display: 'flex', alignItems: 'flex-start', fontSize: '0.75rem',
                        color: 'var(--text)', maxWidth: '100%', textAlign: 'left'
                    }}>
                        <span style={{
                            display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%',
                            backgroundColor: entry.color, marginRight: '6px', marginTop: '3px', flexShrink: 0
                        }}></span>
                        <span style={{ wordBreak: 'break-word' }}>
                            <strong>{entry.value}</strong> ({entry.payload.value})
                        </span>
                    </li>
                ))}
            </ul>
        );
    };

    return (
        <div>
            {/* TARJETAS KPI */}
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

            {/* GRÁFICOS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>

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
                                <Tooltip
                                    formatter={(value) => [`$${formatNumber(Number(value))}`, 'Cotizado']}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                                />
                                <Bar dataKey="total" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={40}>
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

                <div className="panel" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h3 style={{ margin: 0, color: 'var(--text)', fontSize: '1rem' }}>Distribución</h3>
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
                                    cy="45%"
                                    innerRadius={55}
                                    outerRadius={85}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {datosTorta.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORES_PIE[index % COLORES_PIE.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value) => [`${value} presupuestos`, 'Cantidad']}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                                />
                                <Legend verticalAlign="bottom" content={<CustomLegend />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    )
}