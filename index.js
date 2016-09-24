#!/usr/bin/env node --harmony

"use strict";

// https://github.com/mozilla/http-observatory-cli/blob/master/httpobscli/cli.py
// we are doing a lot of things in a sillier way

var chalk = require("chalk");
var program = require("commander");
var rp = require("request-promise");
var delay = require("timeout-as-promise");
var sprintf=require("sprintf-js").sprintf;
var util = require("util");

var SITE_URL = "https://observatory.mozilla.org/";
var API_URL = process.env.HTTPOBS_API_URL || "https://http-observatory.security.mozilla.org/api/v1/";

/* utilities and ephemera */
var clim = require("clim");

var QUIET = false;
var hasSite = false;

function padright(s,l) {
  if (s.length >= l) return s;
  return s + Array(l).fill(" ").join("").slice(s.length)
}

clim.logWrite = function(level, prefixes, msg) {
  if (QUIET) return

  var pfx = "";
  if (prefixes.length > 0) pfx = prefixes.join(" ");

  level = (f[level.toLowerCase()] || function (p) {return p})(level);
  var line = util.format("%s [%s] %s", pfx, level, msg)
  switch (level) {
    case "ERROR":
      process.stderr.write(line + "\n");
      break
    default:
      process.stdout.write(line + "\n");
  }
};

var logger = clim(chalk.grey("observatory"));

var f = {
  error: chalk.red,
  link:  chalk.underline.blue,
  info:  chalk.blue,
  log:   chalk.blue,
  warn:  chalk.red,
  bold:  chalk.bold,
  code:  chalk.grey,
  header: chalk.bold.blue
}

function collect(val, O) {
  O[val] = true;
  return O;
}

function helpAnywhere(rawArgs) {
  return rawArgs.filter(function (x) { return /-h|--help/.exec(x)}).length
}

var FORMATS = {
  "json": {
    "description": "json of the report",
    "action": function (scores) { console.log(JSON.stringify(scores,null,2))}
  },
  "report": {
    "description": "plain-text tabular format",
    "action": formatAnswersCsv
  },
  "csv": {
    "description": util.format("alias for %s", f.code("report")),
    "action": formatAnswersCsv
  },
  "url":{
    "description": "url for online version",
    // this one we handle early, so it has a different api
    "action": function () {}
  }
};

function validateFormatChoice (given) {
  given = given.toLowerCase();
  if (given in FORMATS) return given
  else {
    logger.error("not a valid format choice: %s.  Allowed: ",
      f.error(given),
      f.code(Object.keys(FORMATS).join("|")))
    process.exit(1)
  }
}

function longestInList (L) {
  return Math.max.apply(null, L.map(function(x) {return x.length}))
}

/* functions for retrieving reports */
class Scanner {
  constructor (site, options) {
    this.attempts = 0;
    this.allowed = options.attempts || 10;
    this.site = site;
  }
  promiseScan (site, options) {
    var that = this;
    this.attempts += 1;
    site = site || this.site;
    options = options || this.options;

    if (this.attempts >= this.allowed) {
      throw new Error(sprintf("too many attempts %s", this.attempts));
    }
    var url = API_URL + "analyze?host=" + site;

    var qargs = {site: site};
    ["rescan", "zero"].forEach(function (k) {
      if (options[k]) {
        qargs[k] = "true"
      }
    })
    return rp.post({
        url: url,
        json: true,
        simple: true,
        formData: qargs
    }).then(
      function (scan) {
        if (options.rescan && (scan.error == "rescan-attempt-too-soon")) {
          logger.warn("Rescan attempt is sooner than the allowed cooldown period. Returning cached results instead.")
          options.rescan = false;
          return that.promiseScan(site, options)
        } else {
          if (scan.error) {
            throw new Error(scan.error)
          }
        }
        if (scan.state === "FINISHED") {
          return scan
        } else {
          logger.warn(sprintf("retrying in 1 second (attempt %s/%s)", that.attempts, that.allowed));
          return delay(1000).then(function () {return that.promiseScan(site, options)})
        }
      }
    )
  }
}

/** related to grades */
var grades = ["F"];
"DCBA".split("").forEach(function (g) {
  ["-","","+"].forEach(function(mark) {
    grades.push(g+mark);
  })
})

function gradeCompare (seen, wanted) {
  return grades.indexOf(wanted) <= grades.indexOf(seen)
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
  logger.log(f.link(url));
}

function filterNegativeScores(scores) {
  function isNegative (k) {
    return scores[k].score_modifier < 0;
  }
  return Object.keys(scores).filter(isNegative)
}

function promiseReport (scan, options) {
  var url = API_URL + "getScanResults?scan=" + scan.scan_id;

  return rp({
      url: url,
      json: true,
      simple: true
    }).then(function (reportData) {
      formatAnswer(reportData, url, scan, options)
    }
  )
}

function formatAnswersCsv (scores, url, scan, options) {
  // print("[{modifier:>4}] {reason}".format(modifier=score[0], reason=score[1].replace(""","\\"")))

  function sortByScore(a,b) {
    return a.score_modifier - b.score_modifier
  }

  var longest = longestInList(Object.keys(scores));

  var scoresList = [];
  for (var k in scores) {
    scoresList.push(scores[k])
  }

  // sort and invert to positive
  scoresList.sort(sortByScore)

  console.log("\n%s: %s", f.header("HTTP Observatory Report"), options.site)

  console.log("\n%s\n", f.header("Score Description"));


  scoresList.map(function (score) {
    var points = score.score_modifier;
    var fmt = f.code;
    if (points > 0) { fmt = f.info }
    if (points < 0) { fmt = f.error }

    console.log(sprintf("%5f %s %s", score.score_modifier, fmt(padright(score.name, longest+1)), score.score_description))
  })

  var fullReportUrl = "https://observatory.mozilla.org/analyze.html?host=" + options.site;

  if (Object.keys(options.skip).length) {
    console.log("\nScore: %s (modified due to --skip)", scan.score);
  } else {
    console.log("\nScore: %s", scan.score);
  }
  console.log("Grade: %s", scan.grade);

  console.log(sprintf("\n%s: %s\n", f.header("Full Report Url"), f.link(fullReportUrl)));
}

function handleNagiosMode(options, scan, scores) {
  // https://github.com/mozilla/http-observatory-cli/issues/6

  var nagiosExitCodes = {
    1: "WARNING",
    2: "CRITICAL",
    3: "UNKNOWN"
  };

  if (!(options.nagios in nagiosExitCodes)) {
    throw new Error("nagios exit code must be in %s", Object.keys(nagiosExitCodes).join("|"))
  }
  var codeName = nagiosExitCodes[options.nagios];

  var negatives = filterNegativeScores(scores);

  function OK () {
    console.log("OK")
    process.exit(0)
  }

  function FAIL () {
    console.log("%s %j", codeName, negatives)
    process.exit(codeName)
  }


  if (options.minGrade || (options.minScore !== undefined)) {
    try {
      handleExpectedScore(options, scan)
      OK();
    } catch (err) {
      FAIL();
    }
    return
  } else {
    if (negatives.length) {
      FAIL()
    } else {
      OK()
    }
  }
}

function handleExpectedScore (options, scan) {
  // side cases
  var mingrade = options.minGrade,
      minscore = options.minScore;

  if (mingrade) {
    if (!gradeCompare(scan.grade, mingrade)) {
      throw new Error(sprintf("bad grade.  wanted %s, got %s",  mingrade, scan.grade))
    }
  }
  if (minscore !== undefined) {
    if (scan.score < minscore) {
      throw new Error(sprintf("bad score.  wanted %s, got %s",  minscore, scan.score))
    }
  }
  return
}

function formatAnswer(reportData, url, scan, options) {
  /** Reporting: */
  var scores = {};
  /* filter out --zeros, and --skip or not */
  for (var k in reportData) {
    var v = reportData[k]
    // --zero
    if (v.score_modifier != 0 || options.zero) {
      // --skip
      if (k in options.skip) { continue }

      // actually copy
      scores[k] = v;
    }
  }

  // rescore
  var newScore = 100;
  for (k in scores) {
    newScore += scores[k].score_modifier;
  }

  if (Object.keys(options.skip).length) {
    logger.info("modfiying score, because of --skip.  was: %s, now: %s", f.info(scan.score), f.info(newScore))
    scan.score = newScore;
  }

  if (options.nagios != undefined) {
    // nagios has
    try {
      handleNagiosMode(options, scan, scores)
    } catch (err) {
      logger.error(err);
      process.exit(1)
    }
  }

  if (options.minGrade || (options.minScore !== undefined)) {
    try {
      handleExpectedScore(options, scan)
    } catch (err) {
      logger.error(err);
      process.exit(1)
    }
    return
  }

  FORMATS[options.format || "json"].action(scores, url, scan, options)
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

class Observatory {
  handleNoSite (options) {
    if (options.tls) {
      logger.info("--tls is not yet implemented.")
      logger.info("website:   ",f.link("https://observatory.mozilla.org/"))
      logger.info("go client: ", f.link("https://github.com/mozilla/tls-observatory"))
      logger.info("comment:    %s", f.link("https://github.com/mozilla/observatory-cli/issues/5"))
      return
    }

    // require site for everything else
    logger.error(f.error("no <site> given"));
    return program.help();
  }
}

let O = new Observatory();

program
  .version(require("./package.json").version)
  .description(util.format("cli for interacting with Mozilla HTTP Observatory \n\n  %s", f.link(SITE_URL)))

program
  //.command("check <site>")
  .arguments("<site>")
  .option("--format [format]", util.format("format for output.  choice:  (%s).  `json` is default",
    Object.keys(FORMATS).join("|")),
    validateFormatChoice)
  .option("--min-grade <grade>", "testing: this grade or better, or exit(1)", validateGrade)
  .option("--min-score <score>", "testing: this score or better, or exit(1)", Number)
  .option("--nagios [failcode]", "nagios mode, exits with [failcode] on failure", Number)
  .option("--rescan", "initiate a rescan instead of showing recent scan results")
  .option("-z, --zero", "show test results that don't affect the final score")
  .option("--attempts <n>", "number of attempts to try before failing", Number)
  .option("--api-version [version]", "api version:  defaults to 1", Number)
  .option("--skip <rule>", "skip rules by name.  works with min-score only", collect, {})
  .option("--tls", "do tls checks instead")
  .option("-q, --quiet", "turns off all logging", function () {QUIET=true})

  .action(function mainAction(site, options) {
    // everything here has a site
    hasSite = true;

    if (helpAnywhere(options.rawArgs)) program.help();

    options.site = site; // stuff it in.

    if (options.tls) {
      return O.handleNoSite(options);
    }
    if (options.format == "url") {
      return openSite(util.format("https://observatory.mozilla.org/analyze.html?host=%s", site))
    }

    var api = options.apiVersion
    if (api && api !== 1) {
      logger.error(sprintf("V1 is only API supported, not %s", api));
      process.exit(1)
    }

    var S = new Scanner(site, options);
    S.promiseScan(site, options).then(
    function (reportId) {promiseReport(reportId, options)}).
    catch(function (err){
      logger.error(err);
      process.exit(1)
    })

  })

function newHelp () {
  var longest = longestInList(Object.keys(FORMATS));

  var out =
    "\nFormats help:\n" +

    Object.keys(FORMATS).map(
      function (k) {
        return util.format("    - %s  %s\n",
          f.info(padright(k,longest)),
          FORMATS[k].description
        )
      }).join("") +

    "\n\n" +

    f.header("Nagios Mode" ) +" " + f.code("(--nagios)") +
    "\n" +
    "  - if `--min-score` and/or `--min-grade`, use those.\n" +
    "  - else *any* negative rules fail the check.\n" +
    "  - exits with integer `failcode`.\n"

  return out;
}

program.on("--help", function(){
  console.log(newHelp());
});

program.parse(preprocess(process.argv));
if (! hasSite) {
  O.handleNoSite(program);
}
