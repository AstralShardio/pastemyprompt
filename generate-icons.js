// Node.js script to generate icons for PasteMyPrompt
// Requires: npm install canvas
// Run: node generate-icons.js

const fs = require('fs');
const path = require('path');

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir);
}

// Try to use canvas if available, otherwise create simple placeholder
try {
  const { createCanvas } = require('canvas');
  
  function createIcon(size) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Background gradient - coral to orange
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#ff6b6b');
    gradient.addColorStop(1, '#ffa94d');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    
    // Draw "PM" text (PasteMyPrompt)
    ctx.fillStyle = 'white';
    ctx.font = `bold ${size * 0.45}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PM', size / 2, size / 2);
    
    return canvas;
  }
  
  // Generate icons
  [16, 48, 128].forEach(size => {
    const canvas = createIcon(size);
    const buffer = canvas.toBuffer('image/png');
    const filePath = path.join(iconsDir, `icon${size}.png`);
    fs.writeFileSync(filePath, buffer);
    console.log(`✓ Created ${filePath}`);
  });
  
  console.log('\n✅ All icons generated successfully!');
} catch (error) {
  console.log('⚠ Canvas package not found.');
  console.log('Install it with: npm install canvas');
  console.log('\nAlternatively, open generate-icons.html in your browser to generate icons.');
  
  // Create placeholder note
  const placeholder = path.join(iconsDir, 'README.txt');
  fs.writeFileSync(placeholder, 
    'Icons are required for the extension to work.\n\n' +
    'To generate icons:\n' +
    '1. Open generate-icons.html in your browser\n' +
    '2. Click "Download All Icons"\n' +
    '3. Save the files as icon16.png, icon48.png, icon128.png in this directory\n\n' +
    'Or install canvas and run: node generate-icons.js'
  );
  console.log(`\nCreated placeholder: ${placeholder}`);
}

