#!/usr/bin/env node
var chalk = require('chalk');
var program = require('commander');
var request = require("request");
var rp = require('request-promise');
var delay = require('timeout-as-promise');

var BASE = "https://http-observatory.security.mozilla.org/api/v1/"

function promiseAnalyze (site) {
  var url = BASE + "analyze?host=" + site;
  console.log(url)
  return rp({
      url: url,
      json: true,
      simple: true
  }).then(
    function (body) {
      console.log(body) // Print the json response
      if (body.state === 'FINISHED') {
        return body.scan_id
      } else {
        console.log('retrying in 1 second');
        return delay(1000).then(function () {return promiseAnalyze(site)})
      }
    }
  )
}


function promiseReport (reportId) {
  var url = BASE + "getScanResults?scan=" + reportId;
  console.log(url);
  return rp({
      url: url,
      json: true,
      simple: true
    }).then(function (body) {
      console.log(body) // Print the json response
    }
  )
}


var passedOn = [];
function preprocess (args) {
  var dashed = false,
    out = []
  args.forEach(function (a) {
    if (a == "--") {
      dashed = true;
      return;
    }
    if (dashed) passedOn.push(a)
    else out.push(a)
  })
  return out;
}

var program = require('commander');

program
  .version('1.0.0')
  .arguments('<site>')
  .action(function (site) {
    promiseAnalyze(site).then(
    promiseReport)
  })

program.parse(preprocess(process.argv));
