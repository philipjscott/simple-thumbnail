/* global before, describe, it */

'use strict'

const fs = require('fs-extra')
const path = require('path')
const util = require('util')
const url = require('url')

const chai = require('chai')
const dirtyChai = require('dirty-chai')

const filePromise = require('./data')
const flatten = require('array-flatten')
const genThumbnail = require('../')
const looksSame = util.promisify(require('looks-same'))
const nock = require('nock')

const { expect } = chai
const absolutePath = relative => path.join(__dirname, relative)

chai.use(dirtyChai)

describe('simple-thumbnail creates thumbnails for videos', () => {
  before(async () => {
    await fs.remove(absolutePath('./out'))
    await fs.mkdirp(absolutePath('./out'))
  })

  describe('invalid input', () => {
    const filePath = absolutePath('./data/bunny.webm')
    const outPath = absolutePath('./out/invalid.png')

    it('throws an error on malformed size string', async () => {
      try {
        await genThumbnail(filePath, outPath, 'not a real size')
      } catch (err) {
        expect(err.message).to.equal('Invalid size argument')
      }
    })

    it('throws an error given a "?x?" size string', async () => {
      try {
        await genThumbnail(filePath, outPath, '?x?')
      } catch (err) {
        expect(err.message).to.equal('Invalid size argument')
      }
    })

    it('throws a ffmpeg stderr dump on non-zero exit', async () => {
      try {
        await genThumbnail('not a real path', outPath, '200x200')
      } catch (err) {
        const stderrLines = err.message.split('\n')

        expect(stderrLines[0]).to.equal('ffmpeg exited 1')
        expect(stderrLines[1]).to.equal('ffmpeg stderr:')
      }
    })
  })

  describe('creating thumbnails for files saved on disk', () => {
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
        const expected = x => absolutePath(`./expected/${x}`)
        const config = { tolerance: 0 }
        const versions = [
          `${elem}.png`,
          `${elem}-skewed.png`
        ]

        return versions.map(x => looksSame(expected(x), out(x), config))
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

  describe('creating thumbnails for remote files, ie. via URL', () => {
    const protocols = ['http', 'https']
    const filePath = absolutePath('./data/bunny.webm')
    const outPath = absolutePath('./out/bunny.png')
    const expectedPath = absolutePath('./expected/bunny.png')

    protocols.forEach((protocol) => {
      const fileUrl = `${protocol}://www.w3schools.com/html/mov_bbb.webm`
      const parsedUrl = url.parse(fileUrl)

      nock(`${parsedUrl.protocol}//${parsedUrl.host}`)
        .get(parsedUrl.path)
        .replyWithFile(200, filePath, { 'Content-Type': 'video/webm' })

      describe(`${protocol} protocol`, () => {
        it('successfully generates thumbnails', async () => {
          try {
            await genThumbnail(fileUrl, outPath, '200x?')
          } catch (err) {
            console.log(err)

            expect.fail()
          }
        })

        it('made thumbnails identical to expected result', async () => {
          const config = { tolerance: 0 }

          try {
            await looksSame(expectedPath, outPath, config)
          } catch (err) {
            console.log(err)

            expect.fail()
          }
        })
      })
    })
  })

  describe('creating thumbnails from read streams', () => {
    const filePath = absolutePath('./data/bunny.webm')
    const outPath = absolutePath('./out/stream.png')
    const expectedPath = absolutePath('./expected/stream.png')

    it('successfully generates thumbnails', async () => {
      const stream = fs.createReadStream(filePath)

      try {
        await genThumbnail(stream, outPath, '?x200')
      } catch (err) {
        console.log(err)

        expect.fail()
      }
    })

    it('made thumbnails identical to expected result', async () => {
      const config = { tolerance: 0 }

      try {
        await looksSame(expectedPath, outPath, config)
      } catch (err) {
        console.log(err)

        expect.fail()
      }
    })
  })
})
