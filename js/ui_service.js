/**
 * ============================================================================
 * ARCHIVO: ui_service.js
 * DESCRIPCIÓN: Servicio de Interfaz de Usuario (UI)
 * ============================================================================
 */

const divMensajes = document.getElementById('mensajes');

function autoScroll() {
    if (!divMensajes) return;
    divMensajes.scrollTop = divMensajes.scrollHeight;
}

function escaparHTML(texto) {
    return String(texto ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatearContenidoBasico(texto) {
    const seguro = escaparHTML(texto);

    return seguro
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>')
        .replace(
            /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
            '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
        )
}

export function formatearTexto(texto) {
    return formatearContenidoBasico(texto);
}

function crearBotonCopiar(textoBase) {
    const copiarBtn = document.createElement('button');
    copiarBtn.className = 'copiar-mensaje-btn';
    copiarBtn.type = 'button';
    copiarBtn.title = 'Copiar texto';
    copiarBtn.innerHTML = '📋';

    copiarBtn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(textoBase.trim());

            const textoOriginal = copiarBtn.innerHTML;
            copiarBtn.innerHTML = '✓';

            setTimeout(() => {
                copiarBtn.innerHTML = textoOriginal;
            }, 1500);

        } catch (err) {
            console.error('Error al intentar copiar el texto:', err);
        }
    });

    return copiarBtn;
}

export function agregarMensaje(texto, tipo = 'ai') {
    if (!divMensajes) return null;

    const bubble = document.createElement('div');
    bubble.className = tipo === 'user' ? 'mensaje-usuario' : 'mensaje-ia';

    if (tipo === 'user') {
        const textoDiv = document.createElement('div');
        textoDiv.innerHTML = formatearContenidoBasico(texto);

        const editarBtn = document.createElement('button');
        editarBtn.className = 'reutilizar-mensaje-btn';
        editarBtn.type = 'button';
        editarBtn.title = 'Volver a escribir el mensaje';
        editarBtn.innerHTML = '↺';

        editarBtn.addEventListener('click', () => {
            const input = document.getElementById('usuario-input');
            if (!input) return;

            input.value = texto;
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
        });

        bubble.appendChild(textoDiv);
        bubble.appendChild(editarBtn);
    } else {
        const textoDiv = document.createElement('div');
        textoDiv.innerHTML = formatearContenidoBasico(texto);

        bubble.appendChild(textoDiv);
        bubble.appendChild(crearBotonCopiar(texto));
    }

    divMensajes.appendChild(bubble);
    autoScroll();

    return bubble;
}

export function mostrarPensando() {
    if (!divMensajes) return null;

    const bubble = document.createElement('div');
    bubble.className = 'mensaje-ia';
    bubble.innerHTML = '<em>Pensando...</em>';

    divMensajes.appendChild(bubble);
    autoScroll();

    return bubble;
}

export function mostrarAvisoGPS(mensaje = 'Ubicación activada') {
    if (!divMensajes) return null;

    const aviso = document.createElement('div');
    aviso.className = 'mensaje-ia';
    aviso.innerHTML = `<small>${escaparHTML(mensaje)}</small>`;

    divMensajes.appendChild(aviso);
    autoScroll();

    return aviso;
}

export function crearAvisoConsultando(nombreFuncion = 'herramienta') {
    if (!divMensajes) return null;

    const aviso = document.createElement('div');
    aviso.className = 'mensaje-ia';
    aviso.style.opacity = '0.8';
    aviso.innerHTML = `<small><em>Consultando ${escaparHTML(nombreFuncion)}...</em></small>`;

    divMensajes.appendChild(aviso);
    autoScroll();

    return aviso;
}

function crearIframeMapa(url, titulo = 'Mapa') {
    const wrapper = document.createElement('div');
    wrapper.style.marginTop = '12px';

    const label = document.createElement('div');
    label.style.marginBottom = '8px';
    label.style.fontWeight = '600';
    label.style.color = '#9A1032';
    label.textContent = titulo;

    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.width = '400px';
    iframe.height = '500px';
    iframe.loading = 'lazy';
    iframe.style.border = '0';
    iframe.style.borderRadius = '12px';
    iframe.style.display = 'block';

    wrapper.appendChild(label);
    wrapper.appendChild(iframe);

    return wrapper;
}

function extraerUrlMapa(texto) {
    const patron =
        /https:\/\/sig\.caceres\.es\/serweb\/fichasig\/localizador_sig\/mapagrande\.php\?x=[^ \n"'<>&]+&y=[^ \n"'<>&]+(?:&nombre=[^ \n"'<>&]+)?/i;

    const match = String(texto ?? '').match(patron);
    return match ? match[0] : null;
}

function intentarParsearJSON(texto) {
    const limpio = String(texto ?? '').trim();
    if (!limpio.startsWith('{') || !limpio.endsWith('}')) return null;

    try {
        return JSON.parse(limpio);
    } catch {
        return null;
    }
}

export function renderizarRespuestaIA(respuesta, contenedor = null) {
    const destino = contenedor || divMensajes;
    if (!destino) return null;

    const texto = String(respuesta ?? '').trim();
    const json = intentarParsearJSON(texto);

    const pintarMapaEnDestino = (url, titulo = 'Mapa', textoIntro = '') => {
        destino.innerHTML = '';

        if (textoIntro) {
            const textoDiv = document.createElement('div');
            textoDiv.innerHTML = formatearContenidoBasico(textoIntro);
            destino.appendChild(textoDiv);
        }

        const wrapper = document.createElement('div');
        wrapper.style.marginTop = textoIntro ? '12px' : '0';
		
		
        const label = document.createElement('div');
        label.style.marginBottom = '8px';
        label.style.fontWeight = '600';
        label.style.color = '#9A1032';
        label.textContent = titulo;
		

		const wrapperMapa = document.createElement('div');
		wrapperMapa.className = 'respuesta-mapa';

		const iframe = document.createElement('iframe');
		iframe.src = String(url);
		iframe.loading = 'lazy';
		iframe.allowFullscreen = true;
		iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');

		wrapperMapa.appendChild(iframe);
		destino.appendChild(wrapperMapa);

        autoScroll();
        return destino;
    };

    if (json && json.tipo === 'mapa' && json.url) {
        return pintarMapaEnDestino(
            json.url,
            json.titulo || 'Mapa',
            json.texto || ''
        );
    }

    const urlMapa = extraerUrlMapa(texto);
    if (urlMapa) {
        const resto = texto.replace(urlMapa, '').trim();
        return pintarMapaEnDestino(urlMapa, 'Mapa', resto);
    }

    if (destino === divMensajes) {
        return agregarMensaje(texto, 'ai');
    }

    const textoDiv = document.createElement('div');
	textoDiv.innerHTML = formatearContenidoBasico(texto);

	destino.innerHTML = '';
	destino.appendChild(textoDiv);
	destino.appendChild(crearBotonCopiar(texto));
    autoScroll();
    return destino;
}