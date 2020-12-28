/// <reference types="node" />
import { Readable, Writable } from 'stream';
interface Config {
    path: string;
    seek: string;
    args?: any;
}
declare class SimpleThumbnail {
    /**
     * Parse a size string (eg. '240x?')
     * @func    parseSize
     * @param   {String} sizeStr  A string in the form of '240x100' or '50%'
     * @returns {Object}          Object containing numeric values of the width and height
     *                            of the thumbnail, or the scaling percentage
     * @throws  {Error}           Throws on malformed size string
    */
    private parseSize;
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
    private buildArgs;
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
    private ffmpegExecute;
    /**
     * Spawn an instance of ffmpeg and generate a thumbnail
     * @func    ffmpegStreamExecute
     * @param   {String}          path      The path of the ffmpeg binary
     * @param   {Array<string>}   args      An array of arguments for ffmpeg
     * @param   {stream.Readable} [rstream] A readable stream to pipe data to
     *                                      the standard input of ffmpeg
     * @returns {Promise}  Promise that resolves to ffmpeg stdout
     */
    private ffmpegStreamExecute;
    /**
     * Return a duplex stream
     * @func    ffmpegDuplexExecute
     * @param   {String}          path      The path of the ffmpeg binary
     * @param   {Array<string>}   args      An array of arguments for ffmpeg
     *                                      the standard input of ffmpeg
     * @returns {stream.Duplex}  A duplex stream :)
     */
    private ffmpegDuplexExecute;
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
    generateThumbnail(input: string | Readable, output: string | Writable, size: string, config: Config): Promise<unknown>;
}
export default SimpleThumbnail;
