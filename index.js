'use strict'

const ffmpeg = require('fluent-ffmpeg')
const parsePath = require('parse-filepath')

function generateThumbnail (inputFile, outputFile, size = '150x100') {
  const parsedPath = parsePath(outputFile)

  return ffmpeg(inputFile).takeScreenshots({
    count: 1,
    timemarks: [ '0' ],
    filename: parsedPath.base,
    size
  }, parsedPath.dir)
}

module.exports = generateThumbnail
