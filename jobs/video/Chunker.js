const fs = require('fs');
const path = require('path');

const videoMIME = {
  'mkv': 'video/webm',
  'webm': 'video/webm',
  'mp4': 'video/mp4',
  'avi': 'video/avi'
};

class Chunker {
  constructor(anime, filename, episode) {
    this.anime = anime;
    this.filename = Buffer.from(filename, 'base64').toString();
    this.episode = episode;
  }

  sendChunk(response, range, fileSize) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] 
      ? parseInt(parts[1], 10)
      : fileSize - 1;

    const chunksize = (end-start) + 1;

    const file = fs.createReadStream(this.filename, {start, end});
    const responseHeaders = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': videoMIME[this.filename.split('.').pop()],
    };

    response.writeHead(206, responseHeaders);
    file.pipe(response);
  }

  sendEntireFile(response, fileSize) {
    console.log(this.filename);
    const file = fs.createReadStream(this.filename);
    const responseHeaders = {
      'Content-Length': fileSize,
      'Content-Type': this.filename.split('.').pop(),
    };
    response.writeHead(200, responseHeaders);
    file.pipe(response);
  }

  chunkSend(request, response) {
    fs.stat(this.filename, (err, stat) => {
      const fileSize = stat.size;
      const range = request.headers.range;

      if(range) {
        this.sendChunk(response, range, fileSize);
      } else {
        this.sendEntireFile(response, fileSize);
      }
    });
  }
}

module.exports = Chunker;