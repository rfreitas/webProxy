//JSHint globals
/*global Ember:true,_:true,require:true,__dirname:true, process:true*/

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



    var certificateOptions = {
        key: fs.readFileSync('key.pem'),
        cert: fs.readFileSync('cert.pem')
    };



    var app = express();


    console.log(__dirname);

    app.use(express.static(__dirname) );
    app.use(express.bodyParser());
    app.use(app.router);

    app.get("/proxy/*", function(req, clientRes){

        var reqUrl = req.url.replace(/\/proxy\//,"");


        console.log("\nproxy request for:"+reqUrl);

        var parsedUrl = url.parse( reqUrl, true, true );
        console.log(parsedUrl);

        var options = {
            port: 80,
            method: 'GET'
        };

        var hostFull = parsedUrl.protocol+"//"+parsedUrl.host;

        var prefixedHost = "/proxy/"+hostFull;

        /*
        request(reqUrl, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                console.log("proxy response");
                console.log(response.headers);

                var parsed = $(body);
                parsed.find('*[href], *[content]').each(function(i ,node){
                    var existing = $(node).attr("content");
                    if (existing[0] === "/"){
                        $(node).attr("content", prefixedHost+existing);
                    }
                });

                clientRes.writeHead(200, response.headers);
                //clientRes.set('Content-Type', response.headers["content-type"]);

                if (parsed.length > 0){
                    console.log("sending html");
                    clientRes.end( parsed[0].outerHTML );

                }
                else{
                    //clientRes.end( body , "binary" );
                }
            }
        });
        */

        options = _.extend(options, parsedUrl);

        console.log("client request headers:");
        console.log(req.headers);
        options.headers = _.pick(req.headers, 'user-agent', 'accept-language');

        var referer = options.headers.referer;
        if (referer){
            options.headers.referer = referer.slice( referer.search(/\/proxy\//) + "/proxy/".length);
        }

        proxyRequest(options, _.partial(callback, parsedUrl.hostname, clientRes) ).end();
    });

    var proxyRequest = function(options, callback){
        //options.protocol = "http:";
        options = _.pick(options, "hostname", "path", "protocol", "headers");
        var protocol = http;
        if ( options.protocol === "https:" ){
            protocol = https;
            options.port = 443;
            options.agent = false;
            options = _.extend(options, certificateOptions);
        }
        var wrapper = function(res){
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
        return protocol.request(options, callback );
    };

    var isRequestCompressed = function(response){
        var contentEncoding = response.headers["content-encoding"];
        return !!( contentEncoding && contentEncoding.length > 0 );
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
        clientRes.writeHead( response.statusCode, _.omit(response.headers, "set-cookie"));

        var contentType = response.headers["content-type"];
        var isCompressed =  isRequestCompressed(response);
        var isText = contentType.search(/text/) === 0 && !isCompressed;
        var isHtml = isText && contentType.search(/html/) > 0;
        var isCSS = isText && !isHtml && contentType.search(/css/) > 0;


        if (!isText || isCompressed){
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
            if (isHtml){
                var $ = cheerio.load(str);
                $('[href]').each(function(i ,node){
                    replaceIfRelativeWith( "", "href", node, $);
                });
                $('[src]').each(function(i ,node){
                    replaceIfRelativeWith( "", "src", node, $);
                });
                var fullHtml = $.html();
                console.log( fullHtml ? "fullHtml:": "raw:");
                //console.log(fullHtml || str);
                clientRes.end( fullHtml|| str );
            }
            else if(isCSS){
                var minCss = cleanCSS.process(str);
                var parsedCss = minCss.replace(/url\('[^']+(?='\))|url\("[^"]+(?="\))|url\([^"')]+(?=\))/gi, function(match){
                    var prefix = "";
                    var newUrl;
                    console.log("CSS match:"+match);
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
                    console.log("REsult:"+prefix+newUrl);
                    return prefix+newUrl;
                });
                clientRes.end( parsedCss );
            }
            else if(isText){
                clientRes.end( str );
            }
            else{
                clientRes.end( str , "binary" );
            }
        });
    };

    var isDomainRelative = function(url){
        return url[0] === "/" && url[1] !== "/";
    };

    //fallback for not found relative requests, assume it might be a proxy request
    app.get("*",function(req,res, next){
        var reqUrl = req.url;
        console.log("dead request for:"+reqUrl);
        var referer = req.headers.referer || "";

        var proxyUrl = referer.slice( referer.search(/proxy\//)+"proxy/".length);
        var parsedProxyUrl = url.parse(proxyUrl);
        var proxyHostname = parsedProxyUrl.hostname;

        if (proxyHostname){
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


})();