/**
 * Created with JetBrains WebStorm.
 * User: freitas
 * Date: 24/05/2013
 * Time: 17:16
 * To change this template use File | Settings | File Templates.
 */



var experimentsFactory = sko.extendProto( sko.factory, {
    computed: {
        run: function(){
            "use strict";
            var runId = this.runId();
            return this.runs()[runId];
        }
    },
    setObservables: function(out){
        "use strict";
        out.tasks = ko.observableArray([]);
        out.runs = ko.observable({});
        out.runId = ko.observable(0).local();
    }
});

var experimentRunFactory = sko.extendProto( sko.factory, {
    setObservables: function(out){
        "use strict";
        out.finished = ko.observable(null);
    }
});


var experimentRunView = sko.extendProto( sko.factory, {
    setObservables: function(out){
        "use strict";
        out.experiment = ko.observable({});
        out.experimentRun = ko.observable({});
    }
});

//$root.experiment().tasks()[$index].title"

var experimentCompleteRunFactory = sko.extendProto( sko.factory, {
    setObservables: function(out){
        "use strict";
        out.name = ko.observable("");
        out.age = ko.observable("");
        out.gender = ko.observable("");
        out.notes = ko.observable("");
        out.tasks = ko.observableArray([]);
    }
});

var taskRunFactory = sko.extendProto( sko.factory, {
    computed: {
        started: function(){
            var first = this.checkpoints()[0];
            return first && !!first.startTime();
        },
        finished: function(){
            var last = _.last( this.checkpoints() );
            return last && !!last.endTime();
        },
        running: function(){
            return this.started() && !this.finished();
        },
        waiting: function(){
            return !this.started();
        }
    },
    setObservables: function(out){
        out.checkpoints = ko.observableArray([]);
    },

    constructFromPlain: function(plain){
        var out = this.construct();

        out.checkpoints( plain.checkpoints.map(function(checkpoint){
            //return checkpoint;
            return checkpointRunFactory.constructFromPlain(checkpoint);
        }) );
        return out;
    }
});


var checkpointRunFactory =  sko.extendProto( sko.factory, {
    computed: {
        started: function(){
            return !!this.startTime();
        },
        finished: function(){
            return !!this.endTime();
        },
        running: function(){
            return this.started() && !this.finished();
        },
        waiting: function(){
            return !this.started();
        }
    },
    setObservables: function(out){
        out.endTime = ko.observable(null);
        out.startTime = ko.observable(null);
        out.notes = ko.observable("");
    }
});


$(function($, window,sharejs){
    "use strict";
    var parameters = JSON.parse( $("#params").html() );

    var runId = parameters.runId;
    var experimentDocRef = "experiment."+parameters.id;

    sharejs.open(experimentDocRef, "json", function(error, experiment){
        window.doc = experiment;

        var experimentViewModel = window.expko = experimentRunView.construct();

        var experimentKo = experimentsFactory.construct();

        var expSync =sko.sync( experimentKo, experiment);

        experimentViewModel.experiment(experimentKo);

        sharejs.open(experimentDocRef+".run."+runId, "json", function(error, experimentRun){

            var experimentRunKo = experimentCompleteRunFactory.construct();

            var sync =sko.sync( experimentRunKo, experimentRun, function(plain, key, path){
                console.log("SOMETHING IS HAPPENING!");
                console.log(arguments);

                if (path[0] === "tasks" && path.length <= 1){
                    var taskId = path[1] || key;
                    //return plain;
                    return taskRunFactory.constructFromPlain(plain);
                }
                return plain;
            } );

            sync.synchronize();
            expSync.synchronize();

            experimentKo.runId(runId);

            experimentViewModel.experimentRun(experimentRunKo);

            ko.applyBindings(experimentViewModel);

        });
    });
}.bind(window,jQuery,window,sharejs));