// GLOBALS & SETUP

var width = 800;
var height = 800;

var margin = {
    top: 20,
    left: 20,
    right: 20,
    bottom: 20
};

var initialScale = 0.30;

var sources = [];
var datasets = [];

var digraph;
var render;

var graphData;
var labelData;

// SVG SETUP

var svg = d3.select("svg");
var gGraph = d3.select("svg")
    .append("g")
    .attr("id", "graph")
    .attr('width', width)
    .attr('height', height)
    .attr("transform", "translate(" + width + ", 0)");


// HELPER FUNCTIONS

// Load multiple files asynchronously
function loadDatasets(){

    var urlGraph = "https://raw.githubusercontent.com/ClonedOne/exp_nbs/master/res/main_compressed.dot";
    var urlLabel = "https://raw.githubusercontent.com/ClonedOne/exp_nbs/master/res/address_label_map.json";

    sources.push(d3.text(urlGraph));
    sources.push(d3.json(urlLabel));

    // This will take some time
    Promise.all(
        sources
    ).then(function(files) {
        for (var i = 0; i < files.length; i++){
            datasets[i] = files[i];
        }
        graphRender();
    }).catch(function(err) {
        console.log(err);
    });

}

// Change the content of the node from label to full block
function toggleBlock(d){
    var node = digraph.node(d);
    if (node.label == d){
        node.label = labelData[d.toString()];
    }
    else{
        node.label = d;
    }

    // Smooth transition to the new layout
    digraph.graph().transition = function(selection) {
        return selection.transition().duration(500);
    };
    d3.select("svg g#graph").call(render, digraph);
}


// ZOOM

var zoom = d3.zoom()
    .on("zoom", function() {
        gGraph.attr("transform", d3.event.transform);
    });
svg.call(zoom);


// GRAPH RENDER

function graphRender(){

    graphData = datasets[0];
    labelData = datasets[1];

    digraph = graphlibDot.read(graphData);
    render = new dagreD3.render();

    // Round the corners of the nodes
    digraph.nodes().forEach(function(v) {
        var node = digraph.node(v);
        node.rx = node.ry = 5;
    });

    render(gGraph, digraph);

    // Initial zoom setting
    gGraph.call(
        zoom.transform,
        d3.zoomIdentity.translate(
            (gGraph.attr("width") - digraph.graph().width * initialScale) / 2, 20
        ).scale(initialScale)
    );
    gGraph.attr('height', digraph.graph().height * initialScale + 40);

    gGraph.selectAll("g.node")
        .on("click", function(d) {
            var node = digraph.node(d);
            toggleBlock(d);
        });

}

// START
loadDatasets();
