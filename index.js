'use strict'

const { spawn } = require('child_process')
const duplexify = require('duplexify')

/**
 * Parse a size string (eg. '240x?')
 * @func    parseSize
 * @param   {String} sizeStr  A string in the form of '240x100' or '50%'
 * @returns {Object}          Object containing numeric values of the width and height
 *                            of the thumbnail, or the scaling percentage
 * @throws  {Error}           Throws on malformed size string
 */
function parseSize (sizeStr) {
  const invalidSizeString = new Error('Invalid size string')
  const percentRegex = /(\d+)%/g
  const sizeRegex = /(\d+|\?)x(\d+|\?)/g
  let size

  const percentResult = percentRegex.exec(sizeStr)
  const sizeResult = sizeRegex.exec(sizeStr)

  if (percentResult) {
    size = { percentage: Number.parseInt(percentResult[1]) }
  } else if (sizeResult) {
    const sizeValues = sizeResult.map(x => x === '?' ? null : Number.parseInt(x))

    size = {
      width: sizeValues[1],
      height: sizeValues[2]
    }
  } else {
    throw invalidSizeString
  }

  if (size.width === null && size.height === null) {
    throw invalidSizeString
  }

  return size
}

/**
 * Return an array of string arguments to be passed to ffmpeg
 * @func    buildArgs
 * @param   {String}  input  The input argument for ffmpeg
 * @param   {String}  output The output path for the generated thumbnail
 * @param   {Object}  size   A size object returned from parseSize
 * @param   {Number}  [size.height]     The thumbnail height, in pixels
 * @param   {Number}  [size.width]      The thumbnail width, in pixels
 * @param   {Number}  [size.percentage] The thumbnail scaling percentage
 * @param   {String}  seek   The time to seek, formatted as hh:mm:ss[.ms]
 * @returns {Array<string>}  Array of arguments for ffmpeg
 */
function buildArgs (input, output, { width, height, percentage }, seek) {
  const scaleArg = (percentage)
    ? `-vf scale=iw*${percentage / 100}:ih*${percentage / 100}`
    : `-vf scale=${width || -1}:${height || -1}`

  return [
    '-y',
    `-i ${input}`,
    '-vframes 1',
    `-ss ${seek}`,
    scaleArg,
    output
  ]
}

/**
 * Spawn an instance of ffmpeg and generate a thumbnail
 * @func    ffmpegExecute
 * @param   {String}          path      The path of the ffmpeg binary
 * @param   {Array<string>}   args      An array of arguments for ffmpeg
 * @param   {stream.Readable} [rstream] A readable stream to pipe data to
 *                                      the standard input of ffmpeg
 * @param   {stream.Writable} [wstream] A writable stream to receive data from
 *                                      the standard output of ffmpeg
 * @returns {Promise}  Promise that resolves once thumbnail is generated
 */
function ffmpegExecute (path, args, rstream, wstream) {
  const ffmpeg = spawn(`"${path}"`, args, { shell: true })
  let stderr = ''

  return new Promise((resolve, reject) => {
    if (rstream) {
      rstream.pipe(ffmpeg.stdin)
    }
    if (wstream) {
      ffmpeg.stdout.pipe(wstream)
    }

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString()
    })
    ffmpeg.stderr.on('error', (err) => {
      reject(err)
    })
    ffmpeg.on('exit', (code, signal) => {
      if (code !== 0) {
        const err = new Error(`ffmpeg exited ${code}\nffmpeg stderr:\n\n${stderr}`)
        reject(err)
      }
      if (stderr.includes('nothing was encoded')) {
        const err = new Error(`ffmpeg failed to encode file\nffmpeg stderr:\n\n${stderr}`)
        reject(err)
      }
    })
    ffmpeg.on('close', resolve)
  })
}

/**
 * Spawn an instance of ffmpeg and generate a thumbnail
 * @func    ffmpegStreamExecute
 * @param   {String}          path      The path of the ffmpeg binary
 * @param   {Array<string>}   args      An array of arguments for ffmpeg
 * @param   {stream.Readable} [rstream] A readable stream to pipe data to
 *                                      the standard input of ffmpeg
 * @returns {Promise}  Promise that resolves to ffmpeg stdout
 */
function ffmpegStreamExecute (path, args, rstream) {
  const ffmpeg = spawn(path, args, { shell: true })

  if (rstream) {
    rstream.pipe(ffmpeg.stdin)
  }

  return Promise.resolve(ffmpeg.stdout)
}

/**
 * Return a duplex stream
 * @func    ffmpegDuplexExecute
 * @param   {String}          path      The path of the ffmpeg binary
 * @param   {Array<string>}   args      An array of arguments for ffmpeg
 *                                      the standard input of ffmpeg
 * @returns {stream.Duplex}  A duplex stream :)
 */
function ffmpegDuplexExecute (path, args) {
  const ffmpeg = spawn(path, args, { shell: true })

  return duplexify(ffmpeg.stdin, ffmpeg.stdout)
}

/**
 * Generates a thumbnail from the first frame of a video file
 * @func    genThumbnail
 * @param   {String|stream.Readable}   input    Path to video, or a read stream
 * @param   {String|stream.Writeable}  output   Output path of the thumbnail
 * @param   {String}  size         The size of the thumbnail, eg. '240x240'
 * @param   {Object}  [config={}]  A configuration object
 * @param   {String}  [config.path='ffmpeg']    Path of the ffmpeg binary
 * @param   {String}  [config.seek='00:00:00']  Time to seek for videos
 * @returns {Promise|stream.Duplex}             Resolves on completion, or rejects on error
 */
function genThumbnail (input, output, size, config = {}) {
  const ffmpegPath = config.path || process.env.FFMPEG_PATH || 'ffmpeg'
  const seek = config.seek || '00:00:00'
  const rstream = typeof input === 'string' ? null : input
  const wstream = typeof output === 'string' ? null : output

  let args = ''
  if (config.args) {
    args = config.args
  } else {
    const parsedSize = parseSize(size)

    args = buildArgs(
      typeof input === 'string' ? `"${input}"` : 'pipe:0',
      typeof output === 'string' ? `"${output}"` : '-f singlejpeg pipe:1',
      parsedSize,
      seek
    )
  }

  if ((input === null && output === null) || config.args) {
    return ffmpegDuplexExecute(ffmpegPath, args)
  }
  if (output === null) {
    return ffmpegStreamExecute(ffmpegPath, args, rstream)
  }

  return ffmpegExecute(ffmpegPath, args, rstream, wstream)
}

module.exports = genThumbnail
