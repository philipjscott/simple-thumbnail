'use strict'

const { spawn } = require('child_process')

/**
 * Parse a size string (eg. '240x?')
 * @func    parseSize
 * @param   {string} sizeStr  A string in the form of '240x100' or '50%'
 * @returns {Object}          Object containing numeric values of the width and height
 *                            of the thumbnail, or the scaling percentage
 */
function parseSize (sizeStr) {
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
    throw new Error('Invalid size argument')
  }

  return size
}

/**
 * Return an array of string arguments to be passed to ffmpeg
 * @func    buildArgs
 * @param   {string}  input  The input argument for ffmpeg
 * @param   {string}  output The output path for the generated thumbnail
 * @param   {Object}  size   A size object returned from parseSize
 * @param   {Number}  [size.height]     The thumbnail height, in pixels
 * @param   {Number}  [size.width]      The thumbnail width, in pixels
 * @param   {Number}  [size.percentage] The thumbnail scaling percentage
 * @returns {Array<string>}  Array of arguments for ffmpeg
 */
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

/**
 * Spawn an instance of ffmpeg and generate a thumbnail
 * @func    ffmpegExecute
 * @param   {string}          path   The path of the ffmpeg binary
 * @param   {Array<string>}   args   An array of arguments for ffmpeg
 * @param   {stream.Readable} stream A readable stream to pipe data to
 *                                   the standard input of ffmpeg
 * @returns {Promise}  Promise that resolves once thumbnail is generated
 */
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

/**
 * Generates a thumbnail from the first frame of a video file
 * @func    genThumbnail
 * @param   {string|stream.Readable} input   Path to video, or a read stream
 * @param   {string}  output                 Output path of the thumbnail
 * @param   {string}  size         The size of the thumbnail, eg. '240x240'
 * @param   {Object}  [config={}]  A configuration object
 * @param   {string}  [config.path='ffmpeg'] Path of the ffmpeg binary
 * @returns {Promise}                        Resolves on completion
 */
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

module.exports = genThumbnail
