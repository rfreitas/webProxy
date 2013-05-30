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
        out.name = ko.observable("");
        out.age = ko.observable("");
        out.gender = ko.observable("");
        out.notes = ko.observable("");
    }
});

var taskFactory = sko.extendProto( sko.factory, {
    computed: {
        started: function(){
            var first = this.checkpoints()[0];
            return first && first.run() && !!first.run().startTime();
        },
        finished: function(){
            var last = _.last( this.checkpoints() );
            return last && last.run() && !!last.run().endTime();
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

    constructFromPlainAndRunId: function(plain, runId){
        var out = this.construct();

        out.checkpoints( plain.checkpoints.map(function(checkpoint){
            //return checkpoint;
            return checkpointFactory.constructFromRun(checkpoint, runId);
        }) );
        return out;
    }
});

var checkpointFactory = sko.extendProto( sko.factory, {
    computed: {
        run: function(){
            "use strict";
            var runId = this.runId();
            return this.runs()[runId];
        }
    },
    setObservables: function(out){
        "use strict";
        out.runs = ko.observable({});
        out.runId = ko.observable(0).local();
    },
    constructFromRun: function(plain, runId){
        "use strict";
        var out = this.construct();

        var runs = _.clone( plain.runs );
        _.each(runs, function(run, runId){
            runs[runId] = checkpointRunFactory.constructFromPlain(run);
        });

        out.runs(runs);
        out.runId(runId);

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
    sharejs.open("experiment."+parameters.id, "json", function(error, experiment){
        window.doc = experiment;

        var experimentKo = window.expko = experimentsFactory.construct();


        var sync =sko.sync( experimentKo, experiment, function(plain, key, path){
            console.log("SOMETHING IS HAPPENING!");
            console.log(arguments);

            if (path[0] === "tasks" && path.length <= 1){
                var taskId = path[1] || key;
                //return plain;
                return taskFactory.constructFromPlainAndRunId(plain, runId);
            }
            else if (path[0] === "runs" && path.length <= 1){
                return experimentRunFactory.constructFromPlain(plain);
            }
            return plain;
        } );

        sync.synchronize();

        experimentKo.runId(runId);


        ko.applyBindings(experimentKo);
    });


}.bind(window,jQuery,window,sharejs));

