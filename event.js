'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Event = new Schema({
  title: { type: String, required: true },
  primCategory: { type: String, required: true },
  primSubCategory: { type: String },
  secCategory: String,
  secSubCategory: String,
  locationName: { type: String },
  address: { type: String },
  city: { type: String },
  state: { type: String },
  description: String,
  date: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: String,
  timeValue: Number,
  url: String,
  host: String,
  contactNumber: String,
  contactEmail: String,
  cwId: { type: String, required: true, unique: true, trim: true },
  lat: Number,
  lng: Number,
  active: Boolean
});


module.exports = mongoose.model( 'Event', Event );
