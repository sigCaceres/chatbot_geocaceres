/**
 * =======================================================================================
 * ARCHIVO: main.js
 * DECRIPCIÓN: punto de entrada principal del chatbot de Geo Cáceres. (Entry Point).
 * * FUNCIONALIDADES:
 * 1. Orquestar la comunicación entre los diferentes servicios (IA, MCP, GPS, UI).
 * 2. Gestionar los eventos globales del ciclo de vida de la aplicación (load, DOMContentLoaded).
 * 3.Capturar y procesar las interacciones del usuario (envío de mensajes).
 *  =======================================================================================
 */

// -- IMPORTACION DE MODULOS --
// Importamos la funcionalidades especificas de cada servicio separado
import { cargarHerramientas } from './mcp_service.js';
import { iniciarGPS } from './geo_service.js';
import { obtenerRespuestaIA } from './ia_service.js';
import { agregarMensaje, mostrarPensando, mostrarAvisoGPS, formatearTexto } from './ui_service.js';

// -- REFERENCIAS A LOS ELEMENTOS DEL DOM --
// Recogemos los elementos HTML con los que vamos a interactuar
const inputUsuario = document.getElementById('usuario-input');
const btnEnviar = document.getElementById('enviar-btn');


/**
 * Esta es la funcion principal que coordina el flujo de interaccion
 * Se ejecuta cada vez que el usuario envia un mensaje
 */
async function procesarChat() {
    // 1. Obtenemos el texto y limpiamos el input
    const texto = inputUsuario.value.trim();
    if (!texto) return;

    // 2. Mostramos el mensaje del usuario en el chat y una vez enviado, limpiamos el input
    agregarMensaje(texto, 'user');
    inputUsuario.value = '';

    // 3. Feedback visual: Mostrar burbuja de "Pensando..."
    // Guardamos la referencia (divPensando) para poder modificarla cuando llegue la respuesta.
    const divPensando = mostrarPensando();

    // 4. Llamada a la IA para obtener la respuesta
    const respuesta = await obtenerRespuestaIA(texto);

    // Esto convierte los enlaces y las negritas antes de mostrarlos.
    divPensando.innerHTML = formatearTexto(respuesta);

    // 6. Aseguramos que el scroll del chat siempre muestre el ultimo mensaje
    const divMensajes = document.getElementById('mensajes');
    divMensajes.scrollTop = divMensajes.scrollHeight;
}

// --- INICIALIZACIÓN Y EVENTOS DEL CICLO DE VIDA ---

// 'load': se dispara cuando se ha cargado toda la página, incluyendo todos los recursos
// En este caso iniciamos el GPS y mostramos un mensaje de bienbenida
window.addEventListener('load', () => {
    iniciarGPS(mostrarAvisoGPS);
    agregarMensaje("Hola. Soy el asistente de Geo Cáceres. ¿Qué necesitas consultar?", 'ai');
});

// 'DOMContentLoaded': se dispara cuando el HTML base esta listo
// Aqui tambien se inician las herramientas MCP
window.addEventListener('DOMContentLoaded', () => {
    cargarHerramientas();
});

// --- EVENTOS DE INTERACCIÓN DEL USUARIO ---
// Para capturar el envio del mensje tanto para cuando se pulsa el boton de enviar ('click'), como cuanod se pulsa 'Enter' ('keypress')
btnEnviar.addEventListener('click', procesarChat);
inputUsuario.addEventListener('keypress', (e) => { if (e.key === 'Enter') procesarChat(); });
 
/*
--- PREGUNTAS PARA PROBAR EL CHAT ---
- (por farmacias y barrio) Dime si hay alguna farmacia en la Avenida Alemania, en Cáceres
- (por parada de bus y lugar) Dime las paradas de autobús que hay cerca de la Plaza de Toros.
- Necesito un punto limpio cerca de la Cruz de los Caídos.
- Plazas de movilidad reducida cerca del Parque del Príncipe.
- ¿Dónde está la farmacia más cercana a la Plaza Mayor?
- ¿Qué autobuses pasan por la calle San Pedro?
- ¿En qué barrio se encuentra el Museo de Cáceres?
- ¿Cuál es el catastro de la Avenida de España, 10?
- Dame el enlace a la web oficial del Ayuntamiento de Cáceres y resalta en negrita el nombre de la ciudad.
- Dime la farmacia mas cercana a la Calle Pintores
- ¿En qué zona se encuentra la Avenida de Alemania, de Cáceres?
- Busca farmacias en el barrio de Moctezuma
- ¿Qué autobuses pasan cerca del Hospital San Pedro de Alcántara?
- Dame el enlace a la web de turismo de Cáceres y pon en negrita los monumentos más importantes
- Dime las coordenadas exactas del Arco de la Estrella
- ¿Dónde se encuentra el Gran Teatro?
- Busca el centro del barrio Aldea Moret
- ¿Dónde está el Residencial Universidad?
- Dame la referencia catastral del Ayuntamiento de Cáceres
- Información catastral de la Plaza Mayor
- ¿Dónde está la Cruz de los Caídos, en Cáceres?
- Información sobre la Ronda Norte
- ¿Por dónde pasa la N-630?
- ¿Qué colegios hay cerca de la Plaza de Italia?
- ¿Hay algún parking cerca de Cánovas?
- ¿Dónde está la playa de Cáceres?
- ¿A cuánto se encuentra la playa mas cercana de Cáceres?
- Busca la estación de metro
- ¿Qué colegios hay cerca de la Avenida Ruta de la Plata?
- ¿Dime una ruta de visita en Cáceres?
- Busca la Plaza Mayor
- ¿Cuáles son los límites del barrio Aldea Moret?
- ¿Dónde está El Perú?
- ¿Dónde paran los buses en Colón?
- Busca farmacias en Madrid
- Busca cajeros automáticos cerca de la estatua de Pizarro
- Estoy en el Parque del Príncipe. ¿Tengo alguna parada de bus cerca?
- ¿Qué hay en el Paseo de Cánovas?
- Busca la biblioteca pública más céntrica
- ¿Cuáles son los límites del barrio de San Blas?
- Búscame el número 1 de la Avenida de España
- ¿El Palacio de la Isla es un edificio público?
- ¿Hay desfibriladores en la Plaza Mayor?
- Dame un enlace a la sede electrónica del ayuntamiento y otro a la agenda cultural.
- Resúmeme la historia de la Ciudad Monumental y pon en negrita los siglos importantes.
- Busca la calle del Pez. (Debe de decir que no hay ninguna calle llamada Pez)
- Farmacia de guardia más cercana al Hospital Universitario.
- Estoy en la calle Pisa, ¿cúal es la calle mas cercana, que se encuentre hacia el norte?
- Estoy en la Plaza Mayor. ¿Qué arco se encuentra justo al sur de mi posición?
- Me encuentro en el Paseo de Cánovas. ¿Qué edificio público tengo más cerca hacia la parte superior (norte) del paseo?
- Me encuentro en la Plaza América. ¿Qué edificio público tengo más cerca hacia la parte superior (norte) de la plaza?
- ¿Qué farmacia de guardia está abierta ahora mismo?
- Dime el tiempo de espera del bus en la parada más cercana a la Plaza de Toros.
- ¿Es fin de semana o día laborable?
- ¿Qué día y hora tienes registrados en tu sistema ahora mismo?
- ¿Cuándo pasa el próximo autobús de la Línea 3 por la Plaza Mayor?
- Estoy visitando el Palacio de las Veletas y me encuentro mal. Dime cuál es la farmacia de guardia más cercana a mi posición y qué líneas de autobús tienen parada cerca de esa farmacia para poder volverme luego a casa.

/====================================================================================================================
/====================================================================================================================
/====================================================================================================================
/====================================================================================================================
/====================================================================================================================

--- PREGUNTAS PARA PROBAR QUE LA IA DEVUELVEL LA DIRECIÓN NORMALIZADA (CÓDIGOS DE VÍA Y NUMPOL) ---

- Dame la dirección normalizada de la siguiente dirección: "CALLE MANUEL PACHECO 14- 10005 CACERES"
- Dame el código de vía y numpol de la siguiente dirección: "CALLE MOZART, 82 - 10003 CACERES"
- Dirección normalizada de "CUSTA DE ALDANA  Nº 6"
- numpol y codigo de via de "C/ ANTONIO REYES HUERTAS, Nº 3, BAJO, DERECHA"
- normaliza esta direccion "calle islas canarias 2, bloque  6, escalera 2 5C' (prima)"
- calle obispo segura sáez
*/