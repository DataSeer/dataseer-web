/*
 * @prettier
 */

const Organisations = require('../models/organisations.js');

let Self = {};

/*
 * Get all organisations
 * - cb(err, res)
 */
Self.all = function (cb) {
  return Organisations.find({}).exec(function (err, res) {
    return cb(err, res);
  });
};

/*
 * Update an organisation
 * - opts:
 *   - name
 * - cb(err, res)
 */
Self.create = function (opts = {}, cb) {
  return Organisations.create({ name: opts.name }).exec(function (err, res) {
    return cb(err, res);
  });
};

/*
 * Update an organisation
 * - opts:
 *   - oldName
 *   - newName
 * - cb(err, res)
 */
Self.updateOneByName = function (opts = {}, cb) {
  return Self.findOneByName({ 'name': opts.oldName }).exec(function (err, res) {
    if (err) return cb(err);
    res.name = opts.newName;
    res.save(function (err) {
      return cb(err, res);
    });
  });
};

/*
 * Find an organisation by name
 * - opts:
 *   - oldName
 *   - newName
 * - cb(err, res)
 */
Self.findOneByName = function (opts = {}, cb) {
  return Organisations.findOne({
    'name': opts.name
  }).exec(function (err, res) {
    return cb(err, res);
  });
};

/*
 * Delete an organisation by name & id
 * - opts:
 *   - oldName
 *   - newName
 * - cb(err, res)
 */
Self.deleteOne = function (opts = {}, cb) {
  return Organisations.deleteOne(
    {
      _id: opts.id,
      name: opts.name
    },
    function (err) {
      return cb(err, res);
    }
  );
};

module.exports = Self;
