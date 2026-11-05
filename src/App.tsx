// ============================================================================
// COMPONENTE PRINCIPAL DE LA APLICACIÓN (App.tsx)
// ============================================================================

import { useEffect, useState, useMemo } from 'react'
import * as XLSX from 'xlsx'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { supabase } from './lib/supabaseClient'
import { descargarPDF } from './lib/pdfGenerator'
import { formatNumber, formatearNombreMaterial, buscarPrecioCercano } from './lib/utils'
import { UserHeader } from './components/UserHeader'
import { ReporteGestion } from './components/ReporteGestion'
import type { Rubro, Familia, Perfil, PresupuestoGuardado, Cliente, ItemCarrito } from './types'
import './App.css'

function App() {
  // ==========================================================================
  // 1. ESTADOS GLOBALES
  // ==========================================================================
  const [session, setSession] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [mensajeAuth, setMensajeAuth] = useState('')

  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [nombre, setNombre] = useState('')
  const [cuit, setCuit] = useState('')
  const [telefono, setTelefono] = useState('')
  const [matricula, setMatricula] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [guardandoPerfil, setGuardandoPerfil] = useState(false)

  const [familias, setFamilias] = useState<Familia[]>([])
  const [familiaSeleccionada, setFamiliaSeleccionada] = useState<Familia | null>(null)
  const [rubroSeleccionado, setRubroSeleccionado] = useState<Rubro | null>(null)
  const [loadingData, setLoadingData] = useState(true)

  // Vistas
  const [vistaHistorial, setVistaHistorial] = useState(false)
  const [vistaPerfil, setVistaPerfil] = useState(false)
  const [vistaReporte, setVistaReporte] = useState(false)
  const [vistaCarrito, setVistaCarrito] = useState(false)

  // --- ESTADO PARA EL PANEL DE ADMIN ---
  const [vistaAdmin, setVistaAdmin] = useState(false)
  const [adminStats, setAdminStats] = useState({
    total_users: 0,
    total_budgets: 0,
    total_quoted: 0,
    total_approved: 0,
    ticket_promedio: 0,
    tasa_conversion: 0,
    usuarios_activos: 0,
    top_rubros: [] as string[],
    bottom_rubros: [] as string[],
    growth_data: [] as any[]
  })

  // --- ESTADOS DEL CARRITO ---
  const [itemsCarrito, setItemsCarrito] = useState<ItemCarrito[]>([])
  const [edicionId, setEdicionId] = useState<string | null>(null)
  const [confirmarVaciar, setConfirmarVaciar] = useState(false)
  const [confirmarBorrarCuenta, setConfirmarBorrarCuenta] = useState(false)

  // --- ESTADOS DEL TUTORIAL (ONBOARDING) ---
  const [pasoTutorial, setPasoTutorial] = useState(1)

  // --- ESTADOS DEL FORMULARIO DEL CLIENTE ---
  const [cliente, setCliente] = useState({ nombre: '', domicilio: '', telefono: '' })
  const [trabajo, setTrabajo] = useState({ descripcion: '', tareas: '' })
  const [gastosGenerales, setGastosGenerales] = useState<string>('')
  const [vigenciaDias, setVigenciaDias] = useState<string>('15')

  // --- ESTADOS DEL BUSCADOR DE CLIENTES ---
  const [clientesGuardados, setClientesGuardados] = useState<Cliente[]>([])
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false)

  // --- ESTADOS DEL RUBRO ACTUAL ---
  const [valores, setValores] = useState<Record<string, string>>({})
  const [resultados, setResultados] = useState<Record<string, number> | null>(null)
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null)
  const [toastExito, setToastExito] = useState<string | null>(null)

  // --- ESTADOS DEL HISTORIAL ---
  const [historial, setHistorial] = useState<PresupuestoGuardado[]>([])
  const [, setLoadingHistorial] = useState(false)
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [menuFiltroAbierto, setMenuFiltroAbierto] = useState(false)

  // ==========================================================================
  // 2. EFECTOS
  // ==========================================================================
  useEffect(() => {
    if (toastExito) {
      const timer = setTimeout(() => setToastExito(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toastExito])

  useEffect(() => {
    const cerrarMenus = () => {
      setMenuFiltroAbierto(false)
      setMostrarSugerencias(false)
    }
    document.addEventListener('click', cerrarMenus)
    return () => document.removeEventListener('click', cerrarMenus)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) cargarPerfil(session.user.id)
      else setAuthLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) cargarPerfil(session.user.id)
    })
    return () => subscription.unsubscribe()
  }, [])

  // ==========================================================================
  // 3. FUNCIONES DE AUTENTICACIÓN Y PERFIL
  // ==========================================================================
  const cargarPerfil = async (userId: string) => {
    const { data } = await supabase.from('perfiles').select('*').eq('id', userId).single()
    if (data) {
      setPerfil(data)
      setNombre(data.nombre || ''); setCuit(data.cuit || ''); setTelefono(data.telefono || ''); setMatricula(data.matricula || '');
    }
    setAuthLoading(false)
    cargarFamilias()
    cargarClientes(userId)
    supabase.from('presupuestos').select('*').eq('usuario_id', userId).order('creado_en', { ascending: false }).then(({ data }) => {
      if (data) setHistorial(data);
    });
  }

  const cargarClientes = async (userId: string) => {
    const { data } = await supabase.from('clientes').select('*').eq('usuario_id', userId)
    if (data) setClientesGuardados(data)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setMensajeAuth('Enviando enlace...')
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) setMensajeAuth(`Error: ${error.message}`)
    else setMensajeAuth('¡Revisá tu correo! Te enviamos un enlace mágico para ingresar.')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setPerfil(null); setSession(null); setRubroSeleccionado(null); setFamiliaSeleccionada(null); setVistaHistorial(false); setVistaPerfil(false); setVistaReporte(false); setVistaCarrito(false); setVistaAdmin(false); setEmail(''); setMensajeAuth('')
  }

  const guardarPerfil = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardandoPerfil(true)
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      if (!currentSession) throw new Error("No hay sesión activa.")

      let logoUrl = perfil?.logo_url || ''
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop()
        const fileName = `${currentSession.user.id}-${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage.from('logos').upload(fileName, logoFile)
        if (!uploadError) {
          const { data } = await supabase.storage.from('logos').getPublicUrl(fileName)
          logoUrl = data.publicUrl
        }
      }

      await supabase.from('perfiles').upsert({ id: currentSession.user.id, nombre, cuit, telefono, matricula, logo_url: logoUrl })
      await cargarPerfil(currentSession.user.id)
      setVistaPerfil(false)
      setLogoFile(null)
    } catch (error: any) {
      setErrorValidacion("Error al guardar: " + error.message)
    } finally { setGuardandoPerfil(false) }
  }

  const aceptarTerminos = async () => {
    if (!session) return;
    const { error } = await supabase.from('perfiles').update({ acepto_terminos: true }).eq('id', session.user.id);
    if (!error) {
      setPerfil(prev => prev ? { ...prev, acepto_terminos: true } : null);
    }
  }

  const cerrarTutorial = async () => {
    if (!session) return;
    await supabase.from('perfiles').update({ ha_visto_tutorial: true }).eq('id', session.user.id);
    setPerfil(prev => prev ? { ...prev, ha_visto_tutorial: true } : null);
  }

  const borrarCuenta = async () => {
    if (!session) return;
    const { error } = await supabase.rpc('delete_user');
    if (error) {
      setErrorValidacion("Error al borrar la cuenta: " + error.message);
      setConfirmarBorrarCuenta(false);
      return;
    }
    await supabase.auth.signOut();
    setPerfil(null); setSession(null); setRubroSeleccionado(null); setFamiliaSeleccionada(null);
    setVistaHistorial(false); setVistaPerfil(false); setVistaReporte(false); setVistaCarrito(false); setVistaAdmin(false);
    setEmail(''); setMensajeAuth('');
    setConfirmarBorrarCuenta(false);
    alert("Tu cuenta y todos tus datos han sido eliminados permanentemente.");
  }

  // ==========================================================================
  // 4. FUNCIONES DE LA APP Y CÁLCULOS
  // ==========================================================================
  async function cargarFamilias() {
    const { data, error } = await supabase.from('configuracion').select('esquema').eq('id', 'esquema_global').single()
    if (!error && data?.esquema?.familias) setFamilias(data.esquema.familias)
    setLoadingData(false)
  }

  const handleSeleccionarRubro = async (rubro: Rubro) => {
    setRubroSeleccionado(rubro); setResultados(null); setValores({}); setErrorValidacion(null);
    if (!session) return;
    const { data, error } = await supabase.from('precios_usuario').select('clave_atributo, valor').eq('usuario_id', session.user.id).eq('rubro_id', rubro.id);
    if (!error && data) {
      const preciosGuardados: Record<string, string> = {};
      data.forEach(item => { preciosGuardados[item.clave_atributo] = item.valor.toString(); });
      setValores(prev => ({ ...prev, ...preciosGuardados }));
    }
  }

  const handleInputChange = (clave: string, valor: string) => { setValores(prev => ({ ...prev, [clave]: valor })) }

  const validarMedidas = (): boolean => {
    if (!rubroSeleccionado) return false;
    setErrorValidacion(null);
    for (const atributo of rubroSeleccionado.atributos) {
      if (atributo.requerido && (!valores[atributo.clave] || valores[atributo.clave].trim() === '')) {
        const nombreAtributo = atributo.etiqueta.replace(/cano/gi, 'caño').replace(/tees/gi, 'uniones en T');
        setErrorValidacion(`El campo "${nombreAtributo}" es obligatorio.`);
        return false;
      }
    }
    return true;
  }

  const calcularPresupuesto = async () => {
    if (!validarMedidas() || !rubroSeleccionado) return;

    if (session) {
      try {
        const preciosAGuardar = rubroSeleccionado.costos.map(costo => {
          const numValor = Number(valores[costo.clave]);
          return { usuario_id: session.user.id, rubro_id: rubroSeleccionado.id, clave_atributo: costo.clave, valor: isNaN(numValor) ? 0 : numValor, unidad: costo.unidad };
        }).filter(p => p.valor > 0);
        if (preciosAGuardar.length > 0) await supabase.from('precios_usuario').upsert(preciosAGuardar, { onConflict: 'usuario_id, rubro_id, clave_atributo' });
      } catch (err) { console.error("No se guardaron precios", err); }
    }

    const nuevoContexto: Record<string, any> = {}
    Object.keys(valores).forEach(key => { nuevoContexto[key] = Number(valores[key]) || 0 })
    const resultadosCalculados: Record<string, number> = {}

    Object.entries(rubroSeleccionado.formulas).forEach(([claveResultado, formula]) => {
      try {
        const formulaSegura = formula.replace(/ceil\(/g, 'Math.ceil(')
        const fn = new Function(...Object.keys(nuevoContexto), `return ${formulaSegura}`)
        const resultado = fn(...Object.values(nuevoContexto))
        const resultadoFinal = typeof resultado === 'number' ? Number(resultado.toFixed(2)) : resultado
        resultadosCalculados[claveResultado] = resultadoFinal
        nuevoContexto[claveResultado] = resultadoFinal
      } catch (error) { console.error(error) }
    })
    setResultados(resultadosCalculados); setErrorValidacion(null);
  }

  // ==========================================================================
  // 5. LÓGICA DEL CARRITO Y CLIENTES
  // ==========================================================================
  const agregarAlCarrito = () => {
    if (!resultados || !rubroSeleccionado) return;
    const nuevoItem: ItemCarrito = { rubro: rubroSeleccionado, valores: { ...valores }, resultados: { ...resultados } };
    setItemsCarrito(prev => [...prev, nuevoItem]);
    setToastExito(`${rubroSeleccionado.nombre} agregado al presupuesto.`);
    setRubroSeleccionado(null); setResultados(null); setValores({});
  }

  const eliminarDelCarrito = (index: number) => {
    setItemsCarrito(prev => prev.filter((_, i) => i !== index));
  }

  const handleClienteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setCliente(prev => ({ ...prev, nombre: valor }));
    if (valor.length > 1) setMostrarSugerencias(true);
    else setMostrarSugerencias(false);
  }

  const seleccionarCliente = (c: Cliente) => {
    setCliente({ nombre: c.nombre, domicilio: c.domicilio, telefono: c.telefono || '' });
    setMostrarSugerencias(false);
  }

  // ==========================================================================
  // 6. GENERACIÓN DE PDF Y GUARDADO
  // ==========================================================================
  const generarPDFFinal = async () => {
    if (!perfil || itemsCarrito.length === 0) return;
    if (!cliente.nombre.trim()) { setErrorValidacion("Falta el nombre del cliente."); return; }

    const numVigencia = Number(vigenciaDias) || 15;

    let totalGeneral = 0;
    itemsCarrito.forEach(item => {
      Object.entries(item.resultados).forEach(([clave, cantidad]) => {
        const costo = buscarPrecioCercano(clave, item.rubro.costos);
        totalGeneral += (Number(item.valores[costo?.clave || ''] || 0) * cantidad);
      });
    });
    totalGeneral += Number(gastosGenerales) || 0;

    if (session) {
      const datosInsert = {
        usuario_id: session.user.id,
        rubro_id: itemsCarrito[0].rubro.id,
        cliente_nombre: cliente.nombre,
        datos_entrada: { cliente, trabajo, items: itemsCarrito, gastosGenerales, vigenciaDias: numVigencia },
        resultado_calculo: { totalGeneral },
        total: totalGeneral,
        estado: 'pendiente'
      };

      if (edicionId) {
        await supabase.from('presupuestos').update(datosInsert).eq('id', edicionId);
      } else {
        await supabase.from('presupuestos').insert(datosInsert);
      }

      if (cliente.nombre.trim()) {
        await supabase.from('clientes').upsert(
          { usuario_id: session.user.id, nombre: cliente.nombre, telefono: cliente.telefono, domicilio: cliente.domicilio },
          { onConflict: 'usuario_id, nombre' }
        );
      }
    }

    await descargarPDF(
      perfil, cliente, trabajo, itemsCarrito, gastosGenerales, numVigencia, new Date().toISOString(),
      () => setToastExito("PDF descargado. Ahora abrí WhatsApp Web y adjuntalo.")
    );

    setItemsCarrito([]); setEdicionId(null); setCliente({ nombre: '', telefono: '', domicilio: '' }); setTrabajo({ descripcion: '', tareas: '' });
    setGastosGenerales(''); setVistaCarrito(false); setVistaHistorial(false);
  }

  // ==========================================================================
  // 7. LÓGICA DEL HISTORIAL Y BACKUP EXCEL
  // ==========================================================================
  const irAHistorial = async () => {
    if (!session) return
    setLoadingHistorial(true); setVistaHistorial(true); setVistaPerfil(false); setVistaReporte(false); setVistaCarrito(false); setVistaAdmin(false);
    const { data, error } = await supabase.from('presupuestos').select('*').eq('usuario_id', session.user.id).order('creado_en', { ascending: false });
    if (!error && data) setHistorial(data);
    setLoadingHistorial(false)
  }

  const editarPresupuesto = (p: PresupuestoGuardado) => {
    setEdicionId(p.id);
    setCliente(p.datos_entrada.cliente);
    setTrabajo(p.datos_entrada.trabajo);
    setGastosGenerales(p.datos_entrada.gastosGenerales || '');
    setVigenciaDias(p.datos_entrada.vigenciaDias ? p.datos_entrada.vigenciaDias.toString() : '15');
    setItemsCarrito(p.datos_entrada.items || []);
    setVistaHistorial(false);
    setVistaCarrito(true);
  }

  const actualizarEstado = async (id: string, nuevoEstado: string) => {
    setHistorial(prev => prev.map(p => p.id === id ? { ...p, estado: nuevoEstado as any } : p));
    await supabase.from('presupuestos').update({ estado: nuevoEstado }).eq('id', id);
  }

  const historialFiltrado = useMemo(() => {
    let filtrado = [...historial];
    if (filtroCliente) filtrado = filtrado.filter(p => p.cliente_nombre.toLowerCase().includes(filtroCliente.toLowerCase()));
    if (filtroEstado) filtrado = filtrado.filter(p => p.estado === filtroEstado);
    return filtrado;
  }, [historial, filtroCliente, filtroEstado]);

  const exportarExcel = () => {
    if (historialFiltrado.length === 0) return;

    // --- HOJA 1: RESUMEN (Un registro por presupuesto) ---
    const resumenData = historialFiltrado.map(p => {
      const gastos = Number(p.datos_entrada?.gastosGenerales) || 0;
      return {
        'ID': p.id.split('-')[0].toUpperCase(),
        'Fecha': new Date(p.creado_en).toLocaleDateString('es-AR'),
        'Cliente': p.cliente_nombre,
        'Teléfono': p.datos_entrada?.cliente?.telefono || '',
        'Domicilio': p.datos_entrada?.cliente?.domicilio || '',
        'Materiales': p.total - gastos, // El total menos los gastos generales
        'Gastos Grales.': gastos,
        'Total': p.total,
        'Estado': p.estado.charAt(0).toUpperCase() + p.estado.slice(1)
      };
    });

    // --- HOJA 2: DETALLE (Un registro por cada material de cada rubro) ---
    const detalleData: any[] = [];
    historialFiltrado.forEach(p => {
      // Recorremos los ítems del carrito de este presupuesto
      p.datos_entrada?.items?.forEach((item: any) => {
        // Recorremos los resultados calculados de este rubro
        Object.entries(item.resultados).forEach(([clave, cantidad]: any) => {
          const costo = buscarPrecioCercano(clave, item.rubro.costos);
          const precioUnitario = costo ? Number(item.valores[costo.clave] || 0) : 0;
          const subtotal = precioUnitario * Number(cantidad);

          detalleData.push({
            'ID Presupuesto': p.id.split('-')[0].toUpperCase(),
            'Cliente': p.cliente_nombre,
            'Rubro': item.rubro.nombre, // Acá se ve a qué rubro pertenece (Plomería, Pintura, etc)
            'Material': formatearNombreMaterial(clave),
            'Cantidad': Number(cantidad),
            'Precio Unitario': precioUnitario,
            'Subtotal': subtotal
          });
        });
      });
    });

    // --- CREACIÓN DE LAS HOJAS ---
    const wsResumen = XLSX.utils.json_to_sheet(resumenData);
    const wsDetalle = XLSX.utils.json_to_sheet(detalleData);

    // --- APLICAR FORMATOS (Moneda y Numérico) ---

    // Formato para Resumen (Columnas F, G, H son Materiales, Gastos y Total)
    for (let i = 2; i <= resumenData.length + 1; i++) {
      ['F', 'G', 'H'].forEach(col => {
        if (wsResumen[`${col}${i}`]) wsResumen[`${col}${i}`].z = '"$"#,##0.00';
      });
    }

    // Formato para Detalle (Columna E: Cantidad con 2 decimales, F y G: Moneda)
    for (let i = 2; i <= detalleData.length + 1; i++) {
      if (wsDetalle[`E${i}`]) wsDetalle[`E${i}`].z = '0.00';
      if (wsDetalle[`F${i}`]) wsDetalle[`F${i}`].z = '"$"#,##0.00';
      if (wsDetalle[`G${i}`]) wsDetalle[`G${i}`].z = '"$"#,##0.00';
    }

    // Ajustar el ancho de las columnas para que se vea prolijo al abrir el Excel
    wsResumen['!cols'] = [{ wch: 10 }, { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }];
    wsDetalle['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 35 }, { wch: 12 }, { wch: 15 }, { wch: 15 }];

    // --- GENERAR EL ARCHIVO ---
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, wsResumen, "Resumen");
    XLSX.utils.book_append_sheet(libro, wsDetalle, "Detalle de Ítems");

    const nombreArchivo = `Backup_Presupuestos_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(libro, nombreArchivo);
  }

  // --- FUNCIÓN PARA EL PANEL DE ADMIN ---
  const irAAdmin = async () => {
    if (!session) return;
    setVistaAdmin(true); setVistaHistorial(false); setVistaPerfil(false); setVistaReporte(false); setVistaCarrito(false);

    // Llamamos a la función SQL segura
    const { data, error } = await supabase.rpc('get_admin_stats');
    if (!error && data) {
      setAdminStats(data);
    } else {
      console.error(error);
      setErrorValidacion("Error al cargar estadísticas.");
    }
  }

  // --- FUNCIÓN AUXILIAR PARA EL TAMAÑO DE FUENTE DINÁMICO ---
  const getFontSize = (value: string | number) => {
    const length = String(value).length;
    if (length > 15) return '1rem';
    if (length > 12) return '1.2rem';
    if (length > 9) return '1.4rem';
    return '1.6rem';
  };

  // --- FUNCIÓN PARA MAPEAR IDs DE RUBROS A NOMBRES ---
  const getNombresRubros = (ids: string[]) => {
    if (!ids || ids.length === 0) return 'Sin datos';
    const nombres = ids.map(id => familias.flatMap(f => f.rubros).find(r => r.id === id)?.nombre).filter(Boolean);
    if (nombres.length === 0) return 'Sin datos';
    return nombres.join(', ');
  };

  // ==========================================================================
  // 8. RENDERIZADO
  // ==========================================================================
  if (authLoading) return <div className="spinner-container"><div className="spinner"></div></div>

  if (!session) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>Bienvenido a Presupuestos Pro</h2>
          <p>Ingresá tu email para recibir un enlace de acceso seguro.</p>
          <form onSubmit={handleLogin}>
            <div className="input-group"><label>Correo Electrónico</label><input type="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} required /></div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }}>Enviar Enlace Mágico</button>
          </form>
          {mensajeAuth && <p style={{ marginTop: '15px', color: mensajeAuth.includes('Error') ? 'red' : 'green', fontWeight: 'bold' }}>{mensajeAuth}</p>}
        </div>
      </div>
    )
  }

  if (!perfil || vistaPerfil) {
    return (
      <div className="auth-container" onClick={() => setVistaPerfil(false)}>
        <div className="auth-card" style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>

          {errorValidacion && <div className="error-banner" style={{ position: 'absolute', top: '-20px', right: '-20px' }}><span>⚠️ {errorValidacion}</span><button onClick={() => setErrorValidacion(null)}>✕</button></div>}

          {confirmarBorrarCuenta && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', maxWidth: '400px', width: '90%', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
                  <div style={{ backgroundColor: '#fee2e2', padding: '15px', borderRadius: '50%' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                  </div>
                </div>
                <h3 style={{ marginTop: 0, fontSize: '1.2rem', color: 'var(--text)' }}>¿Eliminar tu cuenta?</h3>
                <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginBottom: '25px' }}>Se borrarán TODOS tus datos, clientes y presupuestos permanentemente. Esta acción NO se puede deshacer.</p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <button className="btn btn-secondary" onClick={() => setConfirmarBorrarCuenta(false)} style={{ flex: 1 }}>Cancelar</button>
                  <button className="btn" style={{ backgroundColor: 'var(--danger)', color: 'white', flex: 1 }} onClick={borrarCuenta}>Sí, eliminar</button>
                </div>
              </div>
            </div>
          )}

          <h2>{perfil ? 'Editar Perfil' : 'Completá tu Perfil'}</h2>
          <form onSubmit={guardarPerfil}>
            <div className="input-group"><label>Nombre o Empresa *</label><input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required /></div>
            <div className="input-group"><label>CUIT</label><input type="text" value={cuit} onChange={e => setCuit(e.target.value)} /></div>
            <div className="input-group"><label>Teléfono</label><input type="text" value={telefono} onChange={e => setTelefono(e.target.value)} /></div>
            <div className="input-group"><label>Matrícula Profesional</label><input type="text" value={matricula} onChange={e => setMatricula(e.target.value)} /></div>
            <div className="input-group"><label>Logo (Dejar en blanco para mantener el actual)</label><input type="file" accept="image/png, image/jpeg" onChange={e => setLogoFile(e.target.files?.[0] || null)} /></div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button type="submit" className="btn btn-primary" disabled={guardandoPerfil}>{guardandoPerfil ? 'Guardando...' : 'Guardar Cambios'}</button>
              {perfil && <button type="button" className="btn btn-secondary" onClick={() => setVistaPerfil(false)}>Cancelar</button>}
            </div>
          </form>

          {perfil && (
            <div style={{ marginTop: '30px', borderTop: '1px solid var(--border)', paddingTop: '20px', textAlign: 'left' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginBottom: '15px' }}>Una vez que elimines tu cuenta, no hay vuelta atrás. Por favor, asegurate de estar seguro.</p>
              <button type="button" className="btn btn-secondary" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', width: '100%' }} onClick={() => setConfirmarBorrarCuenta(true)}>
                🗑️ Borrar mi cuenta permanentemente
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (perfil && perfil.acepto_terminos === false) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ maxWidth: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
          <h2>Términos y Privacidad</h2>
          <p style={{ marginBottom: '15px' }}>Para continuar, necesitás aceptar nuestras políticas.</p>

          <div style={{ flex: 1, overflowY: 'auto', textAlign: 'left', fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: '20px', paddingRight: '10px', lineHeight: '1.6' }}>
            <p style={{ marginBottom: '10px' }}><strong>1. Protección de Datos Personales (Ley 25.326):</strong> Al utilizar Presupuestos Pro, usted acepta que los datos personales de sus clientes (nombres, teléfonos, domicilios) serán almacenados en nuestra base de datos con el único fin de generar y gestionar presupuestos de obra.</p>
            <p style={{ marginBottom: '10px' }}><strong>2. Responsabilidad del Usuario:</strong> Usted declara ser el único responsable de contar con el consentimiento de sus clientes para ingresar sus datos en esta plataforma.</p>
            <p style={{ marginBottom: '10px' }}><strong>3. Privacidad y Seguridad:</strong> Sus datos y los de sus clientes no son compartidos ni vendidos a terceros. La información está resguardada bajo estrictos protocolos de seguridad.</p>
            <p><strong>4. Uso de la Información:</strong> Los datos ingresados son de uso exclusivo para la generación de los documentos PDF que usted descargue.</p>
          </div>

          <button className="btn btn-primary" onClick={aceptarTerminos} style={{ width: '100%', padding: '12px', fontSize: '1rem' }}>
            Acepto los Términos y Condiciones
          </button>
        </div>
      </div>
    )
  }

  if (perfil && perfil.ha_visto_tutorial === false) {
    return (
      <div className="auth-container" style={{ backgroundColor: 'rgba(15, 23, 42, 0.95)' }}>
        <div className="auth-card" style={{ textAlign: 'center', borderTop: '5px solid var(--primary)' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '5px' }}>¡Bienvenido a Presupuestos Pro!</h2>
          <p style={{ color: 'var(--text-light)', marginBottom: '25px' }}>Tu nuevo asistente de obras.</p>

          {pasoTutorial === 1 && (
            <div style={{ animation: 'fadeIn 0.3s ease-in' }}>
              <div style={{ fontSize: '3rem', marginBottom: '15px' }}>💰</div>
              <h3 style={{ margin: '0 0 10px 0' }}>Paso 1: Cargá tus precios</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-light)', marginBottom: '30px' }}>Entrá a cualquier rubro (como Plomería) y cargá los precios de tus materiales. La app los va a recordar para la próxima vez.</p>
              <button className="btn btn-primary" onClick={() => setPasoTutorial(2)}>Siguiente →</button>
            </div>
          )}

          {pasoTutorial === 2 && (
            <div style={{ animation: 'fadeIn 0.3s ease-in' }}>
              <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🧮</div>
              <h3 style={{ margin: '0 0 10px 0' }}>Paso 2: Hacé un presupuesto</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-light)', marginBottom: '30px' }}>Agregá todos los rubros que necesites al carrito y generá un único PDF profesional con el total de la obra.</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-secondary" onClick={() => setPasoTutorial(1)}>← Volver</button>
                <button className="btn btn-primary" onClick={() => setPasoTutorial(3)}>Siguiente →</button>
              </div>
            </div>
          )}

          {pasoTutorial === 3 && (
            <div style={{ animation: 'fadeIn 0.3s ease-in' }}>
              <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📲</div>
              <h3 style={{ margin: '0 0 10px 0' }}>Paso 3: Mandalo por WhatsApp</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-light)', marginBottom: '30px' }}>Si estás desde el celular, al generar el PDF podrás enviarlo directamente por WhatsApp con un solo toque.</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-secondary" onClick={() => setPasoTutorial(2)}>← Volver</button>
                <button className="btn btn-success" onClick={cerrarTutorial}>¡Empezar a usar la App!</button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (loadingData) return <div className="spinner-container"><div className="spinner"></div></div>

  // PANTALLA OCULTA: PANEL DE ADMINISTRADOR
  if (vistaAdmin) {
    const topRubroNombre = getNombresRubros(adminStats.top_rubros);
    const bottomRubroNombre = getNombresRubros(adminStats.bottom_rubros);

    return (
      <div className="app-wrapper">
        <UserHeader
          perfil={perfil}
          onVerHistorial={irAHistorial}
          onVerPerfil={() => { setVistaPerfil(true); setVistaAdmin(false); }}
          onVerReporte={() => { setVistaReporte(true); setVistaAdmin(false); }}
          onLogout={handleLogout}
          mostrarBotonVolver={true}
          onVolver={() => setVistaAdmin(false)}
          itemsCount={itemsCarrito.length}
          onVerCarrito={() => setVistaCarrito(true)}
          isAdmin={perfil?.is_admin}
          onVerAdmin={irAAdmin}
        />

        <div className="page-header">
          <div>
            <h1>Panel de Administrador</h1>
            <p>Métricas globales de la plataforma</p>
          </div>
        </div>

        {/* Grilla de 9 Tarjetas KPI */}
        <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>

          {/* 1. Usuarios */}
          <div className="panel kpi-card">
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px', color: 'var(--primary)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </div>
            <h4 className="kpi-title">Usuarios Registrados</h4>
            <div className="kpi-value" style={{ color: 'var(--primary)', fontSize: getFontSize(adminStats.total_users) }}>{adminStats.total_users}</div>
          </div>

          {/* 2. Presupuestos */}
          <div className="panel kpi-card">
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px', color: '#8b5cf6' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            </div>
            <h4 className="kpi-title">Presupuestos Generados</h4>
            <div className="kpi-value" style={{ color: '#8b5cf6', fontSize: getFontSize(adminStats.total_budgets) }}>{adminStats.total_budgets}</div>
          </div>

          {/* 3. Total Cotizado */}
          <div className="panel kpi-card">
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px', color: 'var(--text)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            </div>
            <h4 className="kpi-title">Total Cotizado</h4>
            <div className="kpi-value" style={{ color: 'var(--text)', fontSize: getFontSize(`$${formatNumber(adminStats.total_quoted)}`) }}>${formatNumber(adminStats.total_quoted)}</div>
          </div>

          {/* 4. Total Aprobado */}
          <div className="panel kpi-card">
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px', color: 'var(--success)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </div>
            <h4 className="kpi-title">Total Aprobado</h4>
            <div className="kpi-value" style={{ color: 'var(--success)', fontSize: getFontSize(`$${formatNumber(adminStats.total_approved)}`) }}>${formatNumber(adminStats.total_approved)}</div>
          </div>

          {/* 5. Ticket Promedio */}
          <div className="panel kpi-card">
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px', color: '#f59e0b' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
            </div>
            <h4 className="kpi-title">Ticket Promedio</h4>
            <div className="kpi-value" style={{ color: '#f59e0b', fontSize: getFontSize(`$${formatNumber(adminStats.ticket_promedio)}`) }}>${formatNumber(adminStats.ticket_promedio)}</div>
          </div>

          {/* 6. Tasa de Conversión */}
          <div className="panel kpi-card">
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px', color: '#10b981' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
            </div>
            <h4 className="kpi-title">Tasa de Conversión</h4>
            <div className="kpi-value" style={{ color: '#10b981', fontSize: getFontSize(`${adminStats.tasa_conversion.toFixed(2)}%`) }}>
              {adminStats.tasa_conversion.toFixed(2)}%
            </div>
          </div>

          {/* 7. Usuarios Activos */}
          <div className="panel kpi-card">
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px', color: '#0ea5e9' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
            </div>
            <h4 className="kpi-title">Usuarios Activos (30 días)</h4>
            <div className="kpi-value" style={{ color: '#0ea5e9', fontSize: getFontSize(adminStats.usuarios_activos) }}>{adminStats.usuarios_activos}</div>
          </div>

          {/* 8. Rubro Más Popular */}
          <div className="panel kpi-card">
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px', color: '#ec4899' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            </div>
            <h4 className="kpi-title">Rubro Más Popular</h4>
            <div className="kpi-value" style={{ color: '#ec4899', fontSize: getFontSize(topRubroNombre), textAlign: 'center' }}>{topRubroNombre}</div>
          </div>

          {/* 9. Rubro Menos Popular */}
          <div className="panel kpi-card">
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px', color: '#64748b' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            </div>
            <h4 className="kpi-title">Rubro Menos Usado</h4>
            <div className="kpi-value" style={{ color: '#64748b', fontSize: getFontSize(bottomRubroNombre), textAlign: 'center' }}>{bottomRubroNombre}</div>
          </div>

        </div>

        {/* GRÁFICO DE CRECIMIENTO (Últimos 6 meses) */}
        <div className="panel" style={{ marginTop: '20px', padding: '20px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--text)', fontSize: '1.1rem', textAlign: 'center' }}>
            Crecimiento de la Plataforma (Últimos 6 meses)
          </h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={adminStats.growth_data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUsuarios" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorPresupuestos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="mes" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#0f172a' }}
                />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '0.9rem' }} />
                <Area type="monotone" dataKey="usuarios" name="Nuevos Usuarios" stroke="#2563eb" fillOpacity={1} fill="url(#colorUsuarios)" />
                <Area type="monotone" dataKey="presupuestos" name="Presupuestos Creados" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorPresupuestos)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    )
  }

  if (vistaReporte) {
    return (
      <div className="app-wrapper">
        <UserHeader
          perfil={perfil}
          onVerHistorial={irAHistorial}
          onVerPerfil={() => { setVistaPerfil(true); setVistaReporte(false); }}
          onVerReporte={() => { setVistaReporte(true); setVistaHistorial(false); setVistaPerfil(false); setVistaCarrito(false); }}
          onLogout={handleLogout}
          mostrarBotonVolver={true}
          onVolver={() => setVistaReporte(false)}
          itemsCount={itemsCarrito.length}
          onVerCarrito={() => setVistaCarrito(true)}
          isAdmin={perfil?.is_admin}
          onVerAdmin={irAAdmin}
        />
        <div className="page-header"><div><h1>Resumen de Gestión</h1></div></div>
        <ReporteGestion historial={historial} familias={familias} />
      </div>
    )
  }

  if (vistaCarrito) {
    return (
      <div className="app-wrapper">
        {confirmarVaciar && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', maxWidth: '400px', width: '90%', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
                <div style={{ backgroundColor: '#fee2e2', padding: '15px', borderRadius: '50%' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                </div>
              </div>
              <h3 style={{ marginTop: 0, fontSize: '1.2rem', color: 'var(--text)' }}>¿Vaciar Presupuesto?</h3>
              <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginBottom: '25px' }}>Se eliminarán todos los ítems cargados hasta el momento. Esta acción no se puede deshacer.</p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button className="btn btn-secondary" onClick={() => setConfirmarVaciar(false)} style={{ flex: 1 }}>Cancelar</button>
                <button className="btn" style={{ backgroundColor: 'var(--danger)', color: 'white', flex: 1 }} onClick={() => {
                  setItemsCarrito([]);
                  setConfirmarVaciar(false);
                  setVistaCarrito(false);
                }}>Sí, vaciar</button>
              </div>
            </div>
          </div>
        )}

        {toastExito && <div className="success-banner"><span>✅ {toastExito}</span><button onClick={() => setToastExito(null)}>✕</button></div>}
        {errorValidacion && <div className="error-banner"><span>⚠️ {errorValidacion}</span><button onClick={() => setErrorValidacion(null)}>✕</button></div>}

        <UserHeader
          perfil={perfil}
          onVerHistorial={irAHistorial}
          onVerPerfil={() => setVistaPerfil(true)}
          onVerReporte={() => { setVistaReporte(true); setVistaHistorial(false); setVistaPerfil(false); setVistaCarrito(false); }}
          onLogout={handleLogout}
          mostrarBotonVolver={true}
          onVolver={() => { setVistaCarrito(false); }}
          itemsCount={itemsCarrito.length}
          onVerCarrito={() => setVistaCarrito(true)}
          isAdmin={perfil?.is_admin}
          onVerAdmin={irAAdmin}
        />

        <div className="page-header">
          <div>
            <h1>{edicionId ? 'Editando Presupuesto' : 'Armar Presupuesto de Obra'}</h1>
            <p>Revisá los ítems antes de generar el PDF.</p>
          </div>
          {itemsCarrito.length > 0 && (
            <button className="btn btn-secondary" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => setConfirmarVaciar(true)}>
              🗑️ Vaciar Carrito
            </button>
          )}
        </div>

        <div className="dashboard-grid">
          <div className="panel panel-cliente" style={{ position: 'relative' }}>
            <h3>1. Datos del Cliente</h3>
            <div className="input-group">
              <label>Nombre (escribí para buscar) *</label>
              <input type="text" value={cliente.nombre} onChange={handleClienteChange} onClick={(e) => e.stopPropagation()} placeholder="Ej: Juan Pérez" autoComplete="off" />
              {mostrarSugerencias && cliente.nombre.length > 1 && (
                <ul className="sugerencias-clientes">
                  {clientesGuardados
                    .filter(c => c.nombre.toLowerCase().includes(cliente.nombre.toLowerCase()))
                    .map(c => (
                      <li key={c.id} onClick={() => seleccionarCliente(c)}>
                        <strong>{c.nombre}</strong> <br /><small>{c.domicilio}</small>
                      </li>
                    ))}
                </ul>
              )}
            </div>
            <div className="input-group"><label>Teléfono (WhatsApp)</label><input type="tel" value={cliente.telefono} onChange={e => setCliente({ ...cliente, telefono: e.target.value })} /></div>
            <div className="input-group"><label>Domicilio</label><input type="text" value={cliente.domicilio} onChange={e => setCliente({ ...cliente, domicilio: e.target.value })} /></div>

            <div className="input-group"><label>Descripción General</label><textarea rows={2} value={trabajo.descripcion} onChange={e => setTrabajo({ ...trabajo, descripcion: e.target.value })} placeholder="Ej: Refacción integral de baño..." /></div>
            <div className="input-group"><label>Vigencia (Días)</label><input type="number" value={vigenciaDias} onChange={e => setVigenciaDias(e.target.value)} /></div>
          </div>

          <div className="panel panel-resultados" style={{ gridColumn: 'span 2' }}>
            <h3>2. Detalle del Presupuesto</h3>
            {itemsCarrito.length === 0 ? (
              <p style={{ color: '#64748b', fontStyle: 'italic' }}>El carrito está vacío. Agregá rubros desde la pantalla anterior.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {itemsCarrito.map((item, index) => (
                  <div key={index} style={{ border: '1px solid #e2e8f0', padding: '10px', borderRadius: '6px', backgroundColor: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <strong style={{ color: 'var(--primary)' }}>{item.rubro.nombre}</strong>
                      <button onClick={() => eliminarDelCarrito(index)} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>Eliminar</button>
                    </div>
                    {Object.entries(item.resultados).map(([clave, valor]) => (
                      <div key={clave} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b' }}>
                        <span>{formatearNombreMaterial(clave)}</span>
                        <span>{valor} u.</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            <div className="input-group" style={{ marginTop: '20px' }}>
              <label>Gastos Generales / Imprevistos</label>
              <input type="number" value={gastosGenerales} onChange={e => setGastosGenerales(e.target.value)} placeholder="$ 0.00" />
            </div>
          </div>
        </div>

        {itemsCarrito.length > 0 && (
          <div className="pdf-action-container" style={{ maxWidth: '600px' }}>
            <button className="btn btn-success" style={{ width: '100%', padding: '15px', fontSize: '1.1rem' }} onClick={generarPDFFinal}>
              📄 {edicionId ? 'Guardar Cambios y Generar PDF' : 'Generar Presupuesto PDF'}
            </button>
          </div>
        )}
      </div>
    )
  }

  if (vistaHistorial) {
    return (
      <div className="app-wrapper">
        <UserHeader
          perfil={perfil}
          onVerHistorial={() => { }}
          onVerPerfil={() => { setVistaPerfil(true); setVistaHistorial(false); }}
          onVerReporte={() => { setVistaReporte(true); setVistaHistorial(false); }}
          onLogout={handleLogout}
          mostrarBotonVolver={true}
          onVolver={() => setVistaHistorial(false)}
          itemsCount={itemsCarrito.length}
          onVerCarrito={() => setVistaCarrito(true)}
          isAdmin={perfil?.is_admin}
          onVerAdmin={irAAdmin}
        />

        <div className="page-header">
          <div><h1>Mis Presupuestos</h1></div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={exportarExcel} style={{ width: 'auto', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Exportar a Excel
            </button>
            <button className="btn btn-primary" onClick={() => { setItemsCarrito([]); setEdicionId(null); setVistaCarrito(true); }} style={{ width: 'auto' }}>
              + Nuevo Presupuesto
            </button>
          </div>
        </div>

        <div className="panel panel-filtros">
          <div style={{ display: 'flex', gap: '15px' }}>
            <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
              <label>Buscar Cliente</label>
              <input type="text" placeholder="Nombre..." value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} />
            </div>

            <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
              <label>Estado</label>
              <div className="contenedor-popover">
                <button
                  className="btn-filtro"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuFiltroAbierto(!menuFiltroAbierto);
                  }}
                >
                  <span>
                    {filtroEstado === 'pendiente' ? 'Pendientes' :
                      filtroEstado === 'aprobado' ? 'Aprobados' :
                        filtroEstado === 'rechazado' ? 'Rechazados' : 'Todos'}
                  </span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                </button>

                {menuFiltroAbierto && (
                  <div className="menu-filtro">
                    <button onClick={() => { setFiltroEstado(''); setMenuFiltroAbierto(false); }}>Todos</button>
                    <button onClick={() => { setFiltroEstado('pendiente'); setMenuFiltroAbierto(false); }}>Pendientes</button>
                    <button onClick={() => { setFiltroEstado('aprobado'); setMenuFiltroAbierto(false); }}>Aprobados</button>
                    <button onClick={() => { setFiltroEstado('rechazado'); setMenuFiltroAbierto(false); }}>Rechazados</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid-rubros">
          {historialFiltrado.map(p => {
            const fechaCreacion = new Date(p.creado_en);
            const hoy = new Date();
            const diasDiferencia = Math.floor((hoy.getTime() - fechaCreacion.getTime()) / (1000 * 3600 * 24));
            const esViejo = p.estado === 'pendiente' && diasDiferencia >= 15;

            return (
              <div key={p.id} className="panel" style={{ padding: '20px', borderTop: esViejo ? '4px solid #f97316' : undefined }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <strong style={{ fontSize: '1.1rem' }}>Cliente: {p.cliente_nombre}</strong>
                  <span style={{ color: '#64748b', fontSize: '0.85rem' }}>{new Date(p.creado_en).toLocaleDateString('es-AR')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
                  <strong style={{ fontSize: '1.3rem', color: 'var(--primary)' }}>${formatNumber(p.total)}</strong>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn btn-secondary" onClick={() => editarPresupuesto(p)}>✏️ Editar</button>
                    <select
                      className={`btn-estado ${p.estado}`}
                      value={p.estado}
                      onChange={(e) => actualizarEstado(p.id, e.target.value)}
                      style={{ padding: '6px', borderRadius: '6px', border: '1px solid #ccc' }}
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="aprobado">Aprobado</option>
                      <option value="rechazado">Rechazado</option>
                    </select>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (rubroSeleccionado) {
    return (
      <div className="app-wrapper">
        {errorValidacion && <div className="error-banner"><span>⚠️ {errorValidacion}</span><button onClick={() => setErrorValidacion(null)}>✕</button></div>}
        {toastExito && <div className="success-banner"><span>✅ {toastExito}</span><button onClick={() => setToastExito(null)}>✕</button></div>}

        <UserHeader
          perfil={perfil}
          onVerHistorial={irAHistorial}
          onVerPerfil={() => setVistaPerfil(true)}
          onVerReporte={() => { setVistaReporte(true); setVistaHistorial(false); setVistaPerfil(false); setVistaCarrito(false); }}
          onLogout={handleLogout}
          itemsCount={itemsCarrito.length}
          onVerCarrito={() => setVistaCarrito(true)}
          isAdmin={perfil?.is_admin}
          onVerAdmin={irAAdmin}
        />
        <div className="page-header">
          <div>
            <button className="btn-secondary" style={{ marginBottom: '10px' }} onClick={() => { setRubroSeleccionado(null); setResultados(null); setValores({}); }}>← Volver a rubros</button>
            <h1>{rubroSeleccionado.nombre}</h1>
          </div>
        </div>

        <div className="dashboard-grid">
          <div className="panel panel-medidas">
            <h3>Medidas</h3>
            {rubroSeleccionado.atributos.map(atributo => (
              <div key={atributo.clave} className="input-group">
                <label>{atributo.etiqueta} {atributo.requerido && '*'}</label>
                {atributo.tipo === 'numero' ? (
                  <input type="number" value={valores[atributo.clave] || ''} onChange={e => handleInputChange(atributo.clave, e.target.value)} />
                ) : (
                  <select value={valores[atributo.clave] || ''} onChange={e => handleInputChange(atributo.clave, e.target.value)}>
                    <option value="">Seleccioná...</option>
                    {atributo.opciones?.map(op => <option key={op} value={op}>{op}</option>)}
                  </select>
                )}
              </div>
            ))}
          </div>

          <div className="panel panel-precios">
            <h3>Precios</h3>
            {rubroSeleccionado.costos.map(costo => (
              <div key={costo.clave} className="input-group">
                <label>{costo.etiqueta}</label>
                <input type="number" value={valores[costo.clave] || ''} onChange={e => handleInputChange(costo.clave, e.target.value)} placeholder="$ 0.00" />
              </div>
            ))}
          </div>
        </div>

        <div className="pdf-action-container" style={{ maxWidth: '100%', display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '30px' }}>
          <button className="btn btn-primary" onClick={calcularPresupuesto} style={{ width: 'auto', padding: '12px 30px' }}>
            Calcular Materiales
          </button>

          {resultados && (
            <button className="btn btn-success" onClick={agregarAlCarrito} style={{ width: 'auto', padding: '12px 30px', backgroundColor: '#0ea5e9' }}>
              + Agregar al Presupuesto
            </button>
          )}
        </div>
      </div>
    )
  }

  if (familiaSeleccionada) {
    return (
      <div className="app-wrapper">
        <UserHeader
          perfil={perfil}
          onVerHistorial={irAHistorial}
          onVerPerfil={() => setVistaPerfil(true)}
          onVerReporte={() => { setVistaReporte(true); setVistaHistorial(false); setVistaPerfil(false); setVistaCarrito(false); }}
          onLogout={handleLogout}
          itemsCount={itemsCarrito.length}
          onVerCarrito={() => setVistaCarrito(true)}
          isAdmin={perfil?.is_admin}
          onVerAdmin={irAAdmin}
        />
        <div className="page-header">
          <div>
            <button className="btn-secondary" style={{ marginBottom: '10px' }} onClick={() => setFamiliaSeleccionada(null)}>← Volver a Categorías</button>
            <h1>{familiaSeleccionada.nombre}</h1>
          </div>
        </div>
        <div className="grid-rubros">
          {familiaSeleccionada.rubros.map(rubro => (
            <button key={rubro.id} className="card-select" onClick={() => handleSeleccionarRubro(rubro)}>{rubro.nombre}</button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="app-wrapper">
      <UserHeader
        perfil={perfil}
        onVerHistorial={irAHistorial}
        onVerPerfil={() => setVistaPerfil(true)}
        onVerReporte={() => { setVistaReporte(true); setVistaHistorial(false); setVistaPerfil(false); setVistaCarrito(false); }}
        onLogout={handleLogout}
        itemsCount={itemsCarrito.length}
        onVerCarrito={() => setVistaCarrito(true)}
        isAdmin={perfil?.is_admin}
        onVerAdmin={irAAdmin}
      />

      <div className="page-header"><div><h1>Presupuestos Pro</h1><p>Seleccioná una categoría</p></div></div>
      <div className="grid-rubros">
        {familias.map(familia => (
          <button key={familia.id} className="card-select" onClick={() => setFamiliaSeleccionada(familia)}>{familia.nombre}</button>
        ))}
      </div>
    </div>
  )
}

export default App