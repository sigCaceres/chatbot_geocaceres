/**
 * =======================================================================================
 * ARCHIVO: main.js
 * =======================================================================================
 */

import { cargarHerramientas } from './mcp_service.js';
import { iniciarGPS } from './geo_service.js';
import { obtenerRespuestaIA } from './ia_service.js';
import {
    agregarMensaje,
    mostrarPensando,
    mostrarAvisoGPS,
    crearAvisoConsultando,
    renderizarRespuestaIA
} from './ui_service.js';

const inputUsuario = document.getElementById('usuario-input');
const btnEnviar = document.getElementById('enviar-btn');
const quickButtons = document.querySelectorAll('.quick-btn');
const mensajes = document.getElementById('mensajes');

let enviando = false;

function hacerScrollAbajo() {
    if (mensajes) {
        mensajes.scrollTop = mensajes.scrollHeight;
    }
}

function depurarValor(valor, etiqueta = 'valor') {
    console.group(`DEBUG ${etiqueta}`);
    console.log('tipo:', typeof valor);
    console.log('valor crudo:', valor);

    if (valor && typeof valor === 'object') {
        try {
            console.log('JSON:', JSON.stringify(valor, null, 2));
        } catch (e) {
            console.log('No se pudo serializar a JSON:', e);
        }
    }

    console.groupEnd();
}

function convertirATextoSeguro(valor) {
    if (valor == null) return '';

    if (typeof valor === 'string') return valor.trim();

    if (typeof valor === 'object') {
        if (typeof valor.texto === 'string') return valor.texto.trim();
        if (typeof valor.mensaje === 'string') return valor.mensaje.trim();
        if (typeof valor.message === 'string') return valor.message.trim();
        if (typeof valor.respuesta === 'string') return valor.respuesta.trim();
        if (typeof valor.content === 'string') return valor.content.trim();
        if (typeof valor.msg === 'string') return valor.msg.trim();
        if (typeof valor.url === 'string' && valor.tipo === 'mapa') return valor.url.trim();

        try {
            return JSON.stringify(valor);
        } catch {
            return '';
        }
    }

    return String(valor).trim();
}

async function procesarChat(textoManual = null) {
    if (!inputUsuario || !btnEnviar) return;
    if (enviando) return;

    const texto = (textoManual ?? inputUsuario.value).trim();
    if (!texto) return;

    enviando = true;
    btnEnviar.disabled = true;
    inputUsuario.disabled = true;

    try {
        depurarValor(textoManual, 'textoManual recibido');
        depurarValor(texto, 'texto final a enviar');

        agregarMensaje(texto, 'user');
        inputUsuario.value = '';
        hacerScrollAbajo();

        const divPensando = mostrarPensando();
        hacerScrollAbajo();

        const respuesta = await obtenerRespuestaIA(texto);
        depurarValor(respuesta, 'respuesta devuelta por obtenerRespuestaIA');

        const respuestaSegura = convertirATextoSeguro(respuesta);
        depurarValor(respuestaSegura, 'respuesta convertida a texto seguro');

        if (divPensando) {
            renderizarRespuestaIA(respuestaSegura, divPensando);
        } else {
            renderizarRespuestaIA(respuestaSegura);
        }

        hacerScrollAbajo();
    } catch (error) {
        console.error('Error al procesar el chat:', error);
        agregarMensaje('Lo siento, ha ocurrido un error al procesar tu consulta.', 'ai');
    } finally {
        enviando = false;
        btnEnviar.disabled = false;
        inputUsuario.disabled = false;
        inputUsuario.focus();
        hacerScrollAbajo();
    }
}

function inicializar() {
    console.log('Inicializando chatbot...');

    try {
        iniciarGPS((mensajeGPS) => {
            depurarValor(mensajeGPS, 'mensajeGPS recibido en iniciarGPS');

            const textoSeguro = convertirATextoSeguro(mensajeGPS);
            depurarValor(textoSeguro, 'mensajeGPS convertido a texto');

            mostrarAvisoGPS(textoSeguro);
        });
    } catch (error) {
        console.error('Error al iniciar GPS:', error);
    }

    agregarMensaje(
        'Hola. Soy el asistente virtual del SIG de Cáceres. ¿En qué puedo ayudarte?',
        'ai'
    );

    if (btnEnviar) {
        btnEnviar.addEventListener('click', () => procesarChat());
    }

    if (inputUsuario) {
        inputUsuario.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.isComposing) {
                e.preventDefault();
                procesarChat();
            }
        });
    }

    quickButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const consulta = btn.dataset.query || '';
            depurarValor(consulta, 'quick-btn dataset.query');
            procesarChat(consulta);
        });
    });
}

window.addEventListener('DOMContentLoaded', async () => {
    try {
        await cargarHerramientas();
        console.log('Herramientas cargadas correctamente');
    } catch (error) {
        console.error('Error al cargar herramientas:', error);
    }

    inicializar();
});

/*
--- PREGUNTAS FRECUENTES EL CHAT ---
- (por farmacias y barrio) Dime si hay alguna farmacia en la Avenida Alemania.
- (por parada de bus y lugar) Dime las paradas de autobús que hay cerca de la Plaza de Toros.
- Plazas de movilidad reducida cerca del Parque del Príncipe.
- ¿Dónde está la farmacia más cercana a la Plaza Mayor?
- ¿Qué autobuses pasan por la calle San Pedro?
- ¿En qué barrio se encuentra el Museo de Cáceres?
- ¿Cuál es el catastro de la Avenida de España, 10?
- Dime la farmacia mas cercana a la Calle Pintores.
- Busca farmacias en el barrio de Moctezuma.
- Dime las coordenadas exactas del Arco de la Estrella.
- ¿Dónde se encuentra el Gran Teatro?
- Busca el centro del barrio Aldea Moret.
- Dame la referencia catastral del Ayuntamiento.
- ¿Dónde está la Cruz de los Caídos?
- Dime monumentos importantes.
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

--- PREGUNTAS PARA PROBAR QUE LA IA DEVUELVE LA DIRECIÓN NORMALIZADA (CÓDIGOS DE VÍA Y NUMPOL) ---

- Dame la dirección normalizada de la siguiente dirección: "CALLE MANUEL PACHECO 14- 10005 CACERES"
- Dame el código de vía y numpol de la siguiente dirección: "CALLE MOZART, 82 - 10003 CACERES"
- Dirección normalizada de "CUSTA DE ALDANA  Nº 6"
- numpol y codigo de via de "C/ ANTONIO REYES HUERTAS, Nº 3, BAJO, DERECHA"
- normaliza esta direccion "calle islas canarias 2, bloque  6, escalera 2 5C'"
- calle obispo segura sáez
*/