/*
 * @prettier
 */

'use strict';

let Self = {};

/**
 * RegExp
 */
Self.RegExp = {
  password: new RegExp(`[\\w\\W]{6,}`),
  email: new RegExp(`[A-Za-z0-9!#$%&'*+-/=?^_\`{|}~]+@[A-Za-z0-9-]+(.[A-Za-z0-9-]+)*`),
  githubRepository: new RegExp(`[gG]{1}ithub.com`),
  URL: /(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/
};

/**
 * Convert string to array of pages number
 * @param {string} params - String (must come from req.query)
 * @returns {array} Return an array containing pages numbers
 */
Self.convertPages = function (params = ``) {
  let str = Self.convertToString(params.toString().replace(/\s+/gm, ``));
  if (typeof str !== `undefined` && str.length > 0) {
    let mapping = {};
    let params = str.split(`,`);
    for (let i = 0; i < params.length; i++) {
      let param = params[i];
      let tmp = param.split(`-`);
      let begin = Self.convertToInteger(tmp[0]);
      let end = Self.convertToInteger(tmp[1]);
      if (isNaN(begin)) continue; // case begin is wrong
      if (isNaN(end)) mapping[begin] = true; // case end is wrong (only one page number)
      // case begin & end are correct -> this is a range
      let min = Math.min(begin, end);
      let max = Math.max(begin, end);
      for (let j = min; j <= max; j++) {
        mapping[j] = true;
      }
    }
    return Self.convertToArray(Object.keys(mapping), `integer`);
  }
  return undefined;
};

/**
 * Check if it is an URL
 * @param {string} params - String (must come from req.query)
 * @returns {boolean} Return true if URL is valid or false
 */
Self.isURL = function (params) {
  let str = Self.convertToString(params);
  if (typeof str !== `undefined` && str.length > 0) return Self.RegExp.URL.test(str);
  return false;
};

/**
 * Check if it is a Github repository
 * @param {string} params - String (must come from req.query)
 * @returns {boolean} Return true if URL is valid or false
 */
Self.isGithubRepository = function (params) {
  let str = Self.convertToString(params);
  if (typeof str !== `undefined` && str.length > 0) return Self.RegExp.githubRepository.test(str);
  return false;
};

/**
 * Check email
 * @param {string} params - String (must come from req.query)
 * @returns {boolean} Return true if email is valid or false
 */
Self.checkEmail = function (params) {
  let str = Self.convertToString(params);
  if (typeof str !== `undefined` && str.length > 0) return Self.RegExp.email.test(str);
  return false;
};

/**
 * Check password
 * @param {string} params - String (must come from req.query)
 * @returns {boolean} Return true if password is valid or false
 */
Self.checkPassword = function (params) {
  let str = Self.convertToString(params);
  if (typeof str !== `undefined` && str.length > 0) return Self.RegExp.password.test(str);
  return false;
};

/**
 * Check string
 * @param {string} params - String (must come from req.query)
 * @returns {boolean} Return true if the given string is no empty or return false
 */
Self.checkString = function (params) {
  return typeof params === `string` && params.length > 0;
};

/**
 * Check integer
 * @param {string} params - String (must come from req.query)
 * @returns {boolean} Return true if the given integer or false
 */
Self.checkInteger = function (params) {
  return typeof params === `number` && !isNaN(params);
};

/**
 * Check array
 * @param {string} params - String (must come from req.query)
 * @returns {boolean} Return true if the given string is no empty or return false
 */
Self.checkArray = function (params) {
  let arr = Self.convertToArray(params);
  return Array.isArray(arr);
};

/**
 * Check array
 * @param {string} params - String (must come from req.query)
 * @returns {boolean} Return true or false
 */
Self.checkBoolean = function (params) {
  let bool = Self.convertToBoolean(params);
  return typeof bool === `boolean` ? true : !!bool;
};

/**
 * Check object
 * @param {string} params - String (must come from req.query)
 * @returns {boolean} Return true if it's an object or false
 */
Self.checkObject = function (params) {
  return typeof params === `object`;
};

/**
 * Check object
 * @param {string} params - String (must come from req.query)
 * @returns {boolean} Return true if it's an date or false
 */
Self.checkDate = function (params) {
  return params instanceof Date;
};

/**
 * Convert string to string
 * @param {string} params - String (must come from req.query)
 * @param {string} [encoding] - Encoding of string
 * @returns {string} Return an string or undefined
 */
Self.convertToString = function (params, encoding = `utf8`) {
  if (typeof params === `undefined`) return;
  if (params === null) return ``;
  // First to string stringify the param and second rencode
  if (typeof params !== `string`) return params.toString().toString(encoding);
  return params.toString(encoding);
};

/**
 * Convert string to integer
 * @param {string} params - String (must come from req.query)
 * @param {string} [base} - Base of parse
 * @returns {integer} Return an int or undefined
 */
Self.convertToInteger = function (params, base = 10) {
  if (typeof params === `undefined`) return;
  if (Number.isInteger(params)) return parseInt(params, base);
  return typeof params === `string` && params.length > 0 ? parseInt(params, base) : NaN;
};

/**
 * Convert string to date
 * @param {string} params - String (must come from req.query)
 * @returns {date} Return an date or undefined
 */
Self.convertToDate = function (params) {
  if (typeof params === `undefined`) return;
  if (params instanceof Date) return new Date(params);
  return typeof params === `string` && params.length > 0 ? new Date(params) : new Date();
};

/**
 * Convert string to boolean
 * @param {string} params - String (must come from req.query)
 * @returns {boolean} Return an boolean or undefined
 */
Self.convertToBoolean = function (params) {
  if (typeof params === `undefined`) return;
  if (params instanceof Boolean) return params;
  if (typeof params === `string` && params.length > 0) {
    if (params === `0` || params === `false`) return false;
    if (params === `1` || params === `true`) return true;
  }
  return !!params;
};

/**
 * Convert string to array
 * @param {string} params - String (must come from req.query)
 * @param {string} [type] - Use it to convert type of data in the Array (available values: 'string', 'boolean', 'date', 'integer')
 * @param {string} [delimiter] - String delimiter
 * @returns {array} Return an array or undefined
 */
Self.convertToArray = function (params, type = null, delimiter = `,`) {
  if (typeof params === `undefined`) return;
  if (Array.isArray(params)) {
    if (type === `string` || type === `boolean` || type === `date` || type === `integer`)
      return params
        .map(function (item) {
          return Self[`convertTo${type[0].toUpperCase()}${type.substring(1)}`](item);
        })
        .filter(function (item) {
          return typeof item !== `undefined`;
        });
    return params;
  }
  if (typeof params === `string` && params.length > 0) {
    return params
      .split(delimiter)
      .map(function (item) {
        return Self[`convertTo${type[0].toUpperCase()}${type.substring(1)}`](item);
      })
      .filter(function (item) {
        return typeof item !== `undefined`;
      });
  }
  return [];
};

module.exports = Self;
