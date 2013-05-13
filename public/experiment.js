
$(function(){
    "use strict";

    // The following method will parse the related sigma instance nodes
    // and set their positions around a circle:
    sigma.publicPrototype.myCircularLayout = function() {
        var R = 100,
            i = 0,
            L = this.getNodesCount();

        this.iterNodes(function(n){
            n.x = Math.cos(Math.PI*(i++)/L)*R;
            n.y = Math.sin(Math.PI*(i++)/L)*R;
        });

        return this.position(0,0,1).draw();
    };

    var sigInst = window.sig = sigma.init($(".task .graph")[0]);

    var id = location.pathname.match(/\/experiment\/[^\/]+/)[0].replace("/experiment/","");


    var commonLeadString = function(str1, str2){
        var out = "";
        for (var i=0; i<str1.length && i<str2.length; i++){
            if (str1[i] === str2[i]){
                out += str1[i];
            }
            else{
                return out;
            }
        }
        return out;
    };


    sharejs.open("experiment."+id, "json", function(error, experiment){
        "use strict";
        var experimentParsed = experiment.get();

        var taskIndex = 0;
        var taskId = experimentParsed.taskOrder[taskIndex];
        var task = experimentParsed.tasks[taskId];
        var runs = task.checkpoints[0].runs;
        var runId = Object.keys(runs)[0];
        var run = runs[runId];

        var tracks = run.tracks;

        var hrefs = _.pluck(tracks, "href");
        var nodes = _.uniq(hrefs);

        var commonLead = nodes.reduce(function(previousValue, currentValue){
            return commonLeadString(previousValue, currentValue);
        },nodes[0]);


        nodes.forEach(function(node){
            sigInst.addNode(node, {
                label: node.replace(commonLead, ""),
                color: '#ff0000'
            });
        });


        hrefs.forEach(function(href, index, hrefs){
            var next = hrefs[index+1];
            if (next)
                sigInst.addEdge(index, href, next);
        });

        sigInst.drawingProperties({
            defaultLabelColor: '#ccc',
            font: 'Arial',
            edgeColor: 'source',
            defaultEdgeType: 'curve'
        }).graphProperties({
                minNodeSize: 1,
                maxNodeSize: 10
            });

        //sigInst.draw();
        sigInst.myCircularLayout();
    });
});