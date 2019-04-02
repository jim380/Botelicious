//     HTTP Util v0.1.4

//     https://github.com/biril/http-util
//     Licensed under the MIT License
//     Copyright (c) 2016 Alex Lambiris

"use strict";

var _ = require("underscore"),

    util = require("util"),

    // Url utilities
    parseUrl = require("url").parse,
    formatUrl = require("url").format,

    http = require("http"),
    // https = require("https"),

    // A handy no-op to reuse
    noOp = function () {},

    // A simple 'contextual logger'
    logger = require("./logger"),

    // Short descriptions for HTTP status codes
    statusCodeDescrs = http.STATUS_CODES,

    // Ports assigned by default to HTTP/S protocols
    portForProtocol = { http: 80, https: 443 },

    // Get a value indicating whether given status code signifies a redirect (for which a 'location'
    //  header should be present). [Status codes 304 'not modified' and 305 'use proxy' are not
    //  redirects]
    isRedirectStatusCode = function (statusCode) {
        return  statusCode === 300 || // Multiple choices
                statusCode === 301 || // Moved permanently
                statusCode === 302 || // Found (Moved temporarily)
                statusCode === 303 || // See other
                statusCode === 307;   // Temporary redirect
    },

    // Buffer given response's content (all data received as part of the response from call-time and
    //  onwards). When response ends `opts.onEnd` will be invoked with `buffer` and
    //  `writtenContentLength` parameters. If connection is closed before it ends, `opts.onClose`
    //  will be called with the same parameters
    bufferResponseContent = function (response, opts) {
        var
            // Attempt to determine buffer size from 'content-length' header (or default to 512
            //  octets)
            bufferSize = parseInt(response.headers["content-length"], 10) || 512,

            // Create buffer
            buffer = new Buffer(bufferSize),

            // Keep track of written content length. The buffer object _cannot_ actually be queried
            //  for this
            writtenContentLength = 0,

            // Logging function
            l = logger.createWriter(opts);

        l(2, "buffering response");

        // Handle a new chunk of data acquired from the host, as part of the response. Indicated by
        //  an emitted 'data' event. The chunk is either a Buffer (by default) or a string if
        //  setEncoding() was used. Each chunk is appended into the `buffer` ad infinitum until
        //  the response ends
        response.on("data", function (chunk) {
            l(3, "buffering: received chunk, length: %d octets", chunk.length);
            l(4, "buffering: chunk: %s", util.inspect(chunk.toString().substr(32))); // TODO: Fix chunk conversion
            if (!Buffer.isBuffer(chunk)) { chunk = new Buffer(chunk); }

            // Enlarge the buffer if chunk won't fit
            if (chunk.length > buffer.length - writtenContentLength) {
                while (bufferSize < writtenContentLength + chunk.length) { bufferSize *= 2; }
                var enlargedBuffer = new Buffer(bufferSize);
                buffer.copy(enlargedBuffer);
                buffer = enlargedBuffer;
            }

            chunk.copy(buffer, writtenContentLength);
            writtenContentLength += chunk.length;
        });

        // Handle the response-end, after which no more data will be received. Indicated by an
        //  emitted 'end' event. Delegate to given `opts.onEnd` callback
        response.once("end", function () {
            l(2, "buffering: response ended, content length: %d octets", writtenContentLength);
            if (opts.onEnd) { opts.onEnd(buffer, writtenContentLength); }
        });

        // Handle the termination of the underlying connection to the server before `response.end()`
        //  was called or was able to flush. Indicated by an emitted 'close' event. Delegates to
        //  given `opts.onClose` callback
        response.once("close", function () {
            l(2, "buffering: connection closed (!), written content length: %d octets", writtenContentLength);
            if (opts.onClose) { opts.onClose(buffer, writtenContentLength); }
        });

        // Handle a response related error, indicated by an emitted 'error' event. Delegate to
        //  given `opts.onError` callback
        response.on("error", function (error) {
            l(2, "buffering: error on response (!): %j, written content length: %d octets", error, writtenContentLength);
            if (opts.onError) { opts.onError(error, buffer, writtenContentLength); }
        });
    },


    // RepeatableClientRequest
    // -----------------------
    //
    // A thin wrapper around `http.ClientRequest` which stores all written content. This can be
    //  retrieved at anytime through the `buffer` property. The `createRepeatableRequest` method
    //  accepts a `http.ClientRequest` instance and returns a new `RepeatableClientRequest`
    createRepeatableRequest = function (clientRequest) {
        var bufferSize = 512,
            buffer = new Buffer(bufferSize),
            writtenContentLength = 0,
            RepeatableClientRequest = function () {},
            rcr = null;

        RepeatableClientRequest.prototype = clientRequest;

        rcr = new RepeatableClientRequest();

        Object.defineProperties(rcr, {
            write: {
                value: function (chunk, encoding, callback) {
                    // callback || (callback = noOp);
                    if (!Buffer.isBuffer(chunk)) { chunk = new Buffer(chunk, encoding); }

                    // Enlarge the buffer if chunk won't fit
                    if (chunk.length > buffer.length - writtenContentLength) {
                        while (bufferSize < writtenContentLength + chunk.length) { bufferSize *= 2; }
                        var enlargedBuffer = new Buffer(bufferSize);
                        buffer.copy(enlargedBuffer);
                        buffer = enlargedBuffer;
                    }

                    // Copy chunk into buffer
                    chunk.copy(buffer, writtenContentLength);
                    writtenContentLength += chunk.length;

                    return clientRequest.write(chunk, encoding, callback);
                }
            },
            // The `end` method just delegates to the inherited `ClientRequest.end`. Which is
            //  exposed and available to callers anyway. But
            //  [still](https://github.com/joyent/node/issues/5758)
            end: { value: function (data, encoding) { return clientRequest.end(data, encoding); } },
            buffer: { get: function () { return buffer; } },
            writtenContentLength: { get: function () { return writtenContentLength; } }
        });
        return rcr;
    },


    // 'requestInto____' Methods
    // -------------------------
    //
    // Both `requestIntoStream` & `requestIntoResponse` accept similar parameters and return an
    //  `http.ClientRequest` object. This also holds true for `request` and `forward` which
    //  delegate to the former pair. In detail:
    //
    // The `url` parameter, common to both methods is the _absolute_ URL of the resource to be
    //  requested. This may be a plain string or a URL object.
    //
    // The `opts` parameter indicates further options. None of these is mandatory as they all
    //  default to sane values. [Note that in the following, 'response' always refers to the the
    //  response received from the origin-server - _not_ the response object given to
    //  `requestIntoResponse`. The latter will be refered to as 'response-to-client' where
    //  necessary.]
    //
    // * `method`: Request method - an HTTP verb. 'GET' by default
    // * `headers`: A hash of request headers. This may empty as 'host' (the only mandatory header
    //     in HTTP/1.1) will be derived from given `url` if absent. Special headers that should be
    //     noted are described in
    //     [Node docs](http://nodejs.org/api/http.html#http_http_request_options_callback)
    // * `maxContentLength`: The maximum allowed length for the received content. Lengthier
    //     responses will be truncated. Optional (& experimental) - no max by default
    // * `followRedirects`: Indicates whether redirects should be silently followed, up until the
    //     request reaches the origin-server (instead of interpreting the first redirect as a
    //     response-to-client). Enabling this will buffer the request's content so that it may be
    //     resent on subsequent, post-redirect requests. (This should especially be noted in cases
    //     where the request carries sizable content.) False by default
    // * `onResponse`: Invoked, only once, when a response is first received. It will be passed
    //     the response's status-code and headers. In the case of `requestIntoResponse`, the caller
    //     may modify the received headers or inject new ones prior to them being written
    // * `onResponseContent`: Invoked, only once, either when response content is first received
    //     (response emits a 'data' event) or, if there's no content for the response, when the
    //     response ends (emits an 'end' event). Note that the handler is invoked *before* the
    //     content is written to given stream / response-to-client. The received data chunk (if
    //     there is one involved) is passed to the handler
    // * `onClose`: Invoked when the underlying connection to the origin-server is terminated
    //     before the response ends or is able to flush. The caller may choose to abort the request
    //     in case it hasn't already ended
    // * `onError`: Invoked in the event of an error related to (emitted by) the origin-server
    //     response. The caller may choose to abort the request in case it hasn't already ended.
    //     Note that the caller should primarily listen for errors on the returned
    //     `http.ClientRequest` object. [_Disclaimer: The aforementioned response is theoretically
    //     susceptible to the class of errors that apply to writable streams. However, at the time
    //     of this writing, it is still unclear to the author whether such (or *any*) errors should
    //     be expected on an `http.ServerResponse`. Are all errors forwarded to the
    //     `http.ClientResponse`?_]
    //
    // Both methods return the request made - an `http.ClientRequest`. This is in line with Node's
    //  [http.request](http://nodejs.org/api/http.html#http_http_request_options_callback): The
    //  request object may be used to push content to the origin-server, for example as part of a
    //  POST. The caller should always `end()` it (whether it writes any content to the body or
    //  not). In the event of an error during the request (be that with DNS resolution, TCP level
    //  errors, or actual HTTP parse errors) it will emit an 'error' event which the caller is
    //  expected to handle


    // requestIntoStream
    // -----------------
    //
    // Make a request to some given host (the 'origin-server') and write received content into
    //  given writable stream
    requestIntoStream = function (url, stream, opts) {

        // Set default options (leave the original `opts` hash unharmed)
        opts = _({}).defaults(opts, {
            method: "GET",
            headers: {},
            followRedirects: false,
            maxContentLength: Number.POSITIVE_INFINITY,
            onResponse: noOp,
            onResponseContent: noOp,
            onClose: noOp,
            onError: noOp
        });

        if (_.isString(url)) { url = parseUrl(url); }

        var
            // Request to be made
            request,

            // Protocol of request to be made
            protocol = url.protocol && url.protocol.indexOf("https") === 0 ? "https" : "http",

            // HTTP/S request method
            makeRequest = require(protocol).request,

            // Indicates whether (any) response content has been received ('data' event has been
            //  emitted) or, if there's no content for the response, the response has ended ('end'
            //  event has been emitted)
            isContentReceived = false,

            // Keeps track of written content length
            writtenContentLength = 0,

            // Logging function
            l = logger.createWriter(opts, url),

            // Handle a new chunk of data acquired from the host, as part of the response.
            //  Indicated by a 'data' event emitted from the received server-response. The
            //  chunk is either a Buffer (by default) or a string if setEncoding() was used.
            //  Each chunk is written into `stream` ad infinitum, until the response ends
            onResponseData = function (chunk) {

                if (!isContentReceived) {
                    isContentReceived = true;
                    l(1, "received first response chunk, length: %d octets", chunk.length);
                    opts.onResponseContent(chunk);
                } else {
                    l(2, "received response chunk, length: %d octets", chunk.length);
                }

                l(2, "response chunk contents: " + util.inspect(chunk.toString().substr(0, 32))); // TODO: Fix chunk conversion

                stream.write(chunk);
                writtenContentLength += chunk.length;

                // If length of written content is more the max allowed ..
                if (writtenContentLength >= opts.maxContentLength) {
                    stream.end();

                    // .. then destroy the connection. This is a bit extreme but node offers no
                    //  other way of doing it (probably causes a 'close' to be dispatched)
                    this.connection.destroy();
                }
            },

            // Handle the response-end, after which no more data will be received. Indicated
            //  by and 'end' event emitted from the received server-response. Will just end `stream`
            onResponseEnd = function () {
                l(1, "response ended, written content length: %d octets", writtenContentLength);
                if (!isContentReceived) {
                    isContentReceived = true;
                    opts.onResponseContent();
                }

                l(1, "ending response-to-client");
                stream.end();
            },

            // Handle the termination of the underlying connection to the server before the
            //  response ends (before `response.end()` in called) or is able to flush. Indicated by
            //  a 'close' event emitted from the received server-response. Delegates to
            //  `opts.onClose`
            onResponseClose = function () {
                l(1, "connection closed (!), written content length: %d octets", writtenContentLength);
                opts.onClose();
            },

            // Handle an 'error' event emitted from the response. See earlier _Disclaimer_ about
            //  this class of errors
            onResponseError = function (error) {
                l(1, "response error (!): %j", error);
                opts.onError(error);
            },

            // Request options (a hash of options expected by `(http|https).request` - not to be
            //  confused with the `opts` hash used in general)
            requestOpts = {
                method: opts.method,
                hostname: url.hostname,
                port: url.port || portForProtocol[protocol],
                path: url.path,
                headers: opts.headers
            };

        // Set a 'host' header (mandatory in HTTP/1.1), if not already set
        _(requestOpts.headers).defaults({
            host: requestOpts.hostname + ":" + requestOpts.port
        });

        l(1, "requesting %s %s", opts.method, formatUrl(url));
        l(3, "request headers: %j", opts.headers);

        // Make the request and wrap it in a repeatable
        request = createRepeatableRequest(makeRequest(requestOpts, function (response) {
            l(1, "started receiving response, status: %d %s", response.statusCode, statusCodeDescrs[response.statusCode]);
            l(3, "response headers: %j", response.headers);

            // Check whether we'll have to follow a redirect
            if (opts.followRedirects && isRedirectStatusCode(response.statusCode)) {

                // We'll buffer the redirect response. This is non-essential as the only thing
                //  needed to follow the redirect is the 'location' header. The actual content of
                //  the response is not of any use
                l(2, "will buffer-and-discard redirect-response");
                bufferResponseContent(response, {
                    logContext: opts.logContext,
                    onEnd: function (buffer, length) {
                        l(2, "redirect-response ended, content length: %d octets", length);
                    },
                    onClose: function (buffer, length) {
                        l(2, "redirect-response connection closed (!), content length: %d octets", length);
                    },
                    onError: function (error, buffer, length) {
                        l(2, "error on redirect-response (!): %j, content length: %d octets", error, length);
                    }
                });

                // Follow the redirect by recursing. Pass the same options that were in effect
                //  for the current invocation but remove the 'host' header. In absense, it will be
                //  correctly set to the proper host based on the request URL
                var redirectUrl = parseUrl(response.headers.location),
                    redirectOpts = _({}).extend(opts, {headers: _({}).extend(opts.headers)});
                delete redirectOpts.headers.host;

                l(1, "will follow redirect to %s", response.headers.location);
                requestIntoStream(redirectUrl, stream, redirectOpts).end(request.buffer.slice(0, request.writtenContentLength));
                return;
            }

            // Okay, so we're not following a redirect. First of all, notify the caller of received
            //  response (status code & headers) ..
            opts.onResponse(response.statusCode, response.headers);

            // .. and then just pump data from the response into the stream
            response.on("data", onResponseData);
            response.on("error", onResponseError);
            response.once("end", onResponseEnd);
            response.once("close", onResponseClose);
        }));

        // Return the request to caller. Note that this may emit an 'error' event (indicating an
        //  error during the request to the origin-server) which the caller is expected to handle
        return request;
    },


    // requestIntoResponse
    // -------------------
    //
    // Make a request to some given host (the 'origin-server') and write received data into given
    //  response (`http.ServerResponse`)
    requestIntoResponse = function (url, responseToClient, opts) {

        // Set default options (leave the original `opts` hash unharmed)
        opts = _({}).defaults(opts, {
            method: "GET",
            maxContentLength: Number.POSITIVE_INFINITY,
            onResponse: noOp,
            onResponseContent: noOp
        });

        var
            // The response status-code - to be forwarded to response-to-client
            statusCode,

            // The response headers - to be forwarded to response-to-client
            headers,

            // Save references to handlers provided by caller (or previously defaulted to no-ops)
            onResponse = opts.onResponse,
            onResponseContent = opts.onResponseContent,

            // Logging function
            l = logger.createWriter(opts, _.isString(url) ? parseUrl(url) : url);

        // When status-code and headers are received on the response
        opts.onResponse = function (responseStatusCode, responseHeaders) {
            headers = _.clone(responseHeaders);
            statusCode = responseStatusCode;

            // Tweak the 'content-length' header (if present) to reflect the modified content
            //  length in case _it was indeed_ truncated due to `maxContentLength` option
            var contentLength = headers["content-length"] ?
                parseInt(headers["content-length"], 10) : -1;

            if (contentLength > opts.maxContentLength) {
                headers["content-length"] = opts.maxContentLength;
            }

            // Invoke given `onResponse`. Client-code may modify the headers even further
            onResponse(statusCode, headers);
        };

        // When content is first written to the response or the response ends, write the headers
        // to the response-to-client. This is as late as this can be done. (note that the handler is
        //  invoked *just before* any content is written to response-to-client)
        opts.onResponseContent = function () {
            l(1, "writing response status code (%d) and headers to response-to-client", statusCode);
            responseToClient.writeHead(statusCode, headers);
        };

        // Write content to response - return the request to caller. Note that the request may
        //  emit an 'error' event (indicating an error during the request to the origin-server)
        //  which the caller is expected to handle
        return requestIntoStream(url, responseToClient, opts);
    },


    // request
    // -------
    //
    // Delegates to `requestIntoStream` or `requestIntoResponse` depending on given whether given
    //  `rspOrStrm` is a writeable stream or response (`http.ServerResponse`)
    request = function (url, rspOrStrm, opts) {
        return (rspOrStrm instanceof http.ServerResponse ?
            requestIntoResponse : requestIntoStream)(url, rspOrStrm, opts);
    },


    // forward
    // -------
    //
    // Forward a client request (`http.IncomingMessage`) to indicated server (the 'origin-server')
    //  and write received data into given response (`http.ServerResponse`). Particularly
    //  applicable in proxying scenarios
    //
    // The `opts` parameter includes all options applicable to 'requestInto____' methods with the
    //  (nonmandatory) addition of a `url` option:
    //
    //  * In absense of this, requests will be forwarded to the original URL, i.e. `request.url`.
    //     Suitable for authoring a forward proxy.
    //  * If `opts.url` is present, the request's original URL will be overriden, effectively
    //     forwarding to a different host. This will also force an appropriately modified 'host'
    //     header derived from the URL. The caller may enforce a _specific_ 'host' by use of
    //     `opts.headers`. This method of forwarding is suited to authoring a reverse proxy.
    //
    // It should be noted that in the case of `forward`, the headers provided by use of
    //  `opts.headers` act as overrides. That is to say, the forwarded request will include _all_
    //  of the original request's headers, either extended or overriden by those present in
    //  `opts.headers`
    forward = function (requestFromClient, responseToClient, opts) {

        // Build request options. `method` is defaulted to the original request's method if not
        //  given. The headers will be dealt with further down. (the original `opts` hash is left
        //  unharmed)
        opts = _({}).defaults(opts, {
            method: requestFromClient.method,
            headers: {}
        });

        var
            // Indicates whether a 'host' header was present in original `opts.headers`. This is
            //  important in case `opts` also has a `url` member: The 'host' header _when
            //  explicitly set by the caller through options_ will override the host derived from
            //  `opts.url`
            isHostHeaderGivenInOptions = !!opts.headers.host,

            // The request to make to origin-server
            req = null,

            // URL of the request to make to origin-server
            url = parseUrl(requestFromClient.url),

            // Logging function
            l = logger.createWriter(opts, url);

        // As for the headers, we start off with the original request's headers and then
        //  extend / override them with headers present on `opts`, if any are given.
        opts.headers = _({}).extend(requestFromClient.headers, opts.headers);

        // Abort the request if the underlying connection to the origin-server is terminated before
        //  the response ends / is able to flush or an error occurs (is emitted by) the response
        //  itself
        opts.onClose = function () { req.abort(); };
        opts.onError = function () { req.abort(); };

        // The presence of an `opts.url` will cause the URL of the original request to be
        //  overriden. In this case the 'host' header will also be reset _but only if it wasn't
        //  explicitly set by the caller through options_
        if (opts.url) {
            url = _.isString(opts.url) ? parseUrl(opts.url) : opts.url;
            if (!isHostHeaderGivenInOptions) { opts.headers.host = url.host; }
        }

        // Forward the request
        req = requestIntoResponse(url, responseToClient, opts);

        //
        requestFromClient.once("end", function () {
            l(1, "request-from-client ended -> ending request");
            req.end();
        });

        requestFromClient.once("close", function () {
            l(1, "request-from-client closed (!) -> ending request");
            req.end();
        });

        // In the case of error on the client request, abort
        requestFromClient.on("error", function (error) {
            l(1, "request-from-client error (!): %j -> aborting request", error);
            req.abort();
        });

        // Forward content data until content ends
        requestFromClient.on("data", function (chunk) { req.write(chunk); });

        // In case of a closed connection, just log
        req.on("close", function () { l(1, "request closed (!)"); });

        // In case of error on the forwarded request (DNS resolution, TCP level, HTTP parse..),
        //  respond to the client with a 503 [Service Unavailable], containing the actual error
        //  message. This is (at least in some cases) followed by a 'close' event
        req.on("error", function (error) {
            l(1, "request error (!): %j -> ending response-to-client with 503", error);
            responseToClient.writeHead(503, { "Content-Type": "text/plain" });
            responseToClient.write("Error: " + JSON.stringify(error));
            responseToClient.end();
        });
    };

// Export module's methods and properties
exports.bufferResponseContent = bufferResponseContent;
exports.request               = request;
exports.forward               = forward;
exports.requestIntoResponse   = requestIntoResponse;
exports.requestIntoStream     = requestIntoStream;
Object.defineProperties(exports, {
    version: { get: function () { return "0.1.4"; } }, // Keep version in sync with package.json
    logLevel: { set: function (value) { logger.setLevel(value); } }
});
