// ============================================================================
// GENERADOR DE PDF - OBRAFÁCIL
// Este archivo se encarga de tomar todos los datos del presupuesto, dibujar
// el documento PDF usando la librería pdf-lib, y luego compartirlo o descargarlo.
// ============================================================================

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { formatNumber, formatearNombreMaterial, buscarPrecioCercano } from './utils'

export const descargarPDF = async (
    // 1. Datos del profesional
    perfilData: any,

    // 2. Datos del cliente
    clienteData: any,

    // 3. Datos del trabajo
    trabajoData: any,

    // 4. Resultados matemáticos
    resultadosData: any,

    // 5. Valores ingresados
    valoresData: any,

    // 6. Rubro seleccionado
    rubroData: any,

    // 7. Gastos generales
    gastos: string,

    // 8. Días de validez
    vigenciaDias: number,

    // 9. Fecha de creación (para calcular el vencimiento)
    fechaCreacionOriginal: string,

    // 10. Función para mostrar el cartel verde de descarga
    onMostrarToast: () => void
) => {

    // --- INICIALIZACIÓN DEL DOCUMENTO ---
    // Creamos un nuevo documento PDF
    const pdfDoc = await PDFDocument.create()

    // Agregamos una página en formato A4 (595 x 842 puntos)
    const page = pdfDoc.addPage([595, 842])

    // Cargamos las fuentes estándar
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    // Obtenemos las dimensiones de la página
    const { height, width } = page.getSize()

    // Eje Y inicial (arriba de todo, con un margen de 50 puntos)
    let y = height - 50

    // Márgenes laterales
    const marginLeft = 40
    const marginRight = width - 40

    // ==========================================================================
    // 1. DIBUJAR EL LOGO (CON PROTECCIÓN DE TAMAÑO)
    // ==========================================================================
    if (perfilData.logo_url) {
        try {
            // Descargamos la imagen desde Supabase Storage
            const response = await fetch(perfilData.logo_url)
            if (response.ok) {
                const logoArrayBuffer = await response.arrayBuffer()
                const logoImage = await pdfDoc.embedPng(logoArrayBuffer)

                // Limitamos el logo a un máximo de 65x65 puntos para que no tape el texto.
                const maxLogoSize = 65
                const originalDims = logoImage.scale(1) // Tamaño original
                const scaleFactor = Math.min(
                    maxLogoSize / originalDims.width,
                    maxLogoSize / originalDims.height
                )
                const logoDims = logoImage.scale(scaleFactor)

                // Dibujamos el logo en la esquina superior izquierda
                page.drawImage(logoImage, {
                    x: marginLeft,
                    y: y - logoDims.height,
                    width: logoDims.width,
                    height: logoDims.height
                })
            }
        } catch (e) {
            console.log('Error cargando logo', e)
        }
    }

    // ==========================================================================
    // 2. ENCABEZADO (TÍTULO, FECHA Y VIGENCIA)
    // ==========================================================================

    // Título alineado a la derecha
    const titulo = 'PRESUPUESTO DE OBRA'
    const tituloWidth = fontBold.widthOfTextAtSize(titulo, 18)
    page.drawText(titulo, {
        x: marginRight - tituloWidth,
        y: y,
        size: 18,
        font: fontBold,
        color: rgb(0.11, 0.22, 0.54) // Azul oscuro
    })

    // Cálculo de fechas
    const fechaBase = new Date(fechaCreacionOriginal)
    const fechaStr = fechaBase.toLocaleDateString('es-AR')

    const fechaVencimiento = new Date(fechaBase)
    fechaVencimiento.setDate(fechaVencimiento.getDate() + vigenciaDias)
    const fechaVencimientoStr = fechaVencimiento.toLocaleDateString('es-AR')

    // Fecha (debajo del título)
    const fechaWidth = font.widthOfTextAtSize(`Fecha: ${fechaStr}`, 9)
    page.drawText(`Fecha: ${fechaStr}`, {
        x: marginRight - fechaWidth,
        y: y - 15,
        size: 9,
        font: font,
        color: rgb(0.4, 0.4, 0.4) // Gris
    })

    // Vigencia (en rojo, debajo de la fecha)
    const vigenciaText = `Válido hasta: ${fechaVencimientoStr}`
    const vigenciaWidth = fontBold.widthOfTextAtSize(vigenciaText, 9)
    page.drawText(vigenciaText, {
        x: marginRight - vigenciaWidth,
        y: y - 28,
        size: 9,
        font: fontBold,
        color: rgb(0.8, 0.2, 0.2) // Rojo
    })

    // ==========================================================================
    // 3. DATOS DEL PROFESIONAL (Subidos 10px para compactar el diseño)
    // ==========================================================================

    // Nombre de la empresa. Lo subimos a y - 75 para acercarlo al logo.
    const nombreEmpresa = perfilData.nombre || 'Profesional Independiente'
    page.drawText(nombreEmpresa, {
        x: marginLeft,
        y: y - 75,
        size: 14,
        font: fontBold
    })

    // CUIT y Teléfono
    page.drawText(`CUIT: ${perfilData.cuit || '-'} | Tel: ${perfilData.telefono || '-'}`, {
        x: marginLeft,
        y: y - 90,
        size: 9,
        font: font,
        color: rgb(0.4, 0.4, 0.4)
    })

    // Matrícula (si existe)
    if (perfilData.matricula) {
        page.drawText(`Matrícula: ${perfilData.matricula}`, {
            x: marginLeft,
            y: y - 102,
            size: 9,
            font: font,
            color: rgb(0.4, 0.4, 0.4)
        })
    }

    // Línea divisoria horizontal (subida a y - 120)
    y -= 120
    page.drawLine({
        start: { x: marginLeft, y: y },
        end: { x: marginRight, y: y },
        thickness: 1,
        color: rgb(0.85, 0.85, 0.85)
    })

    y -= 25

    // ==========================================================================
    // 4. DATOS DEL CLIENTE
    // ==========================================================================

    page.drawText('DATOS DEL CLIENTE', {
        x: marginLeft,
        y: y,
        size: 10,
        font: fontBold,
        color: rgb(0.11, 0.22, 0.54)
    })

    y -= 15
    page.drawText(`Nombre: ${clienteData.nombre || '-'}`, {
        x: marginLeft,
        y: y,
        size: 9,
        font: font
    })

    page.drawText(`Domicilio: ${clienteData.domicilio || '-'}`, {
        x: marginLeft,
        y: y - 12,
        size: 9,
        font: font
    })

    y -= 35

    // ==========================================================================
    // 5. DESCRIPCIÓN DEL TRABAJO
    // ==========================================================================

    page.drawText('DESCRIPCIÓN DEL TRABAJO', {
        x: marginLeft,
        y: y,
        size: 10,
        font: fontBold,
        color: rgb(0.11, 0.22, 0.54)
    })

    y -= 15

    // Función interna para hacer saltos de línea automáticos en el PDF
    const drawTextWrapped = (text: string, x: number, y: number, maxWidth: number) => {
        const words = text.split(' ')
        let line = ''

        for (const word of words) {
            if (font.widthOfTextAtSize(line + word, 9) > maxWidth) {
                page.drawText(line, { x, y, size: 9, font })
                line = word + ' '
                y -= 12
            } else {
                line += word + ' '
            }
        }

        page.drawText(line, { x, y, size: 9, font })
        return y - 15
    }

    y = drawTextWrapped(`Trabajo: ${trabajoData.descripcion || '-'}`, marginLeft, y, marginRight - marginLeft)
    y = drawTextWrapped(`Tareas: ${trabajoData.tareas || '-'}`, marginLeft, y, marginRight - marginLeft)

    y -= 20

    // ==========================================================================
    // 6. TABLA DE MATERIALES Y MANO DE OBRA
    // ==========================================================================

    page.drawText('DETALLE DE MATERIALES Y MANO DE OBRA', {
        x: marginLeft,
        y: y,
        size: 10,
        font: fontBold,
        color: rgb(0.11, 0.22, 0.54)
    })

    y -= 25

    // Definimos las coordenadas X de las columnas
    const colX0 = marginLeft
    const colX1 = 300
    const colX2 = 380
    const colX3 = 480
    const colX4 = marginRight
    const tableTopY = y

    // Función para centrar los encabezados de la tabla
    const drawCenteredText = (text: string, xStart: number, xEnd: number, yPos: number) => {
        const textWidth = fontBold.widthOfTextAtSize(text, 9)
        const centerX = xStart + ((xEnd - xStart) / 2) - (textWidth / 2)
        page.drawText(text, { x: centerX, y: yPos, size: 9, font: fontBold })
    }

    // Dibujamos los encabezados
    drawCenteredText('DESCRIPCIÓN', colX0, colX1, tableTopY - 15)
    drawCenteredText('CANT.', colX1, colX2, tableTopY - 15)
    drawCenteredText('P. UNIT.', colX2, colX3, tableTopY - 15)
    drawCenteredText('SUBTOTAL', colX3, colX4, tableTopY - 15)

    // Líneas horizontales superiores de la tabla
    page.drawLine({ start: { x: colX0, y: tableTopY }, end: { x: colX4, y: tableTopY }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) })
    const headerBottomY = tableTopY - 25
    page.drawLine({ start: { x: colX0, y: headerBottomY }, end: { x: colX4, y: headerBottomY }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) })

    y = headerBottomY - 15
    let totalMateriales = 0
    let lastRowY = y

    // Iteramos sobre los resultados calculados para dibujar cada fila
    Object.entries(resultadosData).forEach(([clave, cantidad]: any) => {
        const costoCercano = buscarPrecioCercano(clave, rubroData.costos)
        let precioUnitario = costoCercano ? Number(valoresData[costoCercano.clave] || 0) : 0
        const subtotal = cantidad * precioUnitario
        totalMateriales += subtotal

        // Descripción
        page.drawText(formatearNombreMaterial(clave), { x: colX0 + 5, y, size: 9, font })

        // Cantidad
        const cantText = formatNumber(cantidad)
        page.drawText(cantText, { x: colX2 - font.widthOfTextAtSize(cantText, 9) - 5, y, size: 9, font })

        // Precio Unitario
        const precioText = `$ ${formatNumber(precioUnitario)}`
        page.drawText(precioText, { x: colX3 - font.widthOfTextAtSize(precioText, 9) - 5, y, size: 9, font })

        // Subtotal
        const subText = `$ ${formatNumber(subtotal)}`
        page.drawText(subText, {
            x: colX4 - font.widthOfTextAtSize(subText, 9) - 5,
            y,
            size: 9,
            font,
            color: subtotal > 0 ? rgb(0.06, 0.72, 0.51) : rgb(0, 0, 0)
        })

        y -= 8
        // Línea divisoria de fila
        page.drawLine({ start: { x: colX0, y: y }, end: { x: colX4, y: y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) })
        y -= 12
        lastRowY = y
    })

    // Agregamos la fila de Gastos Generales si es mayor a 0
    const montoGastos = Number(gastos) || 0
    if (montoGastos > 0) {
        page.drawText('GASTOS GENERALES', { x: colX0 + 5, y, size: 9, font })
        const ggSubText = `$ ${formatNumber(montoGastos)}`
        page.drawText(ggSubText, { x: colX4 - font.widthOfTextAtSize(ggSubText, 9) - 5, y, size: 9, font, color: rgb(0.06, 0.72, 0.51) })
        y -= 8
        page.drawLine({ start: { x: colX0, y: y }, end: { x: colX4, y: y }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) })
        lastRowY = y
    }

    // Dibujamos las líneas verticales de la tabla
    page.drawLine({ start: { x: colX0, y: tableTopY }, end: { x: colX0, y: lastRowY }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) })
    page.drawLine({ start: { x: colX1, y: tableTopY }, end: { x: colX1, y: lastRowY }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) })
    page.drawLine({ start: { x: colX2, y: tableTopY }, end: { x: colX2, y: lastRowY }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) })
    page.drawLine({ start: { x: colX3, y: tableTopY }, end: { x: colX3, y: lastRowY }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) })
    page.drawLine({ start: { x: colX4, y: tableTopY }, end: { x: colX4, y: lastRowY }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) })

    // ==========================================================================
    // 7. TOTAL GENERAL
    // ==========================================================================
    const totalGeneral = totalMateriales + montoGastos
    y = lastRowY - 25

    const labelTotal = `TOTAL ESTIMADO`
    const labelWidth = fontBold.widthOfTextAtSize(labelTotal, 12)
    const montoTotal = `$ ${formatNumber(totalGeneral)}`
    const montoWidth = fontBold.widthOfTextAtSize(montoTotal, 12)

    page.drawText(labelTotal, { x: colX4 - montoWidth - 15 - labelWidth, y, size: 12, font: fontBold })
    page.drawText(montoTotal, { x: colX4 - montoWidth - 5, y, size: 12, font: fontBold, color: rgb(0.11, 0.22, 0.54) })

    page.drawText('* Cálculos estimativos. Deben ser verificados por el profesional habilitado que suscribe.', { x: marginLeft, y: 30, size: 7, font, color: rgb(0.5, 0.5, 0.5) })

    // ==========================================================================
    // 8. GENERACIÓN DEL ARCHIVO Y COMPARTIR
    // ==========================================================================
    const pdfBytes = await pdfDoc.save()
    const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' })

    const hoy = new Date()
    const fechaArchivo = `${String(hoy.getDate()).padStart(2, '0')}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${hoy.getFullYear()}`
    const nombreCliente = clienteData.nombre ? clienteData.nombre.replace(/ /g, '_') : 'Cliente'
    const nombreArchivo = `Presup_${nombreCliente}_${fechaArchivo}.pdf`

    // Detectamos si estamos en un celular
    const esCelular = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

    if (esCelular) {
        try {
            const file = new File([blob], nombreArchivo, { type: 'application/pdf' })
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Presupuesto ObraFácil',
                    text: `Hola ${clienteData.nombre || ''}, te envío el presupuesto de ${nombreEmpresa}.`
                })
                return; // Si se compartió con éxito, terminamos acá.
            }
        } catch (error) {
            console.log('El usuario canceló o falló el compartir en celular. Pasando a descarga directa...', error)
        }
    }

    // FALLBACK: Si es PC o falló en celular, descargamos el archivo
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = nombreArchivo
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    // Mostramos el cartel verde avisando de la descarga (tanto en PC como en el fallback de celular)
    if (!esCelular) {
        onMostrarToast()
    }
}