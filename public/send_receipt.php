<?php
declare(strict_types=1);

require_once __DIR__ . '/vendor/autoload.php';

use Dotenv\Dotenv;

header('Content-Type: application/json; charset=utf-8');

function respond(bool $ok, string $message, array $extra = []): void {
    http_response_code($ok ? 200 : 400);
    echo json_encode(array_merge([
        'ok' => $ok,
        'message' => $message
    ], $extra));
    exit;
}

try {
    $dotenv = Dotenv::createImmutable(__DIR__);
    $dotenv->safeLoad();

    $botToken = $_ENV['BOT_TOKEN'] ?? getenv('BOT_TOKEN') ?: '';
    $chatId = $_ENV['CHAT_ID'] ?? getenv('CHAT_ID') ?: '';

    if ($botToken === '' || $chatId === '') {
        respond(false, 'Missing BOT_TOKEN or CHAT_ID in .env');
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        respond(false, 'Invalid request method');
    }

    if (!isset($_FILES['receipt']) || !is_uploaded_file($_FILES['receipt']['tmp_name'])) {
        respond(false, 'Receipt image is required');
    }

    $file = $_FILES['receipt'];

    if ($file['error'] !== UPLOAD_ERR_OK) {
        respond(false, 'Upload failed with error code: ' . $file['error']);
    }

    if ($file['size'] > 5 * 1024 * 1024) {
        respond(false, 'File too large. Maximum size is 5MB');
    }

    $allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    $mime = mime_content_type($file['tmp_name']) ?: '';
    if (!in_array($mime, $allowedMime, true)) {
        respond(false, 'Invalid file type');
    }

    $name = mb_substr(trim((string)($_POST['name'] ?? '')), 0, 100);
    $amount = mb_substr(trim((string)($_POST['amount'] ?? '')), 0, 50);
    $reference = mb_substr(trim((string)($_POST['reference'] ?? '')), 0, 100);
    $note = mb_substr(trim((string)($_POST['note'] ?? '')), 0, 300);
    $time = mb_substr(trim((string)($_POST['time'] ?? date('M d, Y h:i:s A'))), 0, 100);
    $location = mb_substr(trim((string)($_POST['location'] ?? 'Location unavailable')), 0, 150);

    $caption =
        "Payment Receipt\n" .
        "Name: {$name}\n" .
        "Amount: {$amount}\n" .
        "Reference: " . ($reference !== '' ? $reference : '-') . "\n" .
        "Time: {$time}\n" .
        "Location: {$location}\n" .
        "Note: " . ($note !== '' ? $note : '-');

    $photo = function_exists('curl_file_create')
        ? curl_file_create($file['tmp_name'], $mime, $file['name'])
        : new CURLFile($file['tmp_name'], $mime, $file['name']);

    $url = "https://api.telegram.org/bot{$botToken}/sendPhoto";

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => [
            'chat_id' => $chatId,
            'photo' => $photo,
            'caption' => $caption
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_TIMEOUT => 30,
    ]);

    $result = curl_exec($ch);
    if ($result === false) {
        $err = curl_error($ch);
        curl_close($ch);
        respond(false, 'cURL error: ' . $err);
    }

    $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $json = json_decode($result, true);
    if ($httpCode < 200 || $httpCode >= 300 || !is_array($json) || empty($json['ok'])) {
        respond(false, 'Telegram API error', ['telegram_response' => $json ?? $result]);
    }

    respond(true, 'Receipt sent successfully');
} catch (Throwable $e) {
    respond(false, 'Server error: ' . $e->getMessage());
}