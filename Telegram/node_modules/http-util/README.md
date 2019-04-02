HTTP Util
=========

[![Build Status](https://travis-ci.org/biril/http-util.png)](https://travis-ci.org/biril/http-util)
[![NPM version](https://badge.fury.io/js/http-util.png)](http://badge.fury.io/js/http-util)


Author's HTTP/S toolbox for Node.js. A compact collection of helpers especially applicable to
streaming, proxying, etc. Evolved from (and meant as a DRY replacement for) a number of common Node
patterns. Currently focused on debuggability rather than performance.


Set up
------

`git clone git://github.com/biril/http-util` or `npm install http-util` and `require`:

```javascript
var httpUtil = require("http-util");
console.log("HTTP Util version: " + httpUtil.version);
```


Reference
---------

The module's public API consists primarily of the `request` and `forward` methods which are
described here. An [annotated version](http://biril.github.io/http-util/) of the source is also
maintained as a complete reference.

### request (url, rspOrStr[, opts]) → http.ClientRequest

Make a request to some given host (the 'origin-server') and write received data into given
`rspOrStr` - a `stream.Writable` or `http.ServerResponse`.

The `url` parameter is the _absolute_ URL of the resource to be requested. This may be a plain
 string or a URL object.

The `opts` parameter indicates further options. None of these is mandatory as they all default to
 sane values. [Note that in the following, 'response' does _not_ refer to the given `rspOrStr` but
 rather at the response received from the origin-server. This isn't accessible to API consumers so
 they need not be concerned with it. It nevertheless referred to, for clarification purposes. A
 request argument passed as `rspOrStr` will always be refered to as 'request-from-client'.]

* `method`: Request method - an HTTP verb. 'GET' by default
* `headers`: A hash of request headers. This may empty as 'host' (the only mandatory header
    in HTTP/1.1) will be derived from given `url` if absent. Special headers that should be
    noted are described in
    [Node docs](http://nodejs.org/api/http.html#http_http_request_options_callback).
* `maxContentLength`: The maximum allowed length for the received content. Lengthier responses will
    be truncated. Optional (& experimental) - no max by default.
* `followRedirects`: Indicates whether redirects should be silently followed, up until the request
    reaches the origin-server (instead of interpreting the first redirect as a response-to-client).
    Enabling this will buffer the request's content so that it may be resent on subsequent,
    post-redirect requests. (This should especially be noted in cases where the request carries
    sizable content.) False by default.
* `onResponse`: Invoked, only once, when a response is first received. It will be passed the
    response's status-code and headers. In the case where `rspOrStr` is an `http.ServerResponse`,
    the caller may modify the received headers or inject new ones prior to them being written
* `onResponseContent`: Invoked, only once, either when response content is first received or, if
    there's no content for the response, when the response ends. Note that the handler is invoked
    *before* the content is written to given stream / response-to-client. The received data chunk
    (if there is one involved) is passed to the handler.
* `onClose`: Invoked when the underlying connection to the origin-server is terminated before the
    response ends or is able to flush. The caller may choose to abort the request in case it hasn't
    already ended.
* `onError`: Invoked in the event of a response-related error. The caller may choose to abort the
    request in case it hasn't already ended. Note that the caller should primarily listen for errors
    on the returned `http.ClientRequest` object.

Returns the request made - an `http.ClientRequest`. This is in line with Node's
 [http.request](http://nodejs.org/api/http.html#http_http_request_options_callback): The request
 object may be used to push content to the origin-server, for example as part of a POST. The caller
 should always `end()` it (whether it writes any content to the body or not). In the event of an
 error during the request (be that with DNS resolution, TCP level errors, or actual HTTP parse
 errors) it will emit an 'error' event which the caller is expected to handle.


### forward (request, response[, opts])

Forward a client request (`http.IncomingMessage`) to indicated server (the 'origin-server') and
 write received data into given response (`http.ServerResponse`). Particularly applicable in
 proxying scenarios

The `opts` parameter includes all options applicable to the request method with the (nonmandatory)
 addition of a `url` option:

* In absense of this, requests will be forwarded to the original URL, i.e. `request.url`. Suitable
   for authoring a forward proxy.
* If `opts.url` is present, the request's original URL will be overriden, effectively forwarding to
   a different host. This will also force an appropriately modified 'host' header derived from the
   given URL. The caller may enforce a _specific_ 'host' by use of `opts.headers`. This method of
   forwarding is suited to authoring a reverse proxy.

It should be noted that in the case of `forward`, the headers provided by use of `opts.headers` act
 as overrides. That is to say, the forwarded request will include _all_ of the original request's
 headers, either extended or overriden by those present in `opts.headers`. 


Examples
--------


### Forward proxy

```javascript
var http = require("http"),
    httpUtil = require("http-util");

http.createServer(function (req, rsp) {
    httpUtil.forward(req, rsp);
}).listen(8080);
```


### Forward proxy with custom logic

Fake Googlebot:

```javascript
var http = require("http"),
    httpUtil = require("http-util");

http.createServer(function (req, rsp) {
    httpUtil.forward(req, rsp, {
        headers: {
        	"user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
        }
    });
}).listen(8080);
```

Disallow inferior search engines:

```javascript
var http = require("http"),
	parseUrl = require("url").parse,
    httpUtil = require("http-util");

http.createServer(function (req, rsp) {
    httpUtil.forward(req, rsp, {
        url: req.url.replace("bing", "google"),
        onResponse: function (statusCode, headers) {
            headers["friendly-tip"] = "use google";
        }
    });
}).listen(8080);
```


### Reverse proxy

// TODO


### Fetching a resource

Download google's front-page HTML. Note the necessary `followRedirects` option.

```javascript
var httpUtil = require("http-util"),
    file = require("fs").createWriteStream(__dirname + "/google.html", { flags: "w" });

httpUtil.request("http://google.com", file, {
    followRedirects: true
}).end();
```


Testing
-------

`make test` or `npm test`.


License
-------

Licensed and freely distributed under the MIT License (LICENSE.txt).

Copyright (c) 2012-2016 Alex Lambiris
