const assParser = require('ass-parser');

class SubtitleParser {
  constructor(rawTextSubtitle) {
    this.rawTextSubtitle = rawTextSubtitle;
    this.subtitles = null;
  }

  convert() {
    return assParser(this.rawTextSubtitle);
  }

  /**
   * Alignment works as the position of keys on the numberpad. Like so:
   * ---      Left    Middle  Right
   * Top      7       8       9
   * Middle   4       5       6
   * Bottom   1       2       3
   */
  getAlignment(n) {
    switch(n) {
      case 1:
        return {
          column: 'left',
          row: 'bottom'
        };
      case 2:
        return {
          column: 'middle',
          row: 'bottom'
        };
      case 3:
        return {
          column: 'right',
          row: 'bottom'
        };
      case 4:
        return {
          column: 'left',
          row: 'middle'
        };
      case 5:
        return {
          column: 'middle',
          row: 'middle'
        };
      case 6:
        return {
          column: 'right',
          row: 'middle'
        };
      case 7:
        return {
          column: 'left',
          row: 'top'
        };
      case 8:
        return {
          column: 'middle',
          row: 'top'
        };
      case 9:
        return {
          column: 'right',
          row: 'top'
        };
      default:
        throw new Error("Could not calculate the position of the subtitles");
    }
  }

  processVerticalMargin(alignmentStyle, marginV) {
    const align = this.getAlignment(parseInt(alignmentStyle, 10));
    if(align.row === 'top') {
      return {
        marginTop: +marginV
      };
    }
    if(align.row === 'bottom') {
      return {
        marginBottom: +marginV
      };
    }

    return {}; 
  }

  colorHexChunk(str, size) {
    const numChunks = Math.ceil(str.length / size)
    const chunks = new Array(numChunks)
  
    for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
      chunks[i] = str.substr(o, size)
    }
  
    return chunks
  }

  convertHexToDecimal(hex) {
    return parseInt(hex, 16);
  }

  convertSSAColorToRGBA(ssaColor) {
    const hexWithAlphaChannel = ssaColor.substr(2);
    const channels = this.colorHexChunk(hexWithAlphaChannel, 2).map(channel => this.convertHexToDecimal(channel));
    // The color is in the format:
    // 0: Alpha
    // 1: Blue
    // 2: Green
    // 3: Red

    // Weird, but the alpha channel is always 0, so we set to opaque at all times.

    return `rgba(${channels[3]}, ${channels[2]}, ${channels[1]}, 1)`;
  }

  computeStyles(styles) {
    const computedStyles = {};

    styles.forEach(style => {
      const stylePairs = style['value'];
      computedStyles[stylePairs['Name']] = {
        fontSize: parseInt(stylePairs['Fontsize'], 10),
        color: this.convertSSAColorToRGBA(stylePairs['PrimaryColour']),
        outlineColor: this.convertSSAColorToRGBA(stylePairs['BackColour']),
        bold: parseInt(stylePairs['Bold'], 10) < 0,
        italic: parseInt(stylePairs['Italic'], 10) < 0,
        margins: {
          ...this.processVerticalMargin(stylePairs['Alignment'], stylePairs['MarginV']),
          marginLeft: +`${stylePairs['MarginL']}`,
          marginRight: +`${stylePairs['MarginR']}`
        },
        alignment: this.getAlignment(parseInt(stylePairs['Alignment'], 10))
      }
    });

    return computedStyles;
  }

  filterSubtitleText(text) {
    // For new we remove all the parts that are enclosed within `{}`
    return text.replace(/\s*\{.*?\}\s*/g, '');
  }

  normalizeText(text) {
    // Bunch of replaces
    return text.replace(/\\N/g, "\n");
  }

  computeDialouges(events, styles) {
    return events.map(dialouge => {
      const dialougeValue = dialouge['value'];
      return {
        speaker: dialougeValue["Name"],
        style: styles[dialougeValue["Style"]],
        text: this.normalizeText(this.filterSubtitleText(dialougeValue["Text"])),
        timings: {
          start: dialougeValue["Start"],
          end: dialougeValue["End"]
        }
      };
    });
  }

  process() {
    this.subtitles = this.convert();
    const scriptInfo = this.subtitles.filter(section => section.section === "Script Info")[0];
    const styles = this.subtitles.filter(section => section.section === "V4+ Styles")[0];
    const events = this.subtitles.filter(section => section.section === "Events")[0];

    const computedStyles = this.computeStyles(styles.body.filter((v, k) => k !== 0));
    const dialouges = this.computeDialouges(events.body.filter((v, k) => k !== 0), computedStyles);
    this.computedDialouges = dialouges;
    this.originalScale = {
      y: +scriptInfo.body.filter(info => info.key === "PlayResY")[0]['value'],
      x: +scriptInfo.body.filter(info => info.key === "PlayResX")[0]['value']
    };
  }

  getResponse() {
    return {
      scalingInfo: this.originalScale,
      dialouges: this.computedDialouges
    };
  }
}

module.exports = SubtitleParser;