(function(window,$,document){
    "use strict";

    //disables native scrolling
    document.ontouchmove = function(e) {e.preventDefault();};

    /*
     Disables image dragging
     */
    //ref: http://stackoverflow.com/a/4211930/689223
    $(document).on('dragstart',"img", function(event) { event.preventDefault(); });





    var previousHref = "";
    var callCallbackIfDifferent = function(window, callback, e, href){
        var currentHref = window.location.href.trim();
        if ( currentHref !== previousHref ){
            callback(currentHref, e);
            previousHref = currentHref;
        }
    };

    var hrefChange = function(window, callback){
        //ref:http://stackoverflow.com/questions/680785/on-window-location-hash-change
        $(window).on('hashchange', callback); // 92% support (5/13)

        //custom events triggered by the iframe header code
        $(window).on('statepushed statereplaced', callback);

        return {
            dispose: function(){
                $(window).off('hashchange statepushed statereplaced', callback);
            }
        };
    };

    var iframeHrefChange = function(iframe, callback){
        var window = iframe.contentWindow;
        var callIf = callCallbackIfDifferent.bind(this, window, callback);

        var windowListener = {dispose:function(){}};
        var iframeHandler = function(e){
            callIf(e);
            windowListener.dispose();
            windowListener = hrefChange( iframe, callIf );
        };
        var events = "iframeready iframeloaded";
        $(iframe).on(events, iframeHandler);

        return {
            dispose: function(){
                $(iframe).on(events, iframeHandler);
                windowListener.dispose();
            }
        };
    };

    var currentTime = function(){
        return Date.now();
    };

    $(function(){
        var iframe = $("iframe")[0];

        /*
        $(iframe).on("iframeready iframeactive iframeloaded iframeunloaded iframebeforeunload", function(e){
            console.log(e.type);
            console.log(e.target);
            console.log("WHHHAT");
            console.log($(this.contentDocument).find("*").length);
        });
        */

        var runId = window.runId = cuid();

        $(".experiment-id").text(runId);

        var id = location.pathname.match(/\/experiment\/[^\/]+/)[0].replace("/experiment/","");

        sharejs.open("experiment."+id, "json", function(error, experiment){
            if (!experiment.get()){
                var touchProtoDomain = "/touchproto/index.html";
                var parameters1 = "?expand=false&peek=0&closelabel=false";
                var parameters2 = "?expand=true&peek=.5&closelabel=true";

                var dummyExperimentCreator = function(parameters){
                    return {
                        tasks: [
                            {
                                startUrl: touchProtoDomain+parameters,
                                title: "Turn the phone on",
                                checkpoints: [{
                                    finishCondition: {
                                        href: ".+lockScreenApp.*"
                                    },
                                    runs:{}
                                }]
                            },
                            {
                                //startUrl: touchProtoDomain+parameters,
                                title: "Unlock screen",
                                checkpoints: [{
                                    finishCondition: {
                                        href: ".+app:launcher.*"
                                    },
                                    runs:{}
                                }]
                            },
                            {
                                //startUrl: touchProtoDomain+parameters,
                                title: "Go to the contact list",
                                checkpoints: [{
                                    finishCondition: {
                                        href: ".+app:contacts.*"
                                    },
                                    runs:{}
                                }]
                            },{
                                //startUrl: touchProtoDomain+parameters,
                                title: "Call Andrew Neil",
                                checkpoints: [{
                                    finishCondition: {
                                        href: ".+screen_call_AndrewNeil.*"
                                    },
                                    runs:{}
                                }]
                            },{
                                //startUrl: touchProtoDomain+parameters,
                                title: "Call Tom Fowler",
                                checkpoints: [{
                                    finishCondition: {
                                        href: ".+screen_call_TomFowler.*"
                                    },
                                    runs:{}
                                }]
                            },
                            {
                                //startUrl: touchProtoDomain+parameters,
                                title: "Go to BBC News",
                                checkpoints: [{
                                    finishCondition: {
                                        href: ".+app:news.*"
                                    },
                                    runs:{}
                                }]
                            }],
                        runs:{},
                        //proxy: "/proxy/",
                        title: "a task"
                    };
                };

                var dummyExperiment = dummyExperimentCreator( id == 1 ? parameters1:parameters2);

                experiment.set(dummyExperiment);
            }
            window.doc = experiment;

            $(".start-experiment").on("click",function(){
                $(this).removeClass("btn-primary");
                $(this).addClass("btn-success");
                $(this).text("Confirm");
                $(this).one("click", function(){
                    $(".startup").addClass("hidden");
                    startExperiment(runId);
                });
            });

            var startExperiment = function(runId){

                window.onbeforeunload = function() {
                    return "Please don't close this window without confirmation of the supervior first";
                };

                experiment.at(["runs",runId]).set({
                    useragent: "webkit",
                    name:"",
                    age:"",
                    gender:""
                });

                var setUpCheckpointRun = function(experiment){
                    experiment.get().tasks.forEach(function(task, taskKey){
                        task.checkpoints.forEach(function(checkpoint, checkpointKey){
                            experiment.at(["tasks",taskKey, "checkpoints", checkpointKey, "runs",runId]).set({
                                tracks:[],//why not make a track for every type of tracks? Because then you have to rely on time to get the order of all the tracks and the time might be compromised if the  system's time changes
                                startTime: null
                            });
                        });
                    });
                };

                setUpCheckpointRun(experiment);

                var setUpRun = function(checkpoint){
                    var currentTaskRun = checkpoint.at(["runs",runId]);
                    currentTaskRun.at("startTime").set(currentTime());
                    return currentTaskRun;
                };

                var proxy = experiment.at(["proxy"]).get() || "";

                var settingUpTask = function(currentTask){
                    $("div .title").text(currentTask.at(["title"]).get());
                    var startUlr = currentTask.at(["startUrl"]).get();
                    if (startUlr) $(iframe).attr("src", proxy + startUlr  );
                };


                var currentCheckpoint;
                var currentRun;
                var setCheckpoint = function(checkpoint){
                    currentCheckpoint = checkpoint;
                    currentRun = setUpRun( currentCheckpoint );
                };


                var taskIndex = -1;
                var currentTask;
                var checkpointIndex;
                var nextTask = function(){
                    taskIndex++;
                    currentTask = experiment.at(["tasks",taskIndex]);
                    console.log("currentTask:");
                    console.log(currentTask.get());
                    if (currentTask.get()){
                        settingUpTask(currentTask);
                        checkpointIndex = 0;
                        setCheckpoint( currentTask.at(["checkpoints",checkpointIndex]) );
                    }
                    else{
                        $(iframe).addClass("hidden");
                        $(".finish").removeClass("hidden");
                    }
                };

                nextTask();


                var checkCheckpoint = function(href){
                    var finishCondition = currentCheckpoint.get().finishCondition;
                    if (!finishCondition) return;

                    var stopHref = new RegExp( finishCondition.href );
                    if ( (href.match(stopHref) || [])[0] === href){
                        currentRun.at("endTime").set( currentTime() );
                        checkpointIndex++;
                        var newCheckpoint = currentTask.at(["checkpoints",checkpointIndex]);
                        if (newCheckpoint.get()){
                            setCheckpoint( newCheckpoint );
                        }
                        else{
                            nextTaskModal.modal('show');
                            nextTaskModal.one("hide",function(){
                                nextTaskModal.one("hidden",function(){
                                    //nextTask();
                                });
                            });
                        }
                    }
                };

                var nextTaskModal = $('#nexttaskmodal');

                nextTaskModal.modal({
                    backdrop: "static",
                    keyboard: false,
                    show: false
                });

                nextTaskModal.find("button").on("click",function(){
                    nextTaskModal.modal('hide');
                    nextTask();
                });

                iframeHrefChange(iframe, function newHref(href){
                        href = href.replace(/.*\/proxy\//,"");//remove proxy domain
                        console.log("href: "+href);
                        currentRun.at("tracks").push({
                            type: "hrefchange",
                            href: href,
                            timeStamp: currentTime()
                        });
                        checkCheckpoint(href);
                        return newHref;
                    }
                );
            };
        });
    });

})(window,jQuery, document);