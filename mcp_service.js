/**
 * ============================================================================
 * ARCHIVO: mcp_service.js
 * DESCRIPCIÓN: Servicio de Protocolo de Contexto de Modelos (MCP).
 * ============================================================================
 */

import { MCP_URL_1, MCP_URL_2 } from './chatbot_api.js';
import { reverseGeocode } from './geo_service.js';

// --- ESTADO INTERNO ---
let herramientasDinamicas = [];
const mapaRutasHerramientas = {};

// Herramienta local: vive en el frontend, pero se expone como si fuera una tool MCP.
const herramientaLocalReverseGeocode = {
  type: "function",
  function: {
    name: "reverse_geocode",
    description: "Convierte unas coordenadas GPS en una dirección aproximada y su tipo de vía mediante geocodificación inversa.",
    parameters: {
      type: "object",
      properties: {
        lat: {
          type: "number",
          description: "Latitud de la coordenada."
        },
        lon: {
          type: "number",
          description: "Longitud de la coordenada."
        }
      },
      required: ["lat", "lon"],
      additionalProperties: false
    }
  }
};

/**
 * Convierte la respuesta cruda de Nominatim en un formato más útil para la IA.
 */
function normalizarReverseGeocode(data, lat, lon) {
  const address = data?.address || {};

  const nombreVia =
    address.road ||
    address.pedestrian ||
    address.footway ||
    address.path ||
    address.residential ||
    address.service ||
    address.avenue ||
    address.square ||
    address.plaza ||
    null;

  const texto = `${nombreVia || ""} ${data?.display_name || ""}`.toLowerCase();

  let tipoVia = "Calle";

  if (texto.includes("avenida") || texto.includes("avenue") || texto.includes("av.")) {
    tipoVia = "Avenida";
  } else if (texto.includes("plaza") || texto.includes("square")) {
    tipoVia = "Plaza";
  }

  return {
    lat,
    lon,
    tipoVia,
    nombreVia,
    informacionAdicional: data?.display_name || null,
    raw: data
  };
}

/**
 * Carga herramientas desde los servidores MCP remotos y añade la local.
 */
export async function cargarHerramientas() {
  console.log("Iniciando configuración MULTI-SERVIDOR...");

  const listaServidores = [MCP_URL_1, MCP_URL_2];
  herramientasDinamicas = [];

  // Limpiamos el mapa por seguridad
  for (const key of Object.keys(mapaRutasHerramientas)) {
    delete mapaRutasHerramientas[key];
  }

  for (const urlServidor of listaServidores) {
    if (!urlServidor) continue;

    console.log(`Conectando con: ${urlServidor}...`);

    try {
      const respuesta = await fetch(urlServidor, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
          params: {}
        })
      });

      const reader = respuesta.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let textoAcumulado = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textoAcumulado += decoder.decode(value, { stream: true });
      }

      const inicioJSON = textoAcumulado.indexOf('{');
      if (inicioJSON === -1) continue;

      const jsonCompleto = JSON.parse(textoAcumulado.substring(inicioJSON));

      if (jsonCompleto.result && jsonCompleto.result.tools) {
        const tools = jsonCompleto.result.tools;

        console.group(`SERVIDOR: ${urlServidor}`);
        console.log(`${tools.length} herramientas encontradas.`);
        console.table(
          tools.map(t => ({
            Nombre: t.name,
            Descripción: t.description ? t.description.substring(0, 50) + "..." : "---"
          }))
        );
        console.groupEnd();

        tools.forEach(tool => {
          mapaRutasHerramientas[tool.name] = urlServidor;

          herramientasDinamicas.push({
            type: "function",
            function: {
              name: tool.name,
              description: tool.description,
              parameters: tool.inputSchema
            }
          });
        });
      }

    } catch (err) {
      console.warn(`Error conectando con ${urlServidor}:`, err);
    }
  }

  // Añadimos la herramienta local al catálogo que verá la IA
  mapaRutasHerramientas["reverse_geocode"] = "__LOCAL__";
  herramientasDinamicas.push(herramientaLocalReverseGeocode);

  console.log("Carga de herramientas completada.");
}

export function getHerramientasDisponibles() {
  return herramientasDinamicas;
}

export async function ejecutarHerramienta(nombreFuncion, argsDict) {

  // Caso local: reverse_geocode
  if (nombreFuncion === "reverse_geocode") {
    const lat = Number(argsDict.lat);
    const lon = Number(argsDict.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return "Error: lat y lon deben ser números válidos.";
    }

    try {
      const data = await reverseGeocode(lat, lon);
      const resultado = normalizarReverseGeocode(data, lat, lon);
      return JSON.stringify(resultado);
    } catch (error) {
      return `Error técnico ejecutando reverse_geocode: ${error.message}`;
    }
  }

  // Resto de herramientas remotas
  const urlDestino = mapaRutasHerramientas[nombreFuncion];

  if (!urlDestino) {
    return "Error: Herramienta no encontrada en el catálogo local.";
  }

  for (const key in argsDict) {
    if (typeof argsDict[key] === 'number') {
      argsDict[key] = String(argsDict[key]);
    }
  }

  try {
    const respuesta = await fetch(urlDestino, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: nombreFuncion,
          arguments: argsDict
        }
      })
    });

    const reader = respuesta.body.getReader();
    const decoder = new TextDecoder("utf-8");

    let textoAcumulado = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      textoAcumulado += decoder.decode(value, { stream: true });
    }

    const inicioJSON = textoAcumulado.indexOf('{');
    if (inicioJSON === -1) {
      throw new Error("Respuesta del servidor inválida o vacía");
    }

    const jsonLimpio = JSON.parse(textoAcumulado.substring(inicioJSON));

    if (jsonLimpio.result && jsonLimpio.result.content) {
      return jsonLimpio.result.content[0].text;
    }

    if (jsonLimpio.error) {
      return `Error del servidor remoto: ${jsonLimpio.error.message}`;
    }

    return JSON.stringify(jsonLimpio);

  } catch (error) {
    console.error("Error técnico en mcp_service:", error);
    return "Error técnico de conexión con la herramienta.";
  }
}