/*
 * @prettier
 */

'use strict';

const Colors = function () {
  let self = this,
    colors = ['#ff0000', '#ffa500', '#ffff00', '#008000', '#0000ff', '#4b0082', '#ee82ee'], // list of available colors
    regex = /^rgba\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3}),\s*(\d*(?:\.\d+)?)\)$/, // rgba regex
    c = 0, // current color index
    // Get the current color (never return same color)
    getColor = function () {
      return colors[c++ % (colors.length - 1)];
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
      let rgb = self.rgb(color);
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
        rgb: self.getRGB(background)
      },
      foreground: foreground
    };
  };
  // convert RGBA color to RGB color
  self.getRGB = function (color) {
    let rgb = self.rgb(color);
    return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  };
  // Get rgb values of a given color
  self.rgba = function (color) {
    let matches = color.match(regex),
      r = matches[1],
      g = matches[2],
      b = matches[3],
      a = matches[4];
    return { r, g, b, a };
  };
  // Get rgb values of a given color
  self.rgb = function (color) {
    let matches = color.match(regex),
      r = matches[1],
      g = matches[2],
      b = matches[3];
    return { r, g, b };
  };
  return self;
};
