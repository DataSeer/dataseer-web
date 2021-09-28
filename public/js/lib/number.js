/*
 * @prettier
 */

const NUMBER = {
  ordinal_suffix_of: function (i) {
    let j = i % 10;
    let k = i % 100;
    if (j == 1 && k != 11) {
      return i + `st`;
    }
    if (j == 2 && k != 12) {
      return i + `nd`;
    }
    if (j == 3 && k != 13) {
      return i + `rd`;
    }
    return i + `th`;
  }
};
