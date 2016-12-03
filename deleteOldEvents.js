'use strict'
var fs = require('fs');
var moment = require('moment');
var https = require('https');
var mongoose = require('mongoose');
var Event = require('./event');

var mongoUri = process.env.MONGODB_URI || 'mongodb://localhost/thehaps';
mongoose.connect(mongoUri);

var endOfYesterday = moment().subtract(1, 'days').endOf('day').format("x");

//find old events
function getOldEvents() {
  return new Promise((resolve, reject) => {
    Event.find({timeValue: {$lte:endOfYesterday} }).remove().exec(function(err, numDocs) {
      if(err) {
        reject(err);
      }
      resolve(numDocs.result.n + ' events deleted');
    });
  });
}

getOldEvents().then(result => {
  console.log(result);
  mongoose.disconnect()
});
