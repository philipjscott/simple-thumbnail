'use strict'

const path = require('path')
const util = require('util')
const fs = require('fs')
const url = require('url')
const genThumbnail = require('../')

const test = require('ava')
const streamToArray = require('stream-to-array')
const ffmpeg = require('ffmpeg-static')
const looksSame = util.promisify(require('looks-same'))
const nock = require('nock')

const absPath = rel => path.join(__dirname, rel)

function setFfmpegEnvVar (value, cb) {
  process.env.FFMPEG_PATH = value

  return (...args) => {
    const temp = cb(args)

    process.env.FFMPEG_PATH = ''

    return temp
  }
}

function streamToBuffer (stream) {
  return streamToArray(stream)
    .then(parts => Buffer.concat(
      parts.map(part => Buffer.isBuffer(part) ? part : Buffer.from(part))
    ))
}

async function badSizeStringMacro (t, sizeString, expectedErrMsg) {
  const filePath = absPath('./this/should/not/matter')
  const outPath = absPath('./foo/bar')
  const promise = genThumbnail(filePath, outPath, sizeString)

  const err = await t.throwsAsync(promise)

  t.is(err.message, expectedErrMsg)
}

async function imageTestMacro (t, { input, size, config }, pathToExpected) {
  input = input || absPath('./data/bunny.webm')
  size = size || '50x?'
  config = config || {}
  pathToExpected = pathToExpected || absPath('./expected/tiny.png')

  const stream = genThumbnail(input, null, size, config)
  const buffer = await streamToBuffer(stream)

  const isSame = await looksSame(pathToExpected, buffer, { tolerance: 5 })

  t.true(isSame)
}

async function imageCreationMacro (t, { input, output, size, config }) {
  input = input || absPath('./data/bunny.webm')
  size = size || '50x?'
  config = config || {}

  const promise = genThumbnail(input, output, size, config)

  await t.notThrowsAsync(promise)
}

async function httpMediaTestMacro (t, myUrl) {
  const parsedUrl = url.parse(myUrl)

  nock(`${parsedUrl.protocol}//${parsedUrl.host}`)
    .get(parsedUrl.path)
    .replyWithFile(200, absPath('./data/bunny.webm'), { 'Content-Type': 'video/webm' })

  const stream = genThumbnail(myUrl, null, '50x?')
  const buffer = await streamToBuffer(stream)

  const isSame = await looksSame(absPath('./expected/tiny.png'), buffer, { tolerance: 5 })

  t.true(isSame)
}

test('throws error on malformed size string', badSizeStringMacro, 'bad size', 'Invalid size argument')

test('throws error given a "?x?" size string', badSizeStringMacro, '?x?', 'Invalid size argument')

test('throws error given a percentage string with no value', badSizeStringMacro, '%', 'Invalid size argument')

test('throws a ffmpeg stderr dumb on non-zero exit', async t => {
  const promise = genThumbnail('not real path', './foo/bar', '200x200')

  const err = await t.throwsAsync(promise)
  const lines = err.message.split('\n')

  t.is(lines[0], 'ffmpeg exited 1')
  t.is(lines[1], 'ffmpeg stderr:')
})

test('creates thumbnails for files saved on disk', imageTestMacro, {
  input: absPath('./data/bunny.webm')
})

test('creates thumbnails for streams', imageTestMacro, {
  input: fs.createReadStream('./data/bunny.webm')
})

test('creates thumbnails for http', httpMediaTestMacro,
  'http://www.w3schools.com/html/mov_bbb.webm')

test('creates thumbnails for https', httpMediaTestMacro,
  'https://www.w3schools.com/html/mov_bbb.webm')

test('can create thumbnails from webm', imageTestMacro, {
  input: absPath('./data/bunny.webm')
})

test('can create thumbnails from mp4', imageTestMacro, {
  input: absPath('./data/bunny.mp4')
})

test('can create thumbnails from png', imageTestMacro, {
  input: absPath('./data/bunny.png')
})

test('can seek to an arbitrary time', imageTestMacro, {
  config: { seek: '00:00:00.900' }
}, absPath('./out/seek/seek.png'))

test('operates when ffmpeg path prevent via config', imageTestMacro, {
  config: { path: ffmpeg.path }
})

test('operates when ffmpeg path specified via env var', setFfmpegEnvVar(ffmpeg.path))

test('writes to a file via a write-stream', imageCreationMacro, {
  output: fs.createWriteStream('./out/write.png')
})

test('returns a read-stream on null', async t => {
  const input = absPath('./out/write.png')
  const output = absPath('./data/bunny.mp4')
  const write = fs.createWriteStream(output)

  const stream = await genThumbnail(input, null, '50x?')

  stream.pipe(write)
  write.on('finish', () => t.pass())
  write.on('error', () => t.fail())
})

;['25%', '101%', '50x?', '?x50', '100x50'].forEach((size) => {
  const sanitizeSize = str => str.replace('%', '').replace('?', 'X')

  test(`handles sizes of the form ${size}`, imageTestMacro, {
    size
  }, absPath(`./expected/input-formats/size-${sanitizeSize(size)}.png`))
})

;['gif', 'jpg', 'png'].forEach(format => {
  test(`it can create ${format} images`, imageCreationMacro, {
    output: absPath(`./out/image-formats/${format}.${format}`)
  })
})
