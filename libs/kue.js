'use strict';

var assert = require('assert');
var REDIS_URI = process.env.REDIS_URI;
var KUE_REDIS_PREFIX = process.env.KUE_REDIS_PREFIX;

assert(REDIS_URI, 'Missing REDIS_URI in environment variable');
assert(KUE_REDIS_PREFIX, 'Missing KUE_REDIS_PREFIX in environment variable');

var kue = require('kue');
var queue = kue.createQueue({
  redis: REDIS_URI,
  prefix: KUE_REDIS_PREFIX
});

var elasticsearch = require('./elasticsearch');

queue.process('update shop index', 10, (job, done) => {
  elasticsearch.indexShopById(job.data.shopId).then(() => done(), done);
});

queue.process('delete shop index', 10, (job, done) => {
  elasticsearch.deleteShopIndexById(job.data.shopId).then(() => done(), done);
});

exports.queue = queue;

///////////////////////////
// PRE-DEFINED JOB HERE //
//////////////////////////

var createUpdateShopJob = (jobData) => {
  queue.createJob('update shop index', jobData)
    .priority('high')
    .attempts(5)  // Retry 5 times if failed, after that give up
    .backoff({ delay: 30 * 1000, type: 'fixed' }) // Wait for 30s before retrying
    .ttl(10000) // Kill the job if it take more than 10s
    .removeOnComplete(true)
    .save();
};
exports.createUpdateShopIndexJob = createUpdateShopJob;

var createDeleteShopIndexJob = (jobData) => {
  queue.createJob('delete shop index', jobData)
    .priority('high')
    .attempts(5)  // Retry 5 times if failed, after that give up
    .backoff({ delay: 30 * 1000, type: 'fixed' }) // Wait for 30s before retrying
    .ttl(10000) // Kill the job if it take more than 10s
    .removeOnComplete(true)
    .save();
};
exports.createDeleteShopIndexJob = createDeleteShopIndexJob;
