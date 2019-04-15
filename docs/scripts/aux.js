var colormap = d3.interpolateYlGn;
var activeBlocksList = [];
var activeFunctionName = "main";
var curTimeStep = 0;

var animateStop = false;
var animationRunning = false;
var clicked = false;
var clickTarget = null;


// Get color from palette
function getColor(fnCov) {
    return colormap(fnCov/100); 
}

// Remove an SVG element given the name
function removeElement(element) {
    d3.select(element).selectAll("*").remove();
}

// Perform the loading operations in sources and call the operation function
function loadDataset(sources, operation) {
    Promise.all(sources)
        .then(operation)
        .catch(function(err) {
            console.log(err);
        });
}

// Prepare the slider
function initializeSlider(data) {
    document.getElementById("range").max=Object.keys(data).length-1;
    document.getElementById("range").min=0;
    document.getElementById("range").defaultValue=0;
    document.getElementById("range").disabled=null;
    document.getElementById("button").disabled=null;
}

// Find function block list
function getBlockList(data, func_name) {
    var funcs = data["children"];
    for (let func of funcs) {
        if (func["name"] == func_name) {
            return func["active_blocks"]
        }
    }
}

// Get total coverage at each time step. Cache the results, it's a bit slow
function getTotalCoverage(all_generations) {
  var result = [{"ts": 0, "total": 0}];
  var funcs;
  var idx=1;
  for (gen in all_generations) {
    let funcs = all_generations[gen]["children"];
    this_gen_count = 0;
    for (let func of funcs) { this_gen_count += func["active_blocks"].length } // TODO: reduce instead
    var this_gen = {"ts": idx, "total": this_gen_count};
    result.push(this_gen);
    idx += 1;
  }
  return result;
}

// Change the current time step value shown under the slider
function changeSliderShownValue(curStep) {
    document.getElementById("animation_info") .innerHTML=
        "Showing input " + 
        curStep + "/ " + 
        document.getElementById("range").max;
}
