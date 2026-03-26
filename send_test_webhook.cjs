const fs = require('fs');
const https = require('https');

// Path gambar yang baru Anda upload
const imagePath = '/Users/aisyah/Documents/Reimburst/1_ 20251125184242535423.jpg';

try {
  // 1. Baca gambar dan ubah ke Base64
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;

  // 2. Susun payload JSON
  const payload = JSON.stringify({
    projectName: 'MaxStream',
    fileName: '1_ 20251125184242535423.jpg',
    base64: base64Image
  });

  // 3. Opsi HTTP Request
  const options = {
    hostname: 'aisha.salt.id',
    path: '/n8n/webhook-test/save-evidence-gdrive',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  // 4. Kirim Request
  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log(`Status Code: ${res.statusCode}`);
      console.log(`Response: ${data}`);
    });
  });

  req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
  });

  // Tulis data dan selesaikan request
  req.write(payload);
  req.end();
} catch (error) {
  console.error('Error:', error.message);
}
