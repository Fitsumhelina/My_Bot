$token = "7041187201:AAFi2fG36ToOc0AUIw1JGVX73xaf2k0yAOM"
$webhookUrl = "https://mybot-production-594f.up.railway.app/bot$token" 
$setWebhookUrl = "https://api.telegram.org/bot$token/setWebhook"

Invoke-WebRequest -Uri $setWebhookUrl -Method Post -Body @{ url = $webhookUrl }
