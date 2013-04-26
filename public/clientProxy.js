/**
 * Created with JetBrains WebStorm.
 * User: freitas
 * Date: 25/04/2013
 * Time: 18:15
 * To change this template use File | Settings | File Templates.
 */
(function(window, jQuery, undefined, document){
    "use strict";
    var $ = jQuery.noConflict();
    window.jQuery = undefined;

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



    $(function(){
            var replaceIfRelativeWith = function( prefix, attr, node, $, dontReplaceFullUrls){
                var existing = $(node).attr(attr);
                if (!existing) return;

                var newUrl = "";
                var existingParsed = parseUri(existing);
                if (existing[0] === "/" && existing[1] !== "/"){//is relative path to domain
                    //$(node).attr(attr, proxyHostname() + existing);
                }
                else if (existing[0] === "#"){

                }
                else if(existingParsed.protocol){//absolute path
                    if (!dontReplaceFullUrls && existingParsed.protocol !== "javascript") newUrl = "/proxy/" + existing;
                }
                else{//relative to path
                    var directory = proxyUrlParsed.directory || "/";
                    if (directory[directory.length-1] !== "/") directory = directory + "/";
                    newUrl = "/proxy/" + proxyUrlParsed.protocol +"://"+ proxyUrlParsed.authority+ directory + existing;
                }
                if (newUrl){
                    $(node).attr(attr, newUrl);
                    console.log(existing);
                    console.log(newUrl);
                }
            };

            var proxyUrlParsed = parseUri(location.pathname.replace(/\/proxy\//,""));

            $('a[href]').each(function(i ,node){
                replaceIfRelativeWith( "", "href", node, $);
            });
            $('link[href]').each(function(i ,node){
                //replaceIfRelativeWith( "", "href", node, $, true);
            });
            $('[src]').each(function(i ,node){
                //replaceIfRelativeWith( "", "src", node, $);
            });
        console.log("sup");
    });
})(window, jQuery, undefined, document);