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
    var url = require("url");

    var express = require('express');
    var util = require('util');
    var share = require("share");
    var redis = require("redis");
    var _ = require("underscore");
    var cheerio = require('cheerio');
    var cleanCSS = require('clean-css');
    var cookie = require("./cookie.js");
    var Handlebars = require("handlebars");

    var readFile = function(path){
        return fs.readFileSync(path).toString();
    };


    var certificateOptions = {
        key: fs.readFileSync('key.pem'),
        cert: fs.readFileSync('cert.pem')
    };

    console.log(cookie.parseCookieString("session-id-time=2082787201l; path=/; domain=.amazon.com; expires=Tue, 01-Jan-2036 08:00:01 GMT"));




    var app = express();

    var sharejsOptions = {
        db: {
            //type: 'none'
            type: 'redis' // See docs for options. {type: 'redis'} to enable persistance.
        },
        auth: function(agent, action){
            //ref: https://github.com/josephg/ShareJS/wiki/User-access-control
            action.accept();
        },
        //browserChannel: null,
        sockjs: {},
        websocket:{}
    };


    console.log(__dirname);


    app.use(express.logger());

    app.use(express.static(__dirname+"/public") );
    app.use(express.static(__dirname+"/node_modules") );


    app.use("/touchproto/",express.static(__dirname+"/../touchProto/") );//ref: http://www.senchalabs.org/connect/http.html
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

    app.all("*",function(req,res, next){
        console.log("a request");
        next();
    });

    /*
    * EXPERIMENTS
     */

    var handleTemplate = function(path){
        return Handlebars.compile(fs.readFileSync(path).toString());
    };


    Handlebars.registerPartial('externalScript','{{#each scripts}}' +
        '\n{{#if code}}<script type="text/javascript">{{{code}}}</script>' +
        '{{else}}<script src="{{this}}" type="text/javascript"></script>' +
        '{{/if}}\n' +
        '{{/each}}');
    Handlebars.registerPartial('externalSheet','{{#each sheets}}\n<link href="{{this}}" rel="stylesheet" type="text/css"/>\n{{/each}}');
    Handlebars.registerPartial('serverParameters','<script id="params" type="text/json">{{{parameters}}}</script>');
    var experimentTemplate = handleTemplate('template/experiment_run.html');
    var runObserveTemplate = handleTemplate('template/experiment_run_observe.html');

    var proxyPageTemplate = Handlebars.compile('{{> externalScript}}');
    var proxyPageHeader = proxyPageTemplate({
        scripts:[
            {code:readFile("public/jquery-1.9.1.min.js")},
            {code:readFile("public/clientProxy.js")}]
    });

    app.get("/experiment/:id/run", function(req, res){
        var id = req.params["id"];

        res.send(experimentTemplate({
            scripts:[
                "/jquery-1.9.1.min.js",
                //"/share/node_modules/browserchannel/dist/bcsocket-uncompressed.js",
                //"http://cdn.sockjs.org/sockjs-0.3.min.js"
                "/sockjs-0.3.min.js",
                //"/sockjs-0.2.1.js",
                "/share/webclient/share.js",
                //"/share/webclient/textarea.js",
                "/share/webclient/json.js",
                "/cuid/dist/browser-cuid.js",
                "/underscore/underscore.js",
                "/bootstrap/js/bootstrap.min.js",
                "/proxy.js"
            ],
            sheets:[
                "/bootstrap/css/bootstrap.min.css",
                "/experiment_run.css"
            ],
            iframe_src: ""
        }));
    });

    app.get("/experiment/:id/observe", function(req, res){
        var id = req.params["id"];


        res.send(experimentTemplate({
            parameters: {
                id: id
            },
            scripts:[
                "/jquery-1.9.1.min.js",
                "/sockjs-0.3.min.js",
                "/share/webclient/share.js",
                "/share/webclient/json.js",
                "/cuid/dist/browser-cuid.js",
                "/underscore/underscore.js",
                "/bootstrap/js/bootstrap.min.js",
                "/static/knockout-2.2.1.js",
                "/node_modules/ShareKO.js/share.ko.js",
                "/experiment_observe.js"
            ],
            sheets:[
                "/bootstrap/css/bootstrap.min.css",
                "/experiment_run_observe.css"
            ]
        }));
    });

    app.get("/experiment/:id/run/:run_id/observe", function(req, res){
        var id = req.params.id;
        var runId = req.params.run_id;

        res.send(runObserveTemplate({
            parameters: JSON.stringify({
                id: id,
                runId: runId
            }),
            scripts:[
                "/jquery-1.9.1.min.js",
                "/sockjs-0.3.min.js",
                "/share/webclient/share.js",
                "/share/webclient/json.js",
                "/cuid/dist/browser-cuid.js",
                "/underscore/underscore.js",
                "/bootstrap/js/bootstrap.min.js",
                "/static/knockout-2.2.1.js",
                "/ShareKO.js/share.ko.js",
                "/experiment_run_observe.js"
            ],
            sheets:[
                "/bootstrap/css/bootstrap.min.css",
                "/experiment_run_observe.css"
            ]
        }));
    });



    var experimentViewerTemplate = Handlebars.compile(readFile('template/experiment_view.html'));
    var experimentViewer = experimentViewerTemplate(JSON.parse(readFile('template/experiment_view.json')));

    app.get("/experiment/:id", function(req, res){
        res.send(experimentViewer);
    });





    var httpServer = share.server.attach(app, sharejsOptions);


    httpServer.listen(port);


    /*
    ** PROXY
     */

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

        //console.log("client request headers:");
        //console.log(req.headers);
        options.headers = _.omit(req.headers, "cookie","origin","accept-encoding","host");

        var referer = options.headers.referer;
        if (referer){
            options.headers.referer = referer.slice( referer.search(/\/proxy\//) + "/proxy/".length);
        }
        options.headers.host = parsedUrl.host;
        if (req.headers.origin) options.headers.origin = parsedUrl.host;
        //options.headers["accept-encoding"] = "gzip";
        //options.headers["accept-charset"] = "utf-8";

        var request = proxyRequest(options, _.partial(callback, parsedUrl, clientRes) );


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

        return protocol.request(options, callback );
    };

    var isRequestCompressed = function(response){
        var contentEncoding = response.headers["content-encoding"] || "";
        return contentEncoding.length > 0;
    };

    var callback = function(parsedUrl, clientRes,response) {
        var hostname = parsedUrl.hostname;
        var str = '';
        console.log("\nServer response headers:");
        //console.log(response.headers);
        console.log("status code:"+response.statusCode);
        console.log("requested url:"+parsedUrl.href);

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

        var newHeader = _.omit(response.headers, "set-cookie","p3p","content-length","accept-ranges","transfer-encoding","server");
        newHeader["x-frame-options"] = "SAMEORIGIN";//ref: https://developer.mozilla.org/en-US/docs/HTTP/X-Frame-Options

        clientRes.writeHead( response.statusCode, newHeader);

        console.log(newHeader);

        var contentType = response.headers["content-type"];
        var isCompressed =  isRequestCompressed(response);
        var isText = !isCompressed && contentType && contentType.search(/text/) === 0;
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

        var prefixUrl = function(proxyPrefix, existing, dontProxy){
            //console.log(existing);

            var doProxy = !dontProxy;
            var newUrl = "";
            var existingParsed = parseUri(existing);

            if (existing[0] === "/" && existing[1] !== "/"){//is relative path to domain
                //$(node).attr(attr, proxyHostname() + existing);
                newUrl = proxyHost + existing;
            }
            else if (existing[0] === "#"){
                return existing;
            }
            else if(existingParsed.protocol || existing.search("//") === 0){//absolute path
                if (!dontProxy && existingParsed.protocol !== "javascript") newUrl = existing;
            }
            else{//relative to current path
                var directory = proxyUrlParsed.directory || "/";
                directory = directory.replace(/\/[^\/]+$/g,"/");
                newUrl =  proxyHost + directory + existing;
            }

            if (newUrl && doProxy){
                newUrl = proxyPrefix + newUrl;
            }

            //if (newUrl) console.log(newUrl);
            return newUrl;
        };


        var replaceIfRelativeWith = function( prefix, attr, node, $, dontProxy){
            var existing = $(node).attr(attr);
            var proxyPrefix = "/proxy/";

            var newUrl = prefixUrl(proxyPrefix, existing, dontProxy);

            if (newUrl && newUrl !== existing){
                $(node).attr(attr, newUrl);
            }
        };

        var proxyUrlParsed = parseUri(parsedUrl.href);
        var proxyHost = proxyUrlParsed.protocol +"://"+ proxyUrlParsed.authority;

        var proxyHostname = function(){
            return "/proxy/"+ "http://"+hostname;
        };

        //the whole response has been recieved, so we just print it out here
        response.on('end', function () {
            console.log("response:");
            if (isHtml ){
                str = str.replace(/<head[^>]*>/,function(match){
                    return match + proxyPageHeader;
                });

                var $ = cheerio.load(str);



                $('a[href]').each(function(i ,node){
                    replaceIfRelativeWith( "", "href", node, $);
                    $(node).attr("target", "_self");//ref:http://www.w3schools.com/jsref/prop_anchor_target.asp
                });
                $('area[href]').each(function(i ,node){
                    replaceIfRelativeWith( "", "href", node, $);
                    $(node).attr("target", "_self");//ref:http://www.w3schools.com/jsref/prop_anchor_target.asp
                });
                $('form[action]').each(function(i ,node){
                    replaceIfRelativeWith( "", "action", node, $);
                });
                $('iframe[src]').each(function(i ,node){
                    replaceIfRelativeWith( "", "src", node, $);
                });

                //content
                var dontProxyContent = true;
                $('link[href]').each(function(i ,node){
                    replaceIfRelativeWith( "", "href", node, $, dontProxyContent);
                });
                $('script[src]').each(function(i ,node){
                    replaceIfRelativeWith( "", "src", node, $, dontProxyContent);
                });
                $('object[data]').each(function(i ,node){
                    replaceIfRelativeWith( "", "data", node, $, dontProxyContent);
                });


                var fullHtml = $.html();

                console.log( fullHtml ? "fullHtml:": "raw:");
                console.log(fullHtml);


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



    process.on('uncaughtException', function (err) {
        console.log('Caught exception: ' + err);
    });

})();