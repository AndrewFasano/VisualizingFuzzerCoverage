#!/usr/bin/env python
# coding: utf-8

# In[ ]:


from collections import defaultdict, Counter

import graphviz
import string
import json
import os


# In[ ]:


coverage_path = '../data/coverage.json'
func_graph_path = '../res/dotfiles'
mapping_path = '../data/mapping.json'


# In[ ]:


mapping = json.load(open(mapping_path, 'r'))


# In[ ]:


coverage = json.load(open(coverage_path, 'r'))


# In[ ]:


covered_set = set()


# In[ ]:


for run, blocks in coverage.items():
    covered_set |= set(blocks)


# In[ ]:


print(len(covered_set))


# In[ ]:


overlaps = Counter()


# In[ ]:


for function, blocklist in mapping.items():
    overlaps[function] = len(covered_set & set([int(b, 16) for b in blocklist]))


# In[ ]:


print(overlaps.most_common(10))


# In[ ]:


print sum(overlaps.values())


# In[ ]:


# Cycle through the dotfiles
for graph_file in os.listdir(func_graph_path):

    if '_compressed.dot' in graph_file or '_map.json' in graph_file:
        continue

    # Dictionary mapping the block identifier with the block content for this function
    address_label = {}

    func_graph = os.path.join(func_graph_path, graph_file)
    func_graph_compressed = os.path.join(
        func_graph_path,
        graph_file.split('.dot')[0] + '_compressed.dot'
    )
    func_map = os.path.join(
        func_graph_path,
        graph_file.split('.dot')[0] + '_map.json'
    )

    # Read the function graph file
    with open(func_graph, 'r') as in_file:

        # Open compressed output file
        with open(func_graph_compressed, 'w') as out_file:

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


    # Dump the json mapping for this function
    json.dump(address_label, open(func_map, 'w'), indent=2)


# In[ ]:


functions = [key for key in mapping.keys() if key != '_unknown' and '__x86.' not in key]
print(len(functions))


# In[ ]:





# In[ ]:




