'use strict'
var fs = require('fs');
var xml2js = require('xml2js');
var util = require('util');
var processors = require('xml2js/lib/processors');

fs.readFile(__dirname + '/cwCats.js', "utf8", function(err, data) {

    var catsArr = JSON.parse(data);


    var cats = catsArr.map(function(cat){
      var rObj = {};
      rObj[cat.id] = cat.name;
      return rObj;
    });

    console.log(cats);


    fs.writeFile(__dirname + '/cwCategories.js', util.inspect(cats, false, null), function(err) {
      if(err) {
          return console.log(err);
      }
      console.log("The file was saved!");
    });
});
