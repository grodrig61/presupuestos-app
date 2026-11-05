// ============================================================================
// GENERADOR DE PDF - OBRAFÁCIL
// Este archivo se encarga de tomar todos los datos del presupuesto (ahora
// con múltiples ítems), dibujar el documento PDF usando la librería pdf-lib,
// y luego compartirlo o descargarlo.
// ============================================================================

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import QRCode from 'qrcode'
import { formatNumber, formatearNombreMaterial, buscarPrecioCercano } from './utils'
import type { ItemCarrito } from '../types'

export const descargarPDF = async (
    // 1. Datos del profesional
    perfilData: any,

    // 2. Datos del cliente
    clienteData: any,

    // 3. Datos del trabajo general
    trabajoData: any,

    // 4. Los ítems del carrito (Array de rubros calculados)
    itemsData: ItemCarrito[],

    // 5. Gastos generales
    gastos: string,

    // 6. Descuento a aplicar (%)
    descuentoPorcentaje: number,

    // 7. Días de validez
    vigenciaDias: number,

    // 8. Fecha de creación (para calcular el vencimiento)
    fechaCreacionOriginal: string,

    // 9. Función para mostrar el cartel verde de descarga
    onMostrarToast: () => void
) => {

    // --- INICIALIZACIÓN DEL DOCUMENTO ---
    // Creamos un nuevo documento PDF
    const pdfDoc = await PDFDocument.create()

    // Cargamos las fuentes estándar
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    // Definimos los márgenes del documento
    const marginLeft = 40
    const marginRight = 595 - 40

    // Función auxiliar para crear nuevas páginas si el presupuesto es muy largo
    const agregarPagina = () => {
        const page = pdfDoc.addPage([595, 842]) // Tamaño A4
        return { page, y: 842 - 50 } // y = altura - margen superior
    }

    // Creamos la primera página
    let { page, y } = agregarPagina()

    // ==========================================================================
    // GENERACIÓN PREVIA DEL QR (Si hay datos bancarios)
    // ==========================================================================
    let qrImagePng: any = null;
    // Lógica: Prioridad al CBU, si no hay, usa el Alias.
    const qrData = perfilData.cbu || perfilData.alias;

    if (qrData) {
        try {
            // Generamos el código QR como Data URL (Base64)
            const qrDataUrl = await QRCode.toDataURL(qrData, { margin: 1, width: 150 });
            // Convertimos el Data URL a un ArrayBuffer para que pdf-lib lo pueda leer
            const qrArrayBuffer = await fetch(qrDataUrl).then(res => res.arrayBuffer());
            // Embebemos la imagen en el documento
            qrImagePng = await pdfDoc.embedPng(qrArrayBuffer);
        } catch (error) {
            console.log('Error generando el QR', error);
        }
    }

    // ==========================================================================
    // 1. DIBUJAR EL LOGO (CON PROTECCIÓN DE TAMAÑO Y FORMATO)
    // ==========================================================================
    if (perfilData.logo_url) {
        try {
            const response = await fetch(perfilData.logo_url)
            if (response.ok) {
                const logoArrayBuffer = await response.arrayBuffer()

                let logoImage;
                // Intentamos cargar como PNG. Si falla, intentamos como JPG.
                try {
                    logoImage = await pdfDoc.embedPng(logoArrayBuffer)
                } catch (e) {
                    logoImage = await pdfDoc.embedJpg(logoArrayBuffer)
                }

                // Limitamos el logo a un máximo de 65x65 puntos.
                const maxLogoSize = 65
                const originalDims = logoImage.scale(1)
                const scaleFactor = Math.min(
                    maxLogoSize / originalDims.width,
                    maxLogoSize / originalDims.height
                )
                const logoDims = logoImage.scale(scaleFactor)

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
    // 3. DATOS DEL PROFESIONAL
    // ==========================================================================

    // Nombre de la empresa
    const nombreEmpresa = perfilData.nombre || 'Profesional Independiente'
    page.drawText(nombreEmpresa, {
        x: marginLeft,
        y: y - 85,
        size: 14,
        font: fontBold
    })

    // CUIT y Teléfono
    page.drawText(`CUIT: ${perfilData.cuit || '-'} | Tel: ${perfilData.telefono || '-'}`, {
        x: marginLeft,
        y: y - 100,
        size: 9,
        font: font,
        color: rgb(0.4, 0.4, 0.4)
    })

    // Matrícula (si existe)
    if (perfilData.matricula) {
        page.drawText(`Matrícula: ${perfilData.matricula}`, {
            x: marginLeft,
            y: y - 112,
            size: 9,
            font: font,
            color: rgb(0.4, 0.4, 0.4)
        })
    }

    // Línea divisoria horizontal
    y -= 135
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
    // 5. DESCRIPCIÓN GENERAL DEL TRABAJO
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
    // 6. TABLA DE MATERIALES (ITERANDO SOBRE LOS ÍTEMS DEL CARRITO)
    // ==========================================================================

    let totalGeneral = 0

    // Definimos las coordenadas X de las columnas (se mantienen fijas para todas las tablas)
    const colX0 = marginLeft
    const colX1 = 300
    const colX2 = 380
    const colX3 = 480
    const colX4 = marginRight

    for (let i = 0; i < itemsData.length; i++) {
        const item = itemsData[i]

        // MARGEN DE SEGURIDAD: Si no hay espacio suficiente (dejamos 150 puntos para el final de la tabla y el pie), creamos una nueva página
        if (y < 150) {
            const nuevaPagina = agregarPagina()
            page = nuevaPagina.page
            y = nuevaPagina.y
        }

        // Título de este ítem (nombre del rubro)
        page.drawText(`DETALLE: ${item.rubro.nombre.toUpperCase()}`, {
            x: marginLeft,
            y: y,
            size: 10,
            font: fontBold,
            color: rgb(0.11, 0.22, 0.54)
        })

        y -= 20

        // Encabezados de la tabla
        const tableTopY = y

        const drawCenteredText = (text: string, xStart: number, xEnd: number, yPos: number) => {
            const textWidth = fontBold.widthOfTextAtSize(text, 9)
            const centerX = xStart + ((xEnd - xStart) / 2) - (textWidth / 2)
            page.drawText(text, { x: centerX, y: yPos, size: 9, font: fontBold })
        }

        drawCenteredText('DESCRIPCIÓN', colX0, colX1, tableTopY - 15)
        drawCenteredText('CANT.', colX1, colX2, tableTopY - 15)
        drawCenteredText('P. UNIT.', colX2, colX3, tableTopY - 15)
        drawCenteredText('SUBTOTAL', colX3, colX4, tableTopY - 15)

        // Líneas horizontales superiores de esta tabla
        page.drawLine({ start: { x: colX0, y: tableTopY }, end: { x: colX4, y: tableTopY }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) })
        const headerBottomY = tableTopY - 25
        page.drawLine({ start: { x: colX0, y: headerBottomY }, end: { x: colX4, y: headerBottomY }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) })

        y = headerBottomY - 15
        let lastRowY = y

        // Iteramos sobre los resultados calculados de este ítem
        Object.entries(item.resultados).forEach(([clave, cantidad]: any) => {
            // Validación para salto de página en medio de una tabla. Dejamos 80 puntos libres abajo para el pie de página.
            if (y < 80) {
                const nuevaPagina = agregarPagina()
                page = nuevaPagina.page
                y = nuevaPagina.y
            }

            const costoCercano = buscarPrecioCercano(clave, item.rubro.costos)
            let precioUnitario = costoCercano ? Number(item.valores[costoCercano.clave] || 0) : 0
            const subtotal = cantidad * precioUnitario
            totalGeneral += subtotal

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

        // Dibujamos las líneas verticales de esta tabla
        page.drawLine({ start: { x: colX0, y: tableTopY }, end: { x: colX0, y: lastRowY }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) })
        page.drawLine({ start: { x: colX1, y: tableTopY }, end: { x: colX1, y: lastRowY }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) })
        page.drawLine({ start: { x: colX2, y: tableTopY }, end: { x: colX2, y: lastRowY }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) })
        page.drawLine({ start: { x: colX3, y: tableTopY }, end: { x: colX3, y: lastRowY }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) })
        page.drawLine({ start: { x: colX4, y: tableTopY }, end: { x: colX4, y: lastRowY }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) })

        y -= 20 // Espacio entre tablas
    }

    // ==========================================================================
    // 7. GASTOS GENERALES, DESCUENTO Y TOTAL FINAL
    // ==========================================================================

    // MARGEN DE SEGURIDAD: Si no hay espacio para los totales (dejamos 150 puntos), nueva página
    if (y < 150) {
        const nuevaPagina = agregarPagina()
        page = nuevaPagina.page
        y = nuevaPagina.y
    }

    const montoGastos = Number(gastos) || 0
    if (montoGastos > 0) {
        page.drawText('GASTOS GENERALES', { x: colX0 + 5, y, size: 9, font: fontBold })
        const ggSubText = `$ ${formatNumber(montoGastos)}`
        page.drawText(ggSubText, { x: colX4 - font.widthOfTextAtSize(ggSubText, 9) - 5, y, size: 9, font: fontBold, color: rgb(0.06, 0.72, 0.51) })
        y -= 15
    }

    totalGeneral += montoGastos

    // Lógica de Descuento
    let montoDescuento = 0;
    if (descuentoPorcentaje > 0) {
        montoDescuento = totalGeneral * (descuentoPorcentaje / 100);
        totalGeneral -= montoDescuento;
    }

    y -= 10
    page.drawLine({ start: { x: marginLeft, y }, end: { x: marginRight, y }, thickness: 1, color: rgb(0.6, 0.6, 0.6) })
    y -= 20

    // Si hay descuento, lo mostramos antes del total
    if (montoDescuento > 0) {
        page.drawText(`DESCUENTO (${descuentoPorcentaje}%)`, { x: colX0 + 5, y, size: 9, font: fontBold, color: rgb(0.8, 0.2, 0.2) })
        const descText = `- $ ${formatNumber(montoDescuento)}`
        page.drawText(descText, { x: colX4 - font.widthOfTextAtSize(descText, 9) - 5, y, size: 9, font: fontBold, color: rgb(0.8, 0.2, 0.2) })
        y -= 20
    }

    const labelTotal = `TOTAL ESTIMADO`
    const labelWidth = fontBold.widthOfTextAtSize(labelTotal, 14)
    page.drawText(labelTotal, { x: colX4 - 150 - labelWidth, y, size: 14, font: fontBold })

    const montoTotal = `$ ${formatNumber(totalGeneral)}`
    const montoWidth = fontBold.widthOfTextAtSize(montoTotal, 16)
    page.drawText(montoTotal, { x: colX4 - montoWidth, y: y - 2, size: 16, font: fontBold, color: rgb(0.11, 0.22, 0.54) })

    // ==========================================================================
    // 8. PIE DE PÁGINA GLOBAL (Texto legal, Datos Bancarios, QR y Paginación)
    // ==========================================================================

    // Obtenemos todas las páginas del documento para iterar sobre ellas
    const pages = pdfDoc.getPages()
    const totalPages = pages.length

    // Preparamos el texto de los datos bancarios (si existen)
    const cbuText = perfilData.cbu ? `CBU: ${perfilData.cbu}` : '';
    const aliasText = perfilData.alias ? `Alias: ${perfilData.alias}` : '';
    const bancoInfo = [cbuText, aliasText].filter(Boolean).join('  |  ');

    // Definimos la altura del pie de página (alineado para que el texto, el QR y el número coincidan)
    const footerY = 45;
    const qrSize = 40;

    pages.forEach((p, index) => {
        // 1. Datos Bancarios (Izquierda)
        if (bancoInfo) {
            p.drawText(`Datos de transferencia | ${bancoInfo}`, {
                x: marginLeft,
                y: footerY,
                size: 8,
                font: fontBold,
                color: rgb(0.11, 0.22, 0.54) // Azul oscuro
            })
        }

        // 2. QR (Centro)
        if (qrImagePng) {
            const qrX = (595 / 2) - (qrSize / 2); // Centrado exacto en A4
            p.drawImage(qrImagePng, {
                x: qrX,
                y: footerY - (qrSize / 2) + 4, // Alineado visualmente con el texto
                width: qrSize,
                height: qrSize
            })
        }

        // 3. Paginación (Derecha)
        const pageNumberText = `Página ${index + 1} de ${totalPages}`
        const textWidth = font.widthOfTextAtSize(pageNumberText, 8)
        p.drawText(pageNumberText, {
            x: marginRight - textWidth,
            y: footerY,
            size: 8,
            font: fontBold,
            color: rgb(0.5, 0.5, 0.5)
        })

        // 4. Texto legal (Abajo de todo a la izquierda)
        p.drawText('* Cálculos estimativos. Deben ser verificados por el profesional habilitado que suscribe.', {
            x: marginLeft,
            y: 25,
            size: 7,
            font: font,
            color: rgb(0.5, 0.5, 0.5)
        })
    })

    // ==========================================================================
    // 9. GENERACIÓN DEL ARCHIVO Y COMPARTIR
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
                return // Si se compartió con éxito, terminamos acá.
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

    // Mostramos el cartel verde avisando de la descarga
    if (!esCelular) {
        onMostrarToast()
    }
}