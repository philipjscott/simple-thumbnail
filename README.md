# simple-thumbnail 

[![npm version](https://badge.fury.io/js/simple-thumbnail.svg)](https://badge.fury.io/js/simple-thumbnail)
[![Build Status](https://travis-ci.org/ScottyFillups/simple-thumbnail.svg?branch=master)](https://travis-ci.org/ScottyFillups/simple-thumbnail)
[![Coverage Status](https://coveralls.io/repos/github/ScottyFillups/simple-thumbnail/badge.svg?branch=master)](https://coveralls.io/github/ScottyFillups/simple-thumbnail?branch=master)
[![install size](https://packagephobia.now.sh/badge?p=simple-thumbnail)](https://packagephobia.now.sh/result?p=simple-thumbnail)

A minimal library that produces a thumbnail image from a video's first frame using `ffmpeg`.

## Installation

```bash
$ yarn add simple-thumbnail

# Or,

$ npm install simple-thumbnail --save
```

## Usage

```js
const genThumbnail = require('simple-thumbnail')

// promise
genThumbnail('path/to/video.webm', 'output/file/path.png', '250x?')
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
```

## API

#### genThumbnail(input, output, size, [config])

Returns of a `Promise` which resolves on thumbnail creation.

#### input

Type: `String | stream.Readable`

The URL, file path, or read-stream of a video.

#### output

Type: `String`

The file path of the generated thumbnail, assumes directories exist.

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
