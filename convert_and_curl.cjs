const fs = require('fs');

// Asumsikan path gambar dari attachment
const imagePath = '/Users/aisyah/Documents/Reimburst/test-image.jpg';

// Membaca file gambar dan mengubahnya menjadi Base64
let base64Image = '';
try {
  const imageBuffer = fs.readFileSync(imagePath);
  base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
} catch (error) {
  console.log('Error reading file. Will use dummy base64 for the curl script generation.');
  base64Image = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBD...'; // Placeholder
}

// Data JSON
const payload = {
  projectName: 'Test Project Curl',
  fileName: 'test-evidence-curl.jpg',
  base64: base64Image
};

// Menyimpan ke file JSON agar curl rapi
fs.writeFileSync('payload.json', JSON.stringify(payload));
console.log('payload.json generated successfully.');
