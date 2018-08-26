/* eslint-disable camelcase */

'use strict'

const ffprobe = require('ffprobe-client')
const download = require('partial-load')
const { spawn } = require('child_process')
const { unlink } = require('fs')
const { promisify } = require('util')
const https = require('https')
const http = require('http')
const url = require('url')

const removeFile = promisify(unlink)

function parseInput (input) {
  let isStream
  let inputArg
  let driver

  if (typeof input !== 'string') {
    inputArg = 'pipe:0'
    driver = null
    isStream = true
  } else if (url.parse(input).protocol) {
    const { protocol } = url.parse(input)

    inputArg = 'pipe:0'
    driver = protocol === 'https:' ? https : http
    isStream = false
  } else {
    inputArg = input
    driver = null
    isStream = false
  }

  return {
    inputArg,
    driver,
    isStream
  }
}

function parseSize (sizeStr) {
  const regex = /(\d+|\?)x(\d+|\?)/g
  let width
  let height

  try {
    const res = regex
      .exec(sizeStr)
      .map(x => x === '?' ? null : Number.parseInt(x))

    width = res[1]
    height = res[2]
  } catch (e) {
    throw new Error('Invalid size argument')
  }

  return { width, height }
}

function buildArgs (input, output, { width, height }) {
  return [
    '-y',
    `-i ${input}`,
    '-vframes 1',
    `-filter:v scale=${width || -1}:${height || -1}`,
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
    // use sinon to test this
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

function naiveThumbnail (input, output, dims, misc) {
  const { paths, limit, temp } = misc
  const args = buildArgs(input, output, dims)

  return ffprobe(input, { path: paths.ffprobe })
    .then((data) => {
      const { bit_rate, size, duration } = data.format
      let byteSecond

      if (bit_rate && size && duration) {
        const byteRate = bit_rate / 8
        const overhead = size - byteRate * duration

        byteSecond = overhead + 1 * byteRate
      }

      return byteSecond || limit
    })
    .then((downloadLimit) => download(input, output, downloadLimit))
    .then(() => ffmpegExecute(paths.ffmpeg, args))
    .finally(() => removeFile(temp))
}

function thumbnail (input, output, size, config = { path: {} }) {
  const naiveLimit = config.limit || 1024 * 512
  const naiveTemp = config.temp || 'simple-thumbnail-tmp.png'
  const ffmpegPath = config.path.ffmpeg || 'ffmpeg'

  const dims = parseSize(size)
  const { driver, isStream, inputArg } = parseInput(input)
  const args = buildArgs(inputArg, output, dims)

  if (!driver && isStream) {
    return ffmpegExecute(ffmpegPath, args, input)
  }

  if (!driver) {
    return ffmpegExecute(ffmpegPath, args)
  }

  return new Promise((resolve, reject) => {
    driver.get(input, (res) => {
      const thumbnailPromise = ffmpegExecute(ffmpegPath, args, res).catch(() => {
        return naiveThumbnail(input, output, dims, {
          limit: naiveLimit,
          temp: naiveTemp,
          paths: config.path
        })
      })

      resolve(thumbnailPromise)
    })
  })
}

module.exports = thumbnail
