#!/bin/bash
cd /home/kavia/workspace/code-generation/ping-monitor-210934-210943/ping_gui_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

