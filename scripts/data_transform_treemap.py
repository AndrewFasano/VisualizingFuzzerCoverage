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
coverage_data = json.load((open(coverage, 'r')))

# Load data mapping functions to blocks (created by map_fns_to_blocks.py)
mappings_data = json.load(open(mappings, "r"))

# Create dict mapping function names to metadata and block list
functionDetails = {}
for fn, blocks in mappings_data.items():
    if fn == "_unknown" or fn.startswith("__x86."): 
        # Skip functions missunderstood by ghidra analysis
        continue

    functionDetails[fn] = {
            "length": len(blocks),
            "blocks": [int(x, 16) for x in mappings_data[fn]]
            }

# Create mapping from blocks to function names
block_fn_mapping = {}
for function in functionDetails:
    for block in functionDetails[function]["blocks"]:
        block_fn_mapping[block] = function


########################
# Generate json output #
#######################
# Transform into json as follows for d3
"""
{0: {
        fun1: {"name": fun1, "blocks": X, "coverage_percent": Y, active_blocks: [0x1,0x2...]},
        fun2: {"name": fun2, "blocks": X, "coverage_percent": Y, active_blocks: [0x1,0x2...]}
    },
1: {
        fun2: {"name": fun2, "blocks": X, "coverage_percent": Y, active_blocks: [0x1,0x2...]}
   }
...
}
"""

# Non-cumulative
"""
output = {}
for timestep, time_blocks_mapping in enumerate([coverage_data[k] for k in sorted(coverage_data.keys())]):
    this_ts_fns = {}

    for block in time_blocks_mapping:
        # Find each function for this time
        try:
            fn = block_fn_mapping[block]
        except KeyError: # Skip ignored functions
            continue

        if fn not in this_ts_fns:
            this_ts_fns[fn] = {"active_blocks": [], "name": fn}

        this_ts_fns[fn]["active_blocks"].append(block)
    # End each block loop
    for covered_fn in this_ts_fns.keys():
        this_ts_fns[covered_fn]["blocks"] = functionDetails[covered_fn]["length"]
        this_ts_fns[covered_fn]["coverage_percent"] = \
                int(len(this_ts_fns[covered_fn]["active_blocks"])/functionDetails[covered_fn]["length"] * 100)
        
    output[timestep] = this_ts_fns
"""

# Cumulative
output = {}
for timestep, time_blocks_mapping in enumerate([coverage_data[k] for k in sorted(coverage_data.keys())]):
    this_ts_fns = {}

    for block in time_blocks_mapping:
        # Find each function for this time
        try:
            fn = block_fn_mapping[block]
        except KeyError: # Skip ignored functions
            continue

        if fn not in this_ts_fns:
            old_blocks = set()
            if timestep > 0 and fn in output[timestep-1]:
                old_blocks = set(output[timestep-1][fn]["active_blocks"])

            this_ts_fns[fn] = {"active_blocks": old_blocks, "name": fn}

        this_ts_fns[fn]["active_blocks"].add(block)
    # End each block loop
    for covered_fn in this_ts_fns.keys():
        this_ts_fns[covered_fn]["blocks"] = functionDetails[covered_fn]["length"]
        this_ts_fns[covered_fn]["active_blocks"] = list(this_ts_fns[covered_fn]["active_blocks"]) # Make it a list
        this_ts_fns[covered_fn]["coverage_percent"] = \
                int(len(this_ts_fns[covered_fn]["active_blocks"])/functionDetails[covered_fn]["length"] * 100)
        
    output[timestep] = this_ts_fns

# Actually output the file to disk
json.dump(output, indent=2, fp=open(outfile, "w"))
