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

var digraph;
var render;

// SVG SETUP

var svg = d3.select("svg");
var gGraph = d3.select("svg")
    .append("g")
    .attr("id", "graph")
    .attr('width', width)
    .attr('height', height)
    .attr("transform", "translate(" + width + ", 0)");


// HELPER FUNCTIONS


// LOADING DATA

req = new XMLHttpRequest();
req.open(
    "GET",
    "https://raw.githubusercontent.com/ClonedOne/exp_nbs/master/res/main_compressed.dot",
    true
);

// Given the size of the .dot file we load the data asynchronously
req.onload = function (e){
    var raw_data = req.responseText;
    render(raw_data);
};

req.send();


// ZOOM

var zoom = d3.zoom()
    .on("zoom", function() {
        gGraph.attr("transform", d3.event.transform);
    });
svg.call(zoom);


// GRAPH RENDER

function render(raw_data){

    digraph = graphlibDot.read(raw_data);
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

}
