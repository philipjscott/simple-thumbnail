/* global before, describe, it */

'use strict'

const fs = require('fs-extra')
const path = require('path')
const util = require('util')
const url = require('url')

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const genThumbnail = require('../')
const looksSame = util.promisify(require('looks-same'))
const flatten = require('array-flatten')
const nock = require('nock')

const { expect } = chai
const absolutePath = relative => path.join(__dirname, relative)

chai.use(dirtyChai)

describe('simple-thumbnail creates thumbnails for videos', () => {
  const tinySize = '50x?'

  before(async () => {
    await fs.remove(absolutePath('./out'))

    const directories = [
      './out',
      './out/storage',
      './out/input-formats',
      './out/image-formats',
      './out/bin-paths',
      './out/seek',
      './out/sizes'
    ]
    const promises = directories.map(path => fs.mkdirp(absolutePath(path)))

    await Promise.all(promises)
  })

  describe('invalid input', () => {
    const filePath = absolutePath('./data/bunny.mp4')
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

    it('throws an error given a percentage string with no value (%)', async () => {
      try {
        await genThumbnail(filePath, outPath, '%')
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

  describe('thumbnail creation for different storage mediums', () => {
    const filePath = absolutePath('./data/bunny.webm')

    it('creates thumbnails for files saved on disk', async () => {
      await genThumbnail(filePath, absolutePath('./out/storage/disk.png'), tinySize)
    })

    // Note: mp4 does not work with read streams, hence the usage of .webm
    it('creates thumbnails from read streams', async () => {
      const stream = fs.createReadStream(filePath)

      await genThumbnail(stream, absolutePath('./out/storage/stream.png'), tinySize)
    })

    describe('creates thumbnails for remote files', () => {
      const protocols = ['http', 'https']

      protocols.forEach((protocol) => {
        const fileUrl = `${protocol}://www.w3schools.com/html/mov_bbb.webm`
        const parsedUrl = url.parse(fileUrl)

        nock(`${parsedUrl.protocol}//${parsedUrl.host}`)
          .get(parsedUrl.path)
          .replyWithFile(200, filePath, { 'Content-Type': 'video/webm' })

        it(`${protocol} protocol`, () => {
          it('successfully generates thumbnails', async () => {
            await genThumbnail(fileUrl, absolutePath(`./out/storage/${protocol}.png`), tinySize)
          })
        })
      })
    })
  })

  describe('file formats', () => {
    const formats = ['webm', 'mp4']

    formats.forEach((format) => {
      it(`can create thumbnails for ${format}`, async () => {
        const filePath = absolutePath(`./data/bunny.${format}`)

        await genThumbnail(filePath, absolutePath(`./out/input-formats/${format}.png`), tinySize)
      })
    })
  })

  describe('time seeking', () => {
    const filePath = absolutePath('./data/bunny.webm')

    it('can seek to an arbitrary time', async () => {
      await genThumbnail(filePath, absolutePath(`./out/seek/seek.png`), tinySize, {
        seek: '00:00:00.900'
      })
    })
  })

  describe('thumbnail sizes', () => {
    const sizes = ['25%', '101%', '50x?', '?x50', '100x50']
    const filePath = absolutePath('./data/bunny.webm')

    sizes.forEach((size) => {
      it(`handles sizes of the form ${size}`, async () => {
        await genThumbnail(
          filePath,
          absolutePath(`./out/sizes/size-${size.replace('%', '')}.png`),
          size
        )
      })
    })
  })

  describe('alternative ffmpeg binary paths', () => {
    const filePath = absolutePath('./data/bunny.mp4')

    it('operates correctly when path specified by environment variable', async () => {
      process.env.FFMPEG_PATH = '/usr/bin/ffmpeg'

      await genThumbnail(
        filePath,
        absolutePath('./out/bin-paths/env.png'),
        tinySize
      )

      process.env.FFMPEG_PATH = ''
    })

    it('operates correctly when path specified by config object', async () => {
      await genThumbnail(
        filePath,
        absolutePath('./out/bin-paths/conf.png'),
        tinySize,
        { path: '/usr/bin/ffmpeg' }
      )
    })
  })

  describe('thumbnail output image formats', () => {
    const filePath = absolutePath('./data/bunny.webm')
    const formats = ['gif', 'jpg', 'png']

    formats.forEach((format) => {
      it(`can create ${format} images`, async () => {
        await genThumbnail(
          filePath,
          absolutePath(`./out/image-formats/${format}.${format}`),
          tinySize
        )
      })
    })
  })

  describe('thumbnail correctness', () => {
    it('produces thumbnail images that are identical to expected output', async () => {
      const config = { tolerance: 5 }
      const specialExpected = [
        './out/sizes',
        './out/seek'
      ]
      const directories = [
        './out/storage',
        './out/input-formats',
        './out/sizes',
        './out/bin-paths'
      ]

      const nestedPromises = directories.map(async (path) => {
        const files = await fs.readdir(absolutePath(path))

        return files.map(file => looksSame(
          absolutePath(`./expected/${specialExpected.includes(path) ? file : 'tiny.png'}`),
          absolutePath(`${path}/${file}`),
          config
        ))
      })

      try {
        const results = await Promise.all(flatten(nestedPromises))

        expect(results.every(x => x)).to.be.true()
      } catch (err) {
        console.log(err)

        expect.fail()
      }
    })
  })

  describe('external error handling', () => {
    it('throws an error if stderr fires an error event', async () => {

    })
  })
})
