// Globals to access from function_coverage.js script
var treemapData_url = "https://raw.githubusercontent.com/ClonedOne/cov_host/master/treemap_data.json";
var treemapData = {};

var tWidth;
var tHeight;

var totalCoverage;

var root;
var g;
var cg;


// Initialize the treemap elements
function initializeTreemap() {

    // Initialize the time step slider
    initializeSlider(treemapData); 
    changeSliderShownValue(curTimeStep);

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
    cg = d3.select("covgraph").attr('width', tWidth).attr('height', 200);

    // Get the list of currently covered blocks
    activeBlocksList = getBlockList(treemapData[curTimeStep], activeFunctionName);

    // draw the treemap!
    drawTreemap(treemapData[curTimeStep]);

    // Get the coverage over time
    totalCoverage = getTotalCoverage(treemapData);

    // Get coverage max and set up cov axes
    ymax = totalCoverage[totalCoverage.length-1]["total"]; // Final will have highest cov

    var yscale_ls = d3.scaleLinear()
      .range([200, 0])
      .domain([0, ymax]);

    var xscale_ls = d3.scaleLinear()
      .range([0, tWidth])
      .domain([0, totalCoverage.length-1]);

    cg.call(d3.axisLeft(yscale_ls));
    cg.call(d3.axisBottom(xscale_ls));

    // Draw line slider
    initializeLineSlider(totalCoverage);
      

    // load data for the function coverage graph
    loadDatasets(activeFunctionName, activeBlocksList);

    document.getElementById("range").oninput=modifyTreeMap;



}

// Draw the slider showing total coverage over time;
function initializeLineSlider(coverages) {
  var slider_line = d3.line()
    .x(function(cov) { return xscale_ls(cov.ts); })
    .y(function(cov) { return yscale_ls(cov.total); }) // set the y values for the line generator 

    // TODO, it's not drawing the lines
  cg.append("path")
  .datum(coverages)
  .attr("class", "line")
  .attr("d", slider_line)
  .attr("width", "2")
  .attr("stroke", "black");
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
        .style("stroke", "black")
        .style("fill", function (d) {
            return getColor(d.data["coverage_percent"])
        })
        .on('mouseover', mouseover)
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

    console.log(curData);

    // Change color
    d3.selectAll('rect').style("fill", function (d) {
        if (typeof d == 'string' || d instanceof String)
            return;

        func = d.data.name;
        for (let f of curData["children"]){
            if (f.name == func)
                return getColor(f["coverage_percent"]);
        }
    });

}


// Show function details under the treemap
var mouseover = function (d) { 
    if (clicked)
        return;

    d3.select(".treemap_info")
        .text(d.data.name + "(): " + d.data.coverage_percent + "% covered");

    d3.select(this).style("stroke", "red");
}

// Remove highlighting on mouseot
var mouseout = function (d) {
    if (clicked)
        return;

    d3.select(this).style("stroke", "black");
}

// Select a function and display the relevant graph
var mouseClick = function (d) {

    // If the user clicks a function, the selection should not fade on mouseout
    if (clicked) {

        clicked = false;
        clickTarget
            .style("stroke", "black")
            .style("stroke-width", 1);
        clickTarget = null;

    } else {

        clicked = true;
        clickTarget = d3.select(this);

        d3.select(this)
            .style("stroke", "red")
            .style("stroke-width", 3);

        // Update the data variables
        activeFunctionName = d.data.name;
        activeBlocksList = getBlockList(treemapData[curTimeStep], activeFunctionName);

        // Generate the new function graph
        loadDatasets(activeFunctionName, activeBlocksList);
    }
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

// Load the data and start the rendering
loadDataset(
    [d3.json(treemapData_url)],
    function (results) {
        treemapData = results[0];
        initializeTreemap();
    }
);
