'use strict'

const ffmpeg = require('fluent-ffmpeg')
const parsePath = require('parse-filepath')

function generateThumbnail (inputFile, outputFile, size) {
  const parsedPath = parsePath(outputFile)

  return new Promise((resolve, reject) => {
    ffmpeg(inputFile).takeScreenshots({
      count: 1,
      timemarks: [ '0' ],
      filename: parsedPath.base,
      size
    }, parsedPath.dir)
      .on('error', reject)
      .on('end', resolve)
  })
}

module.exports = generateThumbnail
