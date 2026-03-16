/**
 * ============================================================================
 * ARCHIVO: ia_service.js
 * DESCRIPCIÓN: Cerebro de la IA con Protección, Logs Avanzados y Memoria.
 * NIVEL: EXPERTO / PROD-READY
 * ============================================================================
 */

import { IA_URL } from './chatbot_api.js';
import { getHerramientasDisponibles, ejecutarHerramienta } from './mcp_service.js';
import { crearAvisoConsultando } from './ui_service.js';
import { obtenerUbicacion } from './geo_service.js';
import { generarPromptSistema } from './prompts.js'; 

const MAX_ITERACIONES = 6;
const MAX_HISTORIAL = 20;

let historialConversacion = [];

export async function obtenerRespuestaIA(mensajeUsuario) {
    try {
        const ubicacion = obtenerUbicacion();
        const herramientas = getHerramientasDisponibles();
        
        const fechaActual = new Date().toLocaleString('es-ES', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', 
            hour: '2-digit', minute: '2-digit', timeZoneName: 'short' 
        });

        // 2. GENERAMOS EL PROMPT LIMPIAMENTE
        const instruccionesSistema = generarPromptSistema(fechaActual, ubicacion);

        if (historialConversacion.length === 0) {
            historialConversacion.push({ role: "system", content: instruccionesSistema });
        } else {
            historialConversacion[0].content = instruccionesSistema;
            
            // ... (A partir de aquí, el código de limpieza del historial sigue igual)
            if (historialConversacion.length > MAX_HISTORIAL) {
                
                // 1. Guardamos el System Prompt (siempre es el índice 0)
                const systemMsg = historialConversacion[0];
                
                // 2. Cogemos solo los últimos 10 mensajes (o el número que definas)
                // Usamos 'slice' para extraer el final del array
                let ultimosMensajes = historialConversacion.slice(-10);

                // 3. LIMPIEZA DE HUÉRFANOS (La clave del error 400)
                while (ultimosMensajes.length > 0 && ultimosMensajes[0].role === 'tool') {
                    ultimosMensajes.shift(); // Elimina el primer elemento si es 'tool'
                }

                // 4. Reconstruimos el historial: System + Los últimos válidos
                historialConversacion = [systemMsg, ...ultimosMensajes];
                
                console.log("Historial recortado para ahorrar memoria.");
            }
        }

        historialConversacion.push({ role: "user", content: mensajeUsuario });

        // Logs limpios
        console.log("%c--- NUEVO TURNO DE CONVERSACIÓN ---", "color: violet");
        console.groupCollapsed("Contexto IA");
        console.log(`GPS: ${ubicacion ? 'Sí' : 'No'} | ${fechaActual}`);
        console.log(`Historial: ${historialConversacion.length} mensajes.`);
        console.groupEnd();

        if (herramientas.length === 0) console.warn("ALERTA: Sin herramientas cargadas.");

        // --- 4. BUCLE DE AGENTE (Con protección) ---
        let contadorVueltas = 0; // [MEJORA] Contador de seguridad

        while (contadorVueltas < MAX_ITERACIONES) {
            contadorVueltas++;

            const respuesta = await fetch(IA_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    
                },
                body: JSON.stringify({
                    model: "gpt-4o",
                    messages: historialConversacion,
                    tools: herramientas.length > 0 ? herramientas : undefined,
                    tool_choice: herramientas.length > 0 ? "auto" : "none"
                })
            });

            const data = await respuesta.json();
            if (data.error) throw new Error("API OpenAI: " + data.error.message);

            const mensajeIA = data.choices[0].message;
            historialConversacion.push(mensajeIA);

            // ¿La IA quiere usar herramientas?
            if (mensajeIA.tool_calls && mensajeIA.tool_calls.length > 0) {
                
                console.log(`La IA ejecuta ${mensajeIA.tool_calls.length} herramientas (Vuelta ${contadorVueltas})...`);

                for (const toolCall of mensajeIA.tool_calls) {
                    const nombreFunc = toolCall.function.name;
                    
                    // [MEJORA] Parseo seguro de argumentos
                    let args = {};
                    try { 
                        args = JSON.parse(toolCall.function.arguments); 
                    } catch (e) { 
                        console.error("Error crítico parseando argumentos JSON de la IA:", e);
                        // Inyectamos el error en el historial para que la IA sepa que falló su JSON
                        historialConversacion.push({
                            role: "tool",
                            tool_call_id: toolCall.id,
                            content: "Error: JSON de argumentos inválido. Por favor, reintenta."
                        });
                        continue; // Saltamos a la siguiente herramienta
                    }

                    const avisoDiv = crearAvisoConsultando(nombreFunc);
                    
                    let resultado = "";
                    try {
                        resultado = await ejecutarHerramienta(nombreFunc, args);
                    } catch (errTool) {
                        resultado = `Error técnico ejecutando herramienta: ${errTool.message}`;
                    }
                    
                    avisoDiv.remove();

                    // [MEJORA] Visualización limpia en consola
                    console.groupCollapsed(`DATOS: ${nombreFunc}`);
                    console.log("Argumentos:", args);
                    try {
                        console.log("Respuesta:", JSON.parse(resultado));
                    } catch (e) {
                        console.log("Respuesta (Texto):", resultado);
                    }
                    console.groupEnd();

                    // Guardamos en memoria
                    historialConversacion.push({
                        role: "tool",
                        tool_call_id: toolCall.id,
                        content: resultado
                    });
                }
                // El bucle 'while' continúa automáticamente

            } else {
                // Respuesta final
                console.log("Respuesta final generada.");
                return mensajeIA.content;
            }
        }

        // [MEJORA] Si llegamos aquí, es que hemos superado el límite de vueltas
        console.error("Bucle de seguridad activado: Demasiadas llamadas a herramientas.");
        return "Lo siento, la consulta es demasiado compleja y he tenido que detenerme por seguridad. Por favor, intenta ser más específico.";

    } catch (error) {
        console.error("ERROR CRÍTICO:", error);
        return "Ha ocurrido un error interno. Por favor, revisa la consola.";
    }
}