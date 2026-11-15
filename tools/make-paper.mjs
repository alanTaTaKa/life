#!/usr/bin/env node
// 生成 assets/paper.png —— 一张可平铺的纸纹颗粒图。
//
//   node tools/make-paper.mjs
//
// 它是半透明噪点，不发光、不渐变：浅纸上像纸纤维，暗色下像浮尘，
// 所以浅色和暗色两套主题共用一张图。改颗粒浓度只动下面的常量。

import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const out = join(here, '..', 'assets', 'paper.png')

const SIZE = 128 // 越小越省，平铺看不出接缝全因为它全是随机点
const DENSITY = 0.3 // 多少像素带颗粒
const MAX_ALPHA = 0.05 // 最常见的颗粒透明度（0–1）
const SPECK_CHANCE = 0.006 // 偶尔一颗深一点的
const SPECK_ALPHA = 0.1
const WHITE_GRAIN = 0.72 // 颗粒偏白多一点，纸色才不会被压灰

// ---------- PNG 编码（只做 8bit RGBA，不依赖任何库） ----------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(SIZE, 0)
ihdr.writeUInt32BE(SIZE, 4)
ihdr[8] = 8 // bit depth
ihdr[9] = 6 // RGBA
ihdr[10] = 0
ihdr[11] = 0
ihdr[12] = 0

// 每行开头一个 filter 字节（0 = None）
const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE)
let o = 0
for (let y = 0; y < SIZE; y++) {
  raw[o++] = 0
  for (let x = 0; x < SIZE; x++) {
    let r = 0
    let a = 0
    if (Math.random() < DENSITY) {
      const speck = Math.random() < SPECK_CHANCE
      r = speck ? 190 + Math.random() * 65 : Math.random() < WHITE_GRAIN ? 250 : 60
      const max = speck ? SPECK_ALPHA : MAX_ALPHA
      a = Math.round(Math.random() * max * 255)
    }
    raw[o++] = r
    raw[o++] = r
    raw[o++] = r
    raw[o++] = a
  }
}

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0))
])

mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, png)
console.log(`已生成 ${out}（${SIZE}×${SIZE}，${(png.length / 1024).toFixed(1)} KB）`)
