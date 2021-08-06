/*
 * @prettier
 */

'use strict';

const API = {
  url: `/api`,
  /**
   * Update or Create the Hypothes.is annotation
   * @param {object} opts JSON object containing all data
   * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
   * @returns {undefined} undefined
   */
  updateOrCreateAnnotation: function (opts = {}, done) {
    return $.ajax({
      type: `PUT`,
      data: _.get(opts, `data`, {}),
      url: URLMANAGER.buildURL(`${this.url}/hypothesis/bioRxiv`, {}, { setToken: true }),
      success: function (query) {
        console.log(`updateOrCreateAnnotation`, query);
        return done(false, query);
      },
      error: function (query) {
        return done(query);
      }
    });
  },
  /**
   * Get the Crisp id
   * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
   * @returns {undefined} undefined
   */
  getCrispId: function (done) {
    return $.ajax({
      type: `GET`,
      url: URLMANAGER.buildURL(`${this.url}/getCrispId`, {}, { setToken: true }),
      success: function (query) {
        console.log(`getCrispId`, query);
        return done(false, query);
      },
      error: function (query) {
        return done(query);
      }
    });
  },
  /**
   * Get the userflow token
   * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
   * @returns {undefined} undefined
   */
  getUserflowToken: function (done) {
    return $.ajax({
      type: `GET`,
      url: URLMANAGER.buildURL(`${this.url}/getUserflowToken`, {}, { setToken: true }),
      success: function (query) {
        console.log(`getUserflowToken`, query);
        return done(false, query);
      },
      error: function (query) {
        return done(query);
      }
    });
  },
  /**
   * Signin a given user
   * @param {object} opts JSON object containing all data
   * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
   * @returns {undefined} undefined
   */
  signin: function (opts = {}, done) {
    return $.ajax({
      type: `POST`,
      url: URLMANAGER.buildURL(`${this.url}/signin`, {}, { setToken: true }),
      data: _.get(opts, `data`, {}),
      success: function (query) {
        console.log(`signin`, query);
        return done(false, query);
      },
      error: function (query) {
        return done(query);
      }
    });
  },
  /**
   * Signup a given user
   * @param {object} opts JSON object containing all data
   * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
   * @returns {undefined} undefined
   */
  signup: function (opts = {}, done) {
    return $.ajax({
      type: `POST`,
      url: URLMANAGER.buildURL(`${this.url}/signup`, {}, { setToken: true }),
      data: _.get(opts, `data`, {}),
      success: function (query) {
        console.log(`signup`, query);
        return done(false, query);
      },
      error: function (query) {
        return done(query);
      }
    });
  },
  /**
   * Process "forget password" for a given user
   * @param {object} opts JSON object containing all data
   * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
   * @returns {undefined} undefined
   */
  forgotPassword: function (opts = {}, done) {
    return $.ajax({
      type: `POST`,
      url: URLMANAGER.buildURL(`${this.url}/forgotPassword`, {}, { setToken: true }),
      data: _.get(opts, `data`, {}),
      success: function (query) {
        console.log(`forgotPassword`, query);
        return done(false, query);
      },
      error: function (query) {
        return done(query);
      }
    });
  },
  /**
   * Reset password of a given user
   * @param {object} opts JSON object containing all data
   * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
   * @returns {undefined} undefined
   */
  resetPassword: function (opts = {}, done) {
    return $.ajax({
      type: `POST`,
      url: URLMANAGER.buildURL(`${this.url}/resetPassword`, {}, { setToken: true }),
      data: _.get(opts, `data`, {}),
      success: function (query) {
        console.log(`resetPassword`, query);
        return done(false, query);
      },
      error: function (query) {
        return done(query);
      }
    });
  },
  /**
   * Get the current user
   * @param {object} opts JSON object containing all data
   * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
   * @returns {undefined} undefined
   */
  currentUser: function (opts = {}, done) {
    return $.ajax({
      type: `GET`,
      url: URLMANAGER.buildURL(`${this.url}/currentUser`, {}, { setToken: true }),
      success: function (query) {
        console.log(`currentUser`, query);
        return done(false, query);
      },
      error: function (query) {
        return done(query);
      }
    });
  },
  /**
   * Get logs of "model"
   * @param {string} model Which model of data will be used (accounts, organizations, documents, etc)
   * @param {object} opts JSON object containing all data
   * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
   * @returns {undefined} undefined
   */
  getLogs: function (model, opts = {}, done) {
    return $.ajax({
      type: `GET`,
      url: URLMANAGER.buildURL(`${this.url}/${model}/${opts.id}/logs`, _.get(opts, `params`, {}), {
        setToken: true
      }),
      success: function (query) {
        console.log(`getLogs`, query);
        return done(false, query);
      },
      error: function (query) {
        return done(query);
      }
    });
  },
  /**
   * Get a given "model"
   * @param {string} model Which model of data will be used (accounts, organizations, documents, etc)
   * @param {object} opts JSON object containing all data
   * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
   * @returns {undefined} undefined
   */
  get: function (model, opts = {}, done) {
    return $.ajax({
      type: `GET`,
      url: URLMANAGER.buildURL(`${this.url}/${model}/${opts.id}`, _.get(opts, `params`, {}), { setToken: true }),
      success: function (query) {
        console.log(`get`, model, query);
        return done(false, query);
      },
      error: function (query) {
        return done(query);
      }
    });
  },
  /**
   * Get all "things"
   * @param {string} model Which model of data will be used (accounts, organizations, documents, etc)
   * @param {object} opts JSON object containing all data
   * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
   * @returns {undefined} undefined
   */
  all: function (model, opts = {}, done) {
    return $.ajax({
      type: `GET`,
      url: URLMANAGER.buildURL(`${this.url}/${model}`, opts.params, { setToken: true }),
      success: function (query) {
        console.log(`all`, model, query);
        return done(false, query);
      },
      error: function (query) {
        return done(query);
      }
    });
  },
  /**
   * Add a given "model"
   * @param {string} model Which model of data will be used (accounts, organizations, documents, etc)
   * @param {object} opts JSON object containing all data
   * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
   * @returns {undefined} undefined
   */
  add: function (model, opts = {}, done) {
    return $.ajax({
      type: `POST`,
      data: _.get(opts, `data`, {}),
      url: URLMANAGER.buildURL(`${this.url}/${model}`, {}, { setToken: true }),
      success: function (query) {
        console.log(`add`, model, query);
        return done(false, query);
      },
      error: function (query) {
        return done(query);
      }
    });
  },
  /**
   * Update a given "model"
   * @param {string} model Which model of data will be used (accounts, organizations, documents, etc)
   * @param {object} opts JSON object containing all data
   * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
   * @returns {undefined} undefined
   */
  update: function (model, opts = {}, done) {
    return $.ajax({
      type: `PUT`,
      data: _.get(opts, `data`, {}),
      url: URLMANAGER.buildURL(`${this.url}/${model}/${opts.data._id}`, {}, { setToken: true }),
      success: function (query) {
        console.log(`update`, model, query);
        return done(false, query);
      },
      error: function (query) {
        return done(query);
      }
    });
  },
  /**
   * Update many "things"
   * @param {string} model Which model of data will be used (accounts, organizations, documents, etc)
   * @param {object} opts JSON object containing all data
   * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
   * @returns {undefined} undefined
   */
  updateMany: function (model, opts = {}, done) {
    return $.ajax({
      type: `PUT`,
      data: _.get(opts, `data`, {}),
      url: URLMANAGER.buildURL(`${this.url}/${model}`, {}, { setToken: true }),
      success: function (query) {
        console.log(`updateMany`, model, query);
        return done(false, query);
      },
      error: function (query) {
        return done(query);
      }
    });
  },
  /**
   * Delete a given "model"
   * @param {string} model Which model of data will be used (accounts, organizations, documents, etc)
   * @param {object} opts JSON object containing all data
   * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
   * @returns {undefined} undefined
   */
  delete: function (model, opts = {}, done) {
    return $.ajax({
      type: `DELETE`,
      data: _.get(opts, `data`, {}),
      url: URLMANAGER.buildURL(`${this.url}/${model}/${opts.data._id}`, {}, { setToken: true }),
      success: function (query) {
        console.log(`delete`, model, query);
        return done(false, query);
      },
      error: function (query) {
        return done(query);
      }
    });
  },
  /**
   * Delete many "things"
   * @param {string} model Which model of data will be used (accounts, organizations, documents, etc)
   * @param {object} opts JSON object containing all data
   * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
   * @returns {undefined} undefined
   */
  deleteMany: function (model, opts = {}, done) {
    return $.ajax({
      type: `DELETE`,
      data: _.get(opts, `data`, {}),
      url: URLMANAGER.buildURL(`${this.url}/${model}`, {}, { setToken: true }),
      success: function (query) {
        console.log(`deleteMany`, model, query);
        return done(false, query);
      },
      error: function (query) {
        return done(query);
      }
    });
  },
  /**
   * Upload some files
   * @param {string} model Which model of data will be used (accounts, organizations, documents, etc)
   * @param {object} opts JSON object containing all data
   * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
   * @returns {undefined} undefined
   */
  upload: function (model, opts = {}, done) {
    return $.ajax({
      type: `POST`,
      data: _.get(opts, `data`, {}),
      processData: false,
      contentType: false,
      enctype: `multipart/form-data`,
      url: URLMANAGER.buildURL(`${this.url}/${model}`, {}, { setToken: true }),
      success: function (query) {
        console.log(`upload`, query);
        return done(false, query);
      },
      error: function (query) {
        return done(query);
      }
    });
  },
  dataseerML: {
    url: `api/dataseer-ml`,
    /**
     * Resync jsonDataTypes
     * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
     * @returns {undefined} undefined
     */
    resyncJsonDataTypes: function (done) {
      return $.ajax({
        type: `POST`,
        url: URLMANAGER.buildURL(`${this.url}/resyncJsonDataTypes`, {}, { setToken: true }),
        success: function (query) {
          console.log(`dataseerML.resyncJsonDataTypes`, query);
          return done(false, query);
        },
        error: function (query) {
          return done(true, query);
        }
      });
    },
    /**
     * Get jsonDataTypes
     * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
     * @returns {undefined} undefined
     */
    jsonDataTypes: function (done) {
      return $.ajax({
        type: `GET`,
        url: URLMANAGER.buildURL(`${this.url}/jsonDataTypes`, {}, { setToken: true }),
        success: function (query) {
          console.log(`dataseerML.jsonDataTypes`, query);
          return done(false, query);
        },
        error: function (query) {
          return done(query);
        }
      });
    },
    /**
     * Extract DataTypes from data (result of DataSeerAPI.jsonDataTypes())
     * @param {object} data JSON object containing all data
     * @returns {object} JSON object containing all DataTypes
     */
    extractDatatypeFrom: function (data) {
      let classifications =
        data[`classifications`].length > 0 &&
        typeof data[`classifications`][0] === `object` &&
        data[`classifications`][0].has_dataset > data[`classifications`][0].no_dataset
          ? data[`classifications`][0]
          : {};
      let result = {};
      delete classifications.text;
      delete classifications.has_dataset;
      delete classifications.no_dataset;
      let keys = Object.keys(classifications);
      if (keys.length > 0) {
        let datatype = keys[0];
        let max = classifications[keys[0]];
        for (let i = 1; i < keys.length; i++) {
          if (max < classifications[keys[i]]) {
            max = classifications[keys[i]];
            datatype = keys[i];
          }
        }
        // result.datatype = datatype;
        result.datatype = datatype.toLowerCase(); // lowercase to match with metadata returned by dataseer-ml
        result.cert = max;
      }
      return result;
    },
    /**
     * Get datatype of given sentence
     * @param {object} sentence Sentence HTML element
     * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
     * @returns {undefined} undefined
     */
    getdataType: function (sentence, done) {
      return $.ajax({
        cache: false,
        type: `POST`,
        data: sentence,
        url: URLMANAGER.buildURL(`${this.url}/processDataseerSentence`, {}, { setToken: true }),
        success: function (query) {
          console.log(`dataseerML.getdataType`, query);
          let result = API.dataseerML.extractDatatypeFrom(query);
          console.log(result);
          return done(null, result);
        },
        error: function (query) {
          return done(true, query);
        }
      });
    }
  },
  repoRecommender: {
    url: `api/repoRecommender`,
    /**
     * Call findRepo on given dataset
     * @param {object} opts opts
     * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
     * @returns {undefined} undefined
     */
    findRepo: function (opts = {}, done) {
      return $.ajax({
        type: `POST`,
        data: opts,
        url: URLMANAGER.buildURL(`${this.url}/findRepo`, {}, { setToken: true }),
        success: function (query) {
          console.log(`repoRecommender.findRepo`, query);
          return done(false, query);
        },
        error: function (query) {
          return done(query);
        }
      });
    }
  },
  datasets: {
    url: `api/datasets`,
    /**
     * Create new dataset to datasets
     * @param {object} opts JSON object containing all data
     * @param {string} opts.datasetsId Id of document datasets
     * @param {object} opts.sentence Sentence options
     * @param {string} opts.sentence.id Sentence id
     * @param {string} opts.sentence.text Sentence text
     * @param {object} opts.dataset Dataset options
     * @param {string} opts.dataset.status Dataset status
     * @param {string} opts.dataset.id Dataset id
     * @param {string} opts.dataset.datainstanceId Dataset datainstanceId
     * @param {string} opts.dataset.cert Dataset cert
     * @param {string} opts.dataset.dataType Dataset dataType
     * @param {string} opts.dataset.subType Dataset subType
     * @param {string} opts.dataset.description Dataset description
     * @param {string} opts.dataset.bestDataFormatForSharing Dataset bestDataFormatForSharing
     * @param {string} opts.dataset.mostSuitableRepositories Dataset mostSuitableRepositories
     * @param {string} opts.dataset.name Dataset name
     * @param {string} opts.dataset.DOI Dataset DOI
     * @param {string} opts.dataset.comments Dataset comments
     * @param {string} opts.dataset.status Dataset comments
     * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
     * @returns {undefined} undefined
     */
    createDataset: function (opts = {}, done) {
      return $.ajax({
        type: `POST`,
        url: URLMANAGER.buildURL(`${this.url}/${opts.datasetsId}/dataset`, {}, { setToken: true }),
        data: { dataset: opts.dataset, sentence: opts.sentence },
        success: function (query) {
          console.log(`datasets.createDataset`, query);
          return done(false, query);
        },
        error: function () {
          return done(true);
        }
      });
    },
    /**
     * Save a given dataset
     * @param {object} opts JSON object containing all data
     * @param {string} opts.datasetsId Id of document datasets
     * @param {object} opts.dataset Dataset options
     * @param {string} opts.dataset.status Dataset status
     * @param {string} opts.dataset.id Dataset id
     * @param {string} opts.dataset.cert Dataset cert
     * @param {string} opts.dataset.dataType Dataset dataType
     * @param {string} opts.dataset.subType Dataset subType
     * @param {string} opts.dataset.description Dataset description
     * @param {string} opts.dataset.bestDataFormatForSharing Dataset bestDataFormatForSharing
     * @param {string} opts.dataset.mostSuitableRepositories Dataset mostSuitableRepositories
     * @param {string} opts.dataset.name Dataset name
     * @param {string} opts.dataset.DOI Dataset DOI
     * @param {string} opts.dataset.comments Dataset comments
     * @param {string} opts.dataset.status Dataset comments
     * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
     * @returns {undefined} undefined
     */
    updateDataset: function (opts = {}, done) {
      return $.ajax({
        type: `PUT`,
        data: { dataset: opts.dataset },
        url: URLMANAGER.buildURL(`${this.url}/${opts.datasetsId}/dataset`, {}, { setToken: true }),
        success: function (query) {
          console.log(`datasets.updateDataset`, query);
          return done(false, query);
        },
        error: function (query) {
          return done(query);
        }
      });
    },
    /**
     * Delete a given dataset
     * @param {object} opts JSON object containing all data
     * @param {string} opts.datasetsId Id of datasets
     * @param {string} opts.dataset.id Id of dataset
     * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
     * @returns {undefined} undefined
     */
    deleteDataset: function (opts = {}, done) {
      return $.ajax({
        type: `DELETE`,
        url: URLMANAGER.buildURL(`${this.url}/${opts.datasetsId}/dataset`, {}, { setToken: true }),
        data: { dataset: opts.dataset },
        success: function (query) {
          console.log(`datasets.deleteDataset`, query);
          return done(false, query);
        },
        error: function () {
          return done(true);
        }
      });
    },
    /**
     * Create new link to datasets
     * @param {object} opts JSON object containing all data
     * @param {string} opts.datasetsId Id of datasets
     * @param {object} opts.link Link
     * @param {object} opts.link.sentence Sentence
     * @param {string} opts.link.sentence.id Sentence id
     * @param {object} opts.link.dataset Dataset
     * @param {string} opts.link.dataset.id Dataset id
     * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
     * @returns {undefined} undefined
     */
    linkSentence: function (opts = {}, done) {
      return $.ajax({
        type: `POST`,
        url: URLMANAGER.buildURL(`${this.url}/${opts.datasetsId}/link`, {}, { setToken: true }),
        data: { link: opts.link },
        success: function (query) {
          console.log(`datasets.linkSentence`, query);
          return done(false, query);
        },
        error: function () {
          return done(true);
        }
      });
    },
    /**
     * Delete a given dataset link
     * @param {object} opts JSON object containing all data
     * @param {string} opts.datasetsId Id of datasets
     * @param {object} opts.link Link
     * @param {object} opts.link.sentence Sentence
     * @param {string} opts.link.sentence.id Sentence id
     * @param {object} opts.link.dataset Dataset
     * @param {string} opts.link.dataset.id Dataset id
     * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
     * @returns {undefined} undefined
     */
    unlinkSentence: function (opts = {}, done) {
      return $.ajax({
        type: `DELETE`,
        url: URLMANAGER.buildURL(`${this.url}/${opts.datasetsId}/unlink`, {}, { setToken: true }),
        data: { link: opts.link },
        success: function (query) {
          console.log(`datasets.unlinkSentence`, query);
          return done(false, query);
        },
        error: function () {
          return done(true);
        }
      });
    }
  },
  documents: {
    url: `api/documents`,
    /**
     * Get PDF of given document
     * @param {object} opts Options
     * @param {string} documentId Id of document
     * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
     * @returns {undefined} undefined
     */
    getReport: function (opts = {}, done) {
      return $.ajax({
        type: `GET`,
        url: URLMANAGER.buildURL(
          `${this.url}/${opts.id}/reports/${opts.kind}/${opts.organization}`,
          {},
          { setToken: true }
        ),
        success: function (query) {
          console.log(`documents.getReport`, query);
          return done(false, query);
        },
        error: function (query) {
          return done(query);
        }
      });
    },
    /**
     * Get PDF of given document
     * @param {object} opts Options
     * @param {string} opts.id Id of document
     * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
     * @returns {undefined} undefined
     */
    getPDF: function (opts = {}, done) {
      return $.ajax({
        type: `GET`,
        url: URLMANAGER.buildURL(`${this.url}/${opts.id}/pdf`, {}, { setToken: true }),
        success: function (query) {
          console.log(`documents.getPDF`, query);
          return done(false, query);
        },
        error: function (query) {
          return done(query);
        }
      });
    },
    /**
     * Get TEI of given document
     * @param {object} opts Options
     * @param {string} opts.id Id of document
     * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
     * @returns {undefined} undefined
     */
    getTEI: function (opts = {}, done) {
      return $.ajax({
        type: `GET`,
        url: URLMANAGER.buildURL(`${this.url}/${opts.id}/tei`, {}, { setToken: true }),
        success: function (query) {
          console.log(`documents.getTEI`, query);
          return done(false, query);
        },
        error: function (query) {
          return done(query);
        }
      });
    },
    /**
     * Get TEI content of given document
     * @param {object} opts Options
     * @param {string} opts.id Id of document
     * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
     * @returns {undefined} undefined
     */
    getTEIContent: function (opts = {}, done) {
      return $.ajax({
        type: `GET`,
        url: URLMANAGER.buildURL(`${this.url}/${opts.id}/tei/content`, {}, { setToken: true }),
        success: function (query) {
          console.log(`documents.getTEIContent`, query);
          return done(false, query);
        },
        error: function (query) {
          return done(query);
        }
      });
    },
    /**
     * Refresh token of given document
     * @param {object} opts Options
     * @param {string} opts.id Id of document
     * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
     * @returns {undefined} undefined
     */
    refreshToken: function (opts = {}, done) {
      return $.ajax({
        type: `POST`,
        data: {},
        url: URLMANAGER.buildURL(`${this.url}/${opts.id}/refreshToken`, {}, { setToken: true }),
        success: function (query) {
          console.log(`documents.refreshToken`, query);
          return done(false, query);
        },
        error: function (query) {
          return done(query);
        }
      });
    },
    /**
     * Reload "Metadata" of given document
     * @param {object} opts Options
     * @param {string} opts.id Id of document
     * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
     * @returns {undefined} undefined
     */
    reloadMetadata: function (opts = {}, done) {
      return $.ajax({
        type: `POST`,
        data: {},
        url: URLMANAGER.buildURL(`${this.url}/${opts.id}/metadata/reload`, {}, { setToken: true }),
        success: function (query) {
          console.log(`documents.reloadMetadata`, query);
          return done(false, query);
        },
        error: function (query) {
          return done(query);
        }
      });
    },
    /**
     * Validate "Metadata" process of given document
     * @param {object} opts Options
     * @param {string} opts.id Id of document
     * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
     * @returns {undefined} undefined
     */
    validateMetadata: function (opts = {}, done) {
      return $.ajax({
        type: `POST`,
        data: {},
        url: URLMANAGER.buildURL(`${this.url}/${opts.id}/metadata/validate`, {}, { setToken: true }),
        success: function (query) {
          console.log(`documents.validateMetadata`, query);
          return done(false, query);
        },
        error: function (query) {
          return done(query);
        }
      });
    },
    /**
     * Validate "Datasets" process of given document
     * @param {object} opts Options
     * @param {string} opts.id Id of document
     * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
     * @returns {undefined} undefined
     */
    validateDatasets: function (opts = {}, done) {
      return $.ajax({
        type: `POST`,
        data: {},
        url: URLMANAGER.buildURL(`${this.url}/${opts.id}/datasets/validate`, {}, { setToken: true }),
        success: function (query) {
          console.log(`documents.validateDatasets`, query);
          return done(false, query);
        },
        error: function (query) {
          return done(query);
        }
      });
    },
    /**
     * Reopen document (back to "Metadata" process)
     * @param {object} opts Options
     * @param {string} opts.id Id of document
     * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
     * @returns {undefined} undefined
     */
    reopen: function (opts = {}, done) {
      return $.ajax({
        type: `POST`,
        data: {},
        url: URLMANAGER.buildURL(`${this.url}/${opts.id}/finish/reopen`, {}, { setToken: true }),
        success: function (query) {
          console.log(`documents.reopen`, query);
          return done(false, query);
        },
        error: function (query) {
          return done(query);
        }
      });
    },
    /**
     * Back to "Metadata" process from "datasets" step
     * @param {object} opts Options
     * @param {string} opts.id Id of document
     * @param {function} done Callback function(err, res) (err: error process OR null, res: infos/data OR undefined)
     * @returns {undefined} undefined
     */
    backToMetadata: function (opts = {}, done) {
      return $.ajax({
        type: `POST`,
        data: {},
        url: URLMANAGER.buildURL(`${this.url}/${opts.id}/datasets/backToMetadata`, {}, { setToken: true }),
        success: function (query) {
          console.log(`documents.backToMetadata`, query);
          return done(false, query);
        },
        error: function (query) {
          return done(query);
        }
      });
    }
  }
};
