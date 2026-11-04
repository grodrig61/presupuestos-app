// src/components/ReporteGestion.tsx
import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { formatNumber } from '../lib/utils'
import type { PresupuestoGuardado, Familia } from '../types'

// Definimos los tipos de propiedades que recibe el componente
interface Props {
    historial: PresupuestoGuardado[];
    familias: Familia[];
}

// Paleta de colores para el gráfico de torta
const COLORES_PIE = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#64748b'];

export const ReporteGestion = ({ historial, familias }: Props) => {

    // Estado para alternar la vista del gráfico de torta (Categoría o Rubro)
    const [tipoGrafico, setTipoGrafico] = useState<'categoria' | 'rubro'>('categoria');

    // --- 1. CÁLCULO DE KPIs (Números duros del resumen) ---
    const kpis = useMemo(() => {
        if (historial.length === 0) return { total: 0, cantidad: 0, promedio: 0 };

        // Sumamos el total de todos los presupuestos
        const total = historial.reduce((acc, p) => acc + (p.total || 0), 0);
        const cantidad = historial.length;
        const promedio = total / cantidad;

        return { total, cantidad, promedio };
    }, [historial]);

    // --- 2. DATOS PARA EL GRÁFICO DE BARRAS (Últimos 6 meses) ---
    const datosMeses = useMemo(() => {
        const meses: Record<string, number> = {};
        const hoy = new Date();

        // Inicializamos un objeto con los últimos 6 meses (para que los meses sin ventas aparezcan en 0)
        for (let i = 5; i >= 0; i--) {
            const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
            const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; // Ej: "2023-11"
            const label = d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' }).toUpperCase(); // Ej: "NOV 23"
            meses[clave] = 0;
            meses[`${clave}-label`] = label as any;
        }

        // Recorremos el historial y sumamos el dinero en el mes que corresponde
        historial.forEach(p => {
            const fecha = new Date(p.creado_en);
            const clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
            if (meses[clave] !== undefined) {
                meses[clave] += p.total || 0;
            }
        });

        // Transformamos el objeto en un array que Recharts pueda entender
        return Object.keys(meses)
            .filter(key => !key.includes('-label'))
            .map(clave => ({
                mes: meses[`${clave}-label`],
                total: meses[clave]
            }));
    }, [historial]);

    // --- 3. DATOS PARA EL GRÁFICO DE TORTA (Dinámico según el Toggle) ---
    const datosTorta = useMemo(() => {
        const conteo: Record<string, number> = {};

        historial.forEach(p => {
            let nombreItem = '';

            // Buscamos el nombre de la familia (categoría) para usarlo como prefijo o como dato principal
            const familia = familias.find(f => f.rubros.some(r => r.id === p.rubro_id));
            const nombreCategoria = p.datos_entrada.familiaNombre || familia?.nombre || 'Otros';

            if (tipoGrafico === 'categoria') {
                // MODO CATEGORÍA: Solo mostramos la familia (Ej: "Instalaciones")
                nombreItem = nombreCategoria;
            } else {
                // MODO RUBRO: Agregamos el prefijo jerárquico (Ej: "Instalaciones > Plomería")
                const nombreRubro = p.datos_entrada.rubroNombre || 'Otros';
                nombreItem = `${nombreCategoria} > ${nombreRubro}`;
            }

            // Contamos cuántas veces aparece cada nombre
            if (!conteo[nombreItem]) conteo[nombreItem] = 0;
            conteo[nombreItem] += 1;
        });

        // Transformamos a array y ordenamos de mayor a menor para que la torta se vea mejor
        return Object.keys(conteo).map(nombre => ({
            name: nombre,
            value: conteo[nombre]
        })).sort((a, b) => b.value - a.value);
    }, [historial, familias, tipoGrafico]);

    // Si no hay presupuestos, mostramos un cartel amigable
    if (historial.length === 0) {
        return (
            <div className="empty-state" style={{ background: 'white', padding: '40px', borderRadius: '12px', marginTop: '20px' }}>
                Todavía no hay datos suficientes para generar un reporte.
            </div>
        )
    }

    return (
        <div>
            {/* ==========================================
          SECCIÓN DE TARJETAS KPI
          ========================================== */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px' }}>

                <div className="panel kpi-card">
                    <h4 className="kpi-title">Total Cotizado</h4>
                    <div className="kpi-value" style={{ color: 'var(--primary)' }}>
                        ${formatNumber(kpis.total)}
                    </div>
                </div>

                <div className="panel kpi-card">
                    <h4 className="kpi-title">Presupuestos Creados</h4>
                    <div className="kpi-value" style={{ color: 'var(--text)' }}>
                        {kpis.cantidad}
                    </div>
                </div>

                <div className="panel kpi-card">
                    <h4 className="kpi-title">Ticket Promedio</h4>
                    <div className="kpi-value" style={{ color: 'var(--success)' }}>
                        ${formatNumber(kpis.promedio)}
                    </div>
                </div>

            </div>

            {/* ==========================================
          SECCIÓN DE GRÁFICOS
          ========================================== */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>

                {/* Gráfico 1: Barras Mensuales */}
                <div className="panel" style={{ padding: '20px' }}>
                    <h3 style={{ marginTop: 0, textAlign: 'center', color: 'var(--text)', fontSize: '1rem' }}>
                        Evolución de Cotizaciones (Últimos 6 meses)
                    </h3>
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

                {/* Gráfico 2: Torta Dinámica (Categorías o Rubros con Prefijo) */}
                <div className="panel" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h3 style={{ margin: 0, color: 'var(--text)', fontSize: '1rem' }}>Distribución</h3>

                        {/* Botones Toggle para cambiar la vista */}
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <button
                                className={`btn-toggle ${tipoGrafico === 'categoria' ? 'active' : ''}`}
                                onClick={() => setTipoGrafico('categoria')}
                            >
                                Categorías
                            </button>
                            <button
                                className={`btn-toggle ${tipoGrafico === 'rubro' ? 'active' : ''}`}
                                onClick={() => setTipoGrafico('rubro')}
                            >
                                Rubros
                            </button>
                        </div>
                    </div>

                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={datosTorta}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
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
                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '0.85rem' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    )
}