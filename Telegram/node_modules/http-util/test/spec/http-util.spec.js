/*jshint node:true */
/*global describe, beforeEach, it, expect, runs, waitsFor */
"use strict";

describe("HTTP util", function () {

    var httpStatusCodeDescrs = require("http").STATUS_CODES,
        nock = require("nock"),
        util = require("util"),
        http = require("http"),
        // https = require("https"),
        fs = require("fs"),
        concat = require("concat-stream"),
        httpUtil = require(__dirname + "/../../index.js"),
        testFilePath = __dirname + "/../test.jpg";

    httpUtil.logLevel = 1;

    beforeEach(function() {
        this.addMatchers({

            // A matcher which checks whether _this_ buffer contains all elements of
            //  _expected_ buffer
            toContainAllElementsOf: function(expected) {
                var expectedLength = expected.length,
                    actualLength = this.actual.length,
                    i;

                if (!this.isNot && actualLength < expectedLength) {
                    this.message = function () {
                        return "Expected actual buffer to have length of at least " + expectedLength;
                    };
                    return false;
                }

                this.message = function () {
                    return "Expected " + util.inspect(this.actual) + (this.isNot ? "not" : "") +
                        " to contain all elements of " + util.inspect(expected);
                };

                for (i = 0; i < expectedLength; ++i) {
                    if (expected[i] !== this.actual[i]) { return false; }
                }
                return true;
            }
        });
    });

    // A couple of preliminary tests. Basically make sure the world is a sane place before going
    //  into stuff of actual importance
    it("should be exported", function() {
        expect(httpUtil).toBeDefined();
    });
    it("should report its version", function() {
        expect(httpUtil.version).toMatch(/^\d+\.\d+\.\d+$/);
    });


    ////
    //// Specs for the exported `httpUtil.bufferResponseContent` API
    describe("/ bufferResponseContent", function () {

        it("should buffer response-content when content-length header is present", function () {
            var originHost, rspStatusCode, bufferedRspContent, rsrcContent = "Small Resource";

            runs(function () {
                originHost = nock("http://originhost")
                    .get("/resource/small")
                    .reply(200, rsrcContent, { "content-length": rsrcContent.length });

                http.request("http://originhost/resource/small", function (response) {

                    rspStatusCode = response.statusCode;

                    httpUtil.bufferResponseContent(response, {
                        onEnd: function (buffer, writtenContentLength) {
                            bufferedRspContent = buffer.slice(0, writtenContentLength).toString();
                        }
                    });
                }).end();
            });

            waitsFor(function () {
                return bufferedRspContent;
            }, "response-content to become available", 750);

            runs(function () {
                expect(rspStatusCode).toBe(200);
                expect(bufferedRspContent).toEqual(rsrcContent);
                originHost.done();
            });
        });

        it("should buffer response-content when content-length header is absent", function () {
            var originHost, rspStatusCode, bufferedRspContent, rsrcContent = "Small Resource";

            runs(function () {
                originHost = nock("http://originhost")
                    .get("/resource/small")
                    .reply(200, rsrcContent);

                http.request("http://originhost/resource/small", function (response) {

                    rspStatusCode = response.statusCode;

                    httpUtil.bufferResponseContent(response, {
                        onEnd: function (buffer, writtenContentLength) {
                            bufferedRspContent = buffer.slice(0, writtenContentLength).toString();
                        }
                    });
                }).end();
            });

            waitsFor(function () {
                return bufferedRspContent;
            }, "response-content to become available", 750);

            runs(function () {
                expect(rspStatusCode).toBe(200);
                expect(bufferedRspContent).toEqual(rsrcContent);
                originHost.done();
            });
        });

        it("should buffer extended response-content when content-length header is absent", function () {
            var originHost,
                rspStatusCode,
                bufferedRspContent,
                rsrcContent;

            runs(function () {
                originHost = nock("http://originhost")
                    .get("/resource/small")
                    .replyWithFile(200, testFilePath);

                fs.readFile(testFilePath, function (error, buffer) { rsrcContent = buffer; });

                http.request("http://originhost/resource/small", function (response) {

                    rspStatusCode = response.statusCode;

                    httpUtil.bufferResponseContent(response, {
                        onEnd: function (buffer, writtenContentLength) {
                            bufferedRspContent = buffer.slice(0, writtenContentLength);
                        }
                    });
                }).end();

                waitsFor(function () {
                    return rsrcContent && bufferedRspContent;
                }, "response-content to become available", 750);

                runs(function () {
                    expect(rspStatusCode).toBe(200);
                    expect(bufferedRspContent).toContainAllElementsOf(rsrcContent);
                    originHost.done();
                });
            });
        });

    }); // describe("/ bufferResponseContent", ..


    ////
    //// Specs for the exported `httpUtil.request` API
    describe("/ request", function() {

        var redirectStatusCodes = [300, 301, 302, 303, 307],

            // The following objects will be (re)used in all `request` specs. They'll be reset to
            //  null before each spec (see `beforeEach`). `req` is the request itself.
            //  `rspStatusCode` is the status-code returned as part of the response.
            //  `rspContenStream` is a writable stream always passed to `request` to write the
            //  response into. (We're currently using Max Ogden's `ConcatStream` for this). Finally,
            //  `rspContent` is the response after it's been fully streamed and converted (from a
            //  writable stream) to a plain buffer
            req,
            rspStatusCode,
            rspContentStream,
            rspContent,

            // We'll reuse "/some/resource" as the path of the requested-resource and "Some
            //  Resourse" as the requested-resource-content in (nearly) all specs - these are
            //  basically used as constants
            reqRsrcPath = "/some/resource",
            reqRsrcContent = "Some Resource",

            // Define a number of 'transactions' (request - response pairs) to test. The `req.body`
            //  array defines the request body (which is actually _expected_ on the server side).
            //  Each array element will be separately written to the request before it `end()`s.
            //  That is to say, each element will involve a _seperate_ call to `write()` and every
            //  call will happen on a timer. This process is implemented by `writeRequestBody` below
            transactions = [{
                req: { method: "GET" },
                rsp: { statusCode: 200, content: reqRsrcContent }
            }, {
                req: { method: "GET" },
                rsp: { statusCode: 404, content: "Oops: Not found" }
            }, {
                req: { method: "POST" },
                rsp: { statusCode: 200, content: reqRsrcContent }
            }, {
                req: { method: "GET", body: ["please"] },
                rsp: { statusCode: 200, content: reqRsrcContent }
            }, {
                req: { method: "GET", body: ["pretty", "please"] },
                rsp: { statusCode: 200, content: reqRsrcContent }
            }, {
                req: { method: "GET", body: ["pretty", "please", "withcherries"] },
                rsp: { statusCode: 200, content: reqRsrcContent }
            }],
            writeRequestBody = function (requestBodyParts, request) {
                if (!requestBodyParts || !requestBodyParts.length) { return request.end(); }
                request.write(requestBodyParts.shift());
                global.setTimeout(function () { writeRequestBody(requestBodyParts, request); }, 100);
            };

        beforeEach(function () {
            req = null;
            rspStatusCode = null;
            rspContentStream = null;
            rspContent = null;
        });


        transactions.forEach(function (transaction) {

            describe("for transaction " + JSON.stringify(transaction), function () {

                // `request` should acquire response with simple ransaction-defined content when
                //  no redirects happen before reaching the origin server
                it("should return response", function() {

                    var originHost;

                    runs(function () {
                        originHost = nock("http://originhost")
                            .intercept(reqRsrcPath, transaction.req.method, transaction.req.body ? transaction.req.body.join("") : undefined)
                            .reply(transaction.rsp.statusCode, transaction.rsp.content);

                        rspContentStream = concat(function (buffer) {
                            rspContent = buffer;
                        });

                        req = httpUtil.request("http://originhost" + reqRsrcPath, rspContentStream, {
                            method: transaction.req.method,
                            onResponse: function (statusCode) { rspStatusCode = statusCode; }
                        });

                        writeRequestBody(transaction.req.body, req);
                    });

                    waitsFor(function () {
                        return rspStatusCode && (transaction.rsp.content.length === 0 || rspContent);
                    }, "response-content to become available", 750);

                    runs(function () {
                        expect(rspStatusCode).toBe(transaction.rsp.statusCode);
                        expect(rspContent.toString()).toEqual(transaction.rsp.content);
                        originHost.done();
                    });
                });

                // `request` should acquire response with extended content (test.jpg bitmap data)
                //  when no redirects happen before reaching the origin server
                it("should return response with extended content", function() {

                    var originHost, rsrcContent;

                    runs(function () {
                        originHost = nock("http://originhost")
                            .intercept(reqRsrcPath, transaction.req.method, transaction.req.body ? transaction.req.body.join("") : undefined)
                            .replyWithFile(transaction.rsp.statusCode, testFilePath);

                        rspContentStream = concat(function (buffer) {
                            rspContent = buffer;
                        });

                        fs.readFile(testFilePath, function (error, buffer) { rsrcContent = buffer; });

                        req = httpUtil.request("http://originhost" + reqRsrcPath, rspContentStream, {
                            method: transaction.req.method,
                            onResponse: function (statusCode) { rspStatusCode = statusCode; }
                        });

                        writeRequestBody(transaction.req.body, req);
                    });

                    waitsFor(function () {
                        return rspStatusCode && rspContent && rsrcContent;
                    }, "response-content to become available", 750);

                    runs(function () {
                        expect(rspStatusCode).toBe(transaction.rsp.statusCode);
                        expect(rspContent).toContainAllElementsOf(rsrcContent);
                        originHost.done();
                    });
                });


                // `request` should acquire response with simple ransaction-defined content when
                //  a number of redirects take place before reaching the origin server
                it("should return response when following redirects (" + redirectStatusCodes.join(", ") + ")", function() {
                    var redirectingHosts = [], originHost;

                    runs(function () {
                        var redirectLocation, i, l;
                        for (i = 0, l = redirectStatusCodes.length; i < l; ++i) {
                            redirectLocation = (i + 1) === l ? "http://originhost/some/resource" : "http://redirectinghost" + (i + 1) + "/some/resource";
                            redirectingHosts.push(nock("http://redirectinghost" + i)
                                .intercept(reqRsrcPath, transaction.req.method)
                                .reply(redirectStatusCodes[i], httpStatusCodeDescrs[redirectStatusCodes[i]], { Location: redirectLocation }));
                        }

                        originHost = nock("http://originhost")
                            .intercept(reqRsrcPath, transaction.req.method, transaction.req.body ? transaction.req.body.join("") : undefined)
                            .reply(transaction.rsp.statusCode, transaction.rsp.content);

                        rspContentStream = concat(function (buffer) {
                            rspContent = buffer;
                        });

                        req = httpUtil.request("http://redirectinghost0" + reqRsrcPath, rspContentStream, {
                            method: transaction.req.method,
                            followRedirects: true,
                            onResponse: function (statusCode) { rspStatusCode = statusCode; }
                        });

                        writeRequestBody(transaction.req.body, req);
                    });

                    waitsFor(function () {
                        return rspStatusCode && (transaction.rsp.content.length === 0 || rspContent);
                    }, "response-content to become available", 750);

                    runs(function () {
                        expect(rspStatusCode).toBe(transaction.rsp.statusCode);
                        expect(rspContent.toString()).toEqual(transaction.rsp.content);
                        redirectingHosts.forEach(function (redirectingHost) { redirectingHost.done(); });
                        originHost.done();
                    });
                });


                // `request` should acquire response with extended content (test.jpg bitmap data)
                //  a number of redirects take place before reaching the origin server
                it("should return response with extended content, when following redirects (" + redirectStatusCodes.join(", ") + ")", function() {
                    var redirectingHosts = [], originHost, rsrcContent;

                    runs(function () {
                        var redirectLocation, i, l;
                        for (i = 0, l = redirectStatusCodes.length; i < l; ++i) {
                            redirectLocation = (i + 1) === l ? "http://originhost/some/resource" : "http://redirectinghost" + (i + 1) + "/some/resource";
                            redirectingHosts.push(nock("http://redirectinghost" + i)
                                .intercept(reqRsrcPath, transaction.req.method)
                                .reply(redirectStatusCodes[i], httpStatusCodeDescrs[redirectStatusCodes[i]], { Location: redirectLocation }));
                        }

                        originHost = nock("http://originhost")
                            .intercept(reqRsrcPath, transaction.req.method, transaction.req.body ? transaction.req.body.join("") : undefined)
                            .replyWithFile(transaction.rsp.statusCode, testFilePath);

                        fs.readFile(testFilePath, function (error, buffer) { rsrcContent = buffer; });

                        rspContentStream = concat(function (buffer) {
                            rspContent = buffer;
                        });

                        req = httpUtil.request("http://redirectinghost0" + reqRsrcPath, rspContentStream, {
                            method: transaction.req.method,
                            followRedirects: true,
                            onResponse: function (statusCode) { rspStatusCode = statusCode; }
                        });

                        writeRequestBody(transaction.req.body, req);
                    });

                    waitsFor(function () {
                        return rspStatusCode && rsrcContent && rspContent;
                    }, "response-content to become available", 750);

                    runs(function () {
                        expect(rspStatusCode).toBe(transaction.rsp.statusCode);
                        expect(rspContent).toContainAllElementsOf(rsrcContent);
                        redirectingHosts.forEach(function (redirectingHost) { redirectingHost.done(); });
                        originHost.done();
                    });
                });

            }); // describe("for transaction ...
        }); // transactions.forEach
    }); // describe("/ request", ..
}); // describe("HTTP util", ...