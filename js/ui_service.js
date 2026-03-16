/**
 * ============================================================================
 * ARCHIVO: ui_service.js
 * DESCRIPCIÓN: Servicio de Interfaz de Usuario (UI).
 * RESPONSABILIDADES:
 * 1. Manipular el DOM (Document Object Model) para mostrar mensajes.
 * 2. Gestionar el scroll automático del chat.
 * 3. Crear elementos visuales temporales (avisos de carga, "pensando...").
 * ============================================================================
 */

// Referencia global al contenedor principal del chat.
// Se obtiene una sola vez al cargar el módulo para mejorar el rendimiento.
const divMensajes = document.getElementById('mensajes');

/**
 * Agrega una burbuja de mensaje al chat (sea del usuario o de la IA).
 * @param {string} htmlContent - El texto o HTML a mostrar.
 * @param {string} sender - El emisor: 'user' (derecha) o 'ia' (izquierda).
 */
export function agregarMensaje(htmlContent, sender) {
    const bubble = document.createElement('div');
    
    // Asignamos la clase CSS según quién envía el mensaje para darle color/posición
    bubble.classList.add(sender === 'user' ? 'mensaje-usuario' : 'mensaje-ia');
    
    bubble.innerHTML = htmlContent;
    divMensajes.appendChild(bubble); // Añadir al final de la lista
    
    // Auto-scroll: Bajamos la barra de desplazamiento para mostrar lo nuevo
    divMensajes.scrollTop = divMensajes.scrollHeight;
}

/**
 * Muestra el indicador de "Pensando..." mientras la IA procesa.
 * IMPORTANTE: Devuelve el elemento creado para que luego podamos modificar su 
 * contenido (innerHTML) con la respuesta final sin tener que borrar y crear otro.
 * @returns {HTMLElement} El div del mensaje "Pensando...".
 */
export function mostrarPensando() {
    const mensajePensando = document.createElement('div');
    mensajePensando.classList.add('mensaje-ia');
    mensajePensando.innerText = "Pensando...";
    
    divMensajes.appendChild(mensajePensando);
    divMensajes.scrollTop = divMensajes.scrollHeight;
    
    return mensajePensando; // <--- Retornamos la referencia para usarla después
}

/**
 * Muestra un texto pequeño en gris indicando qué herramienta se está usando.
 * IMPORTANTE: Devuelve el elemento para que podamos llamar a .remove() 
 * y borrarlo una vez que la herramienta termine de cargar.
 * @param {string} nombreFuncion - El nombre técnico de la herramienta (ej: get_farmacias).
 * @returns {HTMLElement} El div del aviso.
 */
export function crearAvisoConsultando(nombreFuncion) {
    const infoDiv = document.createElement('div');
    // Estilos inline para diferenciarlo de un mensaje normal (más sutil)
    infoDiv.innerHTML = `<small style="color: grey; margin-left: 10px;"><i>Consultando ${nombreFuncion}...</i></small>`;
    
    divMensajes.appendChild(infoDiv);
    divMensajes.scrollTop = divMensajes.scrollHeight;
    
    return infoDiv; // <--- Retornamos la referencia para borrarlo después
}

/**
 * Muestra un aviso de sistema simple en color verde.
 * Se usa cuando el GPS se activa correctamente.
 */
export function mostrarAvisoGPS() {
    const aviso = document.createElement('div');
    aviso.innerHTML = "<small style='color:green'>Ubicación activada</small>";
    
    divMensajes.appendChild(aviso);
    divMensajes.scrollTop = divMensajes.scrollHeight;
}

export function formatearTexto(texto) {
    let html = texto;

    // 1. Convertir enlaces Markdown: [Título](URL) -> <a href="URL">Título</a>
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" style="color: #007bff; text-decoration: underline;">$1</a>');

    // 2. Convertir URLs sueltas: https://google.com -> <a href="...">...</a>
    // El regex (?<!href="|">) asegura que no rompamos los enlaces que acabamos de crear en el paso 1.
    html = html.replace(/(?<!href="|">)(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" style="color: #007bff; text-decoration: underline;">$1</a>');

    // 3. Convertir Negritas: **Texto** -> <b>Texto</b>
    html = html.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

    // 4. Convertir saltos de línea (\n) a <br>
    html = html.replace(/\n/g, '<br>');

    return html;
}