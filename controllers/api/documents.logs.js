/*
 * @prettier
 */

'use strict';

const DocumentsLogs = require(`../../models/documents.logs.js`);

const Logs = require(`../../lib/logs.js`);

module.exports = new Logs(DocumentsLogs);
