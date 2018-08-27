'use strict'

const { spawn } = require('child_process')

function parseSize (sizeStr) {
  const percentRegex = /(\d+)%/g
  const sizeRegex = /(\d+|\?)x(\d+|\?)/g
  let payload

  const percentResult = percentRegex.exec(sizeStr)
  const sizeResult = sizeRegex.exec(sizeStr)

  if (percentResult) {
    payload = { percentage: Number.parseInt(percentResult[1]) }
  } else if (sizeResult) {
    const sizeValues = sizeResult.map(x => x === '?' ? null : Number.parseInt(x))

    payload = {
      width: sizeValues[1],
      height: sizeValues[2]
    }
  } else {
    throw new Error('Invalid size argument')
  }

  return payload
}

function buildArgs (input, output, { width, height, percentage }) {
  const scaleArg = (percentage)
    ? `-vf scale=iw*${percentage / 100}:ih*${percentage / 100}`
    : `-vf scale=${width || -1}:${height || -1}`

  return [
    '-y',
    `-i ${input}`,
    '-vframes 1',
    scaleArg,
    output
  ]
}

function ffmpegExecute (path, args, stream = null) {
  const ffmpeg = spawn(path, args, { shell: true })
  let stderr = ''

  return new Promise((resolve, reject) => {
    if (stream) {
      stream.pipe(ffmpeg.stdin)
    }

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString()
    })
    // use sinon?
    ffmpeg.stderr.on('error', (err) => {
      reject(err)
    })

    ffmpeg.on('close', resolve)
    ffmpeg.on('exit', (code, signal) => {
      if (code !== 0) {
        const err = new Error(`ffmpeg exited ${code}\nffmpeg stderr:\n\n${stderr}`)

        reject(err)
      }
    })
  })
}

function genThumbnail (input, output, size, config = {}) {
  const ffmpegPath = config.path || 'ffmpeg'

  const parsedSize = parseSize(size)
  const args = buildArgs(
    typeof input === 'string' ? input : 'pipe:0',
    output,
    parsedSize
  )

  return typeof input === 'string'
    ? ffmpegExecute(ffmpegPath, args)
    : ffmpegExecute(ffmpegPath, args, input)
}

module.exports = thumbnail
