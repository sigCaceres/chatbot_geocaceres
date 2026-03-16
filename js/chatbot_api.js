/**
 * ============================================================================
 * ARCHIVO: chatbot_api.js
 * DESCRIPCIÓN: Distribuidor de endpoints.
 * ============================================================================
 */

import { CONFIG } from './config.js';

// Exportamos las variables usando los nombres que el resto de tus archivos ya esperan
export const IA_URL = CONFIG.PROXY_IA_URL;

export const MCP_URL_1 = CONFIG.SERVIDORES_MCP[0];
export const MCP_URL_2 = CONFIG.SERVIDORES_MCP[1];