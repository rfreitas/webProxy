(function(window,$,document){
    "use strict";

    $(function(){
        $("iframe").on("iframeready iframeactive iframeloaded iframeunloaded iframebeforeunload", function(e){
            console.log(e.type);
            console.log(e.target);
            console.log("WHHHAT");
            console.log($(this.contentDocument).find("*").length);
        });
    });

    $(function(){
        $("iframe").on("beforeunload", function(e){
            return "are you sure";
        });
    });


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
})(window,jQuery, document);

