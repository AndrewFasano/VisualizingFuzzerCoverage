import subprocess
import json
import sys
import os

dest_dir = '../res/dotfiles'
script = './get_function_graph.sh'
mapping = json.load(open('../data/mapping.json', 'r'))
binary_dir = '../binary'

if not os.path.isdir(dest_dir):
    os.mkdir(dest_dir)

if not os.listdir(binary_dir) or len(os.listdir(binary_dir)) > 1:
    print('Please palce exactly one binary in the binary directory')
    sys.exit(1)

binary = os.path.join(binary_dir, os.listdir(binary_dir)[0])

for func in mapping:
    #  Exclude a few non relevant elements
    if '__x86.' in func or '_unknown' in func:
        continue

    print('Extracting graph for function: ' + func)
    func_wrap = 'sym.' + func
    command = script + ' ' + binary + ' ' + func_wrap + ' ' + dest_dir
    subprocess.call(command, shell=True)

