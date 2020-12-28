"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const duplexify_1 = __importDefault(require("duplexify"));
class SimpleThumbnail {
    /**
     * Parse a size string (eg. '240x?')
     * @func    parseSize
     * @param   {String} sizeStr  A string in the form of '240x100' or '50%'
     * @returns {Object}          Object containing numeric values of the width and height
     *                            of the thumbnail, or the scaling percentage
     * @throws  {Error}           Throws on malformed size string
    */
    parseSize(sizeStr) {
        const invalidSizeString = new Error('Invalid size string');
        const percentRegex = /(\d+)%/g;
        const sizeRegex = /(\d+|\?)x(\d+|\?)/g;
        const size = {
            width: null,
            height: null,
            percentage: null
        };
        const percentResult = percentRegex.exec(sizeStr);
        const sizeResult = sizeRegex.exec(sizeStr);
        if (percentResult) {
            size.percentage = Number.parseInt(percentResult[1]);
        }
        else if (sizeResult) {
            const sizeValues = sizeResult.map(x => x === '?' ? null : Number.parseInt(x));
            size.width = sizeValues[1];
            size.height = sizeValues[2];
        }
        else {
            throw invalidSizeString;
        }
        if (!size.width && !size.height) {
            throw invalidSizeString;
        }
        return size;
    }
    /**
     * Return an array of string arguments to be passed to ffmpeg
     * @func    buildArgs
     * @param   {String}  input  The input argument for ffmpeg
     * @param   {String}  output The output path for the generated thumbnail
     * @param   {Object}  size   A size object returned from parseSize
     * @param   {Number}  [size.height]     The thumbnail height, in pixels
     * @param   {Number}  [size.width]      The thumbnail width, in pixels
     * @param   {Number}  [size.percentage] The thumbnail scaling percentage
     * @param   {String}  seek   The time to seek, formatted as hh:mm:ss[.ms]
     * @returns {Array<string>}  Array of arguments for ffmpeg
     */
    buildArgs(input, output, size, seek) {
        const scaleArg = (size.percentage)
            ? `-vf scale=iw*${size.percentage / 100}:ih*${size.percentage / 100}`
            : `-vf scale=${size.width || -1}:${size.height || -1}`;
        return [
            '-y',
            `-i ${input}`,
            '-vframes 1',
            `-ss ${seek}`,
            scaleArg,
            output
        ];
    }
    /**
     * Spawn an instance of ffmpeg and generate a thumbnail
     * @func    ffmpegExecute
     * @param   {String}          path      The path of the ffmpeg binary
     * @param   {Array<string>}   args      An array of arguments for ffmpeg
     * @param   {stream.Readable} [rstream] A readable stream to pipe data to
     *                                      the standard input of ffmpeg
     * @param   {stream.Writable} [wstream] A writable stream to receive data from
     *                                      the standard output of ffmpeg
     * @returns {Promise}  Promise that resolves once thumbnail is generated
     */
    ffmpegExecute(path, args, rstream, wstream) {
        return __awaiter(this, void 0, void 0, function* () {
            const ffmpeg = child_process_1.spawn(`"${path}"`, args, { shell: true });
            let stderr = '';
            return new Promise((resolve, reject) => {
                if (rstream) {
                    rstream.pipe(ffmpeg.stdin);
                }
                if (wstream) {
                    ffmpeg.stdout.pipe(wstream);
                }
                ffmpeg.stderr.on('data', (data) => {
                    stderr += data.toString();
                });
                ffmpeg.stderr.on('error', (err) => {
                    reject(err);
                });
                ffmpeg.on('exit', (code, signal) => {
                    if (code !== 0) {
                        const err = new Error(`ffmpeg exited ${code}\nffmpeg stderr:\n\n${stderr}`);
                        reject(err);
                    }
                    if (stderr.includes('nothing was encoded')) {
                        const err = new Error(`ffmpeg failed to encode file\nffmpeg stderr:\n\n${stderr}`);
                        reject(err);
                    }
                });
                ffmpeg.on('close', resolve);
            });
        });
    }
    /**
     * Spawn an instance of ffmpeg and generate a thumbnail
     * @func    ffmpegStreamExecute
     * @param   {String}          path      The path of the ffmpeg binary
     * @param   {Array<string>}   args      An array of arguments for ffmpeg
     * @param   {stream.Readable} [rstream] A readable stream to pipe data to
     *                                      the standard input of ffmpeg
     * @returns {Promise}  Promise that resolves to ffmpeg stdout
     */
    ffmpegStreamExecute(path, args, rstream) {
        return __awaiter(this, void 0, void 0, function* () {
            const ffmpeg = child_process_1.spawn(path, args, { shell: true });
            if (rstream) {
                rstream.pipe(ffmpeg.stdin);
            }
            return Promise.resolve(ffmpeg.stdout);
        });
    }
    /**
     * Return a duplex stream
     * @func    ffmpegDuplexExecute
     * @param   {String}          path      The path of the ffmpeg binary
     * @param   {Array<string>}   args      An array of arguments for ffmpeg
     *                                      the standard input of ffmpeg
     * @returns {stream.Duplex}  A duplex stream :)
     */
    ffmpegDuplexExecute(path, args) {
        const ffmpeg = child_process_1.spawn(path, args, { shell: true });
        return duplexify_1.default(ffmpeg.stdin, ffmpeg.stdout);
    }
    /**
     * Generates a thumbnail from the first frame of a video file
     * @func    genThumbnail
     * @param   {String|stream.Readable}   input    Path to video, or a read stream
     * @param   {String|stream.Writeable}  output   Output path of the thumbnail
     * @param   {String}  size         The size of the thumbnail, eg. '240x240'
     * @param   {Object}  [config={}]  A configuration object
     * @param   {String}  [config.path='ffmpeg']    Path of the ffmpeg binary
     * @param   {String}  [config.seek='00:00:00']  Time to seek for videos
     * @returns {Promise|stream.Duplex}             Resolves on completion, or rejects on error
     */
    generateThumbnail(input, output, size, config) {
        return __awaiter(this, void 0, void 0, function* () {
            const ffmpegPath = config.path || process.env.FFMPEG_PATH || 'ffmpeg';
            const seek = config.seek || '00:00:00';
            const rstream = typeof input === 'string' ? null : input;
            const wstream = typeof output === 'string' ? null : output;
            let args;
            if (config.args) {
                args = config.args;
            }
            else {
                const parsedSize = this.parseSize(size);
                args = this.buildArgs(typeof input === 'string' ? `"${input}"` : 'pipe:0', typeof output === 'string' ? `"${output}"` : '-f singlejpeg pipe:1', parsedSize, seek);
            }
            if ((input === null && output === null) || config.args) {
                return this.ffmpegDuplexExecute(ffmpegPath, args);
            }
            if (output === null) {
                return this.ffmpegStreamExecute(ffmpegPath, args, rstream);
            }
            return this.ffmpegExecute(ffmpegPath, args, rstream, wstream);
        });
    }
}
exports.default = SimpleThumbnail;
