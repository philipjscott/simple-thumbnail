# simple-thumbnail 
[![All Contributors](https://img.shields.io/badge/all_contributors-3-orange.svg?style=flat-square)](#contributors)
[![npm version](https://badge.fury.io/js/simple-thumbnail.svg)](https://badge.fury.io/js/simple-thumbnail)
[![Build Status](https://travis-ci.org/ScottyFillups/simple-thumbnail.svg?branch=master)](https://travis-ci.org/ScottyFillups/simple-thumbnail)
[![Coverage Status](https://coveralls.io/repos/github/ScottyFillups/simple-thumbnail/badge.svg?branch=master)](https://coveralls.io/github/ScottyFillups/simple-thumbnail?branch=master)
[![install size](https://packagephobia.now.sh/badge?p=simple-thumbnail)](https://packagephobia.now.sh/result?p=simple-thumbnail)

A minimal library that produces thumbnails from images and videos using FFmpeg.

## Installation

```bash
$ npm install simple-thumbnail --save
```

## Usage

```js
const fs = require('fs')
const genThumbnail = require('simple-thumbnail')

// promise
genThumbnail('path/to/image.png', 'output/file/path.png', '250x?')
  .then(() => console.log('done!'))
  .catch(err => console.error(err))

// async/await
async function run () {
  try {
    await genThumbnail('http://www.example.com/foo.webm', 'output/file/path.png', '250x?')
    console.log('Done!')
  } catch (err) {
    console.error(err)
  }
}

run()

// genThumbnail also supports piping to write streams, so you can do this with Express!
app.get('/some/endpoint', (req, res) => {
  genThumbnail('path/to/video.webm', res, '150x100')
    .then(() => console.log('done!'))
    .catch(err => console.error(err))
})

// duplex streams
fs.createReadStream('path/to/image')
  .pipe(genThumbnail(null, null, '250x?'))
  .pipe(fs.createWriteStream('output/file/path.jpg'))
```

## Getting FFmpeg

For those who don't have FFmpeg installed, there's an NPM package that installs it for you: https://www.npmjs.com/package/ffmpeg-static

```js
const ffmpeg = require('ffmpeg-static')
const genThumbnail = require('simple-thumbnail')

async function download () {
  await genThumbnail('https://www.w3schools.com/Html/mov_bbb.webm', 'bunny.webm', '150x?', {
    path: ffmpeg.path
  })
  
  console.log('Done!')
}

download()
```

## API

#### genThumbnail(input, output, size, [config])

Returns of a `Promise` which resolves on thumbnail creation, or a `stream.Duplex` (see below).

#### input

Type: `String | stream.Readable | Null`

The URL, file path, or read-stream of an image or video. If both the input and output are null, then `genThumbnail` will return a `stream.Duplex`.

#### output

Type: `String | stream.Writable | Null`

The file path of the generated thumbnail, a write-stream, or null. If null, `genThumbnail` will resolve to a read-stream that you can pipe somewhere. If you're specifying a file path, make sure the directories exist.

#### size

Type: `String`

The dimensions of the generated thumbnail. The `size` argument may have one of the following formats:

* `150x100`: set a fixed output size.
* `150x?`: set a fixed width and compute the height automatically.
* `?x100`: set a fixed height and compute the width automatically.
* `50%`: rescale both width and height to given percentage.

#### config

Type: `Object`

A configuration object, see details below.

#### config.path

Type: `String`

The path of the `ffmpeg` binary. If omitted, the path will be set to the `FFMPEG_PATH` environment variable. If the environment variable is not set, `ffmpeg` will be invoked directly (ie. `ffmpeg [...]`).

#### config.seek

Type: `String`

Seeks the video to the provided time. The time must be in the following form: `hh:mm:ss[.ms]`, eg. `00:00:42.23`. If omitted, the video time will be set to `00:00:00` (ie. the first frame).

#### config.args

Type: `Array<String>`

FFmpeg arguments that override the synthetic arguments created by `simple-thumbnail`; you'll likely need to pass include your own `-i` flag, `-y` flag, etc.

## Contributors

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore -->
| [<img src="https://avatars2.githubusercontent.com/u/18666879?v=4" width="100px;"/><br /><sub><b>Philip Scott</b></sub>](http://scottyfillups.io)<br />[💻](https://github.com/ScottyFillups/simple-thumbnail/commits?author=ScottyFillups "Code") [⚠️](https://github.com/ScottyFillups/simple-thumbnail/commits?author=ScottyFillups "Tests") [📖](https://github.com/ScottyFillups/simple-thumbnail/commits?author=ScottyFillups "Documentation") | [<img src="https://avatars1.githubusercontent.com/u/2668906?v=4" width="100px;"/><br /><sub><b>cmd430</b></sub>](https://github.com/cmd430)<br />[💻](https://github.com/ScottyFillups/simple-thumbnail/commits?author=cmd430 "Code") [🤔](#ideas-cmd430 "Ideas, Planning, & Feedback") | [<img src="https://avatars0.githubusercontent.com/u/682269?v=4" width="100px;"/><br /><sub><b>Andre-John Mas</b></sub>](http://terra-azure.org)<br />[💻](https://github.com/ScottyFillups/simple-thumbnail/commits?author=ajmas "Code") [🐛](https://github.com/ScottyFillups/simple-thumbnail/issues?q=author%3Aajmas "Bug reports") |
| :---: | :---: | :---: |
<!-- ALL-CONTRIBUTORS-LIST:END -->
<!-- ALL-CONTRIBUTORS-LIST: START - Do not remove or modify this section -->
<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/kentcdodds/all-contributors) specification.

Contributions of any kind are welcome!

## Contributing

See [CONTRIBUTING.md](https://github.com/ScottyFillups/simple-thumbnail/blob/master/CONTRIBUTING.md).
