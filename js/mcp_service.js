
/**
 * ============================================================================
 * ARCHIVO: mcp_service.js
 * DESCRIPCIÓN: Servicio de Protocolo de Contexto de Modelos (MCP).
 * RESPONSABILIDADES:
 * 1. Conectar con múltiples servidores MCP al inicio.
 * 2. Descargar y unificar el catálogo de herramientas disponibles.
 * 3. "Enrutar" las peticiones: Saber si una herramienta pertenece al Servidor 1 o al 2.
 * 4. Ejecutar las herramientas remotas usando el estándar JSON-RPC 2.0.
 * ============================================================================
 */


import { MCP_URL_1, MCP_URL_2 } from './chatbot_api.js';

// --- ESTADO INTERNO ---

// Lista formateada para OpenAI (contiene nombres, descripciones y esquemas de parámetros).
let herramientasDinamicas = [];

// Diccionario de enrutamiento "inteligente".
// Clave: Nombre de la función (ej: "get_farmacias") -> Valor: URL del servidor (ej: "https://geocaceres...")
// Esto nos permite saber a dónde enviar la petición cuando la IA decida usar una herramienta.
const mapaRutasHerramientas = {};


/**
 * Recorre la lista de servidores, descarga sus herramientas y construye el catálogo global.
 * Se ejecuta una sola vez al cargar la página.
 */

export async function cargarHerramientas() {
    console.log("Iniciando configuración MULTI-SERVIDOR...");
    
    // Lista de servidores a consultar (definidos en la API config)
    const listaServidores = [MCP_URL_1, MCP_URL_2];
    herramientasDinamicas = []; // Reiniciamos la lista por seguridad

    // Iteramos por cada servidor
    for (const urlServidor of listaServidores) {
        if (!urlServidor) continue; // Saltamos si la URL está vacía
        console.log(`Conectando con: ${urlServidor}...`);

        try {
            // 1. Petición JSON-RPC para listar herramientas ("tools/list")
            const respuesta = await fetch(urlServidor, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} })
            });

            // 2. LECTURA MANUAL DEL STREAM (FLUJO DE DATOS)
            // Usamos un lector de bajo nivel en lugar de respuesta.json() para tener control total
            // sobre la decodificación, útil si el servidor responde con fragmentos (chunks) o datos extraños.
            const reader = respuesta.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let textoAcumulado = "";
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                textoAcumulado += decoder.decode(value, { stream: true });
            }

            // 3. LIMPIEZA Y PARSEO
            // A veces los servidores incluyen cabeceras o ruido antes del JSON real.
            // Buscamos la primera llave '{' para asegurarnos de parsear solo el objeto JSON.
            const inicioJSON = textoAcumulado.indexOf('{');
            if (inicioJSON === -1) continue;
            const jsonCompleto = JSON.parse(textoAcumulado.substring(inicioJSON));

            // 4. PROCESAMIENTO DE HERRAMIENTAS
            if (jsonCompleto.result && jsonCompleto.result.tools) {
                const tools = jsonCompleto.result.tools;

                // Logs visuales para depuración en consola
                console.group(`SERVIDOR: ${urlServidor}`);
                console.log(`${tools.length} herramientas encontradas.`);
                console.table(tools.map(t => ({ 
                    Nombre: t.name, 
                    Descripción: t.description ? t.description.substring(0, 50) + "..." : "---"
                })));
                console.groupEnd();

                // Guardamos cada herramienta en nuestro sistema
                tools.forEach(tool => {
                    // A. Guardamos la ruta: "Esta herramienta vive en este servidor"
                    mapaRutasHerramientas[tool.name] = urlServidor;

                    // B. Añadimos a la lista que enviaremos a OpenAI
                    herramientasDinamicas.push({
                        type: "function",
                        function: {
                            name: tool.name,
                            description: tool.description,
                            parameters: tool.inputSchema // Definición de argumentos requeridos
                        }
                    });
                });
            }
        } catch (err) {
            console.warn(`Error conectando con ${urlServidor}:`, err);
        }
    }
    console.log("Carga de herramientas completada.");
}

/**
 * Getter simple para devolver las herramientas ya cargadas.
 * @returns {Array} Lista de herramientas formateada para OpenAI.
 */
export function getHerramientasDisponibles() {
    return herramientasDinamicas;
}

/**
 * Ejecuta una herramienta específica en su servidor correspondiente.
 * @param {string} nombreFuncion - El nombre de la herramienta (ej: "get_paradas_bus").
 * @param {Object} argsDict - Los argumentos que envía la IA (ej: { lat: 40, lon: -6 }).
 * @returns {Promise<string>} El resultado en texto plano o JSON stringificado.
 */
export async function ejecutarHerramienta(nombreFuncion, argsDict) {
    // 1. ENRUTAMIENTO: Buscamos a qué servidor pertenece esta función
    const urlDestino = mapaRutasHerramientas[nombreFuncion];

    if (!urlDestino) {
        return "Error: Herramienta no encontrada en el catálogo local.";
    }

    // 2. SANITIZACIÓN DE DATOS
    // Algunos servidores antiguos fallan si reciben números puros, así que convertimos todo a String.
    for (const key in argsDict) {
        if (typeof argsDict[key] === 'number') argsDict[key] = String(argsDict[key]);
    }

    try {
        // 3. LLAMADA REMOTA (JSON-RPC "tools/call")
        const respuesta = await fetch(urlDestino, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "tools/call",
                params: { name: nombreFuncion, arguments: argsDict }
            })
        });

        // 4. LECTURA DE RESPUESTA (Misma técnica de stream que arriba)
        const reader = respuesta.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let textoAcumulado = "";
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            textoAcumulado += decoder.decode(value, { stream: true });
        }

        const inicioJSON = textoAcumulado.indexOf('{');
        if (inicioJSON === -1) throw new Error("Respuesta del servidor inválida o vacía");
        
        const jsonLimpio = JSON.parse(textoAcumulado.substring(inicioJSON));

        // 5. EXTRACCIÓN DEL CONTENIDO
        // El estándar MCP devuelve el resultado dentro de result.content[0].text
        if (jsonLimpio.result && jsonLimpio.result.content) {
            return jsonLimpio.result.content[0].text;
        }
        
        // Manejo de errores que devuelve el propio servidor MCP
        if (jsonLimpio.error) return `Error del servidor remoto: ${jsonLimpio.error.message}`;
        
        return JSON.stringify(jsonLimpio);

    } catch (error) {
        console.error("Error técnico en mcp_service:", error);
        return "Error técnico de conexión con la herramienta.";
    }
}
