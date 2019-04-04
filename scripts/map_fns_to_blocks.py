# Ghidra plugin to generate a mapping of function names to basic blocks in JSON
#@author Andrew Fasano & Brendan Dolan-Gavitt
#@category CodeAnalysis
#@keybinding 
#@menupath 
#@toolbar 

from ghidra.program.model.block import BasicBlockModel
import json

bbmodel = BasicBlockModel(currentProgram)
blockIterator = bbmodel.getCodeBlocks(monitor)
block_map = {}

def add_block(fn, block):
    if fn not in block_map.keys():
         block_map[fn] = []
    block_map[fn].append(str(block))

# For each block, look through the function list until we find a match
# This is terribly inefficient (O(N^2))

while blockIterator.hasNext():
    cur_block = blockIterator.next().getMinAddress()
    function = getFirstFunction()
    found = False

    # Search functions until we find a match or run out of functions
    while function is not None:
        b = function.getBody()
        if b.contains(cur_block):
            add_block(function.getName(), cur_block)
            found=True
            break

        # Update function to next and loop again
        function = getFunctionAfter(function)

    # Done searching functions. If we never found it, add to unknown list
    if not found:
        add_block("_unknown", cur_block)

with open("mapping.json", "w") as f:
    f.write(json.dumps(block_map))
