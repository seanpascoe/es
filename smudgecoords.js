'use strict'
var fs = require('fs');
var moment = require('moment');
var https = require('https');
var mongoose = require('mongoose');
var Event = require('./event');

var mongoUri = process.env.MONGODB_URI || 'mongodb://localhost/thehaps';
mongoose.connect(mongoUri);

// find event documents with matching lat and lng's
function getDups() {
  return new Promise((resolve, reject) => {
    Event.aggregate([
        { $group: {
            // Group by fields to match on (a,b)
            _id: { lat: "$lat", lng: "$lng" },

            // Count number of matching docs for the group
            count: { $sum:  1 },

            // Save the _id for matching docs
            docs: { $push: "$_id" }
        }},

        // Limit results to duplicates (more than 1 match)
        { $match: {
            count: { $gt : 1 }
        }}
    ], function (err, result) {
        if (err) {
          console.log(err);
          reject(err)
        }
        resolve(result)
    });
  });
}

//gets id's for each document with duplicate lat and lng
function getIds(arr) {
  if(arr.length === 0) {
    console.log('No duplicates!');
    mongoose.disconnect();
  }
  arr.forEach(group => {
    var coordsArr = group.docs.map(id => {
      return new Promise((resolve, reject) => {
        modifyCoords(id).then(result => {
          resolve(result);
        });
      });
    });
    Promise.all(coordsArr).then(results => {
      console.log(results);
      mongoose.disconnect();
    }).catch(err => {
      console.log(err)
      mongoose.disconnect();
    })
  });
};


function modifyCoords(id) {
  return new Promise((resolve, reject) => {
    Event.findById(id, (err, doc) => {
      if (err) {
        reject(err);
      }
      let oldLat = parseFloat(doc.lat);
      let oldLng = parseFloat(doc.lng);

      let plusOrMinusLat = Math.random() < 0.5 ? -1 : 1
      let newLat = (Math.random()*.0001*plusOrMinusLat) + oldLat

      let plusOrMinusLng = Math.random() < 0.5 ? -1 : 1;
      let newLng = (Math.random()*.0001*plusOrMinusLng) + oldLng

      Event.findByIdAndUpdate(
        doc._id,
        {$set: {lat: newLat, lng: newLng}},
        {new: true}, (err, event) => {
        if (err) {
          reject(err);
        }
        resolve(event.lat, event.lng);
      });

    });
  });
}


getDups().then(data => {
  getIds(data);
});
