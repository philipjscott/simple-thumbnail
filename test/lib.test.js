/* global before, describe, it */

'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const genThumbnail = require('../')
const filePromise = require('./data')
const fs = require('fs-extra')
const util = require('util')
const looksSame = util.promisify(require('looks-same'))
const flatten = require('array-flatten')
const { expect } = chai

chai.use(dirtyChai)

describe('simple-thumbnail creates thumbnails for videos', () => {
  before(() => {
    return fs.mkdirp('./test/out')
  })

  it('successfully generates thumbnails', async () => {
    const files = await filePromise()

    const nestedPromises = files.map(elem => {
      const input = `./test/data/${elem}.webm`

      const fixedWidth = genThumbnail(input, `./test/out/${elem}.png`, '250x?')
      const fixedSize = genThumbnail(input, `./test/out/${elem}-skewed.png`, '300x300')

      return [fixedWidth, fixedSize]
    })

    try {
      await Promise.all(flatten(nestedPromises))
    } catch (err) {
      console.log(err)

      expect.fail()
    }
  })

  it('made thumbnails identical to expected results', async () => {
    const files = await filePromise()

    const nestedPromises = files.map(elem => {
      const out = x => `./test/out/${x}`
      const res = x => `./test/result/${x}`
      const config = { tolerance: 0 }
      const versions = [
        `${elem}.png`,
        `${elem}-skewed.png`
      ]

      return versions.map(x => looksSame(res(x), out(x), config))
    })

    try {
      const areIdentical = await Promise.all(flatten(nestedPromises))

      expect(areIdentical.every(x => x)).to.be.true()
    } catch (err) {
      console.error(err)

      expect.fail()
    }
  })
})
