/*jshint node:true */
"use strict";

var httpUtil = require(__dirname + "/../http-util");

httpUtil.logLevel = 1;

require("http").createServer(function (req, rsp) {

	httpUtil.forward(req, rsp);

}).listen(8080);
