/*jshint node:true */
"use strict";

var httpUtil = require(__dirname + "/../http-util"),
	file = require("fs").createWriteStream(__dirname + "/google.html", { flags: "w" });

httpUtil.logLevel = 1;

httpUtil.request("http://google.com", file, {
	followRedirects: true
}).end();
