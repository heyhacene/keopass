const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const isWin = process.platform === 'win32';
const targetZip = path.resolve(__dirname, '..', 'keopass-extension.zip');
const extensionDir = path.resolve(__dirname, '..', 'extension');

if (fs.existsSync(targetZip)) {
  fs.unlinkSync(targetZip);
}

if (isWin) {
  execSync(`powershell -Command "Compress-Archive -Path '${extensionDir}/*' -DestinationPath '${targetZip}' -Force"`);
} else {
  execSync(`cd "${extensionDir}" && zip -r "${targetZip}" ./*`);
}

console.log('✅ Extension KeoPass empaquetée avec succès dans :', targetZip);
