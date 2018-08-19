/* global before, describe, it */

'use strict'

const fs = require('fs-extra')
const path = require('path')
const util = require('util')

const chai = require('chai')
const dirtyChai = require('dirty-chai')

const filePromise = require('./data')
const flatten = require('array-flatten')
const genThumbnail = require('../')
const looksSame = util.promisify(require('looks-same'))

const { expect } = chai
const absolutePath = relative => path.join(__dirname, relative)

chai.use(dirtyChai)

describe('simple-thumbnail creates thumbnails for videos', () => {
  before(async () => {
    await fs.remove(absolutePath('./out'))
    await fs.mkdirp(absolutePath('./out'))
  })

  it('successfully generates thumbnails', async () => {
    const files = await filePromise()

    const nestedPromises = files.map(elem => {
      const input = absolutePath(`./data/${elem}.webm`)
      const fixedWidthPath = absolutePath(`./out/${elem}.png`)
      const fixedSizePath = absolutePath(`./out/${elem}-skewed.png`)

      const fixedWidth = genThumbnail(input, fixedWidthPath, '250x?')
      const fixedSize = genThumbnail(input, fixedSizePath, '300x300')

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
      const out = x => absolutePath(`./out/${x}`)
      const res = x => absolutePath(`./result/${x}`)
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
