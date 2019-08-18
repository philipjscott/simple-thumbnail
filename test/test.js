'use strict'

const path = require('path')
const util = require('util')
const fs = require('fs-extra')
const liburl = require('url')

const genThumbnail = require('../')
const test = require('ava')
const ffmpeg = require('ffmpeg-static')
const looksSame = util.promisify(require('looks-same'))
const nock = require('nock')

const absPath = rel => path.join(__dirname, rel)

async function badSizeStringMacro (t, sizeString, expectedErrMsg) {
  const filePath = absPath('./this/should/not/matter')
  const outPath = absPath('./foo/bar')

  try {
    await genThumbnail(filePath, outPath, sizeString)

    t.fail()
  } catch (err) {
    t.is(err.message, expectedErrMsg)
  }
}

async function imageTestMacro (t, { input, size, title, config }, pathToExpected) {
  if (!title) {
    throw new Error('Missing image title')
  }

  input = input || absPath('./data/bunny.webm')
  size = size || '50x?'
  config = config || {}
  pathToExpected = pathToExpected || absPath('./expected/tiny.png')

  const output = absPath(`./out/${title}.png`)

  await genThumbnail(input, output, size, config)

  const isSame = await looksSame(pathToExpected, output, { tolerance: 5 })

  t.true(isSame)
}

function imageCreationMacro (t, { input, output, size, config }) {
  input = input || absPath('./data/bunny.webm')
  size = size || '50x?'
  config = config || {}

  return genThumbnail(input, output, size, config)
    .then(t.pass)
    .catch(t.fail)
}

async function httpMediaTestMacro (t, { url, title }) {
  if (!title) {
    throw new Error('Missing image title')
  }

  const parsedUrl = liburl.parse(url)
  const output = absPath(`./out/${title}.png`)

  nock(`${parsedUrl.protocol}//${parsedUrl.host}`)
    .get(parsedUrl.path)
    .replyWithFile(200, absPath('./data/bunny.webm'), { 'Content-Type': 'video/webm' })

  await genThumbnail(url, output, '50x?')

  const isSame = await looksSame(absPath('./expected/tiny.png'), output, { tolerance: 5 })

  t.true(isSame)
}

async function withArgsMacro (t, { config, title }) {
  const output = absPath(`./out/${title}.png`)

  await genThumbnail('', output, null, config)

  const isSame = await looksSame(absPath('./expected/args.png'), output, { tolerance: 5 })
  t.true(isSame)
}

function streamReturnMacro (t, { input, title }) {
  const output = absPath(`./out/${title}.png`)
  const write = fs.createWriteStream(output)

  genThumbnail(input, null, '50x?').then(stream => {
    stream.pipe(write)
    write.on('finish', t.end)
    write.on('error', t.end)
  })
}

test.before(async t => {
  await fs.mkdirp(absPath('./out'))
})

test('throws error on malformed size string', badSizeStringMacro, 'bad size', 'Invalid size string')

test('throws error given a percentage string with no value', badSizeStringMacro, '%', 'Invalid size string')

test('throws error given a "?x?" size string', badSizeStringMacro, '?x?', 'Invalid size string')

test('throws a ffmpeg stderr dumb on non-zero exit', async t => {
  const promise = genThumbnail('not real path', './foo/bar', '200x200')

  const err = await t.throwsAsync(promise)
  const lines = err.message.split('\n')

  t.is(lines[0], 'ffmpeg exited 1')
  t.is(lines[1], 'ffmpeg stderr:')
})

test('creates thumbnails for files saved on disk', imageTestMacro, {
  input: absPath('./data/bunny.webm'),
  title: 'disk'
})

test('creates thumbnails for streams', imageTestMacro, {
  input: fs.createReadStream(absPath('./data/bunny.webm')),
  title: 'stream'
})

let text = absPath('./data/text.txt').replace(/\\/g, '/').replace(':', '\\:') // Workaround for windows drive letters
test('can pass args to ffmpeg via config', withArgsMacro, {
  config: {
    args: [
      '-f lavfi',
      '-i color=c=white:s=640x480:d=5.396',
      `-filter_complex "drawtext=textfile='${text}':x=0:y=0:fontsize=13:fontcolor=000000"`
    ],
    path: ffmpeg.path
  },
  title: 'args'
})

test('creates thumbnails for http', httpMediaTestMacro, {
  url: 'http://www.w3schools.com/html/mov_bbb.webm',
  title: 'http'
})

test('creates thumbnails for https', httpMediaTestMacro, {
  url: 'https://www.w3schools.com/html/mov_bbb.webm',
  title: 'https'
})

test('can create thumbnails with spaces, from files with spaces', imageTestMacro, {
  input: absPath('./data/File With A Space.webm'),
  title: 'File With A Space'
})

test('can create thumbnails from webm', imageTestMacro, {
  input: absPath('./data/bunny.webm'),
  title: 'webm'
})

test('can create thumbnails from mp4', imageTestMacro, {
  input: absPath('./data/bunny.mp4'),
  title: 'mp4'
})

test('can seek to an arbitrary time', imageTestMacro, {
  config: { seek: '00:00:00.900' },
  title: 'seek'
}, absPath('./expected/seek.png'))

test('operates when ffmpeg path prevent via config', imageTestMacro, {
  config: { path: ffmpeg.path },
  title: 'path'
})

test('operates when ffmpeg path specified via env var', async t => {
  process.env.FFMPEG_PATH = ffmpeg.path

  const input = absPath('./data/bunny.webm')
  const output = absPath('./out/envvar.png')

  await genThumbnail(input, output, '50x?')

  const isSame = await looksSame(absPath('./expected/tiny.png'), output, { tolerance: 5 })

  t.true(isSame)

  process.env.FFMPEG_PATH = ''
})

test('throws error when seek is outside range', async t => {
  const input = absPath('./data/bunny.webm')
  const output = absPath('./out/doesnotmatter.png')

  try {
    await genThumbnail(input, output, '50x?', { seek: '00:05:00' })
    t.fail()
  } catch (err) {
    console.log(err)
    t.pass()
  }
})

// Currently doesn't save in out folder since there's some weird race condition
test('writes to a file via a write-stream', imageCreationMacro, {
  output: fs.createWriteStream(absPath('./write.png'))
})

test.cb('returns a duplex stream for single argument', t => {
  const readStream = fs.createReadStream(absPath('./data/bunny.webm'))
  const writeStream = fs.createWriteStream(absPath('./duplex.jpg'))

  readStream
    .pipe(genThumbnail(null, null, '250x?'))
    .pipe(writeStream)
    .on('finish', t.end)
})

test.cb('returns a read-stream on null', streamReturnMacro, {
  input: absPath('./data/bunny.mp4'),
  title: 'null'
})

test.cb('returns a read-stream on null, with stream input', streamReturnMacro, {
  input: fs.createReadStream(absPath('./data/bunny.mp4')),
  title: 'null-stream'
})

;['25%', '101%', '50x?', '?x50', '100x50'].forEach((size) => {
  const sanitizeSize = str => str.replace('%', '').replace('?', 'X')

  test(`handles sizes of the form ${size}`, imageTestMacro, {
    size,
    title: `size-${sanitizeSize(size)}`
  }, absPath(`./expected/size-${sanitizeSize(size)}.png`))
})

;['gif', 'jpg', 'png'].forEach(format => {
  test(`it can create ${format} images`, imageCreationMacro, {
    output: absPath(`./out/${format}.${format}`)
  })
})
