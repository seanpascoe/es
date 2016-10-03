'use strict'
var fs = require('fs');
var xml2js = require('xml2js');
var util = require('util');
var processors = require('xml2js/lib/processors');

fs.readFile(__dirname + '/filtercats.js', "utf8", function(err, data) {

    var cats = JSON.parse(data);

    for(var mainCats in cats) {
      cats[mainCats].sort()
    }

    console.log(cats);


    fs.writeFile(__dirname + '/alphCats.js', util.inspect(cats, false, null), function(err) {
      if(err) {
          return console.log(err);
      }
      console.log("The file was saved!");
    });
});
