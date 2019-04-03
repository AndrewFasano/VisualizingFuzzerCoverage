// Globals to access from function_coverage.js script
var activeFunctionName;
var activeBlocksList;

// Define color palette for the tree map
color = function(data) {
  if (data.coverage_percent !== undefined) {
    return d3.interpolateYlGn(Number(data.coverage_percent));
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
  vWidth = 400;
  vHeight = 300;

  // Prepare our physical space
  d3.select('svg#treemap').append('g').attr("id", "treemap");
  g = d3.select('g#treemap').attr('width', vWidth).attr('height', vHeight);

  // Load parsed data and visualize a tree map
  vCsvData = d3.csvParse( d3.select("pre#step" + data_step_number).text() );
  vData = d3.stratify()(vCsvData);
  drawViz(vData);
}

// Modify tree map if the range slider value changed
function modifyTreeMap() {
  data_step_number = document.getElementById("range").value;
  vCsvData = d3.csvParse( d3.select("pre#step" + data_step_number).text() );
  vData = d3.stratify()(vCsvData);
  var vRoot = d3.hierarchy(vData).sum(function (d) { return d.data.blocks; });
  var vNodes = vRoot.descendants();

  // Change color
  d3.selectAll('.box').data(vNodes).style("fill", function (d) {
    return color(d.data.data);

  });

  // Update values for vars if needs be
  if (d3.select('.activeBox').data()[0]) {
    activeBlocksList = d3.select('.activeBox').data()[0].data.data.active_list
  }
  if (d3.select('#hoverBox').data()[0]) {
    d3.select(".tooltip").text(d3.select('#hoverBox').data()[0].data.data.id + "(): " + d3.select('#hoverBox').data()[0].data.data.coverage_percent*100 + "% covered");
  }

}

// Remove the treemap
function removeTreeMap() {
  d3.select("g#treemap").selectAll("*").remove();
}

function drawViz(vData) {
  // Declare d3 layout
  var vLayout = d3.treemap().size([vWidth, vHeight - 25]).paddingOuter(0);

  // Layout + Data
  var vRoot = d3.hierarchy(vData).sum(function (d) { return d.data.blocks; });
  var vNodes = vRoot.descendants();
  vLayout(vRoot);
  var vSlices = g.selectAll('rect').data(vNodes).enter().append('rect');

  // Draw on screen
  vSlices.attr('x', function (d) { return d.x0; })
    .attr('y', function (d) { return d.y0; })
    .attr('width', function (d) { return d.x1 - d.x0; })
    .attr('height', function (d) { return d.y1 - d.y0; })
    .style("fill", function (d) { return color(d.data.data); })
    .style("stroke", "black")
    .attr('class', 'box')
    .style("stroke-width", 1)
    .on('click' , function(d) {
      d3.select(".activeBox").attr("class", "box");

      d3.select(this).attr("class", "box activeBox");
      activeFunctionName = d.data.data.id
      activeBlocksList = d.data.data.active_list
    })
    .on('mouseover', function (d) {
          d3.select(this).attr("id", "hoverBox");

          var height = parseFloat(d3.select(this).attr("height"))
          var width = parseFloat(d3.select(this).attr("width"))

          d3.select("g#treemap")
          .append("text")
          .attr("x",vWidth / 2 - 70)
          .attr("y",vHeight - 10)
          .attr("class","tooltip")
          .text(d.data.data.id + "(): " + d.data.data.coverage_percent*100 + "% covered")
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

// How many steps do we have to put in the range slider
function getDataStepsCount() {
    return document.getElementsByTagName('pre').length;
}

// Prepare the slider
document.getElementById("range").max=getDataStepsCount()-1;
document.getElementById("range").min=0;
document.getElementById("range").defaultValue=0;
drawTreeMap(0);
document.getElementById("range").oninput=modifyTreeMap;

// Code to handle animation by recursive calls
function animating(current_step, all) {
  if (current_step == all) {
  	return;
  }
  else {
      document.getElementById("range").value=current_step;
      modifyTreeMap();
			setTimeout(animating, 500, current_step+1, all);
  }
}

// Animate the slider if button is pressed
function animateSlider() {
	steps = getDataStepsCount();
	setTimeout(animating, 0, 0, steps);
 }

// Attach animate event
document.getElementById("button").onclick=animateSlider;
