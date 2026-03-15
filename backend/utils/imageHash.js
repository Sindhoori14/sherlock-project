const Jimp = require('jimp');

async function averageHashFromFile(filePath, bits = 8) {
  const img = await Jimp.read(filePath);
  img.resize(bits, bits).greyscale();
  let total = 0;
  const pixels = [];
  for (let y = 0; y < bits; y++) {
    for (let x = 0; x < bits; x++) {
      const idx = y * bits + x;
      const { r, g, b } = Jimp.intToRGBA(img.getPixelColor(x, y));
      const val = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      pixels[idx] = val;
      total += val;
    }
  }
  const avg = total / (bits * bits);
  let hashBits = '';
  for (let i = 0; i < pixels.length; i++) {
    hashBits += pixels[i] >= avg ? '1' : '0';
  }
  let hex = '';
  for (let i = 0; i < hashBits.length; i += 4) {
    const chunk = hashBits.slice(i, i + 4);
    hex += parseInt(chunk, 2).toString(16);
  }
  return hex;
}

function hammingDistanceHex(a, b) {
  const len = Math.min(a.length, b.length);
  let dist = 0;
  for (let i = 0; i < len; i++) {
    const x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    dist += (x & 1) + ((x >> 1) & 1) + ((x >> 2) & 1) + ((x >> 3) & 1);
  }
  return dist + Math.abs(a.length - b.length) * 4;
}

function hashSimilarity(a, b, bits = 8) {
  const maxBits = bits * bits;
  const dist = hammingDistanceHex(a, b);
  return 1 - dist / maxBits;
}

module.exports = {
  averageHashFromFile,
  hashSimilarity
};

