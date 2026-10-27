const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

// Create a simple uncompressed PNG in pure Node.js
function createCircularPNG(size = 64) {
  // Simple PNG generator with purple/indigo gradient circle
  const width = size
  const height = size
  
  // Row filter 0 (None) + 4 bytes per pixel (RGBA)
  const rowBytes = 1 + width * 4
  const rawData = Buffer.alloc(height * rowBytes)

  const radius = size / 2 - 2
  const center = size / 2

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes
    rawData[rowOffset] = 0 // Filter type: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4
      const dx = x - center
      const dy = y - center
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist <= radius) {
        // Gradient from Indigo (99, 102, 241) to Purple (168, 85, 247)
        const t = (x + y) / (size * 2)
        const r = Math.round(99 + (168 - 99) * t)
        const g = Math.round(102 + (85 - 102) * t)
        const b = Math.round(241 + (247 - 241) * t)

        // Draw inner ring / symbol
        const innerDist = Math.abs(dist - radius * 0.5)
        if (innerDist < 2) {
          rawData[pxOffset] = 255
          rawData[pxOffset + 1] = 255
          rawData[pxOffset + 2] = 255
          rawData[pxOffset + 3] = 255
        } else {
          rawData[pxOffset] = r
          rawData[pxOffset + 1] = g
          rawData[pxOffset + 2] = b
          rawData[pxOffset + 3] = 255
        }
      } else {
        // Transparent
        rawData[pxOffset] = 0
        rawData[pxOffset + 1] = 0
        rawData[pxOffset + 2] = 0
        rawData[pxOffset + 3] = 0
      }
    }
  }

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR chunk
  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(width, 0)
  ihdrData.writeUInt32BE(height, 4)
  ihdrData[8] = 8  // bit depth
  ihdrData[9] = 6  // color type: RGBA
  ihdrData[10] = 0 // compression: deflate
  ihdrData[11] = 0 // filter: standard
  ihdrData[12] = 0 // interlace: none

  function makeChunk(type, data) {
    const len = data.length
    const buf = Buffer.alloc(12 + len)
    buf.writeUInt32BE(len, 0)
    buf.write(type, 4, 4, 'ascii')
    data.copy(buf, 8)
    
    // Simple CRC32 calculation
    const crc = calcCRC32(Buffer.concat([Buffer.from(type, 'ascii'), data]))
    buf.writeUInt32BE(crc, 8 + len)
    return buf
  }

  const ihdrChunk = makeChunk('IHDR', ihdrData)
  const compressedData = zlib.deflateSync(rawData)
  const idatChunk = makeChunk('IDAT', compressedData)
  const iendChunk = makeChunk('IEND', Buffer.alloc(0))

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk])
}

// CRC-32
function calcCRC32(buf) {
  let table = []
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    }
    table[i] = c
  }

  let crc = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF]
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function createICOFromPNG(pngBuffer, size = 64) {
  const icoHeader = Buffer.alloc(6)
  icoHeader.writeUInt16LE(0, 0) // Reserved
  icoHeader.writeUInt16LE(1, 2) // Type 1 = ICO
  icoHeader.writeUInt16LE(1, 4) // 1 Image

  const icoEntry = Buffer.alloc(16)
  icoEntry.writeUInt8(size >= 256 ? 0 : size, 0) // Width
  icoEntry.writeUInt8(size >= 256 ? 0 : size, 1) // Height
  icoEntry.writeUInt8(0, 2) // Colors
  icoEntry.writeUInt8(0, 3) // Reserved
  icoEntry.writeUInt16LE(1, 4) // Color planes
  icoEntry.writeUInt16LE(32, 6) // Bits per pixel
  icoEntry.writeUInt32LE(pngBuffer.length, 8) // Size of image data
  icoEntry.writeUInt32LE(22, 12) // Offset of image data (6 + 16 = 22)

  return Buffer.concat([icoHeader, icoEntry, pngBuffer])
}

const pubDir = path.join(__dirname, '../public')
if (!fs.existsSync(pubDir)) fs.mkdirSync(pubDir, { recursive: true })

const png256 = createCircularPNG(256)
const png64 = createCircularPNG(64)
const ico = createICOFromPNG(png256, 256)

fs.writeFileSync(path.join(pubDir, 'icon.png'), png64)
fs.writeFileSync(path.join(pubDir, 'icon.ico'), ico)
console.log('256x256 Icons generated successfully in public/icon.png and public/icon.ico')
