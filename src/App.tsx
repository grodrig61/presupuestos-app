import { useEffect, useState, useMemo } from 'react'
import { supabase } from './lib/supabaseClient'
import { descargarPDF } from './lib/pdfGenerator'
import { formatNumber, formatearNombreMaterial, buscarPrecioCercano } from './lib/utils'
import { UserHeader } from './components/UserHeader'
import type { Rubro, Familia, Perfil, PresupuestoGuardado } from './types'
import './App.css'

function App() {
  const [session, setSession] = useState<any>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [email, setEmail] = useState('')
  const [mensajeAuth, setMensajeAuth] = useState('')

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

  const [cliente, setCliente] = useState({ nombre: '', domicilio: '' })
  const [trabajo, setTrabajo] = useState({ descripcion: '', tareas: '' })
  const [valores, setValores] = useState<Record<string, string>>({})
  const [gastosGenerales, setGastosGenerales] = useState<string>('')
  const [resultados, setResultados] = useState<Record<string, number> | null>(null)
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null)

  // ESTADO PARA EL CARTEL VERDE DE ÉXITO
  const [toastExito, setToastExito] = useState<string | null>(null)

  const [vistaHistorial, setVistaHistorial] = useState(false)
  const [vistaPerfil, setVistaPerfil] = useState(false)
  const [historial, setHistorial] = useState<PresupuestoGuardado[]>([])
  const [loadingHistorial, setLoadingHistorial] = useState(false)

  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroRubro, setFiltroRubro] = useState('')
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('')
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('')
  const [ordenHistorial, setOrdenHistorial] = useState('fecha-desc')

  // Detectamos si es celular para cambiar los textos de la UI
  const esCelular = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Efecto para que el cartel verde desaparezca solo a los 4 segundos
  useEffect(() => {
    if (toastExito) {
      const timer = setTimeout(() => setToastExito(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toastExito])

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

  const cargarPerfil = async (userId: string) => {
    const { data } = await supabase.from('perfiles').select('*').eq('id', userId).single()
    if (data) {
      setPerfil(data)
      setNombre(data.nombre || ''); setCuit(data.cuit || ''); setTelefono(data.telefono || ''); setMatricula(data.matricula || '');
    }
    setAuthLoading(false)
    cargarFamilias()
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
    setPerfil(null); setSession(null); setRubroSeleccionado(null); setFamiliaSeleccionada(null); setVistaHistorial(false); setVistaPerfil(false); setEmail(''); setMensajeAuth('')
  }

  const guardarPerfil = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardandoPerfil(true)
    setErrorValidacion(null)
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      if (!currentSession) throw new Error("No hay sesión activa.")

      let logoUrl = perfil?.logo_url || ''
      if (logoFile) {
        try {
          const fileExt = logoFile.name.split('.').pop()
          const fileName = `${currentSession.user.id}-${Date.now()}.${fileExt}`
          const { error: uploadError } = await supabase.storage.from('logos').upload(fileName, logoFile)
          if (!uploadError) {
            const { data } = supabase.storage.from('logos').getPublicUrl(fileName)
            logoUrl = data.publicUrl
          }
        } catch (imgError) { console.warn("Error Storage:", imgError); }
      }

      const { error: dbError } = await supabase.from('perfiles').upsert({
        id: currentSession.user.id, nombre, cuit, telefono, matricula, logo_url: logoUrl
      })
      if (dbError) throw dbError

      await cargarPerfil(currentSession.user.id)
      setVistaPerfil(false)
      setLogoFile(null)
    } catch (error: any) {
      setErrorValidacion("Error al guardar: " + error.message)
    } finally { setGuardandoPerfil(false) }
  }

  async function cargarFamilias() {
    const { data, error } = await supabase.from('configuracion').select('esquema').eq('id', 'esquema_global').single()
    if (!error && data?.esquema?.familias) setFamilias(data.esquema.familias)
    setLoadingData(false)
  }

  const handleSeleccionarRubro = async (rubro: Rubro) => {
    setRubroSeleccionado(rubro); setResultados(null); setGastosGenerales(''); setErrorValidacion(null); setValores({});
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

  const validarParaPDF = (): boolean => {
    if (!validarMedidas() || !rubroSeleccionado) return false;
    if (!cliente.nombre.trim()) { setErrorValidacion("Falta el nombre del cliente."); return false; }
    if (!trabajo.descripcion.trim()) { setErrorValidacion("Falta la descripción del trabajo."); return false; }
    let totalMateriales = 0;
    if (resultados) {
      Object.entries(resultados).forEach(([clave, cantidad]) => {
        const costoCercano = buscarPrecioCercano(clave, rubroSeleccionado.costos);
        let precio = costoCercano ? Number(valores[costoCercano.clave] || 0) : 0;
        totalMateriales += cantidad * precio;
      });
    }
    const montoGastos = Number(gastosGenerales) || 0;
    if (totalMateriales + montoGastos <= 0) { setErrorValidacion("El total es $0,00."); return false; }
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
    Object.keys(valores).forEach(key => {
      const num = Number(valores[key])
      nuevoContexto[key] = isNaN(num) || valores[key] === '' ? 0 : num
    })

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

  const generarPDF = async () => {
    if (!resultados || !rubroSeleccionado || !perfil) return
    if (!validarParaPDF()) return;

    if (session) {
      let totalMateriales = 0;
      Object.entries(resultados).forEach(([clave, cantidad]) => {
        const costoCercano = buscarPrecioCercano(clave, rubroSeleccionado.costos);
        let precio = costoCercano ? Number(valores[costoCercano.clave] || 0) : 0;
        totalMateriales += cantidad * precio;
      });
      const totalGeneral = totalMateriales + (Number(gastosGenerales) || 0);
      const familiaActual = familias.find(f => f.rubros.some(r => r.id === rubroSeleccionado.id));

      await supabase.from('presupuestos').insert({
        usuario_id: session.user.id, rubro_id: rubroSeleccionado.id, cliente_nombre: cliente.nombre,
        datos_entrada: { cliente, trabajo, valores, gastosGenerales, rubroNombre: rubroSeleccionado.nombre, familiaNombre: familiaActual?.nombre || 'Sin Categoría' },
        resultado_calculo: { resultados, totalGeneral }, total: totalGeneral
      });
    }

    // Llamamos a la función y le pasamos el callback para el cartel verde
    await descargarPDF(
      perfil, cliente, trabajo, resultados, valores, rubroSeleccionado, gastosGenerales,
      () => setToastExito("PDF descargado. Ahora abrí WhatsApp Web y adjuntalo.")
    );
  }

  const cargarHistorial = async () => {
    if (!session) return;
    setLoadingHistorial(true); setVistaHistorial(true); setVistaPerfil(false);
    const { data, error } = await supabase.from('presupuestos').select('*').eq('usuario_id', session.user.id).order('creado_en', { ascending: false });
    if (!error && data) setHistorial(data);
    setLoadingHistorial(false);
  }

  const descargarPDFDelHistorial = async (presupuesto: PresupuestoGuardado) => {
    if (!perfil) return;
    const { datos_entrada, resultado_calculo, rubro_id } = presupuesto;
    const familia = familias.find(f => f.rubros.some(r => r.id === rubro_id));
    const rubroOriginal = familia?.rubros.find(r => r.id === rubro_id);
    if (rubroOriginal) {
      await descargarPDF(
        perfil, datos_entrada.cliente, datos_entrada.trabajo, resultado_calculo.resultados, datos_entrada.valores, rubroOriginal, datos_entrada.gastosGenerales,
        () => setToastExito("PDF descargado. Ahora abrí WhatsApp Web y adjuntalo.")
      );
    }
  }

  const historialFiltrado = useMemo(() => {
    let filtrado = [...historial];
    if (filtroCliente) filtrado = filtrado.filter(p => p.cliente_nombre.toLowerCase().includes(filtroCliente.toLowerCase()));
    if (filtroCategoria) filtrado = filtrado.filter(p => (p.datos_entrada.familiaNombre || familias.find(f => f.rubros.some(r => r.id === p.rubro_id))?.nombre) === filtroCategoria);
    if (filtroRubro) filtrado = filtrado.filter(p => p.datos_entrada.rubroNombre === filtroRubro);
    if (filtroFechaDesde) filtrado = filtrado.filter(p => new Date(p.creado_en).getTime() >= new Date(filtroFechaDesde + 'T00:00:00').getTime());
    if (filtroFechaHasta) filtrado = filtrado.filter(p => new Date(p.creado_en).getTime() <= new Date(filtroFechaHasta + 'T23:59:59').getTime());

    filtrado.sort((a, b) => {
      switch (ordenHistorial) {
        case 'fecha-asc': return new Date(a.creado_en).getTime() - new Date(b.creado_en).getTime();
        case 'cliente-asc': return a.cliente_nombre.localeCompare(b.cliente_nombre);
        case 'cliente-desc': return b.cliente_nombre.localeCompare(a.cliente_nombre);
        default: return new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime();
      }
    });
    return filtrado;
  }, [historial, filtroCliente, filtroCategoria, filtroRubro, filtroFechaDesde, filtroFechaHasta, ordenHistorial, familias]);

  const rubrosDisponibles = useMemo(() => {
    if (!filtroCategoria) return [];
    const familia = familias.find(f => f.nombre === filtroCategoria);
    return familia ? familia.rubros.map(r => r.nombre) : [];
  }, [filtroCategoria, familias]);

  const limpiarFiltros = () => {
    setFiltroCliente(''); setFiltroCategoria(''); setFiltroRubro(''); setFiltroFechaDesde(''); setFiltroFechaHasta(''); setOrdenHistorial('fecha-desc');
  }

  // --- RENDERIZADO ---
  if (authLoading) return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando sistema...</div>

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

  if (!perfil || vistaPerfil) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ position: 'relative' }}>
          {errorValidacion && (
            <div className="error-banner" style={{ position: 'absolute', top: '-20px', right: '-20px' }}>
              <span>⚠️ {errorValidacion}</span>
              <button onClick={() => setErrorValidacion(null)}>✕</button>
            </div>
          )}
          <h2>{perfil ? 'Editar Perfil' : 'Completá tu Perfil'}</h2>
          <p>Estos datos aparecerán en tus presupuestos.</p>
          <form onSubmit={guardarPerfil}>
            <div className="input-group"><label>Nombre o Empresa *</label><input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required /></div>
            <div className="input-group"><label>CUIT</label><input type="text" value={cuit} onChange={e => setCuit(e.target.value)} /></div>
            <div className="input-group"><label>Teléfono</label><input type="text" value={telefono} onChange={e => setTelefono(e.target.value)} /></div>
            <div className="input-group"><label>Matrícula Profesional</label><input type="text" value={matricula} onChange={e => setMatricula(e.target.value)} /></div>
            <div className="input-group"><label>Logo (Dejar en blanco para mantener el actual)</label><input type="file" accept="image/png, image/jpeg" onChange={e => setLogoFile(e.target.files?.[0] || null)} /></div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button type="submit" className="btn btn-primary" disabled={guardandoPerfil}>
                {guardandoPerfil ? 'Guardando...' : 'Guardar Cambios'}
              </button>
              {perfil && (
                <button type="button" className="btn btn-secondary" onClick={() => setVistaPerfil(false)}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    )
  }

  if (loadingData) return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando datos...</div>

  // --- PANTALLA DE HISTORIAL ---
  if (vistaHistorial) {
    return (
      <div className="app-wrapper">
        {/* CARTEL VERDE DE ÉXITO */}
        {toastExito && (
          <div className="success-banner">
            <span>✅ {toastExito}</span>
            <button onClick={() => setToastExito(null)}>✕</button>
          </div>
        )}

        <UserHeader
          perfil={perfil}
          onVerHistorial={() => { }}
          onVerPerfil={() => { setVistaPerfil(true); setVistaHistorial(false); }}
          onLogout={handleLogout}
          mostrarBotonVolver={true}
          onVolver={() => setVistaHistorial(false)}
        />

        <div className="page-header"><div><h1>Mis Presupuestos</h1></div></div>

        <div className="panel" style={{ marginBottom: '20px', padding: '15px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'flex-end' }}>
            <div className="input-group" style={{ flex: '1 1 200px', marginBottom: 0 }}><label>Buscar Cliente</label><input type="text" placeholder="Nombre..." value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} /></div>
            <div className="input-group" style={{ flex: '1 1 150px', marginBottom: 0 }}>
              <label>Categoría</label>
              <select value={filtroCategoria} onChange={e => { setFiltroCategoria(e.target.value); setFiltroRubro(''); }}>
                <option value="">Todas</option>
                {familias.map(f => <option key={f.id} value={f.nombre}>{f.nombre}</option>)}
              </select>
            </div>
            <div className="input-group" style={{ flex: '1 1 150px', marginBottom: 0 }}>
              <label>Rubro</label>
              <select value={filtroRubro} onChange={e => setFiltroRubro(e.target.value)} disabled={!filtroCategoria}>
                <option value="">Todos</option>
                {rubrosDisponibles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="input-group" style={{ flex: '1 1 130px', marginBottom: 0 }}><label>Desde</label><input type="date" value={filtroFechaDesde} onChange={e => setFiltroFechaDesde(e.target.value)} /></div>
            <div className="input-group" style={{ flex: '1 1 130px', marginBottom: 0 }}><label>Hasta</label><input type="date" value={filtroFechaHasta} onChange={e => setFiltroFechaHasta(e.target.value)} /></div>
            <div className="input-group" style={{ flex: '1 1 150px', marginBottom: 0 }}>
              <label>Ordenar por</label>
              <select value={ordenHistorial} onChange={e => setOrdenHistorial(e.target.value)}>
                <option value="fecha-desc">Más nuevos primero</option>
                <option value="fecha-asc">Más antiguos primero</option>
                <option value="cliente-asc">Cliente (A-Z)</option>
                <option value="cliente-desc">Cliente (Z-A)</option>
              </select>
            </div>
            <button className="btn btn-secondary" onClick={limpiarFiltros} style={{ height: '38px', padding: '0 15px' }}>Limpiar</button>
          </div>
        </div>

        {loadingHistorial ? <p>Cargando...</p> : historialFiltrado.length === 0 ? <div className="empty-state" style={{ background: 'white', padding: '40px', borderRadius: '12px' }}>No hay presupuestos.</div> : (
          <div className="grid-rubros">
            {historialFiltrado.map(p => {
              const familia = familias.find(f => f.rubros.some(r => r.id === p.rubro_id));
              const nombreCategoria = p.datos_entrada.familiaNombre || familia?.nombre || 'Categoría';
              const nombreRubro = p.datos_entrada.rubroNombre || 'Rubro';
              const descripcion = p.datos_entrada.trabajo?.descripcion || 'Sin descripción';
              return (
                <div key={p.id} className="panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.85rem', color: 'var(--text-light)', fontWeight: 'bold' }}>
                    <span>{nombreCategoria} &gt; {nombreRubro}</span><span>{new Date(p.creado_en).toLocaleDateString('es-AR')}</span>
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <strong style={{ display: 'block', fontSize: '1.1rem', marginBottom: '4px' }}>Cliente: {p.cliente_nombre}</strong>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-light)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Desc: {descripcion}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                    <strong style={{ fontSize: '1.2rem', color: 'var(--primary)' }}>${formatNumber(p.total)}</strong>
                    <button className="btn btn-primary" onClick={() => descargarPDFDelHistorial(p)} style={{ width: 'auto', padding: '8px 12px' }}>{esCelular ? '📲 Compartir' : '📄 Descargar'}</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // --- PANTALLA DEL FORMULARIO ---
  if (rubroSeleccionado) {
    return (
      <div className="app-wrapper">
        {errorValidacion && (
          <div className="error-banner"><span>⚠️ {errorValidacion}</span><button onClick={() => setErrorValidacion(null)}>✕</button></div>
        )}

        {/* CARTEL VERDE DE ÉXITO */}
        {toastExito && (
          <div className="success-banner">
            <span>✅ {toastExito}</span>
            <button onClick={() => setToastExito(null)}>✕</button>
          </div>
        )}

        <UserHeader
          perfil={perfil}
          onVerHistorial={cargarHistorial}
          onVerPerfil={() => setVistaPerfil(true)}
          onLogout={handleLogout}
        />
        <div className="page-header">
          <div>
            <button className="btn-secondary" style={{ marginBottom: '10px' }} onClick={() => { setRubroSeleccionado(null); setResultados(null); setGastosGenerales(''); setErrorValidacion(null); }}>← Volver a rubros</button>
            <h1>{rubroSeleccionado.nombre}</h1>
          </div>
        </div>
        <div className="dashboard-grid">
          <div className="panel panel-cliente">
            <h3>1. Datos del Cliente</h3>
            <div className="input-group"><label>Nombre *</label><input type="text" value={cliente.nombre} onChange={e => { setCliente({ ...cliente, nombre: e.target.value }); setErrorValidacion(null); }} /></div>
            <div className="input-group"><label>Domicilio</label><input type="text" value={cliente.domicilio} onChange={e => setCliente({ ...cliente, domicilio: e.target.value })} /></div>
            <div className="input-group"><label>Descripción *</label><textarea rows={2} value={trabajo.descripcion} onChange={e => { setTrabajo({ ...trabajo, descripcion: e.target.value }); setErrorValidacion(null); }} /></div>
            <div className="input-group"><label>Tareas Detalladas</label><textarea rows={2} value={trabajo.tareas} onChange={e => setTrabajo({ ...trabajo, tareas: e.target.value })} /></div>
          </div>
          <div className="panel panel-medidas">
            <h3>2. Medidas</h3>
            {rubroSeleccionado.atributos.map(atributo => (
              <div key={atributo.clave} className="input-group">
                <label>{atributo.etiqueta.replace(/cano/gi, 'caño').replace(/tees/gi, 'uniones en T')} {atributo.requerido && '*'}</label>
                {atributo.tipo === 'numero' ? (
                  <input type="number" value={valores[atributo.clave] || ''} onChange={e => { handleInputChange(atributo.clave, e.target.value); setErrorValidacion(null); }} />
                ) : (
                  <select value={valores[atributo.clave] || ''} onChange={e => { handleInputChange(atributo.clave, e.target.value); setErrorValidacion(null); }}>
                    <option value="">Seleccioná...</option>
                    {atributo.opciones?.map(op => <option key={op} value={op}>{op}</option>)}
                  </select>
                )}
              </div>
            ))}
          </div>
          <div className="panel panel-precios">
            <h3>3. Precios</h3>
            {rubroSeleccionado.costos.map(costo => (
              <div key={costo.clave} className="input-group">
                <label>{costo.etiqueta.replace(/cano/gi, 'caño').replace(/tee/gi, 'unión en T').replace(/pote/gi, 'pegamento (pote)')}</label>
                <input type="number" value={valores[costo.clave] || ''} onChange={e => handleInputChange(costo.clave, e.target.value)} placeholder="$ 0.00" />
              </div>
            ))}
            <div className="input-group"><label>Gastos Generales</label><input type="number" value={gastosGenerales} onChange={e => setGastosGenerales(e.target.value)} placeholder="$ 0.00" /></div>
          </div>
          <div className="panel panel-resultados">
            <h3>4. Resultados</h3>
            <button className="btn btn-primary" onClick={calcularPresupuesto} style={{ marginBottom: '15px' }}>Calcular Totales</button>
            {resultados ? (
              <div>
                {Object.entries(resultados).map(([clave, valor]) => (
                  <div key={clave} className="resultado-item"><span>{formatearNombreMaterial(clave)}</span><strong>{formatNumber(valor)}</strong></div>
                ))}
              </div>
            ) : <div className="empty-state">Completá los datos y presioná "Calcular".</div>}
          </div>
        </div>
        {resultados && (
          <div className="pdf-action-container">
            {/* TEXTO DINÁMICO SEGÚN EL DISPOSITIVO */}
            <button className="btn btn-success" style={{ width: '100%' }} onClick={generarPDF}>
              {esCelular ? '📲 Generar y Compartir' : '📄 Descargar PDF'}
            </button>
          </div>
        )}
      </div>
    )
  }

  if (familiaSeleccionada) {
    return (
      <div className="app-wrapper">
        {toastExito && (
          <div className="success-banner">
            <span>✅ {toastExito}</span>
            <button onClick={() => setToastExito(null)}>✕</button>
          </div>
        )}
        <UserHeader
          perfil={perfil}
          onVerHistorial={cargarHistorial}
          onVerPerfil={() => setVistaPerfil(true)}
          onLogout={handleLogout}
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
      {toastExito && (
        <div className="success-banner">
          <span>✅ {toastExito}</span>
          <button onClick={() => setToastExito(null)}>✕</button>
        </div>
      )}
      <UserHeader
        perfil={perfil}
        onVerHistorial={cargarHistorial}
        onVerPerfil={() => setVistaPerfil(true)}
        onLogout={handleLogout}
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