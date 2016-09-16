# Observatory by Mozilla CLI Client

## Score your site on its HTTPS practices

Observatory by Mozilla is a project designed to help developers, system administrators, and security professionals configure their sites safely and securely.

## See Observatory in Action!

- <https://observatory.mozilla.org/>
- [FAQ](https://observatory.mozilla.org/faq.html)

## install

```
$ npm install -g observatory-cli
```

## usage

1.  **Scan a site** for `https` best practices

    ```
    $ observatory some.site.name


    # include 'zero' scores, display as csv
    $ observatory some.site.name --zero --csv


    # attempt to force a re-scan
    $ observatory some.site.name --rescan

    ```

2.  **Test a site** as part of a Continuous Integration pipeline

    Script will FAIL unless the grade is AT LEAST `B+`

    ```
    $ observatory some.site.name --expect B+
    ```

3.  **Show the URL** for report

    ```
    $ observatory some.site.name --web
    ```

## Help

```
$ observatory --help

  Usage: observatory [options] <site>

  Options:

    -h, --help        output usage information
    -V, --version     output the version number
    --rescan          initiate a rescan instead of showing recent scan results
    -z --zero         show test results that don't affect the final score
    --csv             format report as csv
    --web             print the url for the report and exit
    --expect <grade>  testing: grade to expect / demand, or fail
    --attempts <n>    number of attempts to try before failing
    --tls             do tls checks instead [TODO]
```


## Example Results

```
$ observatory some.site --csv

Score Description

   25 Content Security Policy (CSP) header not implemented
   10 HTTP Strict Transport Security (HSTS) header set to less than six months (15768000)
    5 Contribute.json file missing from root of website

## full report at:

  https://observatory.mozilla.org/analyze.html?host=some.site

```


## Related projects

- [HTTP Observatory](https://github.com/mozilla/http-observatory) by April King
- [Python observatory-cli](https://github.com/mozilla/http-observatory-cli) by April King
