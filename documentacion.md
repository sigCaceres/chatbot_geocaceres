# Documentación Técnica: Chatbot Geo Cáceres

## 1. Visión General de la Arquitectura

El sistema implementa una arquitectura modular basada en el lado del cliente (Frontend) apoyada por un middleware ligero (Backend Proxy). El diseño sigue el principio de **Separación de Responsabilidades (Separation of Concerns)**, dividiendo la lógica de negocio, la interfaz de usuario, la geolocalización y la comunicación externa en servicios independientes.

El chatbot utiliza el modelo de OpenAI y se comunica mediante el estándar **Model Context Protocol (MCP)** con los servidores de datos espaciales e información administrativa del Ayuntamiento de Cáceres.

---

## 2. Estructura del Sistema (Módulos Frontend)

### `main.js` (Entry Point)
Punto de entrada principal de la aplicación.
* **Responsabilidades:** Orquesta la inicialización de servicios al cargar el DOM (GPS, herramientas MCP) y captura los eventos de interacción del usuario (clic en enviar, tecla Enter).
* **Flujo:** Captura el input -> Llama a la UI para mostrarlo -> Llama a `ia_service.js` -> Devuelve y formatea la respuesta en la UI.

### `config.js` & `chatbot_api.js` (Configuración)
Gestión de variables de entorno estáticas.
* **`config.js`:** Define las rutas hacia el proxy local y las URLs de los servidores MCP (`apisig` directo y `geocaceres` vía proxy para evitar CORS).
* **`chatbot_api.js`:** Actúa como distribuidor centralizando las exportaciones de los endpoints para el resto de la aplicación.

### `ui_service.js` (Capa de Presentación)
Único módulo con permisos para interactuar directamente con el DOM.
* **Responsabilidades:** Renderizado de burbujas de chat (usuario/IA), gestión del scroll automático, y despliegue de indicadores de estado temporales ("Pensando...", "Consultando [herramienta]").
* **Utilidades:** Incluye la función `formatearTexto` para parsear Markdown a HTML puro de forma segura.

### `geo_service.js` (Servicio de Contexto Físico)
Abstracción de la API nativa del navegador (`navigator.geolocation`).
* **Responsabilidades:** Solicitar permisos al usuario de forma asíncrona, almacenar el estado global de las coordenadas en memoria y proveer un *getter* seguro (`obtenerUbicacion()`) para inyectar el contexto físico en los prompts de la IA.

### `prompts.js` (Capa de Reglas de Negocio)
Almacén del comportamiento central del Agente IA.
* **Responsabilidades:** Generar dinámicamente el *System Prompt* combinando la fecha actual, la ubicación del usuario (si existe) y las directrices de razonamiento en cascada.
* **Lógica crítica:** Define reglas de oro estrictas para evitar alucinaciones, diferenciando el protocolo de búsqueda de servicios (autobuses/farmacias mediante radio espacial) del protocolo de datos administrativos (NumPol/Direcciones).

### `mcp_service.js` (Conector de Datos y Herramientas)
Gestor de integraciones mediante el estándar MCP (JSON-RPC 2.0).
* **Responsabilidades:** 1. Conectar asíncronamente a múltiples servidores al arranque.
  2. Parsear *streams* de datos para reconstruir los catálogos de herramientas.
  3. Crear un mapa de enrutamiento interno (`mapaRutasHerramientas`) para saber a qué servidor pertenece cada función.
  4. Ejecutar llamadas remotas con sanitización de argumentos (forzado de strings).

### `ia_service.js` (Core del Agente)
Cerebro de la aplicación. Gestiona la comunicación con el LLM y el bucle de ejecución de herramientas.
* **Responsabilidades:**
  1. **Gestión de Memoria:** Controla el tamaño del historial (`MAX_HISTORIAL`) eliminando mensajes antiguos y limpiando ejecuciones huérfanas de herramientas (prevención de errores HTTP 400).
  2. **Bucle de Agente:** Evalúa si la IA requiere usar herramientas (`tool_calls`). Si es así, paraliza la respuesta, ejecuta la función vía `mcp_service.js`, inyecta el resultado en el historial y vuelve a consultar a la IA recursivamente hasta obtener lenguaje natural.
  3. **Seguridad:** Implementa un `MAX_ITERACIONES` para evitar bucles infinitos en caso de consultas anómalas.

---

## 3. Capa de Seguridad y Red (Backend Proxy)

### `proxy.php` (Middleware Enrutador)
Pieza clave de la infraestructura web para solventar limitaciones de arquitectura frontend.
* **Responsabilidad 1 (Seguridad):** Oculta la clave de la API de OpenAI del lado del cliente. Recibe la petición genérica del frontend, le inyecta la cabecera `Authorization: Bearer` en el servidor y ejecuta la llamada mediante `cURL`.
* **Responsabilidad 2 (Bypass de CORS):** Actúa como puente para servidores municipales restrictivos (ej. `geocaceres.caceres.es`). Al realizar la petición HTTP servidor-a-servidor mediante `cURL`, se evade el bloqueo de *Cross-Origin Resource Sharing* impuesto por los navegadores web.
* **Enrutamiento:** Utiliza el parámetro `?service=` (ia o mcp) para determinar el destino final del paquete de datos.

---

## 4. Guía de Despliegue y Consideraciones para Producción

1. **Gestión de Credenciales:** * **CRÍTICO:** La clave real de OpenAI debe residir *únicamente* dentro de `proxy.php`. Nunca debe subirse a repositorios públicos de Git ni enviarse por canales de texto no encriptados. Si la clave se expone, debe ser revocada inmediatamente desde el panel de OpenAI.
2. **Actualización en Servidor:** * Tras cualquier modificación en los archivos `.js`, es imperativo forzar el vaciado de la caché en el navegador (`Ctrl + F5` o *Hard Reload*) para asegurar que se carga la versión actualizada del módulo y no la almacenada en memoria estática.
3. **Mantenimiento de Servidores MCP:**
   * El código frontend asume que las herramientas devolverán un JSON válido. Cualquier caída interna de la base de datos municipal devolverá un error gestionado (`Error del servidor remoto`), el cual la IA leerá para notificar educadamente al usuario.