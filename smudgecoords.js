'use strict'
var fs = require('fs');
var moment = require('moment');
var https = require('https');
var mongoose = require('mongoose');
var Event = require('./event');

var mongoUri = process.env.MONGODB_URI || 'mongodb://localhost/thehaps';
mongoose.connect(mongoUri);

//find event documents with matching lat and lng's
function getDups() {
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
            return;
        }
        getIds(result);
    });
}

//gets id's for each document with duplicate lat and lng
function getIds(arr) {
  arr.forEach(group => {
    group.docs.forEach(id => {
      modifyCoords(id);
    });
  });
};


function modifyCoords(id) {
  Event.findById(id, (err, doc) => {
    if (err) {
      console.log(err);
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
        console.log(err);
      }
      console.log('success!')
      console.log(event.lat, event.lng);
    });

  });

}


getDups();






// mongoose.disconnect()
