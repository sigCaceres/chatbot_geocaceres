// js/spatial_service.js

const EARTH_RADIUS_METERS = 6371000;

function toRadians(degrees) {
    return (degrees * Math.PI) / 180;
}

export function calcularDistancia(lat1, lon1, lat2, lon2) {
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(lat1)) *
            Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) ** 2;

    return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function buscarCercanos(elementos, lat, lon, radioMetros = 500) {
    if (!Array.isArray(elementos)) return [];

    return elementos
        .map((item) => ({
            ...item,
            distancia: calcularDistancia(lat, lon, item.latitud, item.longitud)
        }))
        .filter((item) => item.distancia <= radioMetros)
        .sort((a, b) => a.distancia - b.distancia);
}

export function obtenerMasCercano(elementos, lat, lon) {
    const resultados = buscarCercanos(elementos, lat, lon, Number.MAX_SAFE_INTEGER);
    return resultados.length ? resultados[0] : null;
}

export function formatearResumenResultados(titulo, resultados, limite = 5) {
    if (!resultados || resultados.length === 0) {
        return `No se han encontrado ${titulo} cercanos.`;
    }

    const lineas = resultados.slice(0, limite).map((item, index) => {
        const metros = Math.round(item.distancia);
        return `${index + 1}. ${item.nombre} — ${metros} m`;
    });

    return `He encontrado ${resultados.length} ${titulo} cercanos:\n\n${lineas.join('\n')}`;
}