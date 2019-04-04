// Globals to access from function_coverage.js script
var activeFunctionName;
var activeBlocksList;
var mdata_url = "https://raw.githubusercontent.com/ClonedOne/cov_host/master/treemap_data.json";
var mdata = {};
var animateStop = false;
var animationRunning = false;

// First we load our map data asynch
function loadDataset(){
    // This will take some time
    Promise.all(
        [d3.json(mdata_url)]
    ).then(function(results) {
        mdata = results[0];
        initializeTreemap();
    }).catch(function(err) {
        console.log(err);
    });
}

// Define color palette for the tree map
function genColor(fn_coverage) {
  if (fn_coverage.coverage_percent !== undefined) {
    return d3.interpolateYlGn(Number(fn_coverage.coverage_percent)/100);
    // return d3.interpolateRgb("#ffffff", "#008000")(Number(data.coverage_percent));
  } else {
    // return d3.interpolateRgb("#ffffff", "#008000")(0);
    return d3.interpolateYlGn(0);
  }
}

// Draw a new tree map from scratch
function drawTreeMap() {
  removeTreeMap();
  data_step_number = document.getElementById("range").value;

  // Fill to height of container
  vWidth = +d3.select("#treemap").style('width').slice(0, -2)
  vHeight = +d3.select("#treemap").style('height').slice(0, -2)

  // Prepare our physical space
  d3.select('svg#treemap').append('g').attr("id", "treemap");
  g = d3.select('g#treemap').attr('width', vWidth).attr('height', vHeight);

  // Load parsed data and visualize a tree map
  vData = mdata[data_step_number];
  vData = d3.hierarchy(vData);

  drawViz(vData);
}

// Modify tree map if the range slider value changed
function modifyTreeMap() {
  data_step_number = document.getElementById("range").value;
  document.getElementById("animation_info").innerHTML=
    "Showing input " + data_step_number + "/ " + document.getElementById("range").max;

  vData = mdata[data_step_number];
  vData = d3.hierarchy(vData);
  var vRoot = d3.hierarchy(vData);
  var vNodes = vRoot.descendants();

  // Change color
  d3.selectAll('.box').data(vNodes).style("fill", function (d) {
    return genColor(d.data.data);
  });

  // Update values for vars if needs be
  if (d3.select('.activeBox').data()[0]) {
    activeBlocksList = d3.select('.activeBox').data()[0].data.active_list
  }
  if (d3.select('#hoverBox').data()[0]) {
    d3.select(".tooltip").text(d3.select('#hoverBox').data()[0].data.data.name + "(): " + d3.select('#hoverBox').data()[0].data.data.coverage_percent + "% covered");
  }

}

// Remove the treemap
function removeTreeMap() {
  d3.select("g#treemap").selectAll("*").remove();
}

function drawViz(vData) {
  console.log("DRAW VIZ");
  // Declare d3 layout
  var vLayout = d3.treemap().size([vWidth, vHeight - 25]).paddingOuter(0);

  // vRoot and vNodes are globals
  vRoot = d3.hierarchy(vData).sum(function (d) { return d.data.blocks; });
  vNodes = vRoot.descendants();
  vLayout(vRoot);
  var vSlices = g.selectAll('rect').data(vNodes).enter().append('rect');

  // Draw on screen
  vSlices.attr('x', function (d) { return d.x0; })
    .attr('y', function (d) { return d.y0; })
    .attr('width', function (d) { return d.x1 - d.x0; })
    .attr('height', function (d) { return d.y1 - d.y0; })
    .style("fill", function (d) { return genColor(d.data.data); })
    .style("stroke", "black")
    .attr('class', 'box')
    .style("stroke-width", 1)
    .on('click' , function(d) {
      d3.select(".activeBox").attr("class", "box");

      d3.select(this).attr("class", "box activeBox");
      activeFunctionName = d.data.data.name;
      activeBlocksList = d.data.data.active_blocks

      // Load graph visualization
      loadDatasets(activeFunctionName, activeBlocksList);

    })
    .on('mouseover', function (d) {
          d3.select(this).attr("id", "hoverBox");

          var height = parseFloat(d3.select(this).attr("height"))
          var width = parseFloat(d3.select(this).attr("width"))

          d3.select(".treemap_info")
            .text(d.data.data.name + "(): " + d.data.data.coverage_percent + "% covered");

          d3.select("g#treemap")
          .append("text")
          .attr("x",vWidth / 2 - 70)
          .attr("y",vHeight - 10)
          .attr("class","tooltip")
          .text(d.data.data.name + "(): " + d.data.data.coverage_percent + "% covered")
          .style('fill', 'black');
      	  d3.select(this).style("stroke", "red");
          d3.select(this).style("stroke-width", 1);

       })
       .on("mouseout",function(){
         d3.select(this).attr("id", null);

          d3.select(".tooltip").remove();
      	  d3.select(this).style("stroke", "black");
          d3.select(this).style("stroke-width", 1);
        });

}

function initializeTreemap() {
  // Prepare the slider
  document.getElementById("range").max=Object.keys(mdata).length-1;
  document.getElementById("range").min=0;
  document.getElementById("range").defaultValue=0;
  document.getElementById("range").disabled=null;
  document.getElementById("button").disabled=null;

  drawTreeMap(0);
  document.getElementById("range").oninput=modifyTreeMap;

}

// Code to handle animation by recursive calls
function runAnimate() {
    if (animateStop) {
      animateStop = false;
      return;
    }
    nextval = (+document.getElementById("range").value)+1;
    document.getElementById("range").value = nextval;
    modifyTreeMap();

    if (nextval < (+document.getElementById("range").max))
      setTimeout(runAnimate, 500);
}

// Animate the slider if button is pressed
function toggleAnimate() {
  if (animationRunning) { // clicked 'stop'
    animateStop = true;
    animationRunning = false;
    document.getElementById("button").innerHTML = "Start animation";
  }else{ // Clicked 'start'
    animationRunning = true;
    animateStop = false;
    document.getElementById("button").innerHTML = "Stop animation";
    setTimeout(runAnimate, 0);
  }
 }

// Attach animate event
document.getElementById("button").onclick=toggleAnimate;
loadDataset();
