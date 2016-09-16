#!/usr/bin/env node

// https://github.com/mozilla/http-observatory-cli/blob/master/httpobscli/cli.py
// we are doing a lot of things in a sillier way

var chalk = require('chalk');
var program = require('commander');
var request = require("request");
var rp = require('request-promise');
var delay = require('timeout-as-promise');
var merge = require('merge');
var sprintf=require("sprintf-js").sprintf;

var API_URL = process.env.HTTPOBS_API_URL || "https://http-observatory.security.mozilla.org/api/v1/";

var attempts = 0;
function promiseScan (site, options) {
  attempts += 1;
  allowed = options.attempts || 10;
  if (attempts > allowed) {
    throw new Error(sprintf("too many attempts %s", attempts));
  }
  var url = API_URL + "analyze?host=" + site;

  var qargs = {site: site};
  ['rescan', 'zero'].forEach(function (k) {
    if (options[k]) {
      qargs[k] = 'true'
    }
  })
  return rp.post({
      url: url,
      json: true,
      simple: true,
      formData: qargs
  }).then(
    function (scan) {
      if (options.rescan && (scan.error == 'rescan-attempt-too-soon')) {
        //console.log(scan);
        console.warn('Rescan attempt is sooner than the allowed cooldown period. Returning cached results instead.')
        options.rescan = false;
        return promiseScan(site, options)
      } else {
        if (scan.error) {
          throw new Error(scan.error)
        }
      }
      //console.log(scan) // Print the json response
      if (scan.state === 'FINISHED') {
        return scan
      } else {
        console.warn(sprintf('retrying in 1 second (attempt %s/%s)', attempts, allowed));
        return delay(1000).then(function () {return promiseScan(site, options)})
      }
    }
  )
}


/** related to grades */
var grades = ['F'];
'DCBA'.split('').forEach(function (g) {
  ['-','','+'].forEach(function(mark) {
    grades.push(g+mark);
  })
})

function gradeCompare (seen, wanted) {
  return grades.indexOf(wanted) >= grades.indexOf(seen)
}

function validateGrade (val) {
  val = val.toUpperCase();
  if (grades.indexOf(val) >= 0) {
    return val
  } else {
    throw new Error("invalid grade: " + val)
  }
}

function openSite (url) {
  console.log(url);
  // var opener = require("opener");
  // opener("http://google.com");
}

function promiseReport (scan, options) {
  var url = API_URL + "getScanResults?scan=" + scan.scan_id;
  //console.log(url);

  // side cases
  if (options.expect) {
    if (!gradeCompare(scan.grade, options.expect)) {
      throw new Error(sprintf("bad grade.  wanted %s, got %s",  options.expect, scan.grade))
    }
    return
  }

  return rp({
      url: url,
      json: true,
      simple: true
    }).then(function (reportData) {
      printReport(reportData, url, options)
    }
  )
}

function printReportsCsv (scoresList, url, options) {
  // print('[{modifier:>4}] {reason}'.format(modifier=score[0], reason=score[1].replace('"','\\"')))

  console.log("\nScore Description\n");

  scoresList.map(function (score) {
    console.log(sprintf("%5f %s", score.score_modifier, score.score_description))
  })

  var fullReportUrl = "https://observatory.mozilla.org/analyze.html?host=" + options.site;

  console.log(sprintf("\n## full report at: \n\n  %s\n", fullReportUrl))
}

function printReport(reportData, url, options) {
  function invertScore(k) {
    var score = k.score_modifier;
    if (score < 0) {
      k.score_modifier = -score;
    }
    return k
  }

  function sortByScore(a,b) {
    return a.score_modifier - b.score_modifier
  }

  var scores = {};
  var scoresList = [];

  // option --zero shows all.
  if (!options.zero) {
    for (var k in reportData) {
      var v = reportData[k]
      if (v.score_modifier != 0) {
        scores[k] = v;
      }
    }
  } else {
    scores = reportData;
  }

  // turn zero-filtered into a list
  for (var k in scores) {
    scoresList.push(scores[k])
  }

  // sort and invert to positive
  scoresList.sort(sortByScore).map(invertScore)

  if (options.csv) {
    printReportsCsv(scoresList, url, options);
  }
  else {
    console.log(scores)
  }

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
  .version('0.2.1')

program
  //.command('check <site>')
  .arguments('<site>')
  .option("--rescan", "initiate a rescan instead of showing recent scan results")
  .option("-z --zero", "show test results that don't affect the final score")
  .option("--csv", "format report as csv")
  .option("--web", "print the url for the report and exit")
  .option("--expect <grade>", "testing: grade to expect / demand, or fail", validateGrade)
  .option("--attempts <n>", "number of attempts to try before failing", Number)
  .option("--tls", "do tls checks instead [TODO]")

  .action(function (site, options) {
    options.site = site; // stuff it in.

    if (options.tls) {
      throw new Error ("tls, attempts not yet implemented")
    };

    if (options.web) {
      return openSite("https://observatory.mozilla.org/analyze.html?host=" + site)
    }

    promiseScan(site, options).then(
    function (reportId) {promiseReport(reportId, options)}).
    catch(function (err){
      console.error(err)
    })
  })

program.parse(preprocess(process.argv));
