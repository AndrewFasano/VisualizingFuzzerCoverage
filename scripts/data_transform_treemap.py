import json

import sys

assert(len(sys.argv) == 4), "Usage: {} mappings.json coverage.json".format(sys.argv[0])

# Data files
mappings = sys.argv[1] 
coverage = sys.argv[2]
outfile  = sys.argv[3] # something.html

####################
# Parse data files #
####################

# Load data on fuzzer coverage over time (created by measure_rode0day_coverage.py)
coverage_data_s = json.load((open(coverage, 'r')))
coverage_data = {}
for k,v in coverage_data_s.items():
    coverage_data[float(k)] = v

# Load data mapping functions to blocks (created by map_fns_to_blocks.py)
mappings_data = json.load(open(mappings, "r"))

# Create dict mapping function names to metadata and block list
function_details = {}
for fn, blocks in mappings_data.items():
    if fn == "_unknown" or fn.startswith("__x86."): 
        # Skip functions missunderstood by ghidra analysis
        continue

    function_details[fn] = {
            "length": len(blocks),
            "blocks": [int(x, 16) for x in mappings_data[fn]]
            }

# Create mapping from blocks to function names
block_fn_mapping = {}
for function in function_details:
    for block in function_details[function]["blocks"]:
        block_fn_mapping[block] = function


########################
# Generate json output #
#######################
# Transform into json as follows for d3
"""
{0: {
        "children" : [
            {"name": fun1, "blocks": X, "coverage_percent": Y, active_blocks: [0x1,0x2...], "children": [] 
            {"name": fun2, "blocks": X, "coverage_percent": Y, active_blocks: [0x1,0x2...], "children": []}
        ]
    },
1: {
        "children" : [
            {"name": fun2, "blocks": X, "coverage_percent": Y, active_blocks: [0x1,0x2...], "children": []}
        ]
   }
...
}
"""

# non-cumulative (note now needs updates)
"""
output = {}
for timestep, time_blocks_mapping in enumerate([coverage_data[k] for k in sorted(coverage_data.keys())]):
    this_ts_fns = {}

    for block in time_blocks_mapping:
        # find each function for this time
        try:
            fn = block_fn_mapping[block]
        except keyerror: # skip ignored functions
            continue

        if fn not in this_ts_fns:
            this_ts_fns[fn] = {"active_blocks": [], "name": fn}

        this_ts_fns[fn]["active_blocks"].append(block)
    # end each block loop
    for covered_fn in this_ts_fns.keys():
        this_ts_fns[covered_fn]["blocks"] = function_details[covered_fn]["length"]
        this_ts_fns[covered_fn]["coverage_percent"] = \
                int(len(this_ts_fns[covered_fn]["active_blocks"])/function_details[covered_fn]["length"] * 100)
        
    output[timestep] = this_ts_fns
"""

# Assume input data is already cumulative
output = {}

timestep = 0
for ts in sorted(coverage_data.keys()):
    timestep += 1
    time_blocks_mapping = coverage_data[ts]
    this_ts_fns = {}

    for block in time_blocks_mapping:
        # Find each function for this time
        try:
            fn = block_fn_mapping[block]
        except KeyError: # Skip ignored functions
            continue

        if fn not in this_ts_fns.keys():
            this_ts_fns[fn] = {"active_blocks": set(), "name": fn, "children": []}
        """
            old_blocks = set()
            if timestep > 0 and fn in output[timestep-1]:
                old_blocks = set(output[timestep-1][fn]["active_blocks"])

            this_ts_fns[fn] = {"active_blocks": old_blocks, "name": fn, "children": []}
        """

        this_ts_fns[fn]["active_blocks"].add(block)
    # End each block loop

    for covered_fn in this_ts_fns.keys():
        this_ts_fns[covered_fn]["blocks"] = function_details[covered_fn]["length"]
        this_ts_fns[covered_fn]["active_blocks"] = list(this_ts_fns[covered_fn]["active_blocks"]) # Make it a list
        this_ts_fns[covered_fn]["coverage_percent"] = \
                int(len(this_ts_fns[covered_fn]["active_blocks"])/function_details[covered_fn]["length"] * 100)

    # Now add all uncovered functions
    covered_fn_names = this_ts_fns.keys()
    for uncovered_fn in function_details.keys():
        if uncovered_fn in covered_fn_names: continue
        this_ts_fns[uncovered_fn] = {"active_blocks": [], "coverage_percent": 0, "children": [], "name": uncovered_fn,
                                    "blocks": function_details[uncovered_fn]["length"] }

    output[timestep] = this_ts_fns

# Create coverage at time 0 to be 0
output[0] = output[1]
for k in output[0].keys():
    output[0][k]["active_blocks"] =  []
    output[0][k]["coverage_percent"] =  0

formatted_output = {}
for ts, ts_vals in output.items():
    formatted_val = {"children": [v for k,v in ts_vals.items()]} # Strip key name
    formatted_output[ts] = formatted_val


# Actually output the file to disk
json.dump(formatted_output, indent=2, fp=open(outfile, "w"))
