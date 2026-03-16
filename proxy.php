<?php
// ============================================================================
// ARCHIVO: proxy.php
// DESCRIPCIÓN: Enrutador central para IA y servidor MCP con bloqueo CORS.
// ============================================================================

header('Content-Type: application/json');

// 1. Identificamos el destino mediante un parámetro en la URL (?service=)
// Si no se especifica, asumimos 'ia' por retrocompatibilidad
$service = isset($_GET['service']) ? $_GET['service'] : 'ia';
$inputData = file_get_contents('php://input');

// 2. Asignamos la ruta y cabeceras correspondientes según el servicio
if ($service === 'ia') {
    $url = 'https://api.openai.com/v1/chat/completions';
    // poner la clave de open ia
    $OPENAI_API_KEY = "clave"; 
    $headers = array(
        'Content-Type: application/json',
        'Authorization: Bearer ' . $OPENAI_API_KEY
    );
} else if ($service === 'mcp') {
    // Apuntamos al servidor del ayuntamiento que nos bloquea el CORS
    $url = 'https://geocaceres.caceres.es/mcp';
    $headers = array(
        'Content-Type: application/json'
    );
} else {
    http_response_code(400);
    echo json_encode(["error" => "Servicio no autorizado"]);
    exit;
}

// 3. Ejecutamos la petición HTTP desde nuestro backend (inmune al CORS)
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);

if ($inputData) {
    curl_setopt($ch, CURLOPT_POSTFIELDS, $inputData);
}

curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if(curl_errno($ch)){
    http_response_code(500);
    echo json_encode(["error" => "Error interno en cURL: " . curl_error($ch)]);
} else {
    http_response_code($httpCode);
    echo $response;
}

curl_close($ch);
?>