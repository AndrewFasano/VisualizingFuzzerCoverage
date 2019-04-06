var activeFunctionName;
var colormap = d3.interpolateBuGn;

var animateStop = false;
var animationRunning = false;


// Define color palette
function genColor(fn_coverage) {
    return colormap(+fn_coverage.coverage_percent/100);
}

// Remove an SVG element given the name
function removeTreeMap(element) {
  d3.select(element).selectAll("*").remove();
}

// Perform the loading operations in sources and call the operation function
function loadDataset(sources, operation){
    Promise.all(sources)
        .then(operation(results))
        .catch(function(err) {
            console.log(err);
        });
}
