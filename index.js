var ytdl = require('ytdl-core');
var FFmpeg = require('fluent-ffmpeg');
var through = require('through2');
var xtend = require('xtend');
var fs = require('fs');

var defaultAudioBitrate = 5;
var minAudioBitrate = 0;
var maxAudioBitrate = 9;

var isYT = false;

function streamify(uri, timestampstart, audioduration, audioBitrate, opt) {
    opt = xtend({
        audioBitrate: audioBitrate,
        filter: 'audioonly',
        quality: 'lowest',
        audioFormat: 'mp3',
        startTime: timestampstart,
        duration: audioduration,
        applyOptions: function () {}
    }, opt);


    var audio;



    function startTime() {
        if (opt.startTime != null) {
            var isValid = /^(?:(\d{1,2}):)?(\d{1,2}:)?(\d{2})$/.test(opt.startTime);
            if(isValid){
                return opt.startTime;
            }else{
                return null;
            }
        } else {
            return null;
        }
    }

    function getDuration() {
        if(opt.duration != null){
            if(opt.duration > 0){
                return opt.duration;
            }else{
                return 9999999999;
            }
        }else{
            return 9999999999;
        }
    }

    function bitrate() {
        if (opt.audioBitrate != null) {
            console.log("Submitted bitrate: " + opt.audioBitrate);
            if (opt.audioBitrate >= minAudioBitrate && opt.audioBitrate <= maxAudioBitrate) {
                return opt.audioBitrate;
            } else {
                console.log("Ignoring submitted bitrate, using default");
                return defaultAudioBitrate;
            }
        } else {
            return defaultAudioBitrate;
        }
    }



    if(uri.lastIndexOf("aud:", 0) === 0){
        //This is a wav request
        audio = uri.substring(4);

    }else{
        isYT = true;
        audio = ytdl(uri, {filter: opt.filter, quality: opt.quality});
    }


    var stream = opt.file
    ? fs.createWriteStream(opt.file)
    : through();

    //Hacky horrid fix for no starttime...
    if(startTime() != null){
        var ffmpeg = new FFmpeg(audio)
        .seekInput(startTime())
        .duration(getDuration())
        .noVideo()
        .audioQuality(bitrate())
        .audioChannels(1)
        .renice(-20);
    }else{
        var ffmpeg = new FFmpeg(audio)
        .noVideo()
        .duration(getDuration())
        .audioQuality(bitrate())
        .audioChannels(1)
        .renice(-20);
    }

    opt.applyOptions(ffmpeg);
    var output = ffmpeg
    .format(opt.audioFormat)
    .pipe(stream);
    if(isYT){
        output.on('error', audio.end.bind(audio));
    }
    output.on('error', stream.emit.bind(stream, 'error'));
    return stream;


}

module.exports = streamify;