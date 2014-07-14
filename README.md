webProxy
========

Quick and dirty web proxy written in Node.js (Don't use in production)


how to use:

  var express = require('express');
  var proxy = require("webProxy");

  var app = express();

  proxy(app); 
