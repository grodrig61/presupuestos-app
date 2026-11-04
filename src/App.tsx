// ============================================================================
// COMPONENTE PRINCIPAL DE LA APLICACIÓN (App.tsx)
// ============================================================================

import { useEffect, useState, useMemo } from 'react'
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

  // --- Estados de Autenticación ---
  const [session, setSession] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [mensajeAuth, setMensajeAuth] = useState('')

  // --- Estados del Perfil del Profesional ---
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [nombre, setNombre] = useState('')
  const [cuit, setCuit] = useState('')
  const [telefono, setTelefono] = useState('')
  const [matricula, setMatricula] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [guardandoPerfil, setGuardandoPerfil] = useState(false)

  // --- Estados de los Datos de la App (Familias y Rubros) ---
  const [familias, setFamilias] = useState<Familia[]>([])
  const [familiaSeleccionada, setFamiliaSeleccionada] = useState<Familia | null>(null)
  const [rubroSeleccionado, setRubroSeleccionado] = useState<Rubro | null>(null)
  const [loadingData, setLoadingData] = useState(true)

  // --- Estados de Navegación (Vistas) ---
  const [vistaHistorial, setVistaHistorial] = useState(false)
  const [vistaPerfil, setVistaPerfil] = useState(false)
  const [vistaReporte, setVistaReporte] = useState(false)
  const [vistaCarrito, setVistaCarrito] = useState(false)

  // --- Estados del Carrito (Puro estado de React, sin localStorage) ---
  const [itemsCarrito, setItemsCarrito] = useState<ItemCarrito[]>([])
  const [edicionId, setEdicionId] = useState<string | null>(null) // ID del presupuesto que estamos editando

  // --- Estados del Formulario del Cliente ---
  const [cliente, setCliente] = useState({ nombre: '', domicilio: '', telefono: '' })
  const [trabajo, setTrabajo] = useState({ descripcion: '', tareas: '' })
  const [gastosGenerales, setGastosGenerales] = useState<string>('')
  const [vigenciaDias, setVigenciaDias] = useState<string>('15')

  // --- Estados del Buscador de Clientes (Autocompletado) ---
  const [clientesGuardados, setClientesGuardados] = useState<Cliente[]>([])
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false)

  // --- Estados del Rubro Actual (Se resetean al agregar al carrito) ---
  const [valores, setValores] = useState<Record<string, string>>({})
  const [resultados, setResultados] = useState<Record<string, number> | null>(null)
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null)
  const [toastExito, setToastExito] = useState<string | null>(null)

  // --- Estados del Historial de Presupuestos ---
  const [historial, setHistorial] = useState<PresupuestoGuardado[]>([])
  const [loadingHistorial, setLoadingHistorial] = useState(false)
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')

  // ==========================================================================
  // 2. EFECTOS
  // ==========================================================================

  // Efecto para ocultar el cartel de éxito (Toast) después de 4 segundos
  useEffect(() => {
    if (toastExito) {
      const timer = setTimeout(() => setToastExito(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toastExito])

  // Efecto para cerrar la lista de sugerencias de clientes si hacemos clic fuera
  useEffect(() => {
    const handleClickOutside = () => setMostrarSugerencias(false)
    document.addEventListener("click", handleClickOutside)
    return () => document.removeEventListener("click", handleClickOutside)
  }, [])

  // Efecto principal de Autenticación (Verifica si hay sesión activa)
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

  // Carga los datos del perfil desde Supabase y luego carga familias y clientes
  const cargarPerfil = async (userId: string) => {
    const { data } = await supabase.from('perfiles').select('*').eq('id', userId).single()
    if (data) {
      setPerfil(data)
      setNombre(data.nombre || '')
      setCuit(data.cuit || '')
      setTelefono(data.telefono || '')
      setMatricula(data.matricula || '')
    }
    setAuthLoading(false)
    cargarFamilias()
    cargarClientes(userId)
  }

  // Carga la libreta de clientes para el autocompletado
  const cargarClientes = async (userId: string) => {
    const { data } = await supabase.from('clientes').select('*').eq('usuario_id', userId)
    if (data) setClientesGuardados(data)
  }

  // Maneja el inicio de sesión con enlace mágico (Magic Link)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setMensajeAuth('Enviando enlace...')
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) setMensajeAuth(`Error: ${error.message}`)
    else setMensajeAuth('¡Revisá tu correo! Te enviamos un enlace mágico para ingresar.')
  }

  // Cierra la sesión y limpia todos los estados
  const handleLogout = async () => {
    await supabase.auth.signOut()
    setPerfil(null); setSession(null); setRubroSeleccionado(null); setFamiliaSeleccionada(null);
    setVistaHistorial(false); setVistaPerfil(false); setVistaReporte(false); setVistaCarrito(false);
    setEmail(''); setMensajeAuth('')
  }

  // Guarda o actualiza el perfil del profesional (incluye subida de logo)
  const guardarPerfil = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardandoPerfil(true)
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      if (!currentSession) throw new Error("No hay sesión activa.")

      let logoUrl = perfil?.logo_url || ''

      // Si el usuario subió un nuevo logo, lo guardamos en Supabase Storage
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop()
        const fileName = `${currentSession.user.id}-${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage.from('logos').upload(fileName, logoFile)
        if (!uploadError) {
          const { data } = await supabase.storage.from('logos').getPublicUrl(fileName)
          logoUrl = data.publicUrl
        }
      }

      // Guardamos los datos en la tabla 'perfiles'
      await supabase.from('perfiles').upsert({ id: currentSession.user.id, nombre, cuit, telefono, matricula, logo_url: logoUrl })
      await cargarPerfil(currentSession.user.id)
      setVistaPerfil(false)
      setLogoFile(null)
    } catch (error: any) {
      setErrorValidacion("Error al guardar: " + error.message)
    } finally {
      setGuardandoPerfil(false)
    }
  }

  // ==========================================================================
  // 4. FUNCIONES DE LA APP Y CÁLCULOS
  // ==========================================================================

  // Carga las familias y rubros desde la tabla 'configuracion'
  async function cargarFamilias() {
    const { data, error } = await supabase.from('configuracion').select('esquema').eq('id', 'esquema_global').single()
    if (!error && data?.esquema?.familias) setFamilias(data.esquema.familias)
    setLoadingData(false)
  }

  // Se ejecuta al hacer clic en un rubro. Prepara el formulario y busca precios guardados.
  const handleSeleccionarRubro = async (rubro: Rubro) => {
    setRubroSeleccionado(rubro); setResultados(null); setValores({}); setErrorValidacion(null);
    if (!session) return;

    // Buscamos si el usuario ya había guardado precios para este rubro
    const { data, error } = await supabase.from('precios_usuario').select('clave_atributo, valor').eq('usuario_id', session.user.id).eq('rubro_id', rubro.id);
    if (!error && data) {
      const preciosGuardados: Record<string, string> = {};
      data.forEach(item => { preciosGuardados[item.clave_atributo] = item.valor.toString(); });
      setValores(prev => ({ ...prev, ...preciosGuardados }));
    }
  }

  // Actualiza el estado de los inputs del formulario de rubro
  const handleInputChange = (clave: string, valor: string) => {
    setValores(prev => ({ ...prev, [clave]: valor }))
  }

  // Valida que los campos requeridos (ej: medidas) estén completos
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

  // Ejecuta las fórmulas matemáticas del rubro para calcular los materiales
  const calcularPresupuesto = async () => {
    if (!validarMedidas() || !rubroSeleccionado) return;

    // Guardamos los precios que ingresó el usuario en Supabase para la próxima vez
    if (session) {
      try {
        const preciosAGuardar = rubroSeleccionado.costos.map(costo => {
          const numValor = Number(valores[costo.clave]);
          return { usuario_id: session.user.id, rubro_id: rubroSeleccionado.id, clave_atributo: costo.clave, valor: isNaN(numValor) ? 0 : numValor, unidad: costo.unidad };
        }).filter(p => p.valor > 0);
        if (preciosAGuardar.length > 0) await supabase.from('precios_usuario').upsert(preciosAGuardar, { onConflict: 'usuario_id, rubro_id, clave_atributo' });
      } catch (err) { console.error("No se guardaron precios", err); }
    }

    // Preparamos el contexto para evaluar las fórmulas (las variables que usan las fórmulas)
    const nuevoContexto: Record<string, any> = {}
    Object.keys(valores).forEach(key => { nuevoContexto[key] = Number(valores[key]) || 0 })
    const resultadosCalculados: Record<string, number> = {}

    // Evaluamos cada fórmula del rubro
    Object.entries(rubroSeleccionado.formulas).forEach(([claveResultado, formula]) => {
      try {
        const formulaSegura = formula.replace(/ceil\(/g, 'Math.ceil(')
        const fn = new Function(...Object.keys(nuevoContexto), `return ${formulaSegura}`)
        const resultado = fn(...Object.values(nuevoContexto))
        const resultadoFinal = typeof resultado === 'number' ? Number(resultado.toFixed(2)) : resultado
        resultadosCalculados[claveResultado] = resultadoFinal
        nuevoContexto[claveResultado] = resultadoFinal // Guardamos el resultado para que pueda ser usado por otras fórmulas
      } catch (error) { console.error(error) }
    })

    setResultados(resultadosCalculados); setErrorValidacion(null);
  }

  // ==========================================================================
  // 5. LÓGICA DEL CARRITO Y CLIENTES
  // ==========================================================================

  // Agrega el rubro actual (con sus resultados) al carrito
  const agregarAlCarrito = () => {
    if (!resultados || !rubroSeleccionado) return;

    const nuevoItem: ItemCarrito = {
      rubro: rubroSeleccionado,
      valores: { ...valores },
      resultados: { ...resultados }
    };

    // Usamos la función de actualización (prev) para garantizar que se acumulen y no se sobreescriban
    setItemsCarrito(prev => [...prev, nuevoItem]);
    setToastExito(`${rubroSeleccionado.nombre} agregado al presupuesto.`);

    // Reseteamos el rubro actual para volver a la pantalla anterior
    setRubroSeleccionado(null);
    setResultados(null);
    setValores({});
  }

  // Elimina un ítem específico del carrito por su índice
  const eliminarDelCarrito = (index: number) => {
    setItemsCarrito(prev => prev.filter((_, i) => i !== index));
  }

  // Maneja el cambio en el input de búsqueda de cliente (activar sugerencias)
  const handleClienteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setCliente(prev => ({ ...prev, nombre: valor }));
    if (valor.length > 1) {
      setMostrarSugerencias(true);
    } else {
      setMostrarSugerencias(false);
    }
  }

  // Autocompleta los datos cuando se selecciona un cliente de la lista
  const seleccionarCliente = (c: Cliente) => {
    setCliente({ nombre: c.nombre, domicilio: c.domicilio, telefono: c.telefono || '' });
    setMostrarSugerencias(false);
  }

  // ==========================================================================
  // 6. GENERACIÓN DE PDF Y GUARDADO EN BASE DE DATOS
  // ==========================================================================
  const generarPDFFinal = async () => {
    if (!perfil || itemsCarrito.length === 0) return;
    if (!cliente.nombre.trim()) { setErrorValidacion("Falta el nombre del cliente."); return; }

    const numVigencia = Number(vigenciaDias) || 15;

    // Calcular el total general de forma segura (Evita errores de NaN)
    let totalGeneral = 0;
    itemsCarrito.forEach(item => {
      Object.entries(item.resultados).forEach(([clave, cantidad]) => {
        const costo = buscarPrecioCercano(clave, item.rubro.costos);
        const precioUnitario = costo ? Number(item.valores[costo.clave] || 0) : 0;
        totalGeneral += (precioUnitario * Number(cantidad));
      });
    });
    totalGeneral += Number(gastosGenerales) || 0;

    // Guardamos en Supabase si el usuario está logueado
    if (session) {
      const datosInsert = {
        usuario_id: session.user.id,
        rubro_id: itemsCarrito[0].rubro.id, // Guardamos el ID del primer rubro por compatibilidad
        cliente_nombre: cliente.nombre,
        datos_entrada: {
          cliente,
          trabajo,
          items: itemsCarrito, // Guardamos el carrito completo con todos los rubros
          gastosGenerales,
          vigenciaDias: numVigencia
        },
        resultado_calculo: { totalGeneral },
        total: totalGeneral,
        estado: 'pendiente' // Por defecto, todo nuevo presupuesto está pendiente
      };

      // Si hay un edicionId, actualizamos. Si no, insertamos uno nuevo.
      if (edicionId) {
        await supabase.from('presupuestos').update(datosInsert).eq('id', edicionId);
      } else {
        await supabase.from('presupuestos').insert(datosInsert);
      }

      // Guardamos o actualizamos el cliente en la base de datos para el autocompletado futuro
      if (cliente.nombre.trim()) {
        await supabase.from('clientes').upsert(
          { usuario_id: session.user.id, nombre: cliente.nombre, telefono: cliente.telefono, domicilio: cliente.domicilio },
          { onConflict: 'usuario_id, nombre' }
        );
      }
    }

    // Llamamos a la función que dibuja el PDF
    await descargarPDF(
      perfil, cliente, trabajo, itemsCarrito, gastosGenerales, numVigencia, new Date().toISOString(),
      () => setToastExito("PDF descargado. Ahora abrí WhatsApp Web y adjuntalo.")
    );

    // Limpiamos todo DESPUÉS de generar el PDF exitosamente
    setItemsCarrito([]);
    setEdicionId(null);
    setCliente({ nombre: '', telefono: '', domicilio: '' });
    setTrabajo({ descripcion: '', tareas: '' });
    setGastosGenerales('');
    setVistaCarrito(false);
    setVistaHistorial(false);
  }

  // ==========================================================================
  // 7. LÓGICA DEL HISTORIAL Y MINI-CRM
  // ==========================================================================

  // Carga el historial de presupuestos desde Supabase
  const irAHistorial = async () => {
    if (!session) return
    setLoadingHistorial(true); setVistaHistorial(true); setVistaPerfil(false); setVistaReporte(false); setVistaCarrito(false);
    const { data, error } = await supabase.from('presupuestos').select('*').eq('usuario_id', session.user.id).order('creado_en', { ascending: false });
    if (!error && data) setHistorial(data);
    setLoadingHistorial(false)
  }

  // Carga un presupuesto guardado en el carrito para poder editarlo
  const editarPresupuesto = (p: PresupuestoGuardado) => {
    setEdicionId(p.id);
    // Usamos optional chaining (?.) por si el presupuesto es viejo y no tiene estos datos
    setCliente(p.datos_entrada?.cliente || { nombre: '', domicilio: '', telefono: '' });
    setTrabajo(p.datos_entrada?.trabajo || { descripcion: '', tareas: '' });
    setGastosGenerales(p.datos_entrada?.gastosGenerales || '');
    setVigenciaDias(p.datos_entrada?.vigenciaDias ? p.datos_entrada.vigenciaDias.toString() : '15');
    setItemsCarrito(p.datos_entrada?.items || []); // Cargamos todos los ítems que tenía
    setVistaHistorial(false);
    setVistaCarrito(true);
  }

  // Actualiza el estado de un presupuesto (Aprobado, Rechazado, Pendiente)
  const actualizarEstado = async (id: string, nuevoEstado: string) => {
    // Actualizamos la UI primero para que se sienta rápido
    setHistorial(prev => prev.map(p => p.id === id ? { ...p, estado: nuevoEstado as any } : p));
    // Luego actualizamos en la base de datos
    await supabase.from('presupuestos').update({ estado: nuevoEstado }).eq('id', id);
  }

  // Filtra el historial según los inputs de búsqueda del usuario
  const historialFiltrado = useMemo(() => {
    let filtrado = [...historial];
    if (filtroCliente) filtrado = filtrado.filter(p => p.cliente_nombre.toLowerCase().includes(filtroCliente.toLowerCase()));
    if (filtroEstado) filtrado = filtrado.filter(p => p.estado === filtroEstado);
    return filtrado;
  }, [historial, filtroCliente, filtroEstado]);

  // ==========================================================================
  // 8. RENDERIZADO DE LAS PANTALLAS
  // ==========================================================================

  // --- PANTALLA DE CARGA INICIAL ---
  if (authLoading) return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando sistema...</div>

  // --- PANTALLA DE LOGIN ---
  if (!session) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>Bienvenido a Presupuestos Pro</h2>
          <p>Ingresá tu email para recibir un enlace de acceso seguro.</p>
          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label>Correo Electrónico</label>
              <input type="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }}>Enviar Enlace Mágico</button>
          </form>
          {mensajeAuth && <p style={{ marginTop: '15px', color: mensajeAuth.includes('Error') ? 'red' : 'green', fontWeight: 'bold' }}>{mensajeAuth}</p>}
        </div>
      </div>
    )
  }

  // --- PANTALLA DE PERFIL (Completar o Editar) ---
  if (!perfil || vistaPerfil) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ position: 'relative' }}>
          {errorValidacion && <div className="error-banner" style={{ position: 'absolute', top: '-20px', right: '-20px' }}><span>⚠️ {errorValidacion}</span><button onClick={() => setErrorValidacion(null)}>✕</button></div>}
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
        </div>
      </div>
    )
  }

  // --- PANTALLA DE CARGA DE DATOS (Familias) ---
  if (loadingData) return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando datos...</div>

  // --- PANTALLA DE REPORTE DE GESTIÓN ---
  if (vistaReporte) {
    return (
      <div className="app-wrapper">
        <UserHeader
          perfil={perfil}
          onVerHistorial={irAHistorial}
          onVerPerfil={() => { setVistaPerfil(true); setVistaReporte(false); }}
          onVerReporte={() => { }}
          onLogout={handleLogout}
          mostrarBotonVolver={true}
          onVolver={() => setVistaReporte(false)}
          itemsCount={itemsCarrito.length}
          onVerCarrito={() => setVistaCarrito(true)}
        />
        <div className="page-header"><div><h1>Resumen de Gestión</h1></div></div>
        <ReporteGestion historial={historial} familias={familias} />
      </div>
    )
  }

  // --- PANTALLA DEL CARRITO (RESUMEN ANTES DEL PDF) ---
  if (vistaCarrito) {
    return (
      <div className="app-wrapper">
        {toastExito && <div className="success-banner"><span>✅ {toastExito}</span><button onClick={() => setToastExito(null)}>✕</button></div>}
        {errorValidacion && <div className="error-banner"><span>⚠️ {errorValidacion}</span><button onClick={() => setErrorValidacion(null)}>✕</button></div>}

        {/* IMPORTANTE: El botón Volver acá NO vacía el carrito, solo cambia de vista */}
        <UserHeader
          perfil={perfil}
          onVerHistorial={irAHistorial}
          onVerPerfil={() => setVistaPerfil(true)}
          onVerReporte={() => { setVistaReporte(true); setVistaCarrito(false); }}
          onLogout={handleLogout}
          mostrarBotonVolver={true}
          onVolver={() => setVistaCarrito(false)}
          itemsCount={itemsCarrito.length}
          onVerCarrito={() => setVistaCarrito(true)}
        />

        <div className="page-header">
          <div>
            <h1>{edicionId ? 'Editando Presupuesto' : 'Armar Presupuesto de Obra'}</h1>
            <p>Revisá los ítems antes de generar el PDF.</p>
          </div>
          {/* Botón para vaciar el carrito manualmente si el usuario quiere arrancar de cero */}
          {itemsCarrito.length > 0 && (
            <button className="btn btn-secondary" style={{ color: 'red', borderColor: 'red' }} onClick={() => { if (confirm('¿Seguro que querés vaciar el presupuesto?')) setItemsCarrito([]) }}>
              🗑️ Vaciar Carrito
            </button>
          )}
        </div>

        <div className="dashboard-grid">
          {/* PANEL 1: DATOS DEL CLIENTE CON AUTOCOMPLETADO */}
          <div className="panel panel-cliente" style={{ position: 'relative' }}>
            <h3>1. Datos del Cliente</h3>
            <div className="input-group">
              <label>Nombre (escribí para buscar) *</label>
              <input
                type="text"
                value={cliente.nombre}
                onChange={handleClienteChange}
                onClick={(e) => e.stopPropagation()} // Evita que se cierre la lista al hacer clic en el input
                placeholder="Ej: Juan Pérez"
                autoComplete="off"
              />
              {/* Lista de sugerencias flotante */}
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

          {/* PANEL 2: LISTA DEL CARRITO */}
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
                    {/* Mostramos los resultados calculados de este rubro */}
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

        {/* BOTÓN DE GENERAR PDF FINAL */}
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

  // --- PANTALLA DEL HISTORIAL CON MINI-CRM ---
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
        />

        <div className="page-header">
          <div><h1>Mis Presupuestos</h1></div>
          <button className="btn btn-primary" onClick={() => { setItemsCarrito([]); setEdicionId(null); setVistaCarrito(true); }} style={{ width: 'auto' }}>
            + Nuevo Presupuesto
          </button>
        </div>

        {/* BARRA DE FILTROS */}
        <div className="panel panel-filtros">
          <div style={{ display: 'flex', gap: '15px' }}>
            <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
              <label>Buscar Cliente</label>
              <input type="text" placeholder="Nombre..." value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} />
            </div>
            <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
              <label>Estado</label>
              <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
                <option value="">Todos</option>
                <option value="pendiente">Pendientes</option>
                <option value="aprobado">Aprobados</option>
                <option value="rechazado">Rechazados</option>
              </select>
            </div>
          </div>
        </div>

        {/* LISTADO DE TARJETAS */}
        {loadingHistorial ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-light)' }}>Cargando historial...</div>
        ) : (
          historialFiltrado.map(p => {
            const fechaCreacion = new Date(p.creado_en);
            const hoy = new Date();
            const diasDiferencia = Math.floor((hoy.getTime() - fechaCreacion.getTime()) / (1000 * 3600 * 24));
            const esViejo = p.estado === 'pendiente' && diasDiferencia >= 15;

            return (
              <div key={p.id} className="panel" style={{ padding: '20px', marginBottom: '15px', borderTop: esViejo ? '4px solid #f97316' : undefined }}>
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
          })
        )}
      </div>
    )
  }

  // --- PANTALLA DE FORMULARIO DE RUBRO (MEDIDAS Y PRECIOS) ---
  if (rubroSeleccionado) {
    return (
      <div className="app-wrapper">
        {errorValidacion && <div className="error-banner"><span>⚠️ {errorValidacion}</span><button onClick={() => setErrorValidacion(null)}>✕</button></div>}
        {toastExito && <div className="success-banner"><span>✅ {toastExito}</span><button onClick={() => setToastExito(null)}>✕</button></div>}

        <UserHeader
          perfil={perfil}
          onVerHistorial={irAHistorial}
          onVerPerfil={() => setVistaPerfil(true)}
          onVerReporte={() => { setVistaReporte(true); }}
          onLogout={handleLogout}
          itemsCount={itemsCarrito.length}
          onVerCarrito={() => setVistaCarrito(true)}
        />

        <div className="page-header">
          <div>
            <button className="btn-secondary" style={{ marginBottom: '10px' }} onClick={() => { setRubroSeleccionado(null); setResultados(null); setValores({}); }}>← Volver a rubros</button>
            <h1>{rubroSeleccionado.nombre}</h1>
          </div>
        </div>

        <div className="dashboard-grid">
          {/* Panel de Atributos/Medidas */}
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

          {/* Panel de Precios */}
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

        {/* Botones de Acción del Rubro */}
        <div className="pdf-action-container" style={{ maxWidth: '100%', display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '30px' }}>
          <button type="button" className="btn btn-primary" onClick={calcularPresupuesto} style={{ width: 'auto', padding: '12px 30px' }}>
            Calcular Materiales
          </button>

          {/* El botón de agregar solo aparece si ya se calcularon los materiales */}
          {resultados && (
            <button type="button" className="btn btn-success" onClick={agregarAlCarrito} style={{ width: 'auto', padding: '12px 30px', backgroundColor: '#0ea5e9' }}>
              + Agregar al Presupuesto
            </button>
          )}
        </div>
      </div>
    )
  }

  // --- PANTALLA DE SELECCIÓN DE RUBROS DENTRO DE UNA FAMILIA ---
  if (familiaSeleccionada) {
    return (
      <div className="app-wrapper">
        <UserHeader
          perfil={perfil}
          onVerHistorial={irAHistorial}
          onVerPerfil={() => setVistaPerfil(true)}
          onVerReporte={() => { setVistaReporte(true); }}
          onLogout={handleLogout}
          itemsCount={itemsCarrito.length}
          onVerCarrito={() => setVistaCarrito(true)}
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

  // --- PANTALLA HOME (SELECCIÓN DE FAMILIAS) ---
  return (
    <div className="app-wrapper">
      <UserHeader
        perfil={perfil}
        onVerHistorial={irAHistorial}
        onVerPerfil={() => setVistaPerfil(true)}
        onVerReporte={() => { setVistaReporte(true); }}
        onLogout={handleLogout}
        itemsCount={itemsCarrito.length}
        onVerCarrito={() => setVistaCarrito(true)}
      />

      <div className="page-header">
        <div>
          <h1>Presupuestos Pro</h1>
          <p>Seleccioná una categoría</p>
        </div>
      </div>

      <div className="grid-rubros">
        {familias.map(familia => (
          <button key={familia.id} className="card-select" onClick={() => setFamiliaSeleccionada(familia)}>
            {familia.nombre}
          </button>
        ))}
      </div>
    </div>
  )
}

export default App