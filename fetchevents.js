'use strict'
var fs = require('fs');
var xml2js = require('xml2js');
var util = require('util');
var processors = require('xml2js/lib/processors');
var request = require('request');
var moment = require('moment');
var https = require('https');
var mongoose = require('mongoose');
var Event = require('./event');

var mongoUri = process.env.MONGODB_URI || 'mongodb://localhost/thehaps';
mongoose.connect(mongoUri);

var categories = {
  music: {85: "classical", 86: "country", 87: "jazz", 89: "electronic", 92: "hip hip", 93: "latin", 94: "folk", 95: "r&b & soul", 96: "rock", 97: "religious", 99: "opera", 100: "concert", 101: "a capella", 102: "acoustic", 104: "choral", 108: "marching band", 204: "alt rock", 206: "heavy metal", 207: "punk", 270: "reggae", 239: "rockabilly", 213: "blues", 212: "bluegrass", 226: "funk", 107: "karaoke", 10262: "live music", 78: "dance club"},

  'performing arts': {18: "dance", 19: "theatre", 20: "comedy", 21: "open mic", 424: "variety show", 10173: "auditions", 430: "improv", 446: "magic show"},

  'visual arts': {22: "drawing & painting", 23: "sculpture", 24: "architecture", 25: "photography", 26: "film", 10170: "galleries", 10237: "glass art", 10256: "media arts"},

  'literary arts': {27: "writing", 28: "poetry", 29: "storytelling", 30: "books", 425: "reading", 453: "books", 10202: "books", 189: "books"},

  'sports & outdoors': {36: "organized sport", 37: "outdoor recreation", 38: "fitness", 10136: "races", 167: "running"},

  'hobbies & interests': {51: "crafts", 52: "collectibles", 53: "games", 54: "markets & shopping", 55: "fashion", 56: "travel", 58: "automotive", 59: "home & garden", 10025: "farming & ranching", 10032: "other interests"},

  'food & drink': {74: "food", 75: "drinks", 10001: "coffee & tea", 10016: "coffee & tea", 10149: "food trucks", 382: "wine", 10252: "beer", 50: "culinary arts"},

  lifestyle: {60: "health & wellness", 61: "religion & spirituality", 63: "culture & ethnic", 64: "relationships", 65: "parenting", 66: "personal finance", 67: "pets"},

  education: {39: "conferences & workshops", 40: "talks & lectures", 41: "lessons & classes", 32: "museums & exhibits", 33: "animals & zoos", 35: "sightseeing", 427: "webinar", 426: "special attractions"},

  professional: {42: "business", 43: "real estate", 44: "technology", 45: "law", 46: "science", 47: "schools", 48: "career & jobs", 49: "networking", 180: "medicine"},

  community: {34: "parks & gardens", 10120: "community groups", 68: "volunteer", 69: "fundraisers", 73: "causes & activism", 70: "politics & government", 439: "politics & government", 10005: "politics & government", 79: "family", 80: "kids", 81: "teens", 82: "singles", 83: "women", 84: "seniors", 363: "lgbt", 10022: "patriotic"},

  'special events': {31: "festivals & fairs", 381: "parties & reunions", 431: "parties & reunions", 390: "holidays", 178: "tradeshows & expos", 385: "farmers markets", 388: "yard sales", 386: "flea markets", 10142: "awards ceremony"}
};

var mainCats = {
  2: "performing arts",
  3: "visual arts",
  4: "literary arts",
  5: "community",
  6: "sports & outdoors",
  7: "education",
  8: "professional",
  10: "lifestyle",
  11: "community",
  12: "food & drink",
  14: "special events",
  15: "hobbies & interests",
  76: "hobbies & interests",
  390: "special events"
}

var today = moment().format('YYYY-MM-DD');

var eventsLimit = 25;

var eventsSkip = 0

var eventsParam = `{"searchKeywords":null,"venueKeywords":null,"search":"","longitude":-111.888221740723,"latitude":40.760311126709,"distance":50,"limit":${eventsLimit},"categories":[],"skip":${eventsSkip},"start":"${today}T00:00:00.000Z","end":null,"sortby":"start","sortdir":"asc","onlySparked":false,"oneSort":false,"deals":false,"hier":[2,5299,5300],"possible":false,"ppid":8315,"blockedCategories":[],"blockedKeywords":["x96","x96 live","x96 event","Eagle live","Eagle event","mix 1079","mix live","mix event","mix pop-up","u92","u92 live","u92 event","espn 700","espn 960","Cougar Sports Live","Bill Riley","rewind:","rewind 100.7","rewind live","rewind event","rewind night"],"hoursOffset":7,"venue":null,"exact":false,"interest":50,"eventPIds":null,"defaultCat":true,"metric":false,"handPicked":false,"bhier":[2,5299,5300],"labels":[]}`

var eventsURL = `http://portal.cityspark.com/api/events/getevents2?request=${encodeURIComponent(eventsParam)}`


function getCoords(address, city, state) {
  return new Promise(function(resolve, reject) {
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
            console.log("Got a response: ", data.status);

            if (data.results[0]) {
              var location = data.results[0].geometry.location
              resolve(location);
            } else {
              reject("unable to retrieve coords");
            }
        });
    }).on('error', function(e){
      console.log("Got an error: ", e);
    });
  });
}

function postEvent(title, primCategory, primSubCategory, secCategory, secSubCategory, locationName, address, city, state, description, date, startTime, endTime, timeValue, url, host, contactNumber, contactEmail, cwId, lat, lng) {
  return new Promise((resolve, reject) => {
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
      contactEmail: contactEmail,
      cwId: cwId,
      lat: lat,
      lng: lng,
      active: true
    }).save((err, event) => {
      if(err) {
        resolve(err.message);
      }
      resolve('event added');
    });

  });
}

function processEvents(err, result) {
  var events = result.GetEventResponse.events.jsEvent;
  var interval = 25; // delay in milliseconds

  // for(let i = 0; i < events.length; i++) {
  var eventsArr = events.map((event, i) => {
    return new Promise(function(resolve, reject) {
      setTimeout(function(i) {

        // let event = events[i];

        var primCategory;
        var primSubCategory;
        var secCategory;
        var secSubCategory;

        //assigns array of category numbers to prim, sec, & sub categories
        function parseCats(catArr) {
          //loop over all event category numbers and try to match with categories
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
          });
          if(!secCategory) {
            secCategory = '';
            secSubCategory= '';
          }
          //try assigning a primCat with parent category numbers
            //add cases here if catArr's are console.log'd
          if(!primCategory) {
            catArr.forEach(function(eventCatNum) {
              switch (eventCatNum) {
                case "17":
                  primCategory = "music";
                  console.log("assigned music primCat on second go!")
                  break;
                default:
                  break;
              }
            });
          }
          if(!primCategory) {
            console.log(catArr)
          }

        };

        //assigns string category number to primCategory
        function parseCatString(catString) {
          for(var catNum in mainCats) {
            if(catString === catNum) {
              primCategory = mainCats[catString];
              console.log('assigned primCategory from string!');
            }
          }
        }

        //call functions to assign categories
        if(typeof event.Tags.int != 'string' && typeof event.Tags.int != 'undefined') {
          parseCats(event.Tags.int);
        } else if(typeof event.Tags.int === "string") {
          parseCatString(event.Tags.int);
        }

        var title = event.Name;
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
          } else if(typeof event.Tickets.jsLink != 'undefined') {
            //handles case where Tickets.jsLink is an array
            if(event.Tickets.jsLink.length > 1) {
              return event.Tickets.jsLink[0].url;
            }
            //remove affiliate code from bandsintown link
            if(event.Tickets.jsLink.url.includes('buy_tickets')) {
              return event.Tickets.jsLink.url.split('buy_tickets')[0];
            }
            return event.Tickets.jsLink.url
          } else {
            return ''
          }
        })()
        var hostName = typeof event.ct.name == 'string' ? event.ct.name : '';
        var hostOrg = typeof event.ct.org == 'string' ? event.ct.org : '';
        var host = (function() {
          if(hostName && hostOrg) {
            return hostName + ", " + hostOrg;
          } else if(hostOrg) {
            return hostOrg;
          } else if(hostName) {
            return hostName;
          } else {
            return '';
          }
        })();

        var contactNumber = typeof event.ct.phone == 'string' ? event.ct.phone : '';
        var contactEmail = typeof event.ct.email == 'string' ? event.ct.email : '';
        var cwId = event.Id;

        if(typeof event.Address == 'string') {
            getCoords(address, city, state).then(location => {
              var lat = location.lat;
              var lng = location.lng;
              postEvent(title, primCategory, primSubCategory, secCategory, secSubCategory, locationName, address, city, state, description, date, startTime, endTime, timeValue, url, host, contactNumber, contactEmail, cwId, lat, lng).then((value) => {
                resolve(value);
              })
            }).catch(data => {
              console.log(data);
              resolve(data);
            });;
        } else {
            var lat = typeof event.Address !== 'string' ? event.latitude : '';
            var lng = typeof event.Address !== 'string' ? event.longitude : '';
            postEvent(title, primCategory, primSubCategory, secCategory, secSubCategory, locationName, address, city, state, description, date, startTime, endTime, timeValue, url, host, contactNumber, contactEmail, cwId, lat, lng).then((value) => {
              resolve(value);
            });
        }

      }, interval * i, i);

    });
  });

  Promise.all(eventsArr).then(results => {
    console.log(results);

    var success = 0;
    var failed = 0;
    results.forEach(result => {
      if(result === "event added") {
        ++success
      } else {
        ++failed
      }
    });
    console.log(`Successful: ${success} \nFailed: ${failed}`)
    mongoose.disconnect()
  })
}




function getEvents() {
  request({uri: eventsURL, headers: {'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.98 Safari/537.36', 'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'}}, function(error, response, body) {
    if(error) {
      console.log(error);
    }

    xml2js.parseString(body, {tagNameProcessors: [processors.stripPrefix], explicitArray: false}, processEvents);
  });

}

getEvents();





// fetch events from local file
// function getEvents() {
//   fs.readFile(__dirname + '/getevents2.xml', function(err, data) {
//     console.log(data)
//     xml2js.parseString(data, {tagNameProcessors: [processors.stripPrefix], explicitArray: false}, processEvents);
//   });
//
// }
