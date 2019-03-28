// GLOBALS & SETUP

var width = 800;
var height = 800;

var margin = {
  top: 20,
  left: 20,
  right: 20,
  bottom: 20
};


d3.select("svg")
    .append("g")
    .attr("id", "graph")

d3.select("g#graph")
    .attr('width', width)
    .attr('height', height)
    .attr("transform", "translate(" + width + ", 0)");


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

// GRAPH RENDER

function render(raw_data){
    d3.select("#graph")
        .graphviz()
        .renderDot(raw_data);

}
