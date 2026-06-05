/**
 * ============================================================================
 * ARCHIVO: geo_service.js
 * DESCRIPCIÓN: Servicio de Geolocalización.
 * ============================================================================
 */

// --- ESTADO DEL MÓDULO ---
// Variable privada para guardar las coordenadas.
let ubicacionUsuario = null;

// Variable privada para guardar la ubicación enriquecida con datos de dirección.
let ubicacionUsuarioDetallada = null;

/**
 * Función "Getter" para acceder a la ubicación desde otros archivos.
 * @returns {Object|null} Objeto {lat, lon} o null si no hay ubicación.
 */
export function obtenerUbicacion() {
    return ubicacionUsuario;
}

/**
 * Función "Getter" para acceder a la ubicación enriquecida.
 * Devuelve lat/lon, tipo de vía, nombre de vía e información adicional.
 * @returns {Object|null}
 */
export function obtenerUbicacionDetallada() {
    return ubicacionUsuarioDetallada;
}

/**
 * Extrae un nombre de vía razonable desde la respuesta de Nominatim.
 * Nominatim puede devolver distintos campos dentro de "address" según el lugar.
 * @param {Object} address
 * @returns {string|null}
 */
function extraerNombreVia(address = {}) {
    return (
        address.road ||
        address.pedestrian ||
        address.footway ||
        address.path ||
        address.residential ||
        address.service ||
        address.avenue ||
        address.square ||
        address.plaza ||
        null
    );
}

/**
 * Intenta clasificar el tipo de vía en Calle / Avenida / Plaza.
 * Si no puede inferirse con claridad, devuelve "Calle" como valor por defecto.
 * @param {Object} data
 * @returns {string}
 */
function inferirTipoVia(data = {}) {
    const address = data.address || {};
    const nombreVia = extraerNombreVia(address) || "";
    const texto = `${nombreVia} ${data.display_name || ""}`.toLowerCase();

    if (texto.includes("avenida") || texto.includes("avenue") || texto.includes("av.")) {
        return "Avenida";
    }

    if (texto.includes("plaza") || texto.includes("square")) {
        return "Plaza";
    }

    return "Calle";
}

/**
 * Construye un texto legible para mostrar en la interfaz.
 * Así evitamos pasar objetos directamente a la UI y terminar con "[object Object]".
 * @param {Object|null} ubicacion
 * @returns {string}
 */
function construirMensajeUbicacion(ubicacion) {
    if (!ubicacion) return "Ubicación activada";

    const partes = ["Ubicación activada"];

    if (ubicacion.tipoVia && ubicacion.nombreVia) {
        partes.push(`${ubicacion.tipoVia}: ${ubicacion.nombreVia}`);
    } else if (ubicacion.nombreVia) {
        partes.push(ubicacion.nombreVia);
    }

    return partes.join(" - ");
}

/**
 * Llama a Nominatim para hacer geocodificación inversa y obtener la dirección
 * asociada a unas coordenadas.
 *
 * Endpoint oficial de reverse geocoding:
 * https://nominatim.openstreetmap.org/reverse?lat=<value>&lon=<value>&<params>
 *
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<Object>}
 */
export async function reverseGeocode(lat, lon) {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.search = new URLSearchParams({
        lat: String(lat),
        lon: String(lon),
        format: "jsonv2",
        addressdetails: "1"
    }).toString();

    const response = await fetch(url.toString(), {
        headers: {
            "Accept-Language": "es"
        }
    });

    if (!response.ok) {
        throw new Error(`Error en reverseGeocode: ${response.status} ${response.statusText}`);
    }

    return await response.json();
}

/**
 * Inicia el proceso de solicitud de permisos GPS al navegador.
 * Si obtiene coordenadas, hace también geocodificación inversa y guarda el resultado.
 *
 * @param {Function} callbackVisual - (Opcional) Función que se ejecutará si la localización tiene éxito.
 */
export function iniciarGPS(callbackVisual) {
    if (!navigator.geolocation) {
        console.warn("Tu navegador no soporta geolocalización.");
        return;
    }

    console.log("Solicitando permiso de ubicación...");

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            ubicacionUsuario = {
                lat: position.coords.latitude,
                lon: position.coords.longitude
            };

            console.log("Ubicación detectada:", ubicacionUsuario);

            try {
                const data = await reverseGeocode(ubicacionUsuario.lat, ubicacionUsuario.lon);
                const address = data?.address || {};
                const nombreVia = extraerNombreVia(address);
                const tipoVia = inferirTipoVia({ address, display_name: data?.display_name });

                ubicacionUsuarioDetallada = {
                    ...ubicacionUsuario,
                    tipoVia,
                    nombreVia,
                    informacionAdicional: data?.display_name || null,
                    raw: data
                };

                console.log("Ubicación enriquecida:", ubicacionUsuarioDetallada);
            } catch (error) {
                console.warn("No se pudo hacer reverse geocoding:", error.message);

                ubicacionUsuarioDetallada = {
                    ...ubicacionUsuario,
                    tipoVia: null,
                    nombreVia: null,
                    informacionAdicional: null,
                    error: error.message
                };
            }

            if (callbackVisual) {
                callbackVisual(construirMensajeUbicacion(ubicacionUsuarioDetallada));
            }
        },
        (error) => {
            console.warn("Ubicación denegada o error:", error.message);

            if (callbackVisual) {
                callbackVisual("No se pudo activar la ubicación");
            }
        }
    );
}