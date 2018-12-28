const fs = require('fs');
const path = require('path');
const FFMPEG_PATH = __dirname + '/../../bundled/ffmpeg.exe';
const TEMP_STORAGE = path.join(__dirname, '../../temp-data');
const { exec } = require('child_process');
const assToVtt = require('ass-to-vtt');
const SubtitleParser = require('./SubtitleParser');

class SubtitleExtractor {
  constructor(anime, filename, episode) {
    this.anime = anime;
    this.filename = Buffer.from(filename, 'base64').toString();
    this.episode = episode;
  }

  deleteFileIfExists(file) {
    if(fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  }

  parseSubs(subtitlePath) {
    const subs = fs.readFileSync(subtitlePath).toString();
    const parser = new SubtitleParser(subs);
    parser.process();

    return parser.getResponse();
  }

  async extract() {
    const subtitlePath = `${TEMP_STORAGE}/${this.anime}-ep-${this.episode}-subtitle.ass`;

    this.deleteFileIfExists(subtitlePath);

    const command = `"${FFMPEG_PATH}" -i "${this.filename}" -map 0:s -c copy "${subtitlePath}"`;

    return new Promise((resolve, reject) => {
      exec(command, (err, stdout, stderr) => {
        if(err) console.log(err);
        const parsedSubtitles = this.parseSubs(subtitlePath);
        // const fileStream = fs.createReadStream(subtitlePath).pipe(assToVtt());
        resolve(parsedSubtitles);
      });
    });
  }
}

module.exports = SubtitleExtractor;