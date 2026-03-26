#!/bin/bash
# Script untuk mentrigger production webhook n8n dengan gambar lampiran
IMAGE_PATH="/Users/aisyah/Documents/Reimburst/1_ 20251125184242535423.jpg"

if [ -f "$IMAGE_PATH" ]; then
  # Encode file gambar menjadi Base64
  BASE64_IMG="data:image/jpeg;base64,$(base64 -i "$IMAGE_PATH")"
  
  # Kirim request POST dengan Payload JSON ke URL PRODUCTION BARU
  echo "Mengirim request ke URL Production webhook n8n..."
  curl -X POST \
    -H "Content-Type: application/json" \
    -d "{\"reimbursementId\":\"req_test_123\",\"projectName\":\"MaxStream\",\"fileName\":\"$(basename "$IMAGE_PATH")\",\"base64\":\"$BASE64_IMG\"}" \
    "https://n8nreimburst.app.n8n.cloud/webhook/save-evidence-gdrive"
else
  echo "File gambar tidak ditemukan!"
fi
