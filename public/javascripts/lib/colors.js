/*
 * @prettier
 */

'use strict';

const Colors = function () {
  let self = this,
    c = 0, // current color index
    // Get the current color (never return same color)
    getColor = function () {
      return Colors.colors[c++ % (Colors.colors.length - 1)];
    },
    // Get a random background color
    backgroundColor = function (alpha = 1) {
      return randomColor({
        hue: getColor(),
        format: 'rgba',
        alpha: alpha
      });
    },
    // Get a random foreground color
    foregroundColor = function (color) {
      let rgb = Colors.rgb(color);
      // Calculate the perceptive luminance (aka luma) - human eye favors green color...
      let luma = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
      // Return black for bright colors, white for dark colors
      return luma > 0.5 ? 'black' : 'white';
    };
  // Get a rancom color (background & foreground)
  self.randomColor = function (alpha) {
    let background = backgroundColor(alpha),
      foreground = foregroundColor(background);
    return {
      background: {
        rgba: background,
        rgb: Colors.getRGB(background)
      },
      foreground: foreground
    };
  };
  return self;
};

Colors.colors = ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3']; // list of available colors
Colors.regex = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)$/; // rgba regex

// convert RGBA color to RGB color
Colors.getRGB = function (color) {
  let rgb = Colors.rgb(color);
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
};

// Get rgb values of a given color
Colors.rgba = function (color) {
  let matches = color.match(Colors.regex),
    r = matches[1],
    g = matches[2],
    b = matches[3],
    a = matches[4];
  return { r, g, b, a };
};

// Get rgb values of a given color
Colors.rgb = function (color) {
  let matches = color.match(Colors.regex),
    r = matches[1],
    g = matches[2],
    b = matches[3];
  return { r, g, b };
};

// Check if a color is white
Colors.isWhite = function (r, g, b) {
  let result = Math.sqrt(r * r * 0.2126 + g * g * 0.7152 + b * b * 0.0722) / 255;
  return result > 0.6;
};
