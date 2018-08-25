'use strict'

const { spawn } = require('child_process')
const https = require('https')
const http = require('http')
const url = require('url')

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

      // silence ffmpeg stdin errors; occurs even on success
      // ffmpeg.stdin.on('error', () => {})
    }

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString()
    })
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

function thumbnail (input, output, size, config = {}) {
  const path = config.path || 'ffmpeg'
  const dims = parseSize(size)
  const { driver, isStream, inputArg } = parseInput(input)
  const args = buildArgs(inputArg, output, dims)

  if (!driver && isStream) {
    return ffmpegExecute(path, args, input)
  }

  if (!driver) {
    return ffmpegExecute(path, args)
  }

  return new Promise((resolve, reject) => {
    driver.get(input, (res) => {
      resolve(ffmpegExecute(path, args, res))
    })
  })
}

module.exports = thumbnail
