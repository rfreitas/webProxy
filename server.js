//JSHint globals
/*global Ember:true,_:true,require:true,__dirname:true, process:true*/


//ref: http://stevenlevithan.com/demo/parseuri/js/assets/parseuri.js
//alt: http://james.padolsey.com/javascript/parsing-urls-with-the-dom/
// parseUri 1.2.2
// (c) Steven Levithan <stevenlevithan.com>
// MIT License
function parseUri (str) {
    var	o   = parseUri.options,
        m   = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
        uri = {},
        i   = 14;

    while (i--) uri[o.key[i]] = m[i] || "";

    uri[o.q.name] = {};
    uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
        if ($1) uri[o.q.name][$1] = $2;
    });

    return uri;
};

parseUri.options = {
    strictMode: false,
    key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
    q:   {
        name:   "queryKey",
        parser: /(?:^|&)([^&=]*)=?([^&]*)/g
    },
    parser: {
        strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
        loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
    }
};

(function(){
    "use strict";

    var port = process.env.PORT || 5000;

    var http = require('http');
    var https = require('https'),
        path = require("path"),
        fs = require("fs"),
        crypto = require("crypto");
    var express = require('express');
    var util = require('util');
    var sharejs = require('share').server;
    var redis = require("redis");
    var url = require("url");
    var _ = require("underscore");
    var request = require('request');
    var cheerio = require('cheerio');
    var cleanCSS = require('clean-css');
    var cookie = require("./cookie.js");
    var Handlebars = require("Handlebars");



    var certificateOptions = {
        key: fs.readFileSync('key.pem'),
        cert: fs.readFileSync('cert.pem')
    };

    console.log(cookie.parseCookieString("session-id-time=2082787201l; path=/; domain=.amazon.com; expires=Tue, 01-Jan-2036 08:00:01 GMT"));




    var app = express();


    console.log(__dirname);

    app.use(express.static(__dirname+"/public") );
    //app.use(express.bodyParser());

    //ref: http://stackoverflow.com/a/13565786/689223
    app.use(function(req, res, next) {
        var data = '';
        req.setEncoding('utf8');
        req.on('data', function(chunk) {
            data += chunk;
        });
        req.on('end', function() {
            req.rawBody = data;
            next();
        });
    });

    app.use(app.router);

    var scriptTemplate = Handlebars.registerPartial('externalScript','{{#each scripts}}<script src="{{this}}" type="text/javascript"></script>{{/each}}');
    var cssTemplate = Handlebars.registerPartial('externalSheet','<link href="{{css_src}}" rel="stylesheet" type="text/css"/>');
    var experimentTemplate = Handlebars.compile('<head>{{> externalScript}}{{> externalSheet}}</head> <body><iframe src="/proxy/http://www.amazon.com"></iframe></body>');

    var proxyPageTemplate = Handlebars.compile('{{> externalScript}}');
    var proxyPageHeader = proxyPageTemplate({
        scripts:["http://code.jquery.com/jquery-1.9.1.min.js",
            "http://stevenlevithan.com/demo/parseuri/js/assets/parseuri.js",
            "/clientProxy.js"]
    });

    app.get("/experiment/:id", function(req, res){
        res.send(experimentTemplate({
            scripts:["http://code.jquery.com/jquery-1.9.1.min.js","/proxy.js"],
            css_src:"/experiment.css"
        }));
        //res.send('<iframe src="/proxy/http://www.amazon.com"></iframe>');
    });


    app.all("/proxy/*", function(req, clientRes){

        var reqUrl = req.url.replace(/\/proxy\//,"");

        console.log("\nproxy request for:"+reqUrl);
        console.log("method:"+req.method);

        var parsedUrl = url.parse( reqUrl, true, true );

        var options = {
            port: 80,
            method: req.method
        };

        options = _.extend(options, parsedUrl);

        console.log("client request headers:");
        console.log(req.headers);
        options.headers = _.pick(req.headers, "accept","user-agent","accept-language","accept-charset","referer");

        var referer = options.headers.referer;
        if (referer){
            options.headers.referer = referer.slice( referer.search(/\/proxy\//) + "/proxy/".length);
        }
        //options.headers["accept-encoding"] = "gzip";
        options.headers["accept-charset"] = "utf-8";

        var request = proxyRequest(options, _.partial(callback, parsedUrl.hostname, clientRes) );

        request.on('error', function(e) {
            console.log("Got error: " + e.message);

            var referer = options.headers.referer;
            console.log("referer:"+referer);
            var parsedReferer = parseUri(referer);
            if (referer && false){
                console.log("Trying to redirect request");

                var directory = parsedReferer.directory || "/";
                if (directory[directory.length-1] !== "/") directory = directory + "/";
                var existing = parsedUrl.host + parsedUrl.path;
                clientRes.redirect("/proxy/" + parsedReferer.protocol +"://"+ parsedReferer.authority+ directory + existing);
            }
            else{
                clientRes.send(404);
            }
        });

        //ref: http://stackoverflow.com/questions/6158933/http-post-request-in-node-js
        //ref: http://stackoverflow.com/questions/9920208/expressjs-raw-body
        var body = req.rawBody;
        if (body){
            console.log("body:");
            console.log(body);
            request.write(body);
        }
        request.end();
    });

    var proxyRequest = function(options, callback){
        options = _.pick(options, "hostname", "path", "protocol", "headers", "method", "port");

        var protocol = http;
        if ( options.protocol === "https:" ){
            protocol = https;
            options.port = options.port || 443;
            options.agent = false;
            options = _.extend(options, certificateOptions);
        }

        console.log("Proxy request:");
        console.log(options);

        var transparentRedirectWrapper = function(res){
            if (res.statusCode > 300 && res.statusCode < 400 && res.headers.location) {
                // The location for some (most) redirects will only contain the path,  not the hostname;
                // detect this and add the host to the path.
                var parsedLocation = url.parse(res.headers.location);
                options = _.extend(options, _.pick(parsedLocation, "hostname", "path", "protocol"));
                console.log("\nredirect");
                console.log(res.headers);
                console.log(options);
                proxyRequest(options, callback).end();
            }
            else{
                callback.apply(this,arguments);
            }
        };


        return protocol.request(options, callback ).on('error',function(e){
            console.log("Error: " + e.message);
            console.log( e.stack );
        });
    };

    var isRequestCompressed = function(response){
        var contentEncoding = response.headers["content-encoding"] || "";
        return contentEncoding.length > 0;
    };

    var callback = function(hostname, clientRes,response) {
        var str = '';
        console.log("\nServer response headers:");
        console.log(response.headers);

        if (response.statusCode > 300 && response.statusCode < 400 && response.headers.location) {
            // The location for some (most) redirects will only contain the path,  not the hostname;
            // detect this and add the host to the path.
            var parsedLocation = url.parse(response.headers.location);
            if ( parsedLocation.hostname ){
                response.headers.location = "/proxy/"+parsedLocation.href;
            }
            else{
                response.headers.location = "/proxy/"+hostname+parsedLocation.path;
            }
        }
        clientRes.writeHead( response.statusCode, _.omit(response.headers, "set-cookie","p3p"));

        var contentType = response.headers["content-type"];
        var isCompressed =  isRequestCompressed(response);
        var isText = !isCompressed && contentType.search(/text/) === 0;
        var isHtml = isText && contentType.search(/html/) > 0;
        var isCSS = isText && !isHtml && contentType.search(/css/) > 0;


        if (!isText){
            response.setEncoding('binary');
        }

        //another chunk of data has been recieved, so append it to `str`
        response.on('data', function (chunk) {
            str += chunk;
        });
        console.log("The callback");
        console.log("hostname: "+hostname);

        var replaceIfRelativeWith = function( prefix, attr, node, $){
            var existing = $(node).attr(attr);
            if (existing[0] === "/" && existing[1] !== "/"){//is relative path
                $(node).attr(attr, proxyHostname() + existing);
            }
            else if(existing){//absolute path
                $(node).attr(attr, "/proxy/" + existing);
            }
        };

        var proxyHostname = function(){
            return "/proxy/"+ "http://"+hostname;
        };

        //the whole response has been recieved, so we just print it out here
        response.on('end', function () {
            console.log("response:");
            if (isHtml ){
                var $ = cheerio.load(str);
                $('[href]').each(function(i ,node){
                    replaceIfRelativeWith( "", "href", node, $);
                });
                $('[src]').each(function(i ,node){
                    replaceIfRelativeWith( "", "src", node, $);
                });
                var fullHtml = $.html();
                fullHtml = str.replace(/<html[^>]*>/,function(match){
                    return match + proxyPageHeader;
                });
                console.log( fullHtml ? "fullHtml:": "raw:");

                //console.log(fullHtml || str);
                clientRes.end( fullHtml|| str );
            }
            else if(isCSS){
                var minCss = cleanCSS.process(str);
                var parsedCss = minCss.replace(/url\('[^']+(?='\))|url\("[^"]+(?="\))|url\([^"')]+(?=\))/gi, function(match){
                    var prefix = "";
                    var newUrl;
                    var url = match.replace(/url\(|url\('|url\("/, function(prefixMatch){
                        prefix = prefixMatch;
                        return "";
                    });
                    if (isDomainRelative(url)){
                        newUrl = proxyHostname() + url;
                    }
                    else{
                        newUrl = url;
                    }
                    //console.log("CSS match:"+match);
                    //console.log("REsult:"+prefix+newUrl);
                    return prefix+newUrl;
                });
                clientRes.end( parsedCss );
            }
            else if(isText){
                clientRes.end( str );
            }
            else{
                console.log("compressed request:");
                clientRes.end( str , "binary" );
            }
        });
    };

    var isDomainRelative = function(url){
        return url[0] === "/" && url[1] !== "/";
    };

    //fallback for not found relative requests, assume it might be a proxy request
    app.all("*",function(req,res, next){
        var reqUrl = req.url;
        console.log("dead request for:"+reqUrl);
        var referer = req.headers.referer || "";

        var proxyUrl = referer.slice( referer.search(/proxy\//)+"proxy/".length);
        var parsedProxyUrl = url.parse(proxyUrl);
        var proxyHostname = parsedProxyUrl.hostname;

        if (proxyHostname){
            console.log("redirecting to:"+"/proxy/"+parsedProxyUrl.protocol+"//"+proxyHostname + reqUrl);
            res.redirect("/proxy/"+parsedProxyUrl.protocol+"//"+proxyHostname + reqUrl);
        }
        else{
            next();
        }
    });


    app.get('/jsclock', function(req, res){
        console.log("jsclock");
        var epoch = Date.now();
        res.send({ epoch: epoch });
    });

    console.log("port:"+port);

    app.listen(port);

    process.on('uncaughtException', function (err) {
        console.log('Caught exception: ' + err);
    });

})();