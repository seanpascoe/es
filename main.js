'use strict'
var fs = require('fs');
var xml2js = require('xml2js');
var util = require('util');
var processors = require('xml2js/lib/processors');
var moment = require('moment');
var https = require('https');


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




fs.readFile(__dirname + '/getevents.xml', function(err, data) {
  xml2js.parseString(data, {tagNameProcessors: [processors.stripPrefix], explicitArray: false}, function (err, result) {

    var events = result.GetEventResponse.events.jsEvent;

    var eventsArr = events.map(function(event){

      var title = event.Name;
      var primCategory;
      var primSubCategory;
      var secCategory;
      var secSubCategory;
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


      if(typeof event.Address == 'string') {
          getCoords(address, city, state, function(lat, lng) {
            console.log(`${address} Location: ${lat}, ${lng}`)
          });
      } else {
          var lat = typeof event.Address !== 'string' ? event.latitude : '';
          var lng = typeof event.Address !== 'string' ? event.longitude : '';
          console.log(`${address} Location: ${lat}, ${lng}`)
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



// ,
