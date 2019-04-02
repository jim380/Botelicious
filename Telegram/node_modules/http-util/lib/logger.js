//     HTTP Util v0.1.4

//     https://github.com/biril/http-util
//     Licensed under the MIT License
//     Copyright (c) 2016 Alex Lambiris

// A simple 'contextual' logger. Every log message belongs to a specific context with a
//  meaningful (unique-ish) name and a discreet color. Based on these, it applies a uniform
//  'decoration' for all messages which are part of the same op, even when intermingled with
//  others, referring to some _other_ (parallel) op

"use strict";

require("colors");

var _ = require("underscore"),

    util = require("util"),

    // A handy no-op to reuse
    noOp = function () {},

    // A helper which creates an array containing `obj` as first element and the elements of `args`
    //  as final elements, (excluding all elements up to the `argsIndex`-th)
    mergeWithArgs = function (obj, args, argsIndex) {
        return Array.prototype.concat.apply([obj], Array.prototype.slice.call(args, argsIndex || 0));
    },

    // Log level
    level = 0,

    // Log colors
    colors = ["yellow", "cyan", "magenta", "green", "grey", "blue"],

    // Index of current log color, used to loop through them
    colorIndex = 0,

    getNextContextColor = function () {
        var color = colors[colorIndex];
        colorIndex = (colorIndex + 1) % colors.length;
        return color;
    },

    // Build name of context given method and URL
    buildContextName = function (method, url) {
        url || (url = {});
        var name = [
            url.protocol && url.protocol.indexOf("https") === 0 ? "s://" : "",
            url.hostname || "",
            url.pathname || ""
        ].join("");
        if (name.length > 32) { name = name.substr(0, 15) + ".." + name.substr(-15, 15); }
        name = method + " " + name;
        return name;
    },

    // Create logging context given method and url
    createLogContext = function (method, url) {
        return {id: _.uniqueId(), name: buildContextName(method, url), color: getNextContextColor()};
    },

    lgr = {
        write: null,

        // Set the log-level - 0 (none) to 4 (debug (annoying))
        setLevel: function (lvl) {
            level = lvl;
            var write = function (context, logLevel, msg) {
                if (logLevel > level) { return; }
                var args = mergeWithArgs((context.name + ">  " + msg)[context.color], arguments, 3);
                console.log(util.format.apply(util, args)); // eslint-disable-line no-console
            };
            lgr.write = level ? write : noOp;
        },

        // Create a writer (a logging function) for the given `opts.context`. Will ensure
        //  that logging-context actually exists on `opts` using the optional `url` to
        //  create it if it doesn't
        createWriter: function (opts, url) {
            opts.logContext || (opts.logContext = createLogContext(opts.method, url));
            return function (/* level, msg */) {
                lgr.write.apply(null, mergeWithArgs(opts.logContext, arguments));
            };
        }
    };

lgr.setLevel(0);

module.exports = lgr;
