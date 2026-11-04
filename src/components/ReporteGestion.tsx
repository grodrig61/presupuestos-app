// src/components/ReporteGestion.tsx
import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { formatNumber } from '../lib/utils'
import type { PresupuestoGuardado, Familia } from '../types'

interface Props {
    historial: PresupuestoGuardado[];
    familias: Familia[];
}

const COLORES_PIE = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#64748b'];

export const ReporteGestion = ({ historial, familias }: Props) => {

    // --- CÁLCULO DE KPIs (Números duros) ---
    const kpis = useMemo(() => {
        if (historial.length === 0) return { total: 0, cantidad: 0, promedio: 0 };

        const total = historial.reduce((acc, p) => acc + (p.total || 0), 0);
        const cantidad = historial.length;
        const promedio = total / cantidad;

        return { total, cantidad, promedio };
    }, [historial]);

    // --- DATOS PARA EL GRÁFICO DE BARRAS (Últimos 6 meses) ---
    const datosMeses = useMemo(() => {
        const meses: Record<string, number> = {};
        const hoy = new Date();

        // Inicializamos los últimos 6 meses en 0
        for (let i = 5; i >= 0; i--) {
            const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
            const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
            const label = d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' }).toUpperCase();
            meses[clave] = 0;
            meses[`${clave}-label`] = label as any;
        }

        // Sumamos los totales en el mes que corresponden
        historial.forEach(p => {
            const fecha = new Date(p.creado_en);
            const clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
            if (meses[clave] !== undefined) {
                meses[clave] += p.total || 0;
            }
        });

        return Object.keys(meses)
            .filter(key => !key.includes('-label'))
            .map(clave => ({
                mes: meses[`${clave}-label`],
                total: meses[clave]
            }));
    }, [historial]);

    // --- DATOS PARA EL GRÁFICO DE TORTA (Rubros más solicitados) ---
    const datosRubros = useMemo(() => {
        const conteo: Record<string, number> = {};

        historial.forEach(p => {
            const familia = familias.find(f => f.rubros.some(r => r.id === p.rubro_id));
            const nombreCategoria = p.datos_entrada.familiaNombre || familia?.nombre || 'Otros';

            if (!conteo[nombreCategoria]) conteo[nombreCategoria] = 0;
            conteo[nombreCategoria] += 1;
        });

        return Object.keys(conteo).map(nombre => ({
            name: nombre,
            value: conteo[nombre]
        })).sort((a, b) => b.value - a.value);
    }, [historial, familias]);

    if (historial.length === 0) {
        return (
            <div className="empty-state" style={{ background: 'white', padding: '40px', borderRadius: '12px', marginTop: '20px' }}>
                Todavía no hay datos suficientes para generar un reporte.
            </div>
        )
    }

    return (
        <div>
            {/* TARJETAS KPI */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                <div className="panel" style={{ textAlign: 'center', padding: '25px 15px' }}>
                    <h4 style={{ margin: 0, color: 'var(--text-light)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Total Cotizado</h4>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)', marginTop: '10px' }}>
                        ${formatNumber(kpis.total)}
                    </div>
                </div>
                <div className="panel" style={{ textAlign: 'center', padding: '25px 15px' }}>
                    <h4 style={{ margin: 0, color: 'var(--text-light)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Presupuestos Creados</h4>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text)', marginTop: '10px' }}>
                        {kpis.cantidad}
                    </div>
                </div>
                <div className="panel" style={{ textAlign: 'center', padding: '25px 15px' }}>
                    <h4 style={{ margin: 0, color: 'var(--text-light)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Ticket Promedio</h4>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)', marginTop: '10px' }}>
                        ${formatNumber(kpis.promedio)}
                    </div>
                </div>
            </div>

            {/* GRÁFICOS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>

                {/* Gráfico de Barras: Evolución Mensual */}
                <div className="panel" style={{ padding: '20px' }}>
                    <h3 style={{ marginTop: 0, textAlign: 'center', color: 'var(--text)', fontSize: '1rem' }}>Evolución de Cotizaciones (Últimos 6 meses)</h3>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={datosMeses} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="mes" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(value) => `$${value / 1000}k`} />
                                <Tooltip
                                    formatter={(value) => [`$${formatNumber(Number(value))}`, 'Cotizado']}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                                />
                                <Bar dataKey="total" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Gráfico de Torta: Rubros */}
                <div className="panel" style={{ padding: '20px' }}>
                    <h3 style={{ marginTop: 0, textAlign: 'center', color: 'var(--text)', fontSize: '1rem' }}>Distribución por Categoría</h3>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={datosRubros}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {datosRubros.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORES_PIE[index % COLORES_PIE.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value) => [`${value} presupuestos`, 'Cantidad']}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '0.85rem' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    )
}