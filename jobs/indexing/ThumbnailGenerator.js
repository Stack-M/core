const fs = require('fs');
const exec = require('child_process').exec;

class ThumbnailGenerator {
    constructor(file, outputDir, screencapName = "preview-thumbnail") {
        this.inputFile = file;
        this.outputDir = outputDir;
        this.screencapName = screencapName;
        this.ffmpegExecutable = `${__dirname}/../../bundled/ffmpeg.exe`;
    }

    createDirectoryIfNonExistant() {
        if(!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir);
        }
    }

    create() {
        this.createDirectoryIfNonExistant();
        exec(
            `${this.ffmpegExecutable} -ss 300 -i "${this.inputFile}" -vf select="eq(pict_type\\,I)" -vframes 1 "${this.outputDir + this.screencapName}.jpg"`,
            (err, stdout, stderr) => {
            }
        );
    }
}

module.exports = ThumbnailGenerator;