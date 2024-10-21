> [!IMPORTANT]
>
> ## ⚠️ Deprecation Announcement for Mozilla HTTP Observatory
>
> Dear Mozilla Observatory Users,
>
> This code repository is now deprecated. There is a [Node/Javascript based replacement available](https://github.com/mdn/mdn-http-observatory/), that has updated scoring and backs the [HTTP Observatory service on MDN](https://developer.mozilla.org/en-US/observatory).
>
> ### 🛠️ What This Means
>
> * No Further Updates: We will no longer be providing updates, bug fixes, or new features for this repository.
> * Limited Support: Official support will be discontinued.
> * Archival: The repository will be archived soon, making it read-only.
>
> 🔍 Alternatives and Recommendations
>
> We recommend transitioning to [HTTP Observatory](https://github.com/mdn/mdn-http-observatory/), maintained by [MDN](https://developer.mozilla.org).
>
> 📦 Migration Guide
>
> To assist you in transitioning, we have prepared a [Migration Guide](https://github.com/mdn/mdn-http-observatory/blob/main/README.md#migrating-from-the-public-v1-api-to-the-v2-api) that covers steps to migrate your existing setup to the alternative.

# Observatory by Mozilla CLI Client

The Mozilla HTTP Observatory is a set of tools to analyze your website and inform you if you are utilizing the many available methods to secure it.

It is split into three projects:

* [http-observatory](https://github.com/mozilla/http-observatory) - scanner/grader
* [observatory-cli](https://github.com/mozilla/observatory-cli) - command line interface
* [http-observatory-website](https://github.com/mozilla/http-observatory-website) - web interface

## Score your site's HTTPS practices

Observatory by Mozilla is a project designed to help developers, system administrators, and security professionals configure their sites safely and securely.

## Observatory in action!

- <https://observatory.mozilla.org/>
- [FAQ](https://observatory.mozilla.org/faq.html)

### Example site report, with additional options

![Screenshot of ssllabs.com report, showing colors](report.png)

The [full report url](https://observatory.mozilla.org/analyze.html?host=ssllabs.com) has suggestions to **repair** each of these issues.


## Install

```
$ npm install -g observatory-cli
```

(Optional `Docker` instructions below.)

## Usage

1.  **Scan a site** for `https` best practices.

    ```
    # json!
    $ observatory some.site.name

    # include 'zero' scores, display as a tabular report
    $ observatory some.site.name --zero --format=report

    # attempt to force a re-scan
    $ observatory some.site.name --rescan

    ```

2.  **Test a site** as part of a Continuous Integration pipeline.

    Script will FAIL unless the grade is AT LEAST `B+`

    ```
    $ observatory some.site.name --min-grade B+
    ```

    ...and the score is at least 50.

    ```
    $ observatory some.site.name --min-grade B+ --min-score 50
    ```


3.  **Print the URL** for the expanded online report.

    ```
    $ observatory some.site.name --format=url
    ```

4.  **nagios** monitoring plugin mode.

    For `--nagios <failcode>`, `failcode` will be the exit code if the test fails.

    `--min-score`, `--min-grade`, `--zero`, `--skip` affect the test.

    ```
    $ observatory  --nagios 2 --min-score 85 -z --skip cookies
    CRITICAL ["content-security-policy",...,"x-xss-protection"]
    ```

    Any **negative scores fail the test**, unless `--min-score` or `--min-grade` is specified.

    ```
    # '2' maps to nagios 'critical.'  Exits '2'

    $ observatory ssllabs.com --nagios 2
    CRITICAL ["redirection"]
    ```

    We can `--skip` the failing rule, and affect the score.

    ```
    $ observatory ssllabs.com --nagios 2 --skip redirection
    observatory [INFO] modfiying score, because of --skip.  was: 100, now: 105
    OK
    ```

    Quiet output with `-q`.

    ```
    $ observatory ssllabs.com --nagios 2 --skip redirection -q
    OK
    ```

## Help Ouput

```
$ observatory --help

  Usage: observatory [options] <site>

  cli for interacting with Mozilla HTTP Observatory

  https://observatory.mozilla.org/

  Options:

    -h, --help               output usage information
    -V, --version            output the version number
    --format [format]        format for output.  choice:  (json|report|csv|url).  `json` is default
    --min-grade <grade>      testing: this grade or better, or exit(1)
    --min-score <score>      testing: this score or better, or exit(1)
    --nagios [failcode]      nagios mode, exits with [failcode] on failure
    --rescan                 initiate a rescan instead of showing recent scan results
    -z, --zero               show test results that don't affect the final score
    --attempts <n>           number of attempts to try before failing
    --api-version [version]  api version:  defaults to 1
    --skip <rule>            skip rules by name.  works with min-score only
    --tls                    do tls checks instead
    -q, --quiet              turns off all logging


  Output Formats (--format)
    - json    json of the report
    - report  plain-text tabular format
    - csv     alias for report
    - url     url for online version


  Nagios Mode (--nagios)
    - if `--min-score` and/or `--min-grade`, use those.
    - else *any* negative rules fail the check.
    - exits with integer `failcode`.
```

## Example Report, Text Version

Report, with options:

* `-z` to show '0' rules (all rules)
* `--skip` to skip a rule (affects SCORE, but not GRADE)

```
$ observatory some.site --format=report -z --skip redirection

observatory [INFO] modfiying score, because of --skip.  was: 60, now: 65

HTTP Observatory Report: some.site

Score Description

  -20 content-security-policy        Content Security Policy (CSP) implemented, but allows 'unsafe-inline' inside script-src
  -10 x-xss-protection               X-XSS-Protection header not implemented
   -5 x-content-type-options         X-Content-Type-Options header not implemented
    0 contribute                     Contribute.json implemented with the required contact information
    0 cookies                        No cookies detected
    0 cross-origin-resource-sharing  Content is not visible via cross-origin resource sharing (CORS) files or headers
    0 public-key-pinning             HTTP Public Key Pinning (HPKP) header not implemented
    0 strict-transport-security      HTTP Strict Transport Security (HSTS) header set to a minimum of six months (15768000)
    0 subresource-integrity          Subresource Integrity (SRI) not implemented, but all scripts are loaded from a similar origin
    0 x-frame-options                X-Frame-Options (XFO) header set to SAMEORIGIN or DENY

Score: 65 (modified due to --skip)
Grade: C+

Full Report Url: https://observatory.mozilla.org/analyze/some.site

```

## Technical / Development

### Debug observatory api urls

```
NODE_DEBUG=request observatory --format report --rescan --zero www.mozilla.org
```

### API Documentation

https://github.com/mozilla/http-observatory/blob/master/httpobs/docs/api.md

### Dockerized `observatory-cli`

Use the provided [Dockerfile](./Dockerfile), to build and execute `observatory` in Docker container.  Useful for Continuous Integration/Continuous Deployment (CI/CD) pipelines capable of running containers but that otherwise don't need a lot of extra software.

**To get started,**

1. Build the container.  Tag it as `mozilla/observatory-cli`

    ```
    docker build -t mozilla/observatory-cli .
    ```

2. Add a section like this to your `profile` (varies depending on your operating system and shell. `bash` shown).

    ```
    ## $HOME/.bashrc
    if [[ -d $HOME/.bash_functions ]]; then
        for file in $HOME/.bash_functions/*; do
            . $file
        done
    fi
    ```

3. Create the directory referenced in point 2 and copy the files in `shell_functions` (not `bash_completion`) into that directory:

    ```
    $ mkdir $HOME/.bash_functions
    $ find shell_functions -maxdepth 1 -type f -executable | while read file; do cp $file $HOME/.bash_functions; done
    ```

4. *Optional*: Add Bash completion to your shell.  (varies depending on your host operating system)

    ```
    ## On Red Hat based distributions:
    sudo cp shell_functions/bash_completion/observatory.bash /etc/bash_completion.d/
    ```

5. Start a new shell and execute `observatory`.  Now it's in a Docker container.  Bash completion is available if you've added it.

![Screenshot showing use of containerized observatory-cli](docker_example.png)


## Related projects

- [HTTP Observatory](https://github.com/mozilla/http-observatory) by April King
- [Python observatory-cli](https://github.com/mozilla/http-observatory-cli) by April King
