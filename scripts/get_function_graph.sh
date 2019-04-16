#!/bin/bash

if [ $# -eq 3 ]
then
    echo $1
    echo $2
    echo $3
else
    echo "USAGE: ./get_function_graph.sh BINARY FUNCTION_NAME DEST_DIR"
    exit 1
fi

ORI_BIN=$1
SEL_FUN=$2
DES_DIR=$3

radare2 -q -c "e anal.jmp.tbl=true; aaa ; agfd $2 > $3/$2.dot" $1

