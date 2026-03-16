/**
 * ============================================================================
 * ARCHIVO: geo_service.js
 * DESCRIPCIÓN: Servicio de Geolocalización.
 * RESPONSABILIDADES:
 * 1. Abstraer la API nativa del navegador (navigator.geolocation).
 * 2. Almacenar el estado de la ubicación actual (latitud/longitud).
 * 3. Proveer métodos para que otros módulos (como la IA) lean la ubicación.
 * ============================================================================
 */

// --- ESTADO DEL MÓDULO ---
// Variable privada para guardar las coordenadas.
// Al estar fuera de las funciones exportadas, mantiene su valor mientras la web esté abierta.
let ubicacionUsuario = null;


/**
 * Función "Getter" para acceder a la ubicación desde otros archivos.
 * Permite leer el dato sin riesgo de modificarlo accidentalmente desde fuera.
 * @returns {Object|null} Objeto {lat, lon} o null si no hay ubicación.
 */
export function obtenerUbicacion() {
    return ubicacionUsuario;
}

/**
 * Inicia el proceso de solicitud de permisos GPS al navegador.
 * * @param {Function} callbackVisual - (Opcional) Una función que se ejecutará 
 * si la localización tiene éxito. Se usa para actualizar la UI (ej: mostrar aviso verde).
 * Esto permite separar la lógica (este archivo) de la vista (ui_service.js).
 */
export function iniciarGPS(callbackVisual) {
    // 1. Verificamos si el navegador soporta geolocalización
    if (!navigator.geolocation) {
        console.warn("Tu navegador no soporta geolocalización.");
        return;
    }

    
    console.log("Solicitando permiso de ubicación...");
    // 2. Solicitamos la ubicación actual al navegador
    navigator.geolocation.getCurrentPosition(

        // En caso de exito, guardamos las coordenadas en una varible de estado
        (position) => {
            ubicacionUsuario = {
                lat: position.coords.latitude,
                lon: position.coords.longitude
            };
            console.log("Ubicación detectada:", ubicacionUsuario);
            // Si nos pasaron una función para actualizar la pantalla, la ejecutamos ahora
            if (callbackVisual) callbackVisual(); 
        },
        (error) => { // En caso de erro, que puede ser por denegación del permiso o fallo en la señal del GPS
            console.warn("Ubicación denegada o error:", error.message);
        }
    );
}