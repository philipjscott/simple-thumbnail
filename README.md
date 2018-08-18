# simple-thumbnail 

A wrapper library of [fluent-ffmpeg](https://www.npmjs.com/package/fluent-ffmpeg) that produces a thumbnail image from a video's first frame.

## Installation

```bash
$ yarn add simple-thumbnail

# Or,

$ npm install simple-thumbnail --save
```

## Usage

```js
const thumbnail = require('simple-thumbnail')

thumbnail('path/to/video.webm', 'output/file/path.png', '250x?')
```

## API

#### thumbnail(input, output, size)

Returns of a `Promise` which resolves on thumbnail creation.

#### input

Type: `String`

The file path of the video.

#### output

Type: `String`

The file path of the generated thumbnail, assumes directory exists.

#### size

Type: `String`

The dimensions of the generated thumbnail. The `size` argument may have one of the following formats:

* `150x100`: set a fixed output size.
* `150x?`: set a fixed width and compute the height automatically.
* `?x100`: set a fixed height and compute the width automatically.
* `50%`: rescale both width and height to given percentage.
