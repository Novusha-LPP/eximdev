#!/bin/bash
python3 -m uvicorn app.main:app --reload --port 8100 --host 0.0.0.0
