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
var labelData;
var digraph;
var render;
var baseUrl = "https://raw.githubusercontent.com/ClonedOne/cov_host/master/dotfiles/sym.";

// SVG SETUP
var svg = d3.select("svg#graph");
var gGraph = d3.select("svg#graph")
    .append("g")
    .attr("id", "ggraph")
    .attr("class", "ggraph")
    .attr('width', width)
    .attr('height', height)
    .attr("transform", "translate(" + width + ", 0)");


// HELPER FUNCTIONS

// Load multiple files asynchronously
function loadDatasets(cur_func, block_list){
  console.log("LOADING DATA FOR " + cur_func);

    var urlGraph = baseUrl + cur_func + "_compressed.dot";
    var urlLabel = baseUrl + cur_func + "_map.json";


    // This may take some time
    Promise.all(
     [d3.text(urlGraph), d3.json(urlLabel)]
    ).then(function(files) {
        // console.log(files);
        graphRender(files[0], files[1], block_list);
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
    d3.select("svg g#ggraph").call(render, digraph);
}


// ZOOM

var zoom = d3.zoom()
    .on("zoom", function() {
        gGraph.attr("transform", d3.event.transform);
    });
svg.call(zoom);

// GRAPH RENDER
function graphRender(graphData, _labelData, initial_blocks){
  labelData = _labelData // Copy local to global
    d3.selectAll("#graph .output").remove(); // Clear any old graph

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

    // On click, add details
    gGraph.selectAll("g.node")
        .on("click", function(d) {
            var node = digraph.node(d);
            toggleBlock(d);
        });

    updateCoverageMap(initial_blocks);
}


function updateCoverageMap(covered_blocks) {
    // Color 
    console.log("UpdateCoverage with length " + covered_blocks.length);
    var s = new Set(covered_blocks);
    var filled_c = getColor(100);
    digraph.nodes().forEach(function(v) {
      var v_str = parseInt(v) // Starts with 0x so it's parsed as hex
      if (s.has(v_str)) {
        var node = digraph.node(v);
        node.class = "node covered";
      }else if (node != undefined) {
        node.class = "node";
      }

    });

    // After loop, re-render
    d3.select("svg g#ggraph").call(render, digraph);
}
