// src/lib/pdfGenerator.ts
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { formatNumber, formatearNombreMaterial, buscarPrecioCercano } from './utils'

export const descargarPDF = async (
    perfilData: any,
    clienteData: any,
    trabajoData: any,
    resultadosData: any,
    valoresData: any,
    rubroData: any,
    gastos: string,
    onMostrarToast: () => void // Callback para mostrar el cartel verde
) => {
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([595, 842])
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const { height, width } = page.getSize()

    let y = height - 50
    const marginLeft = 40
    const marginRight = width - 40

    // Cargar Logo
    if (perfilData.logo_url) {
        try {
            const response = await fetch(perfilData.logo_url)
            if (response.ok) {
                const logoArrayBuffer = await response.arrayBuffer()
                const logoImage = await pdfDoc.embedPng(logoArrayBuffer)
                const logoDims = logoImage.scale(0.12)
                page.drawImage(logoImage, { x: marginLeft, y: y - logoDims.height, width: logoDims.width, height: logoDims.height })
            }
        } catch (e) { console.log('Error cargando logo', e) }
    }

    // Encabezado
    const titulo = 'PRESUPUESTO DE OBRA'
    const tituloWidth = fontBold.widthOfTextAtSize(titulo, 18)
    page.drawText(titulo, { x: marginRight - tituloWidth, y: y, size: 18, font: fontBold, color: rgb(0.11, 0.22, 0.54) })

    const fechaStr = new Date().toLocaleDateString('es-AR')
    const fechaWidth = font.widthOfTextAtSize(`Fecha: ${fechaStr}`, 9)
    page.drawText(`Fecha: ${fechaStr}`, { x: marginRight - fechaWidth, y: y - 15, size: 9, font, color: rgb(0.4, 0.4, 0.4) })

    page.drawText(perfilData.nombre, { x: marginLeft, y: y - 75, size: 14, font: fontBold })
    page.drawText(`CUIT: ${perfilData.cuit} | Tel: ${perfilData.telefono}`, { x: marginLeft, y: y - 90, size: 9, font, color: rgb(0.4, 0.4, 0.4) })
    if (perfilData.matricula) page.drawText(`Matrícula: ${perfilData.matricula}`, { x: marginLeft, y: y - 102, size: 9, font, color: rgb(0.4, 0.4, 0.4) })

    y -= 130
    page.drawLine({ start: { x: marginLeft, y }, end: { x: marginRight, y }, thickness: 1, color: rgb(0.85, 0.85, 0.85) })
    y -= 25

    // Datos del Cliente
    page.drawText('DATOS DEL CLIENTE', { x: marginLeft, y, size: 10, font: fontBold, color: rgb(0.11, 0.22, 0.54) })
    y -= 15
    page.drawText(`Nombre: ${clienteData.nombre}`, { x: marginLeft, y, size: 9, font })
    page.drawText(`Domicilio: ${clienteData.domicilio}`, { x: marginLeft, y: y - 12, size: 9, font })
    y -= 35

    // Descripción
    page.drawText('DESCRIPCIÓN DEL TRABAJO', { x: marginLeft, y, size: 10, font: fontBold, color: rgb(0.11, 0.22, 0.54) })
    y -= 15

    const drawTextWrapped = (text: string, x: number, y: number, maxWidth: number) => {
        const words = text.split(' ')
        let line = ''
        for (const word of words) {
            if (font.widthOfTextAtSize(line + word, 9) > maxWidth) {
                page.drawText(line, { x, y, size: 9, font }); line = word + ' '; y -= 12;
            } else { line += word + ' '; }
        }
        page.drawText(line, { x, y, size: 9, font }); return y - 15;
    }

    y = drawTextWrapped(`Trabajo: ${trabajoData.descripcion}`, marginLeft, y, marginRight - marginLeft)
    y = drawTextWrapped(`Tareas: ${trabajoData.tareas}`, marginLeft, y, marginRight - marginLeft)
    y -= 20

    // Tabla
    page.drawText('DETALLE DE MATERIALES Y MANO DE OBRA', { x: marginLeft, y, size: 10, font: fontBold, color: rgb(0.11, 0.22, 0.54) })
    y -= 25

    const colX0 = marginLeft, colX1 = 300, colX2 = 380, colX3 = 480, colX4 = marginRight
    const tableTopY = y;

    const drawCenteredText = (text: string, xStart: number, xEnd: number, yPos: number) => {
        const textWidth = fontBold.widthOfTextAtSize(text, 9);
        const centerX = xStart + ((xEnd - xStart) / 2) - (textWidth / 2);
        page.drawText(text, { x: centerX, y: yPos, size: 9, font: fontBold });
    }

    drawCenteredText('DESCRIPCIÓN', colX0, colX1, tableTopY - 15);
    drawCenteredText('CANT.', colX1, colX2, tableTopY - 15);
    drawCenteredText('P. UNIT.', colX2, colX3, tableTopY - 15);
    drawCenteredText('SUBTOTAL', colX3, colX4, tableTopY - 15);

    page.drawLine({ start: { x: colX0, y: tableTopY }, end: { x: colX4, y: tableTopY }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) })
    const headerBottomY = tableTopY - 25;
    page.drawLine({ start: { x: colX0, y: headerBottomY }, end: { x: colX4, y: headerBottomY }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) })

    y = headerBottomY - 15;
    let totalMateriales = 0
    let lastRowY = y;

    Object.entries(resultadosData).forEach(([clave, cantidad]: any) => {
        const costoCercano = buscarPrecioCercano(clave, rubroData.costos)
        let precioUnitario = costoCercano ? Number(valoresData[costoCercano.clave] || 0) : 0
        const subtotal = cantidad * precioUnitario
        totalMateriales += subtotal

        page.drawText(formatearNombreMaterial(clave), { x: colX0 + 5, y, size: 9, font })
        const cantText = formatNumber(cantidad)
        page.drawText(cantText, { x: colX2 - font.widthOfTextAtSize(cantText, 9) - 5, y, size: 9, font })
        const precioText = `$ ${formatNumber(precioUnitario)}`
        page.drawText(precioText, { x: colX3 - font.widthOfTextAtSize(precioText, 9) - 5, y, size: 9, font })
        const subText = `$ ${formatNumber(subtotal)}`
        page.drawText(subText, { x: colX4 - font.widthOfTextAtSize(subText, 9) - 5, y, size: 9, font, color: subtotal > 0 ? rgb(0.06, 0.72, 0.51) : rgb(0, 0, 0) })

        y -= 8
        page.drawLine({ start: { x: colX0, y: y }, end: { x: colX4, y: y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) })
        y -= 12
        lastRowY = y;
    })

    const montoGastos = Number(gastos) || 0
    if (montoGastos > 0) {
        page.drawText('GASTOS GENERALES', { x: colX0 + 5, y, size: 9, font })
        const ggSubText = `$ ${formatNumber(montoGastos)}`
        page.drawText(ggSubText, { x: colX4 - font.widthOfTextAtSize(ggSubText, 9) - 5, y, size: 9, font, color: rgb(0.06, 0.72, 0.51) })
        y -= 8
        page.drawLine({ start: { x: colX0, y: y }, end: { x: colX4, y: y }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) })
        lastRowY = y;
    }

    page.drawLine({ start: { x: colX0, y: tableTopY }, end: { x: colX0, y: lastRowY }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) })
    page.drawLine({ start: { x: colX1, y: tableTopY }, end: { x: colX1, y: lastRowY }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) })
    page.drawLine({ start: { x: colX2, y: tableTopY }, end: { x: colX2, y: lastRowY }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) })
    page.drawLine({ start: { x: colX3, y: tableTopY }, end: { x: colX3, y: lastRowY }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) })
    page.drawLine({ start: { x: colX4, y: tableTopY }, end: { x: colX4, y: lastRowY }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) })

    const totalGeneral = totalMateriales + montoGastos
    y = lastRowY - 25

    const labelTotal = `TOTAL ESTIMADO`
    const labelWidth = fontBold.widthOfTextAtSize(labelTotal, 12)
    const montoTotal = `$ ${formatNumber(totalGeneral)}`
    const montoWidth = fontBold.widthOfTextAtSize(montoTotal, 12)

    page.drawText(labelTotal, { x: colX4 - montoWidth - 15 - labelWidth, y, size: 12, font: fontBold })
    page.drawText(montoTotal, { x: colX4 - montoWidth - 5, y, size: 12, font: fontBold, color: rgb(0.11, 0.22, 0.54) })

    page.drawText('* Cálculos estimativos. Deben ser verificados por el profesional habilitado que suscribe.', { x: marginLeft, y: 30, size: 7, font, color: rgb(0.5, 0.5, 0.5) })

    // --- GENERACIÓN Y COMPARTIR ---
    const pdfBytes = await pdfDoc.save()
    const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' })

    const hoy = new Date()
    const fechaArchivo = `${String(hoy.getDate()).padStart(2, '0')}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${hoy.getFullYear()}`
    const nombreCliente = clienteData.nombre ? clienteData.nombre.replace(/ /g, '_') : 'Cliente'
    const nombreArchivo = `Presup_${nombreCliente}_${fechaArchivo}.pdf`

    // Detectamos si es celular
    const esCelular = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (esCelular) {
        // MODO CELULAR: Intentar compartir nativamente
        try {
            const file = new File([blob], nombreArchivo, { type: 'application/pdf' })
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Presupuesto ObraFácil',
                    text: `Hola ${clienteData.nombre || ''}, te envío el presupuesto de ${perfilData.nombre}.`
                });
                return; // Si compartió con éxito, salimos y NO se descarga ni muestra cartel.
            }
        } catch (error) {
            console.log('El usuario canceló o falló el compartir en celular. Pasando a descarga directa...', error);
            // Si el usuario cancela o hay un error, caemos al fallback de abajo.
        }
    }

    // FALLBACK (PC o si falló el compartir en celular)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = nombreArchivo
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    // Mostramos el cartel verde avisando de la descarga (tanto en PC como en el fallback de celular)
    onMostrarToast();
}