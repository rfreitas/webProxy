(function(window,jQuery){
    "use strict";
    var $ = jQuery.noConflict();

    $(function(){
        var iframe = $('iframe');
        iframe.load( function(){
            console.log("iframe ready change");
            console.log(this.contentDocument.readyState);
            console.log(this);

            var iframeDocument = this.contentDocument;
            console.log(iframeDocument);

            var iframeWindow = this.contentWindow;
            console.log(iframeWindow);
            console.log(iframeWindow.location.href);
            var idoc = $(iframeDocument);

        }.bind(iframe[0]));
        console.log("sup");
    });
})(window,jQuery);

