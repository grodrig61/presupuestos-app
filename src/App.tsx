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
  const [vistaCarrito, setVistaCarrito] = useState(false) // Para ver el carrito antes de generar el PDF

  // --- ESTADOS DEL CARRITO (Lo que hace la app un sistema de obras) ---
  const [itemsCarrito, setItemsCarrito] = useState<ItemCarrito[]>([])
  const [edicionId, setEdicionId] = useState<string | null>(null) // Para saber si estamos editando

  // --- ESTADOS DEL FORMULARIO DEL CLIENTE ---
  const [cliente, setCliente] = useState({ nombre: '', domicilio: '', telefono: '' })
  const [trabajo, setTrabajo] = useState({ descripcion: '', tareas: '' })
  const [gastosGenerales, setGastosGenerales] = useState<string>('')
  const [vigenciaDias, setVigenciaDias] = useState<string>('15')

  // --- ESTADOS DEL BUSCADOR DE CLIENTES ---
  const [clientesGuardados, setClientesGuardados] = useState<Cliente[]>([])
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false)

  // --- ESTADOS DEL RUBRO ACTUAL (Se resetean al agregar al carrito) ---
  const [valores, setValores] = useState<Record<string, string>>({})
  const [resultados, setResultados] = useState<Record<string, number> | null>(null)
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null)
  const [toastExito, setToastExito] = useState<string | null>(null)

  // --- ESTADOS DEL HISTORIAL ---
  const [historial, setHistorial] = useState<PresupuestoGuardado[]>([])
  const [loadingHistorial, setLoadingHistorial] = useState(false)
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
<<<<<<< HEAD
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('')
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('')
  const [ordenHistorial, setOrdenHistorial] = useState('fecha-desc')

  // --- Estados para los Popovers (Menús flotantes) ---
  const [menuEstadoAbierto, setMenuEstadoAbierto] = useState<string | null>(null) // Para las tarjetas (el ID del presupuesto)
  const [menuFiltroAbierto, setMenuFiltroAbierto] = useState<string | null>(null) // Para la barra de filtros ('estado', 'categoria', 'rubro', 'orden')
=======
>>>>>>> f91b008f877ac287b782a2043b8da848a8a190f6

  const esCelular = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

  // ==========================================================================
  // 2. EFECTOS
  // ==========================================================================
  useEffect(() => {
    if (toastExito) {
      const timer = setTimeout(() => setToastExito(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toastExito])

<<<<<<< HEAD
  // Cerrar menús al hacer clic afuera
  useEffect(() => {
    const cerrarMenus = () => {
      setMenuEstadoAbierto(null)
      setMenuFiltroAbierto(null)
    }
    document.addEventListener('click', cerrarMenus)
    return () => document.removeEventListener('click', cerrarMenus)
  }, [])

=======
>>>>>>> f91b008f877ac287b782a2043b8da848a8a190f6
  // Verificación de sesión
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
  }

  // Carga la libreta de clientes para el autocompletado
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
    setPerfil(null); setSession(null); setRubroSeleccionado(null); setFamiliaSeleccionada(null); setVistaHistorial(false); setVistaPerfil(false); setVistaReporte(false); setVistaCarrito(false); setEmail(''); setMensajeAuth('')
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

<<<<<<< HEAD
      const { error: dbError } = await supabase.from('perfiles').upsert({
        id: currentSession.user.id, nombre, cuit, telefono, matricula, logo_url: logoUrl
      })
      if (dbError) throw dbError

=======
      await supabase.from('perfiles').upsert({ id: currentSession.user.id, nombre, cuit, telefono, matricula, logo_url: logoUrl })
>>>>>>> f91b008f877ac287b782a2043b8da848a8a190f6
      await cargarPerfil(currentSession.user.id)
      setVistaPerfil(false)
      setLogoFile(null)
    } catch (error: any) {
      setErrorValidacion("Error al guardar: " + error.message)
    } finally { setGuardandoPerfil(false) }
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
<<<<<<< HEAD
      const preciosGuardados: Record<string, string> = {}
      data.forEach(item => { preciosGuardados[item.clave_atributo] = item.valor.toString() })
      setValores(prev => ({ ...prev, ...preciosGuardados }))
=======
      const preciosGuardados: Record<string, string> = {};
      data.forEach(item => { preciosGuardados[item.clave_atributo] = item.valor.toString(); });
      setValores(prev => ({ ...prev, ...preciosGuardados }));
>>>>>>> f91b008f877ac287b782a2043b8da848a8a190f6
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
<<<<<<< HEAD
    return true
  }

  const validarParaPDF = (): boolean => {
    if (!validarMedidas() || !rubroSeleccionado) return false
    if (!cliente.nombre.trim()) { setErrorValidacion("Falta el nombre del cliente."); return false }
    if (!trabajo.descripcion.trim()) { setErrorValidacion("Falta la descripción del trabajo."); return false }

    let totalMateriales = 0
    if (resultados) {
      Object.entries(resultados).forEach(([clave, cantidad]) => {
        const costoCercano = buscarPrecioCercano(clave, rubroSeleccionado.costos)
        let precio = costoCercano ? Number(valores[costoCercano.clave] || 0) : 0
        totalMateriales += cantidad * precio
      })
    }
    const montoGastos = Number(gastosGenerales) || 0
    if (totalMateriales + montoGastos <= 0) { setErrorValidacion("El total es $0,00."); return false }
    return true
=======
    return true;
>>>>>>> f91b008f877ac287b782a2043b8da848a8a190f6
  }

  const calcularPresupuesto = async () => {
    if (!validarMedidas() || !rubroSeleccionado) return;

    // Guardamos los precios en memoria para el usuario
    if (session) {
      try {
        const preciosAGuardar = rubroSeleccionado.costos.map(costo => {
<<<<<<< HEAD
          const numValor = Number(valores[costo.clave])
          return { usuario_id: session.user.id, rubro_id: rubroSeleccionado.id, clave_atributo: costo.clave, valor: isNaN(numValor) ? 0 : numValor, unidad: costo.unidad }
        }).filter(p => p.valor > 0)

        if (preciosAGuardar.length > 0) {
          await supabase.from('precios_usuario').upsert(preciosAGuardar, { onConflict: 'usuario_id, rubro_id, clave_atributo' })
        }
      } catch (err) { console.error("No se guardaron precios", err) }
=======
          const numValor = Number(valores[costo.clave]);
          return { usuario_id: session.user.id, rubro_id: rubroSeleccionado.id, clave_atributo: costo.clave, valor: isNaN(numValor) ? 0 : numValor, unidad: costo.unidad };
        }).filter(p => p.valor > 0);
        if (preciosAGuardar.length > 0) await supabase.from('precios_usuario').upsert(preciosAGuardar, { onConflict: 'usuario_id, rubro_id, clave_atributo' });
      } catch (err) { console.error("No se guardaron precios", err); }
>>>>>>> f91b008f877ac287b782a2043b8da848a8a190f6
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

  // Agrega el rubro actual al carrito
  const agregarAlCarrito = () => {
    if (!resultados || !rubroSeleccionado) return;
    const nuevoItem: ItemCarrito = { rubro: rubroSeleccionado, valores: { ...valores }, resultados: { ...resultados } };
    setItemsCarrito(prev => [...prev, nuevoItem]);
    setToastExito(`${rubroSeleccionado.nombre} agregado al presupuesto.`);

    // Resetear el formulario del rubro
    setRubroSeleccionado(null); setResultados(null); setValores({});
  }

  // Eliminar un ítem del carrito
  const eliminarDelCarrito = (index: number) => {
    setItemsCarrito(prev => prev.filter((_, i) => i !== index));
  }

  // Autocompletar cliente
  const handleClienteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setCliente(prev => ({ ...prev, nombre: valor }));
    if (valor.length > 1) {
      setMostrarSugerencias(true);
    } else {
      setMostrarSugerencias(false);
    }
  }

  const seleccionarCliente = (c: Cliente) => {
    setCliente({ nombre: c.nombre, domicilio: c.domicilio, telefono: c.telefono || '' });
    setMostrarSugerencias(false);
  }

  // ==========================================================================
  // 6. GENERACIÓN DE PDF Y GUARDADO (El momento de la verdad)
  // ==========================================================================
  const generarPDFFinal = async () => {
    if (!perfil || itemsCarrito.length === 0) return;
    if (!cliente.nombre.trim()) { setErrorValidacion("Falta el nombre del cliente."); return; }

    const numVigencia = Number(vigenciaDias) || 15;

    // Calcular total
    let totalGeneral = 0;
    itemsCarrito.forEach(item => {
      Object.entries(item.resultados).forEach(([clave, cantidad]) => {
        const costo = buscarPrecioCercano(clave, item.rubro.costos);
        totalGeneral += (Number(item.valores[costo?.clave || ''] || 0) * cantidad);
      });
    });
    totalGeneral += Number(gastosGenerales) || 0;

    if (session) {
<<<<<<< HEAD
      let totalMateriales = 0
      Object.entries(resultados).forEach(([clave, cantidad]) => {
        const costoCercano = buscarPrecioCercano(clave, rubroSeleccionado.costos)
        let precio = costoCercano ? Number(valores[costoCercano.clave] || 0) : 0
        totalMateriales += cantidad * precio
      })
      const totalGeneral = totalMateriales + (Number(gastosGenerales) || 0)
      const familiaActual = familias.find(f => f.rubros.some(r => r.id === rubroSeleccionado.id))

      await supabase.from('presupuestos').insert({
        usuario_id: session.user.id, rubro_id: rubroSeleccionado.id, cliente_nombre: cliente.nombre,
        datos_entrada: { cliente, trabajo, valores, gastosGenerales, vigenciaDias: numVigencia, rubroNombre: rubroSeleccionado.nombre, familiaNombre: familiaActual?.nombre || 'Sin Categoría' },
        resultado_calculo: { resultados, totalGeneral }, total: totalGeneral, estado: 'pendiente'
      })
    }

    await descargarPDF(
      perfil, cliente, trabajo, resultados, valores, rubroSeleccionado, gastosGenerales,
      numVigencia, new Date().toISOString(),
=======
      const datosInsert = {
        usuario_id: session.user.id,
        rubro_id: itemsCarrito[0].rubro.id, // Guardamos el ID del primer rubro por compatibilidad
        cliente_nombre: cliente.nombre,
        datos_entrada: {
          cliente,
          trabajo,
          items: itemsCarrito, // <--- ACÁ GUARDAMOS EL CARRITO COMPLETO
          gastosGenerales,
          vigenciaDias: numVigencia
        },
        resultado_calculo: { totalGeneral },
        total: totalGeneral,
        estado: 'pendiente'
      };

      if (edicionId) {
        // MODO EDICIÓN: Actualizamos el registro existente
        await supabase.from('presupuestos').update(datosInsert).eq('id', edicionId);
      } else {
        // MODO NUEVO: Insertamos
        await supabase.from('presupuestos').insert(datosInsert);
      }

      // Guardar/Actualizar Cliente en la Base de Datos
      if (cliente.nombre.trim()) {
        await supabase.from('clientes').upsert(
          { usuario_id: session.user.id, nombre: cliente.nombre, telefono: cliente.telefono, domicilio: cliente.domicilio },
          { onConflict: 'usuario_id, nombre' }
        );
      }
    }

    await descargarPDF(
      perfil, cliente, trabajo, itemsCarrito, gastosGenerales, numVigencia, new Date().toISOString(),
>>>>>>> f91b008f877ac287b782a2043b8da848a8a190f6
      () => setToastExito("PDF descargado. Ahora abrí WhatsApp Web y adjuntalo.")
    );

    // Limpiar todo después de generar
    setItemsCarrito([]); setEdicionId(null); setCliente({ nombre: '', telefono: '', domicilio: '' }); setTrabajo({ descripcion: '', tareas: '' });
    setGastosGenerales(''); setVistaCarrito(false); setVistaHistorial(false);
  }

  // ==========================================================================
  // 7. LÓGICA DEL HISTORIAL
  // ==========================================================================
  const irAHistorial = async () => {
    if (!session) return
<<<<<<< HEAD
    setLoadingHistorial(true); setVistaHistorial(true); setVistaPerfil(false); setVistaReporte(false)

    const { data, error } = await supabase
      .from('presupuestos').select('*').eq('usuario_id', session.user.id).order('creado_en', { ascending: false })

    if (!error && data) setHistorial(data)
    setLoadingHistorial(false)
  }

  const irAReporte = async () => {
    if (!session) return
    setVistaReporte(true); setVistaHistorial(false); setVistaPerfil(false)

    if (historial.length === 0) {
      setLoadingData(true)
      const { data, error } = await supabase.from('presupuestos').select('*').eq('usuario_id', session.user.id).order('creado_en', { ascending: false })
      if (!error && data) setHistorial(data)
      setLoadingData(false)
    }
  }

  const descargarPDFDelHistorial = async (presupuesto: PresupuestoGuardado) => {
    if (!perfil) return
    const { datos_entrada, resultado_calculo, rubro_id, creado_en } = presupuesto
    const familia = familias.find(f => f.rubros.some(r => r.id === rubro_id))
    const rubroOriginal = familia?.rubros.find(r => r.id === rubro_id)

    if (rubroOriginal) {
      const vigencia = datos_entrada.vigenciaDias || 15
      await descargarPDF(
        perfil, datos_entrada.cliente, datos_entrada.trabajo, resultado_calculo.resultados, datos_entrada.valores, rubroOriginal, datos_entrada.gastosGenerales,
        vigencia, creado_en,
        () => setToastExito("PDF descargado. Ahora abrí WhatsApp Web y adjuntalo.")
      )
    }
  }

  const duplicarPresupuesto = (presupuesto: PresupuestoGuardado) => {
    const { datos_entrada, resultado_calculo, rubro_id } = presupuesto
    const familia = familias.find(f => f.rubros.some(r => r.id === rubro_id))
    const rubroOriginal = familia?.rubros.find(r => r.id === rubro_id)

    if (rubroOriginal) {
      setRubroSeleccionado(rubroOriginal); setCliente(datos_entrada.cliente); setTrabajo(datos_entrada.trabajo)
      setValores(datos_entrada.valores); setGastosGenerales(datos_entrada.gastosGenerales || '')
      setVigenciaDias(datos_entrada.vigenciaDias ? datos_entrada.vigenciaDias.toString() : '15')
      setResultados(resultado_calculo.resultados)

      setVistaHistorial(false); setVistaReporte(false); setErrorValidacion(null)
      setToastExito("Datos cargados. Modificá lo necesario y generá el nuevo PDF.")
    }
=======
    setLoadingHistorial(true); setVistaHistorial(true); setVistaPerfil(false); setVistaReporte(false); setVistaCarrito(false);
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
>>>>>>> f91b008f877ac287b782a2043b8da848a8a190f6
  }

  const actualizarEstado = async (id: string, nuevoEstado: string) => {
    setHistorial(prev => prev.map(p => p.id === id ? { ...p, estado: nuevoEstado as any } : p));
    await supabase.from('presupuestos').update({ estado: nuevoEstado }).eq('id', id);
  }

  // Filtro básico del historial
  const historialFiltrado = useMemo(() => {
<<<<<<< HEAD
    let filtrado = [...historial]

    if (filtroCliente) {
      filtrado = filtrado.filter(p => p.cliente_nombre.toLowerCase().includes(filtroCliente.toLowerCase()))
    }
    if (filtroCategoria) {
      filtrado = filtrado.filter(p => (p.datos_entrada.familiaNombre || familias.find(f => f.rubros.some(r => r.id === p.rubro_id))?.nombre) === filtroCategoria)
    }
    if (filtroRubro) {
      filtrado = filtrado.filter(p => p.datos_entrada.rubroNombre === filtroRubro)
    }
    if (filtroEstado) {
      filtrado = filtrado.filter(p => p.estado === filtroEstado)
    }
    if (filtroFechaDesde) {
      filtrado = filtrado.filter(p => new Date(p.creado_en).getTime() >= new Date(filtroFechaDesde + 'T00:00:00').getTime())
    }
    if (filtroFechaHasta) {
      filtrado = filtrado.filter(p => new Date(p.creado_en).getTime() <= new Date(filtroFechaHasta + 'T23:59:59').getTime())
    }

    filtrado.sort((a, b) => {
      switch (ordenHistorial) {
        case 'fecha-asc': return new Date(a.creado_en).getTime() - new Date(b.creado_en).getTime()
        case 'cliente-asc': return a.cliente_nombre.localeCompare(b.cliente_nombre)
        case 'cliente-desc': return b.cliente_nombre.localeCompare(a.cliente_nombre)
        default: return new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime()
      }
    })
    return filtrado
  }, [historial, filtroCliente, filtroCategoria, filtroRubro, filtroEstado, filtroFechaDesde, filtroFechaHasta, ordenHistorial, familias])

  const rubrosDisponibles = useMemo(() => {
    if (!filtroCategoria) return []
    const familia = familias.find(f => f.nombre === filtroCategoria)
    return familia ? familia.rubros.map(r => r.nombre) : []
  }, [filtroCategoria, familias])

  const limpiarFiltros = () => {
    setFiltroCliente(''); setFiltroCategoria(''); setFiltroRubro(''); setFiltroEstado(''); setFiltroFechaDesde(''); setFiltroFechaHasta(''); setOrdenHistorial('fecha-desc')
  }
=======
    let filtrado = [...historial];
    if (filtroCliente) filtrado = filtrado.filter(p => p.cliente_nombre.toLowerCase().includes(filtroCliente.toLowerCase()));
    if (filtroEstado) filtrado = filtrado.filter(p => p.estado === filtroEstado);
    return filtrado;
  }, [historial, filtroCliente, filtroEstado]);
>>>>>>> f91b008f877ac287b782a2043b8da848a8a190f6

  // ==========================================================================
  // 8. RENDERIZADO
  // ==========================================================================
  if (authLoading) return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando sistema...</div>

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
<<<<<<< HEAD
              <button type="submit" className="btn btn-primary" disabled={guardandoPerfil}>
                {guardandoPerfil ? 'Guardando...' : 'Guardar Cambios'}
              </button>
=======
              <button type="submit" className="btn btn-primary" disabled={guardandoPerfil}>{guardandoPerfil ? 'Guardando...' : 'Guardar Cambios'}</button>
>>>>>>> f91b008f877ac287b782a2043b8da848a8a190f6
              {perfil && <button type="button" className="btn btn-secondary" onClick={() => setVistaPerfil(false)}>Cancelar</button>}
            </div>
          </form>
        </div>
      </div>
    )
  }

  if (loadingData) return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando datos...</div>

  if (vistaReporte) {
    return (
      <div className="app-wrapper">
<<<<<<< HEAD
        <UserHeader
          perfil={perfil}
          onVerHistorial={irAHistorial}
          onVerPerfil={() => { setVistaPerfil(true); setVistaReporte(false); }}
          onVerReporte={() => { }}
          onLogout={handleLogout}
          mostrarBotonVolver={true}
          onVolver={() => setVistaReporte(false)}
        />
        <div className="page-header"><div><h1>Resumen de Gestión</h1><p>Visualizá el rendimiento de tu negocio</p></div></div>
=======
        <UserHeader perfil={perfil} onVerHistorial={irAHistorial} onVerPerfil={() => { setVistaPerfil(true); setVistaReporte(false); }} onVerReporte={() => { }} onLogout={handleLogout} mostrarBotonVolver={true} onVolver={() => setVistaReporte(false)} />
        <div className="page-header"><div><h1>Resumen de Gestión</h1></div></div>
>>>>>>> f91b008f877ac287b782a2043b8da848a8a190f6
        <ReporteGestion historial={historial} familias={familias} />
      </div>
    )
  }

  // PANTALLA 3: EL CARRITO (Resumen antes de PDF)
  if (vistaCarrito) {
    return (
      <div className="app-wrapper">
        {toastExito && <div className="success-banner"><span>✅ {toastExito}</span><button onClick={() => setToastExito(null)}>✕</button></div>}
        {errorValidacion && <div className="error-banner"><span>⚠️ {errorValidacion}</span><button onClick={() => setErrorValidacion(null)}>✕</button></div>}

        <UserHeader perfil={perfil} onVerHistorial={irAHistorial} onVerPerfil={() => setVistaPerfil(true)} onVerReporte={() => { }} onLogout={handleLogout} mostrarBotonVolver={true} onVolver={() => { setVistaCarrito(false); setEdicionId(null); setItemsCarrito([]); }} />

<<<<<<< HEAD
        <div className="page-header"><div><h1>Mis Presupuestos</h1></div></div>

        {/* BARRA DE FILTROS */}
        <div className="panel" style={{ marginBottom: '20px', padding: '15px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'flex-end' }}>
            <div className="input-group" style={{ flex: '1 1 150px', marginBottom: 0 }}>
              <label>Buscar Cliente</label>
              <input type="text" placeholder="Nombre..." value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} />
            </div>

            {/* FILTRO DE ESTADO */}
            <div className="contenedor-popover" style={{ flex: '1 1 130px', marginBottom: 0 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-light)', marginBottom: '4px', display: 'block' }}>Estado</label>
              <button
                className="btn-filtro"
                onClick={(e) => { e.stopPropagation(); setMenuFiltroAbierto(menuFiltroAbierto === 'estado' ? null : 'estado'); }}
              >
                <span>{filtroEstado ? (filtroEstado === 'aprobado' ? 'Aprobados' : filtroEstado === 'rechazado' ? 'Rechazados' : 'Pendientes') : 'Todos'}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
              </button>
              {menuFiltroAbierto === 'estado' && (
                <div className="menu-filtro">
                  <button onClick={() => { setFiltroEstado(''); setMenuFiltroAbierto(null); }}>Todos</button>
                  <button onClick={() => { setFiltroEstado('pendiente'); setMenuFiltroAbierto(null); }}>Pendientes</button>
                  <button onClick={() => { setFiltroEstado('aprobado'); setMenuFiltroAbierto(null); }}>Aprobados</button>
                  <button onClick={() => { setFiltroEstado('rechazado'); setMenuFiltroAbierto(null); }}>Rechazados</button>
                </div>
              )}
            </div>

            {/* FILTRO DE CATEGORÍA */}
            <div className="contenedor-popover" style={{ flex: '1 1 130px', marginBottom: 0 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-light)', marginBottom: '4px', display: 'block' }}>Categoría</label>
              <button
                className="btn-filtro"
                onClick={(e) => { e.stopPropagation(); setMenuFiltroAbierto(menuFiltroAbierto === 'categoria' ? null : 'categoria'); }}
              >
                <span>{filtroCategoria || 'Todas'}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
              </button>
              {menuFiltroAbierto === 'categoria' && (
                <div className="menu-filtro">
                  <button onClick={() => { setFiltroCategoria(''); setFiltroRubro(''); setMenuFiltroAbierto(null); }}>Todas</button>
                  {familias.map(f => (
                    <button key={f.id} onClick={() => { setFiltroCategoria(f.nombre); setFiltroRubro(''); setMenuFiltroAbierto(null); }}>{f.nombre}</button>
                  ))}
                </div>
              )}
            </div>

            {/* FILTRO DE RUBRO */}
            <div className="contenedor-popover" style={{ flex: '1 1 130px', marginBottom: 0 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-light)', marginBottom: '4px', display: 'block' }}>Rubro</label>
              <button
                className="btn-filtro" disabled={!filtroCategoria}
                onClick={(e) => { e.stopPropagation(); setMenuFiltroAbierto(menuFiltroAbierto === 'rubro' ? null : 'rubro'); }}
              >
                <span>{filtroRubro || 'Todos'}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
              </button>
              {menuFiltroAbierto === 'rubro' && filtroCategoria && (
                <div className="menu-filtro">
                  <button onClick={() => { setFiltroRubro(''); setMenuFiltroAbierto(null); }}>Todos</button>
                  {rubrosDisponibles.map(r => (
                    <button key={r} onClick={() => { setFiltroRubro(r); setMenuFiltroAbierto(null); }}>{r}</button>
                  ))}
                </div>
              )}
            </div>

            <div className="input-group" style={{ flex: '1 1 110px', marginBottom: 0 }}><label>Desde</label><input type="date" value={filtroFechaDesde} onChange={e => setFiltroFechaDesde(e.target.value)} /></div>
            <div className="input-group" style={{ flex: '1 1 110px', marginBottom: 0 }}><label>Hasta</label><input type="date" value={filtroFechaHasta} onChange={e => setFiltroFechaHasta(e.target.value)} /></div>

            {/* FILTRO DE ORDEN */}
            <div className="contenedor-popover" style={{ flex: '1 1 150px', marginBottom: 0 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-light)', marginBottom: '4px', display: 'block' }}>Ordenar por</label>
              <button
                className="btn-filtro"
                onClick={(e) => { e.stopPropagation(); setMenuFiltroAbierto(menuFiltroAbierto === 'orden' ? null : 'orden'); }}
              >
                <span>
                  {ordenHistorial === 'fecha-asc' ? 'Más antiguos' : ordenHistorial === 'cliente-asc' ? 'Cliente (A-Z)' : ordenHistorial === 'cliente-desc' ? 'Cliente (Z-A)' : 'Más nuevos'}
                </span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
              </button>
              {menuFiltroAbierto === 'orden' && (
                <div className="menu-filtro">
                  <button onClick={() => { setOrdenHistorial('fecha-desc'); setMenuFiltroAbierto(null); }}>Más nuevos primero</button>
                  <button onClick={() => { setOrdenHistorial('fecha-asc'); setMenuFiltroAbierto(null); }}>Más antiguos primero</button>
                  <button onClick={() => { setOrdenHistorial('cliente-asc'); setMenuFiltroAbierto(null); }}>Cliente (A-Z)</button>
                  <button onClick={() => { setOrdenHistorial('cliente-desc'); setMenuFiltroAbierto(null); }}>Cliente (Z-A)</button>
                </div>
              )}
            </div>

            <button className="btn btn-secondary" onClick={limpiarFiltros} style={{ height: '38px', padding: '0 15px' }}>Limpiar</button>
          </div>
        </div>

        {/* LISTA DE TARJETAS */}
        {loadingHistorial ? <p>Cargando...</p> : historialFiltrado.length === 0 ? <div className="empty-state" style={{ background: 'white', padding: '40px', borderRadius: '12px' }}>No hay presupuestos.</div> : (
          <div className="grid-rubros">
            {historialFiltrado.map(p => {
              const familia = familias.find(f => f.rubros.some(r => r.id === p.rubro_id));
              const nombreCategoria = p.datos_entrada.familiaNombre || familia?.nombre || 'Categoría';
              const nombreRubro = p.datos_entrada.rubroNombre || 'Rubro';
              const descripcion = p.datos_entrada.trabajo?.descripcion || 'Sin descripción';
              return (
                <div key={p.id} className="panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
=======
        <div className="page-header">
          <div>
            <h1>{edicionId ? 'Editando Presupuesto' : 'Armar Presupuesto de Obra'}</h1>
            <p>Revisá los ítems antes de generar el PDF.</p>
          </div>
        </div>

        <div className="dashboard-grid">
          {/* PANEL 1: DATOS DEL CLIENTE CON AUTOCOMPLETADO */}
          <div className="panel panel-cliente" style={{ position: 'relative' }}>
            <h3>1. Datos del Cliente</h3>
            <div className="input-group">
              <label>Nombre (escribí para buscar) *</label>
              <input type="text" value={cliente.nombre} onChange={handleClienteChange} placeholder="Ej: Juan Pérez" autoComplete="off" />
              {/* Lista de sugerencias */}
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
>>>>>>> f91b008f877ac287b782a2043b8da848a8a190f6

            <div className="input-group"><label>Descripción General</label><textarea rows={2} value={trabajo.descripcion} onChange={e => setTrabajo({ ...trabajo, descripcion: e.target.value })} placeholder="Ej: Refacción integral de baño..." /></div>
            <div className="input-group"><label>Vigencia (Días)</label><input type="number" value={vigenciaDias} onChange={e => setVigenciaDias(e.target.value)} /></div>
          </div>

<<<<<<< HEAD
                  <div style={{ marginBottom: '15px' }}>
                    <strong style={{ display: 'block', fontSize: '1.1rem', marginBottom: '4px' }}>Cliente: {p.cliente_nombre}</strong>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-light)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Desc: {descripcion}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', gap: '10px', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '1.2rem', color: 'var(--primary)' }}>${formatNumber(p.total)}</strong>

                    <div className="acciones-tarjeta">
                      <div className="contenedor-popover">
                        <button
                          className={`btn-estado ${p.estado || 'pendiente'}`}
                          onClick={(e) => { e.stopPropagation(); setMenuEstadoAbierto(menuEstadoAbierto === p.id ? null : p.id); }}
                        >
                          <span className={`dot-color dot-${p.estado || 'pendiente'}`}></span>
                          {p.estado === 'aprobado' ? 'Aprobado' : p.estado === 'rechazado' ? 'Rechazado' : 'Pendiente'}
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                        </button>
                        {menuEstadoAbierto === p.id && (
                          <div className="menu-estado">
                            <button onClick={(e) => { e.stopPropagation(); actualizarEstado(p.id, 'pendiente'); }}><span className="dot-color dot-pendiente"></span> Pendiente</button>
                            <button onClick={(e) => { e.stopPropagation(); actualizarEstado(p.id, 'aprobado'); }}><span className="dot-color dot-aprobado"></span> Aprobado</button>
                            <button onClick={(e) => { e.stopPropagation(); actualizarEstado(p.id, 'rechazado'); }}><span className="dot-color dot-rechazado"></span> Rechazado</button>
                          </div>
                        )}
                      </div>

                      <button className="btn-icono" onClick={() => duplicarPresupuesto(p)} title="Duplicar Presupuesto">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                      </button>

                      <button className="btn-descarga" onClick={() => descargarPDFDelHistorial(p)}>
                        {esCelular ? (
                          <><svg viewBox="0 0 24 24"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" x2="12" y1="2" y2="15" /></svg>Compartir</>
                        ) : (
                          <><svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>PDF</>
                        )}
                      </button>
=======
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
>>>>>>> f91b008f877ac287b782a2043b8da848a8a190f6
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

  // PANTALLA 4: HISTORIAL CON MINI-CRM
  if (vistaHistorial) {
    return (
      <div className="app-wrapper">
        <UserHeader perfil={perfil} onVerHistorial={() => { }} onVerPerfil={() => { setVistaPerfil(true); setVistaHistorial(false); }} onVerReporte={() => { setVistaReporte(true); setVistaHistorial(false); }} onLogout={handleLogout} mostrarBotonVolver={true} onVolver={() => setVistaHistorial(false)} />

        <div className="page-header">
          <div><h1>Mis Presupuestos</h1></div>
          <button className="btn btn-primary" onClick={() => { setItemsCarrito([]); setEdicionId(null); setVistaCarrito(true); }} style={{ width: 'auto' }}>
            + Nuevo Presupuesto
          </button>
        </div>

        {/* BARRA DE FILTROS SIMPLE */}
        <div className="panel panel-filtros">
          <div style={{ display: 'flex', gap: '15px' }}>
            <div className="input-group" style={{ flex: 1, marginBottom: 0 }}><label>Buscar Cliente</label><input type="text" placeholder="Nombre..." value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} /></div>
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

        {/* TARJETAS */}
        {historialFiltrado.map(p => {
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
        })}
      </div>
    )
  }

  // PANTALLA 5: FORMULARIO DE RUBRO
  if (rubroSeleccionado) {
    return (
      <div className="app-wrapper">
        {errorValidacion && <div className="error-banner"><span>⚠️ {errorValidacion}</span><button onClick={() => setErrorValidacion(null)}>✕</button></div>}
        {toastExito && <div className="success-banner"><span>✅ {toastExito}</span><button onClick={() => setToastExito(null)}>✕</button></div>}

<<<<<<< HEAD
        <UserHeader
          perfil={perfil} onVerHistorial={irAHistorial} onVerPerfil={() => setVistaPerfil(true)} onVerReporte={irAReporte} onLogout={handleLogout}
        />
=======
        <UserHeader perfil={perfil} onVerHistorial={irAHistorial} onVerPerfil={() => setVistaPerfil(true)} onVerReporte={() => { }} onLogout={handleLogout} />
>>>>>>> f91b008f877ac287b782a2043b8da848a8a190f6
        <div className="page-header">
          <div>
            <button className="btn-secondary" style={{ marginBottom: '10px' }} onClick={() => { setRubroSeleccionado(null); setResultados(null); setValores({}); }}>← Volver a rubros</button>
            <h1>{rubroSeleccionado.nombre}</h1>
          </div>
        </div>

        <div className="dashboard-grid">
<<<<<<< HEAD
          <div className="panel panel-cliente">
            <h3>1. Datos del Cliente</h3>
            <div className="input-group"><label>Nombre *</label><input type="text" value={cliente.nombre} onChange={e => { setCliente({ ...cliente, nombre: e.target.value }); setErrorValidacion(null); }} /></div>
            <div className="input-group"><label>Domicilio</label><input type="text" value={cliente.domicilio} onChange={e => setCliente({ ...cliente, domicilio: e.target.value })} /></div>
            <div className="input-group"><label>Vigencia del Presupuesto (Días)</label><input type="number" value={vigenciaDias} onChange={e => setVigenciaDias(e.target.value)} placeholder="Ej: 15" /></div>
            <div className="input-group"><label>Descripción *</label><textarea rows={2} value={trabajo.descripcion} onChange={e => { setTrabajo({ ...trabajo, descripcion: e.target.value }); setErrorValidacion(null); }} /></div>
            <div className="input-group"><label>Tareas Detalladas</label><textarea rows={2} value={trabajo.tareas} onChange={e => setTrabajo({ ...trabajo, tareas: e.target.value })} /></div>
          </div>

=======
>>>>>>> f91b008f877ac287b782a2043b8da848a8a190f6
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
<<<<<<< HEAD
        {toastExito && <div className="success-banner"><span>✅ {toastExito}</span><button onClick={() => setToastExito(null)}>✕</button></div>}
        <UserHeader
          perfil={perfil} onVerHistorial={irAHistorial} onVerPerfil={() => setVistaPerfil(true)} onVerReporte={irAReporte} onLogout={handleLogout}
        />
=======
        <UserHeader perfil={perfil} onVerHistorial={irAHistorial} onVerPerfil={() => setVistaPerfil(true)} onVerReporte={() => { }} onLogout={handleLogout} />
>>>>>>> f91b008f877ac287b782a2043b8da848a8a190f6
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

  // PANTALLA 7: HOME
  return (
    <div className="app-wrapper">
<<<<<<< HEAD
      {toastExito && <div className="success-banner"><span>✅ {toastExito}</span><button onClick={() => setToastExito(null)}>✕</button></div>}
      <UserHeader
        perfil={perfil} onVerHistorial={irAHistorial} onVerPerfil={() => setVistaPerfil(true)} onVerReporte={irAReporte} onLogout={handleLogout}
      />
=======
      <UserHeader perfil={perfil} onVerHistorial={irAHistorial} onVerPerfil={() => setVistaPerfil(true)} onVerReporte={() => { }} onLogout={handleLogout} />

      {/* Si hay items en el carrito, mostramos un aviso flotante para ir a pagar */}
      {itemsCarrito.length > 0 && (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 999 }}>
          <button className="btn btn-primary" onClick={() => setVistaCarrito(true)} style={{ padding: '15px 25px', borderRadius: '30px', boxShadow: '0 4px 12px rgba(37,99,235,0.4)' }}>
            🛒 Ver Presupuesto ({itemsCarrito.length} ítems)
          </button>
        </div>
      )}

>>>>>>> f91b008f877ac287b782a2043b8da848a8a190f6
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