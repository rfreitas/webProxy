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

    var m = new MutationObserver(function(mutationsArray){
        m.disconnect();

        mutationsArray.forEach(function(mutation){
            if (mutation.type === "childList"){
                $(mutation.addedNodes).each(function(i,node){
                    if ( $(node).is("a[href]") ){
                        $( function(){
                        replaceIfRelativeWith( "", "href", node, $);
                            $(node).find("a[href]").each( function(i, node){
                                replaceIfRelativeWith( "", "href", node, $);
                            });
                        });
                    }
                    else if( $(node).is("link[href]") ){
                        replaceIfRelativeWith( "", "href", node, $, true);
                    }
                    else if ($(node).is("iframe[src]")){
                        $( function(){//bug changing the before the onready event makes it so that the change does not register
                            replaceIfRelativeWith( "", "src", node, $);
                        });
                    }
                });
            }
            else if(mutation.type === "attributes"){
                //console.log("attributes changed!!!!");
                return;
                var node = mutation.target;

                //console.log(node);
                if ($(node).is("*[src]")){
                    console.log("src change");
                    replaceIfRelativeWith( "", "src", node, $, true);
                }
                else if($(node).is("*[href]")){
                    console.log("href change");
                }
            }
        });

        m.observe(document, observerOptions);
    });

    var observerOptions = {
        childList:true,
        attributes:true,
        subtree:true,
        characterData: false,
        attributeOldValue: false,
        attributeFilter: ["href","src"]
    };
    m.observe(document, observerOptions);


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


    var replaceIfRelativeWith = function( prefix, attr, node, $, dontProxy){
        var doProxy = !dontProxy;
        var existing = $(node).attr(attr);
        var proxyPrefix = "/proxy/";

        if (!existing || existing.search(proxyPrefix) === 0) return;
        console.log(existing);


        var newUrl = "";
        var existingParsed = parseUri(existing);
        if (existing[0] === "/" && existing[1] !== "/"){//is relative path to domain
            //$(node).attr(attr, proxyHostname() + existing);
            newUrl = proxyHost + existing;
        }
        else if (existing[0] === "#"){

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

        if (newUrl && newUrl !== existing){
            $(node).attr(attr, newUrl);
            //console.log(existing);
            console.log($(node).attr(attr));
        }
    };

    var proxyUrlParsed = parseUri(location.pathname.replace(/\/proxy\//,""));
    var proxyHost = proxyUrlParsed.protocol +"://"+ proxyUrlParsed.authority;

    $(function(){
            return;

            $('a[href]').each(function(i ,node){
                replaceIfRelativeWith( "", "href", node, $);
            });
            $('link[href]').each(function(i ,node){
                replaceIfRelativeWith( "", "href", node, $, true);
            });
            $('iframe[src]').each(function(i ,node){
                replaceIfRelativeWith( "", "src", node, $);
            });
        console.log("sup");
    });
})(window, jQuery, undefined, document);