/*
 * @prettier
 */

'use strict';

const PARAMS = {
  /**
   * RegExp
   */
  RegExp: {
    password: new RegExp(`[\\w\\W]{6,}`),
    email: new RegExp(`[A-Za-z0-9!#$%&'*+-/=?^_\`{|}~]+@[A-Za-z0-9-]+(.[A-Za-z0-9-]+)*`)
  },
  /**
   * Check email
   * @param {string} params - String (must come from req.query)
   * @returns {boolean} Return true if email is valid or false
   */
  checkEmail: function (params) {
    let str = PARAMS.convertToString(params);
    if (typeof str !== `undefined` && str.length > 0) return PARAMS.RegExp.email.test(params);
    return false;
  },
  /**
   * Check password
   * @param {string} params - String (must come from req.query)
   * @returns {boolean} Return true if password is valid or false
   */
  checkPassword: function (params) {
    let str = PARAMS.convertToString(params);
    if (typeof str !== `undefined` && str.length > 0) return PARAMS.RegExp.password.test(params);
    return false;
  },
  /**
   * Check string
   * @param {string} params - String (must come from req.query)
   * @returns {boolean} Return true if the given string is no empty or return false
   */
  checkString: function (params) {
    return typeof params === `string` && params.length > 0;
  },
  /**
   * Check integer
   * @param {string} params - String (must come from req.query)
   * @returns {boolean} Return true if the given integer or false
   */
  checkInteger: function (params) {
    return typeof params === `number` && !isNaN(params);
  },
  /**
   * Check array
   * @param {string} params - String (must come from req.query)
   * @returns {boolean} Return true if the given string is no empty or return false
   */
  checkArray: function (params) {
    let arr = PARAMS.convertToArray(params);
    return Array.isArray(arr);
  },
  /**
   * Check array
   * @param {string} params - String (must come from req.query)
   * @returns {boolean} Return true or false
   */
  checkBoolean: function (params) {
    let bool = PARAMS.convertToBoolean(params);
    return typeof bool === `boolean` ? bool : !!bool;
  },
  /**
   * Check object
   * @param {string} params - String (must come from req.query)
   * @returns {boolean} Return true if it's an object or false
   */
  checkObject: function (params) {
    return typeof params === `object`;
  },
  /**
   * Check object
   * @param {string} params - String (must come from req.query)
   * @returns {boolean} Return true if it's an date or false
   */
  checkDate: function (params) {
    return params instanceof Date;
  },
  /**
   * Convert string to string
   * @param {string} params - String (must come from req.query)
   * @param {string} [encoding} - Encoding of string
   * @returns {date} Return an string or undefined
   */
  convertToString: function (params, encoding = `utf8`) {
    if (typeof params === `undefined`) return;
    return params.toString(encoding);
  },
  /**
   * Convert string to integer
   * @param {string} params - String (must come from req.query)
   * @param {string} [base} - Base of parse
   * @returns {date} Return an int or undefined
   */
  convertToInteger: function (params, base = 10) {
    if (typeof params === `undefined`) return;
    if (Number.isInteger(params)) return parseInt(params, base);
    return typeof params === `string` && params.length > 0 ? parseInt(params, base) : NaN;
  },
  /**
   * Convert string to date
   * @param {string} params - String (must come from req.query)
   * @returns {date} Return an date or undefined
   */
  convertToDate: function (params) {
    if (typeof params === `undefined`) return;
    if (params instanceof Date) return new Date(params);
    return typeof params === `string` && params.length > 0 ? new Date(params) : new Date();
  },
  /**
   * Convert string to boolean
   * @param {string} params - String (must come from req.query)
   * @returns {boolean} Return an boolean or undefined
   */
  convertToBoolean: function (params) {
    if (typeof params === `undefined`) return;
    if (params instanceof Boolean) return params;
    if (typeof params === `string` && params.length > 0) {
      if (params === `0` || params === `false`) return false;
      if (params === `1` || params === `true`) return true;
    }
    return !!params;
  },
  /**
   * Convert string to array
   * @param {string} params - String (must come from req.query)
   * @param {string} [type] - Use it to convert type of data in the Array (available values: 'string', 'boolean', 'date', 'integer')
   * @param {string} [delimiter] - String delimiter
   * @returns {array} Return an array or undefined
   */
  convertToArray: function (params, type = null, delimiter = `,`) {
    if (typeof params === `undefined`) return;
    if (Array.isArray(params)) {
      if (type === `string` || type === `boolean` || type === `date` || type === `integer`)
        return params
          .map(function (item) {
            return PARAMS[`convertTo${type[0].toUpperCase()}${type.substring(1)}`](item);
          })
          .filter(function (item) {
            return typeof item !== `undefined`;
          });
      return params;
    }
    if (typeof params === `string` && params.length > 0) {
      if (type === `string` || type === `boolean` || type === `date` || type === `integer`)
        return params
          .split(delimiter)
          .map(function (item) {
            return PARAMS[`convertTo${type[0].toUpperCase()}${type.substring(1)}`](item);
          })
          .filter(function (item) {
            return typeof item !== `undefined`;
          });
      return params.split(delimiter);
    }
    return [];
  }
};
