'use strict'

const fs = require('fs-extra')

async function getFiles () {
  const files = await fs.readdir('./test/data')

  return files.filter(x => x !== 'index.js')
    .map(x => /(.*)\.webm/.exec(x)[1])
}

module.exports = getFiles
