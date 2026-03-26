#!/bin/bash
# Script untuk mentrigger test webhook n8n dengan gambar lampiran
IMAGE_PATH="/Users/aisyah/Documents/Reimburst/1_ 20251125184242535423.jpg"

if [ -f "$IMAGE_PATH" ]; then
  # Encode file gambar menjadi Base64
  BASE64_IMG="data:image/jpeg;base64,$(base64 -i "$IMAGE_PATH")"
  
  # Kirim request POST dengan Payload JSON
  curl -X POST \
    -H "Content-Type: application/json" \
    -d "{\"projectName\":\"MaxStream\",\"fileName\":\"$(basename "$IMAGE_PATH")\",\"base64\":\"$BASE64_IMG\"}" \
    "https://aisha.salt.id/n8n/webhook-test/save-evidence-gdrive"
else
  echo "File gambar tidak ditemukan!"
fi
