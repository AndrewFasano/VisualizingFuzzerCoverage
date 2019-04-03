import json
from ruamel import yaml

# Data files
yaml_file = "/Users/talhaparacha/Downloads/CS7250_visualizing_coverage/data/memdjpeg_coverage/data_89.yaml"
json_file = "/Users/talhaparacha/Downloads/mapping.json"


def get_function_coverage(function, step, cumulative = True):
    active_func_blocks = set()
    start_step = step
    if cumulative:
        start_step = 0
    for s in range(start_step, step):
        active_blocks = timeBlocksMapping[s]
        for block in list(dict.fromkeys(active_blocks)):
            if block in blockFunctionMapping and function in blockFunctionMapping[block]:
                active_func_blocks.add(block)
    return len(active_func_blocks) / len(functionBlockMapping[function]), ' '.join(hex(v) for v in active_func_blocks)


# Parse data files
with open(yaml_file, 'r') as fp:
    yaml_mapping_data = yaml.load(fp)
timeBlocksMapping = dict()
startStep = 0
for key in sorted(yaml_mapping_data.keys()):
    timeBlocksMapping[startStep] = yaml_mapping_data[key]
    startStep += 1

with open(json_file, "r") as read_file:
    json_mapping_data = json.load(read_file)

# Generate dictionaries
totalSteps = len(timeBlocksMapping)
functionBlockMapping = dict()
for item in json_mapping_data:
    functionBlockMapping[item] = []
    for hex_num in json_mapping_data[item]:
        functionBlockMapping[item].append(int(hex_num, 16))

blockFunctionMapping = dict()
for function in functionBlockMapping:
    for block in functionBlockMapping[function]:
        if block not in blockFunctionMapping:
            blockFunctionMapping[block] = []
        blockFunctionMapping[block].append(function)

# Transform into html required by treemap
prologue = "id,parentId,blocks,coverage_percent,active_list\nf,\n"
html = ""
for i in range(0, totalSteps):
    prologueHtml = "<pre id=\"step" + str(i) + "\">\n"
    endHtml = "</pre>\n"
    html += prologueHtml + prologue
    for item in functionBlockMapping:
        percent, active_list = get_function_coverage(item, i)
        html += item + ",f," + str(len(functionBlockMapping[item])) + "," + str(percent) + "," + str(active_list) + "\n"
    html += endHtml
with open(yaml_file[yaml_file.rfind('/') + 1:yaml_file.rfind('.')] + ".html", "w") as f:
    f.write(html)
