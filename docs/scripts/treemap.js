// Globals to access from function_coverage.js script
var activeBlocksList = [];
var mdata_url = "https://raw.githubusercontent.com/ClonedOne/cov_host/master/treemap_data.json";
var mdata = {};


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

  updateCoverageMap(activeBlocksList)

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
  activeFunctionName = "main"

  // Prepare the slider
  document.getElementById("range").max=Object.keys(mdata).length-1;
  document.getElementById("range").min=0;
  document.getElementById("range").defaultValue=0;
  document.getElementById("range").disabled=null;
  document.getElementById("button").disabled=null;

  drawTreeMap(0);

  // Lookup default (main) function to get activeBlocksList
  var block_lists = vData.data["children"];
  for (var i = 0; 1 < block_lists.length; i++) {
    if (block_lists[i]["name"] == "main") {
      activeBlocksList = block_lists[i]["active_blocks"]
      break;
    }
  }

  loadDatasets("main", activeBlocksList);

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

    if (nextval < (+document.getElementById("range").max)) {
      setTimeout(runAnimate, 500);
    }else{
      animateStop = true;
      animationRunning = false;
      document.getElementById("button").innerHTML = "Restart animation";
    }
}

// Animate the slider if button is pressed
function toggleAnimate() {
  if (animationRunning) { // clicked 'stop'
    animateStop = true;
    animationRunning = false;
    document.getElementById("button").innerHTML = "Start animation";
  }else{ // Clicked 'start'
    // If was at end, restart when you click start again
    cur_val = (+document.getElementById("range").value);
    max_val = (+document.getElementById("range").max);
    if (cur_val == max_val) {
      document.getElementById("range").value = 0;
    }

    animationRunning = true;
    animateStop = false;
    document.getElementById("button").innerHTML = "Stop animation";
    setTimeout(runAnimate, 0);
  }
 }

// Attach animate event
document.getElementById("button").onclick=toggleAnimate;
loadDataset();
