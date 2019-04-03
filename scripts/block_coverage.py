#!/usr/bin/env python
# coding: utf-8

from collections import defaultdict, Counter

import graphviz
import string
import yaml
import json
import os

coverage_path = '../data/memdjpeg_coverage/data_14.yaml'
func_graph_path = '../data/main.dot'
mapping_path = '../data/mapping.json'

mapping = json.load(open(mapping_path, 'r'))
coverage = yaml.load(open(coverage_path, 'r'), Loader=yaml.SafeLoader)

covered_set = set()

for run, blocks in coverage.items():
    covered_set |= set(blocks)

print len(covered_set)

overlaps = Counter()

for function, blocklist in mapping.items():
    overlaps[function] = len(covered_set & set([int(b, 16) for b in blocklist]))

overlaps.most_common(10)

print sum(overlaps.values())

address_label = {}

with open(func_graph_path, 'r') as in_file:
    with open('../res/main_compressed.dot', 'w') as out_file:

        for line in in_file.readlines():

            if 'node [fillcolor=gray style=filled shape=box];' in line:
                new_line = '\tnode [fillcolor=gray style=filled];\n'

            elif 'label=' in line:
                address_g = line.split()[0]
                address_m = line.split()[0].strip().translate(None, string.punctuation)
                content = line.split('label=')[1][:-2].replace('\l', '\n').translate(None, '"')
                address_label[address_m] = content
                new_line = line.split('label=')[0] + 'label=' + address_g + ']' + os.linesep

            else:
                new_line = line

            out_file.write(new_line)


functions = [key for key in mapping.keys() if key != '_unknown']
print len(functions)

json.dump(address_label, open('../res/address_label_map.json', 'w'), indent=2)

