'use strict'
var fs = require('fs');
var xml2js = require('xml2js');
var util = require('util');
var processors = require('xml2js/lib/processors');
var moment = require('moment');
var https = require('https');
var mongoose = require('mongoose');
var Event = require('./event');

var mongoUri = process.env.MONGODB_URI || 'mongodb://localhost/thehaps';
mongoose.connect(mongoUri);

var categories = {
  music: {85: "classical", 86: "country", 87: "jazz", 89: "electronic", 92: "hip hip", 93: "latin", 94: "folk", 95: "r&b & soul", 96: "rock", 97: "religious", 99: "opera", 100: "concert", 101: "a capella", 102: "acoustic", 104: "choral", 108: "marching band", 204: "alt rock", 20: "heavy metal", 207: "punk", 270: "reggae", 239: "rockabilly", 213: "blues", 212: "bluegrass", 226: "funk", 107: "karaoke", 10262: "live music", 78: "dance club"},

  'performing arts': {18: "dance", 19: "theatre", 20: "comedy", 21: "open mic", 424: "variety show", 10173: "auditions", 430: "improv", 446: "magic show"},

  'visual arts': {22: "drawing & painting", 23: "sculpture", 24: "architecture", 25: "photography", 26: "film", 10170: "galleries", 10237: "glass art", 10256: "media arts"},

  'literary arts': {27: "writing", 28: "poetry", 29: "storytelling", 30: "books", 425: "reading", 453: "books", 10202: "books", 189: "books"},

  'sports & outdoors': {36: "organized sport", 37: "outdoor recreation", 38: "fitness", 10136: "races", 167: "running"},

  'hobbies & interests': {51: "crafts", 52: "collectibles", 53: "games", 54: "markets & shopping", 55: "fashion", 56: "travel", 58: "automotive", 59: "home & garden", 10025: "farming & ranching", 10032: "other interests"},

  'food & drink': {74: "food", 75: "drinks", 10001: "coffee & tea", 10016: "coffee & tea", 10149: "food trucks", 382: "wine", 10252: "beer", 50: "culinary arts"},

  lifestyle: {60: "health & wellness", 61: "religion & spirituality", 63: "culture & ethnic", 64: "relationships", 65: "parenting", 66: "personal finance", 67: "pets"},

  education: {39: "conferences & workshops", 40: "talks & lectures", 41: "lessons & classes", 32: "museums & exhibits", 33: "animals & zoos", 35: "sightseeing", 427: "webinar", 426: "special attractions"},

  professional: {42: "business", 43: "real estate", 44: "technology", 45: "law", 46: "science", 47: "schools", 48: "career & jobs", 49: "networking", 180: "medicine"},

  community: {34: "parks & gardens", 10120: "community groups", 68: "volunteer", 69: "fundraisers", 73: "causes & activism", 70: "politics & government", 439: "politics & government", 10005: "politics & government", 79: "family", 80: "kids", 81: "teens", 82: "singles", 83: "women", 84: "seniors", 363: "lgbt"},

  'special events': {31: "festivals & fairs", 381: "parties & reunions", 431: "parties & reunions", 390: "holidays", 178: "tradeshows & expos", 385: "farmers markets", 388: "yard sales", 386: "flea markets", 10142: "awards ceremony"}
};

function getCoords(address, city, state, callback) {
  var mapAddress = address.split(' ').join('+').replace(/\./g, '');
  var mapCity = city.split(' ').join('+').replace(/\./g, '');
  var url = `https://maps.googleapis.com/maps/api/geocode/json?address=${mapAddress},+${mapCity},+${state}&key=AIzaSyBDnrHjFasPDwXmFQ1XUAyt1Q1uAPju8TI`

  https.get(url, function(res){
      var body = '';
      res.on('data', function(chunk){
          body += chunk;
      });
      res.on('end', function(){
          var data = JSON.parse(body);
          // console.log("Got a response: ", data.results[0].geometry.location);
          var location = data.results[0].geometry.location;
          var lat = location.lat;
          var lng = location.lng;
          callback(lat, lng);
      });
  }).on('error', function(e){
        console.log("Got an error: ", e);
  });
}

function postEvent(title, primCategory, primSubCategory, secCategory, secSubCategory, locationName, address, city, state, description, date, startTime, endTime, timeValue, url, host, contactNumber, cwId, lat, lng) {
  new Event({
    title: title,
    primCategory: primCategory,
    primSubCategory: primSubCategory,
    secCategory: secCategory,
    secSubCategory: secSubCategory,
    locationName: locationName,
    address: address,
    city: city,
    state: state,
    description: description,
    date: date,
    startTime: startTime,
    endTime: endTime,
    timeValue: timeValue,
    url: url,
    host: host,
    contactNumber: contactNumber,
    cwId: cwId,
    lat: lat,
    lng: lng
  }).save((err, event) => {
    if(err) {
      console.log(err);
    }
    console.log(event);
  });
}


fs.readFile(__dirname + '/getevents.xml', function(err, data) {
  xml2js.parseString(data, {tagNameProcessors: [processors.stripPrefix], explicitArray: false}, function (err, result) {

    var events = result.GetEventResponse.events.jsEvent;

    var eventsArr = events.map(function(event){
      var primCategory;
      var primSubCategory;
      var secCategory;
      var secSubCategory;
      function parseCats(catArr) {
        //loop over all event category numbers
        catArr.forEach(function(eventCatNum) {
          //loop over parent categories in list
          for(var cat in categories) {
            //assign name to subcategories object for each parent category
            var subCategories = categories[cat]
            //loop over subcategories object
            for(var subCatNum in subCategories) {
              //if the subcategory number (key) equals the eventcategorynumber, assign the categories
              if(subCatNum == eventCatNum && !primCategory) {
                primCategory = cat;
                primSubCategory = subCategories[subCatNum];
              } else if(subCatNum == eventCatNum && !secCategory){
                secCategory = cat;
                secSubCategory = subCategories[subCatNum];
              }
            }
          }
        })
        if(!secCategory) {
          console.log(catArr);
          secCategory = '';
          secSubCategory= '';
        }
      };

      var title = event.Name;

      parseCats(event.Tags.int);

      var locationName = event.Venue;
      var address = typeof event.Address == 'string' ? event.Address : '';
      var city = event.CityState.split(', ')[0];
      var state = event.CityState.split(', ')[1];
      var description = event.Description;
      var date = moment.utc(event.Date).format('MMMM D, YYYY');
      var startTime = moment.utc(event.DateStart).format('HH:mm');
      var endTime = typeof event.DateEnd == 'string' ? moment.utc(event.DateEnd).format('HH:mm') : '';
      var timeValue = parseInt(moment(`${date}, ${startTime}`, 'MMMM D, YYYY, HH:mm', true).format('x'));
      var url = (function() {
        if(typeof event.Links.jsLink !== 'undefined') {
          return event.Links.jsLink.url
        } else if(typeof event.Tickets.jsLink !== 'undefined') {
          if(event.Tickets.jsLink.url.includes('buy_tickets')) {
            return event.Tickets.jsLink.url.split('buy_tickets')[0];
          }
          return event.Tickets.jsLink.url
        } else {
          return ''
        }
      })()
      var host = typeof event.ct.name == 'string' ? event.ct.name : '';
      var contactNumber = typeof event.ct.phone == 'string' ? event.ct.phone : '';
      var cwId = event.Id;


      if(typeof event.Address == 'string') {
          getCoords(address, city, state, function(lat, lng) {
            postEvent(title, primCategory, primSubCategory, secCategory, secSubCategory, locationName, address, city, state, description, date, startTime, endTime, timeValue, url, host, contactNumber, cwId, lat, lng);
          });
      } else {
          var lat = typeof event.Address !== 'string' ? event.latitude : '';
          var lng = typeof event.Address !== 'string' ? event.longitude : '';
          postEvent(title, primCategory, primSubCategory, secCategory, secSubCategory, locationName, address, city, state, description, date, startTime, endTime, timeValue, url, host, contactNumber, cwId, lat, lng);
      }
    })




    //writes file
    fs.writeFile(__dirname + '/events.js', util.inspect(events, false, null), function(err) {
      if(err) {
          return console.log(err);
      }
      console.log("The file was saved!");
    });

    console.log('Done');
  });
});

// mongoose.disconnect()
