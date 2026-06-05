 /**
  * ============================================================================
  * ARCHIVO: ia_service.js
  * DESCRIPCIÓN: Cerebro de la IA con Protección, Logs Avanzados y Memoria.
  * ============================================================================
  */

import { IA_URL } from './chatbot_api.js';
import { getHerramientasDisponibles, ejecutarHerramienta } from './mcp_service.js';
import { crearAvisoConsultando } from './ui_service.js';
import { obtenerUbicacion, obtenerUbicacionDetallada } from './geo_service.js';
import { generarPromptSistema } from './prompts.js';

const MAX_ITERACIONES = 6;
const MAX_HISTORIAL = 20;

let historialConversacion = [];

export async function obtenerRespuestaIA(mensajeUsuario) {
  try {

    // USAMOS UBICACIÓN DETALLADA SI EXISTE
    const ubicacion = obtenerUbicacionDetallada() || obtenerUbicacion();

    const herramientas = getHerramientasDisponibles();

    const fechaActual = new Date().toLocaleString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    const instruccionesSistema = generarPromptSistema(fechaActual, ubicacion);

    if (historialConversacion.length === 0) {
      historialConversacion.push({
        role: "system",
        content: instruccionesSistema
      });
    } else {
      historialConversacion[0].content = instruccionesSistema;

      if (historialConversacion.length > MAX_HISTORIAL) {
        const systemMsg = historialConversacion[0];
        let ultimosMensajes = historialConversacion.slice(-10);

        // Limpieza de huérfanos
        while (ultimosMensajes.length > 0 && ultimosMensajes[0].role === 'tool') {
          ultimosMensajes.shift();
        }

        historialConversacion = [systemMsg, ...ultimosMensajes];

        console.log("Historial recortado para ahorrar memoria.");
      }
    }

    historialConversacion.push({
      role: "user",
      content: mensajeUsuario
    });

    console.log("%c--- NUEVO TURNO DE CONVERSACIÓN ---", "color: violet");

    console.groupCollapsed("Contexto IA");
    console.log(`GPS: ${ubicacion ? 'Sí' : 'No'} | ${fechaActual}`);
    console.log(`Historial: ${historialConversacion.length} mensajes.`);
    console.groupEnd();

    if (herramientas.length === 0) {
      console.warn("ALERTA: Sin herramientas cargadas.");
    }

    let contadorVueltas = 0;

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

      if (data.error) {
        throw new Error("API OpenAI: " + data.error.message);
      }

      const mensajeIA = data.choices[0].message;
      historialConversacion.push(mensajeIA);

      // USO DE HERRAMIENTAS
      if (mensajeIA.tool_calls && mensajeIA.tool_calls.length > 0) {

        console.log(
          `La IA ejecuta ${mensajeIA.tool_calls.length} herramientas (Vuelta ${contadorVueltas})...`
        );

        for (const toolCall of mensajeIA.tool_calls) {

          const nombreFunc = toolCall.function.name;

          let args = {};

          try {
            args = JSON.parse(toolCall.function.arguments);
          } catch (e) {
            console.error("Error parseando argumentos JSON:", e);

            historialConversacion.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: "Error: JSON inválido. Reintenta."
            });

            continue;
          }

          const avisoDiv = crearAvisoConsultando(nombreFunc);

          let resultado = "";

          try {
            resultado = await ejecutarHerramienta(nombreFunc, args);
          } catch (errTool) {
            resultado = `Error técnico: ${errTool.message}`;
          }

          avisoDiv.remove();

          console.groupCollapsed(`DATOS: ${nombreFunc}`);
          console.log("Argumentos:", args);

          try {
            console.log("Respuesta:", JSON.parse(resultado));
          } catch {
            console.log("Respuesta (Texto):", resultado);
          }

          console.groupEnd();

          historialConversacion.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: resultado
          });
        }

      } else {
        console.log("Respuesta final generada.");
        return mensajeIA.content;
      }
    }

    console.error("Demasiadas llamadas a herramientas.");
    return "La consulta es demasiado compleja. Intenta ser más específico.";

  } catch (error) {
    console.error("ERROR CRÍTICO:", error);
    return "Error interno. Revisa la consola.";
  }
}