// Globals to access from function_coverage.js script
var treemapData_url = "https://raw.githubusercontent.com/ClonedOne/cov_host/master/treemap_data.json";
var treemapData = {};

var tWidth;
var tHeight;

var totalCoverage;

var root;
var g;

// Coverage line slider
var cg;
var xscale_ls;
var yscale_ls;

// Function coverage line slider
var fcg;
var xscale_fn;
var yscale_fn;

// Initialize the treemap elements
function initializeTreemap() {
    // Initialize the time step slider
    initializeSlider(treemapData);

    // Fill to height of container
    tWidth = +d3.select("#treemap").style('width').slice(0, -2)
    tHeight = +d3.select("#treemap").style('height').slice(0, -2)

    // Prepare our physical space
    d3.select('svg#treemap').append('g').attr("id", "treemap_body");
    g = d3.select('g#treemap_body').attr('width', tWidth).attr('height', tHeight);

    // Prepare space for line graph
    d3.select('svg#treemap').append('g').attr("id", "treemap_body");
    g = d3.select('g#treemap_body').attr('width', tWidth).attr('height', tHeight);

    // Set up slider line graph
    d3.select('svg#covgraph_container').append("g").attr("id", "covgraph");
    cg = d3.select("#covgraph").attr('width', tWidth).attr('height', 100);

    // Get the list of currently covered blocks
    activeBlocksList = getBlockList(treemapData[curTimeStep], activeFunctionName);

    // draw the treemap!
    drawTreemap(treemapData[curTimeStep]);

    // Setup data and draw line slider
    initializeLineGraph(treemapData);
    changeSliderShownValue(curTimeStep);

    // load data for the function coverage graph
    selectFunction(activeFunctionName, activeBlocksList);

    document.getElementById("range").oninput=modifyTreeMap;
}

// Set up data and draw the slider showing total
// coverage over time;
function initializeLineGraph(treemapData) {
    // Get the coverage over time
    totalCoverage = getTotalCoverage(treemapData);

    // Find maximum possible coverage for y-axis height
    ymax = 0;
    for (let func of treemapData[0]["children"]) {ymax += +func["blocks"] }

    // Set up scales
    yscale_ls = d3.scaleLinear()
      .range([100, 0])
      .domain([0, ymax]);

    xscale_ls = d3.scaleLinear()
      .range([50, tWidth])
      .domain([0, totalCoverage.length]);  // Slightly larger than 0 to hide 0 on axis

    cg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0, 100)")
      .call(d3.axisTop(xscale_ls));

    // Remove 0 tick
		cg.selectAll(".axis.x .tick")
			.each(function (d) { if (d == 0) this.remove() });



    cg.append("g")
      .attr("class", "y axis")
      .attr("transform", "translate(50, 0)")
      .call(d3.axisLeft(yscale_ls)
          .ticks(5));

    cg.append('text')
			.attr("transform", "rotate(-90)")
      .attr("y", 0)
      .attr("x", -55)
      .attr("dy", "14px")
      .style("text-anchor", "middle")
      .text("Total Coverage")

    cg.append('text')
      .attr("y", 115)
      .attr("x", "52%")
      .style("text-anchor", "middle")
      .text("Input Index");


    // Now draw the line
    var slider_line = d3.line()
      .x(function(cov) { return xscale_ls(cov.ts); })
      .y(function(cov) { return yscale_ls(cov.total); }) // set the y values for the line generator

    cg.append("path")
    .datum(totalCoverage)
    .attr("class", "line")
    .style("fill", "none")
    .style("stroke", "black")
    .attr("d", slider_line);

    // Set up brushing
    var brush = d3.brushX()
      .extent([[50, 0], [tWidth, 100]])
      .on("end", coverageChartBrushEnd)
      .on("start", coverageChartBrushStart);

    cg.append("g")
      .attr("class", "coverage-chart-brush")
      .call(brush)
      .call(brush.move, [xscale_ls.range()[0], xscale_ls.range()[1]-1]);
}

function initializeFnLineGraph(func_n) {
    // Get the coverage over time
    localCoverage = getLocalCoverage(func_n, treemapData);

    // Find maximum possible coverage for y-axis height
    var ymax = 0;
    let funcs = treemapData[0]["children"];
    for (let func of funcs) {
      if (func["name"] == func_n) {
        ymax = +func["blocks"];
        break;
      }
    }

    // Set up scales
    yscale_fn = d3.scaleLinear()
      .range([100, 0])
      .domain([0, ymax]);

    xscale_fn = d3.scaleLinear()
      .range([50, tWidth])
      .domain([0.01, localCoverage.length-1]);

    // Set up slider line graph for functions
    d3.select('svg#fncovgraph_container').append("g").attr("id", "fncovgraph");
    fcg = d3.select("#fncovgraph").attr('width', tWidth).attr('height', 100);

    fcg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0, 100)")
      .call(d3.axisTop(xscale_fn));

    fcg.append("g")
      .attr("class", "y axis")
      .attr("transform", "translate(50, 0)")
      .call(d3.axisLeft(yscale_fn)
          .ticks(5));

    fcg.append('text')
			.attr("transform", "rotate(-90)")
      .attr("y", 0)
      .attr("x", -55)
      .attr("dy", "14px")
      .style("text-anchor", "middle")
      .text("Func. Coverage")

    fcg.append('text')
      .attr("y", 115)
      .attr("x", "52%")
      .style("text-anchor", "middle")
      .text("Input Index");


    // Now draw the line
    var fun_slider_line = d3.line()
      .x(function(cov) { return xscale_fn(cov.ts); })
      .y(function(cov) { return yscale_fn(cov.total); })

    fcg.append("path")
    .datum(localCoverage)
    .attr("class", "line")
    .style("fill", "none")
    .style("stroke", "black")
    .attr("d", fun_slider_line);
}

// Event when brushing over the coverage chart starts
function coverageChartBrushStart() {
  // Remove the old line
  cg.select(".cur_timestep").remove();
  if (fcg) fcg.select(".cur_timestep").remove();
}

// Event when brushing is done over the coverage chart
function coverageChartBrushEnd() {
  inputRangeBrushed = d3.event.selection.map(xscale_ls.invert, xscale_ls);
  document.getElementById("range").min = Math.ceil(inputRangeBrushed[0]);
  document.getElementById("range").value = Math.ceil(inputRangeBrushed[0]);
  document.getElementById("range").max = Math.ceil(inputRangeBrushed[1]);

  // Do not update on the default move of the brush
  if (d3.event.selection !== null && coverageChartBrushEnd.didrun) {
    modifyTreeMap();
  } else {
    coverageChartBrushEnd.didrun = true;
  }
}

// Change the current time step value shown under the slider
function changeSliderShownValue(curStep) {
    document.getElementById("animation_info").innerHTML=
        "After " + curStep + " of " + document.getElementById("range").max + 
        " selected inputs, cumulative coverage is " + Math.round(totalCoverage[curStep]["total"]*100/ymax, 1) + "%";

    // Fist delete old TS line
    cg.selectAll(".cur_timestep").remove();
    if (fcg) fcg.select(".cur_timestep").remove();

    // Now draw the new line, if we've started animating
    if (fcg) {
      cg.append("line")
        .attr("class", "cur_timestep")
        .attr("x1", xscale_ls(curStep))
        .attr("y1", 0)
        .attr("x2", xscale_ls(curStep))
        .attr("y2", 100)

      fcg.append("line")
        .attr("class", "cur_timestep")
        .attr("x1", xscale_fn(curStep))
        .attr("y1", 0)
        .attr("x2", xscale_fn(curStep))
        .attr("y2", 100)
    }
}

// Draw that nice treemap!
function drawTreemap(curData) {

    // Compute the hierarchy and the layout positions
    root = d3.hierarchy(curData).sum(function (d) { return Math.max(5, d.blocks); });

    d3.treemap()
        .size([tWidth, tHeight])
        .padding(2)
    (root)

    // Plot the treemap
    g.selectAll("rect")
        .data(root.leaves())
        .enter()
        .append("rect")
        .attr('x', function (d) { return d.x0; })
        .attr('y', function (d) { return d.y0; })
        .attr('width', function (d) { return d.x1 - d.x0; })
        .attr('height', function (d) { return d.y1 - d.y0; })
        .attr("class", "treemap-node")
        .attr("id", function(d) { return "function_" +d["data"].name })
        .style("fill", function (d) {
            return getColor(d.data["coverage_percent"])
        })
        .on('mouseover', mouseover)
        .on("mousemove", mousemove)
        .on('mouseout', mouseout)
        .on('click', mouseClick);

    // Add labels to bigger functions
    g.selectAll("text")
        .data(root.leaves())
        .enter()
        .append("text")
        .attr("x", function(d){ return d.x0+5})    // +10 to adjust position (more right)
        .attr("y", function(d){ return d.y0+20})    // +20 to adjust position (lower)
        .text(function(d){
            if (d.data.blocks > 15)
                return d.data.name
        })
        .classed('fn_label', true);
}


// Modify tree map if the range slider value changed
function modifyTreeMap() {
    // Update the current time step value
    curTimeStep = document.getElementById("range").value;
    changeSliderShownValue(curTimeStep);

    // Update variables with current time step data
    var curData = treemapData[curTimeStep];
    activeBlocksList = getBlockList(curData, activeFunctionName);

    updateCoverageMap(activeBlocksList)

    // Change color
    g.selectAll('rect').style("fill", function (d) {
        if (typeof d == 'string' || d instanceof String)
            return;

        func = d.data.name;
        for (let f of curData["children"]){
            if (f.name == func) {
                return getColor(f["coverage_percent"]);
            }
        }
    });

}

var Tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip");

var mousemove = function(d) {
    Tooltip
        .style("left", (d3.event.pageX + 10) + "px")
        .style("top", (d3.event.pageY + 10) + "px");
};


// Show tooltip and update hovered node's css class
var mouseover = function (d) {
    // Calculate this function's current coverage as a percent
    curTimeStep = document.getElementById("range").value;
    for (let f of treemapData[curTimeStep]["children"]){
        if (f.name == d.data.name) {
            current_percent = f["coverage_percent"];
            break;
        }
    }

    Tooltip
        .html(
            "Function name: " + d.data.name +
            "<br> Coverage : " + current_percent + "%" +
            "<br> Input index : " + curTimeStep
        )
        .style("left", (d3.event.pageX + 10) + "px")
        .style("top", (d3.event.pageY + 10) + "px")
        .style("display", "block");


    // Add hover class to add highlight
    d3.select(this).classed("treemap-node-hover", true);
}

// Remove highlighting on mouseout
var mouseout = function (d) {
    d3.select(this).classed("treemap-node-hover", false);

    Tooltip
        .style("display", "none");
}

// Select a function and display the relevant graph
function mouseClick(d) {
    // Update the data variables
    activeFunctionName = d.data.name;
    activeBlocksList = getBlockList(treemapData[curTimeStep], activeFunctionName);
    // Generate the new function graph
    selectFunction(activeFunctionName, activeBlocksList);
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
        setTimeout(runAnimate, 50);
    }else{
        animateStop = true;
        animationRunning = false;
        document.getElementById("button_image").className = "button_image fas fa-play";
    }
}

// Animate the slider if button is pressed
function toggleAnimate() {
    if (animationRunning) { // clicked 'stop'
        animateStop = true;
        animationRunning = false;
        document.getElementById("button_image").className = "fas fa-play";
    }else{ // Clicked 'start'
        // If was at end, restart when you click start again
        cur_val = (+document.getElementById("range").value);
        max_val = (+document.getElementById("range").max);
        if (cur_val == max_val) {
            document.getElementById("range").value = 0;
        }

        animationRunning = true;
        animateStop = false;
        document.getElementById("button_image").className = "fas fa-pause";
        setTimeout(runAnimate, 0);
    }
}

// Attach animate event
document.getElementById("button").onclick=toggleAnimate;

// Load the data and start the rendering
loadDataset(
    [d3.json(treemapData_url)],
    function (results) {
        treemapData = results[0];
        initializeTreemap();
    }
);
