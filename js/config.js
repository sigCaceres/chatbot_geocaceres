/**
 * ============================================================================
 * ARCHIVO: config.js
 * DESCRIPCIÓN: Variables de entorno públicas (URLs y configuraciones).
 * ============================================================================
 */

export const CONFIG = {
    // Apuntamos al proxy solicitando el servicio de IA
    PROXY_IA_URL: "../proxy.php?service=ia", 
    
    SERVIDORES_MCP: [
        // Apuntamos al proxy solicitando el servicio MCP para evitar el CORS
        "../proxy.php?service=mcp",
        
        // Petición directa a apisig (no tiene problemas de CORS)
        "https://apisig.caceres.es/mcp"
    ]
};