(function() {
    "use strict";

    var port = process.env.PORT || 5000;

    var express = require('express');
    var proxy = require("./index.js");

    var app = express();

    console.log(__dirname);
    console.log(proxy);

    proxy(app);

    app.listen(port);
})();