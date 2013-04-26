/**
 * Created with JetBrains WebStorm.
 * User: freitas
 * Date: 24/04/2013
 * Time: 03:12
 * To change this template use File | Settings | File Templates.
 * ORIGINAL: https://github.com/yui/yui3/blob/master/src/cookie/js/Cookie.js
 * ref: http://www.nczonline.net/blog/2009/05/05/http-cookies-explained/
 */

(function(){
    "use strict";

    var _ = require("underscore");

    //shortcuts
    var L       = _,
        O       = _,
        NULL    = null,

    //shortcuts to functions
        isString    = L.isString,
        isObject    = L.isObject,
        isUndefined = L.isUndefined,
        isFunction  = L.isFunction,
        encode      = encodeURIComponent,
        decode      = decodeURIComponent;

    /*
     * Throws an error message.
     */
    function error(message){
        throw new TypeError(message);
    }

    var YUIfunction={
        /**
         * Creates a cookie string that can be assigned into document.cookie.
         * @param {String} name The name of the cookie.
         * @param {String} value The value of the cookie.
         * @param {Boolean} encodeValue True to encode the value, false to leave as-is.
         * @param {Object} options (Optional) Options for the cookie.
         * @return {String} The formatted cookie string.
         * @method _createCookieString
         * @private
         * @static
         */
        _createCookieString : function (name /*:String*/, value /*:Variant*/, encodeValue /*:Boolean*/, options /*:Object*/) /*:String*/ {

            options = options || {};

            var text /*:String*/ = encode(name) + "=" + (encodeValue ? encode(value) : value),
                expires = options.expires,
                path    = options.path,
                domain  = options.domain;


            if (isObject(options)){
                //expiration date
                if (expires instanceof Date){
                    text += "; expires=" + expires.toUTCString();
                }

                //path
                if (isString(path) && path !== ""){
                    text += "; path=" + path;
                }

                //domain
                if (isString(domain) && domain !== ""){
                    text += "; domain=" + domain;
                }

                //secure
                if (options.secure === true){
                    text += "; secure";
                }
            }

            return text;
        },

        /**
         * Formats a cookie value for an object containing multiple values.
         * @param {Object} hash An object of key-value pairs to create a string for.
         * @return {String} A string suitable for use as a cookie value.
         * @method _createCookieHashString
         * @private
         * @static
         */
        _createCookieHashString : function (hash /*:Object*/) /*:String*/ {
            if (!isObject(hash)){
                error("Cookie._createCookieHashString(): Argument must be an object.");
            }

            var text /*:Array*/ = [];

            O.each(hash, function(value, key){
                if (!isFunction(value) && !isUndefined(value)){
                    text.push(encode(key) + "=" + encode(String(value)));
                }
            });

            return text.join("&");
        },

        /**
         * Parses a cookie hash string into an object.
         * @param {String} text The cookie hash string to parse (format: n1=v1&n2=v2).
         * @return {Object} An object containing entries for each cookie value.
         * @method _parseCookieHash
         * @private
         * @static
         */
        _parseCookieHash : function (text) {

            var hashParts   = text.split("&"),
                hashPart    = NULL,
                hash        = {};

            if (text.length){
                for (var i=0, len=hashParts.length; i < len; i++){
                    hashPart = hashParts[i].split("=");
                    hash[decode(hashPart[0])] = decode(hashPart[1]);
                }
            }

            return hash;
        },

        /**
         * Parses a cookie string into an object representing all accessible cookies.
         * @param {String} text The cookie string to parse.
         * @param {Boolean} shouldDecode (Optional) Indicates if the cookie values should be decoded or not. Default is true.
         * @param {Object} options (Optional) Contains settings for loading the cookie.
         * @return {Object} An object containing entries for each accessible cookie.
         * @method _parseCookieString
         * @private
         * @static
         */
        _parseCookieString : function (text /*:String*/, shouldDecode /*:Boolean*/, options /*:Object*/) /*:Object*/ {

            var cookies /*:Object*/ = {};

            if (isString(text) && text.length > 0) {

                var decodeValue = (shouldDecode === false ? function(s){return s;} : decode),
                    cookieParts = text.split(/;\s/g),
                    cookieName  = NULL,
                    cookieValue = NULL,
                    cookieNameValue = NULL;

                for (var i=0, len=cookieParts.length; i < len; i++){
                    //check for normally-formatted cookie (name-value)
                    cookieNameValue = cookieParts[i].match(/([^=]+)=/i);
                    if (cookieNameValue instanceof Array){
                        try {
                            cookieName = decode(cookieNameValue[1]);
                            cookieValue = decodeValue(cookieParts[i].substring(cookieNameValue[1].length+1));
                        } catch (ex){
                            //intentionally ignore the cookie - the encoding is wrong
                        }
                    } else {
                        //means the cookie does not have an "=", so treat it as a boolean flag
                        cookieName = decode(cookieParts[i]);
                        cookieValue = "";
                    }
                    // don't overwrite an already loaded cookie if set by option
                    if (!isUndefined(options) && options.reverseCookieLoading) {
                        if (isUndefined(cookies[cookieName])) {
                            cookies[cookieName] = cookieValue;
                        }
                    } else {
                        cookies[cookieName] = cookieValue;
                    }
                }

            }

            return cookies;
        }
    };

    _.each( YUIfunction, function(func, key){
        exports[key.slice(1)] = func;
    } );
})();