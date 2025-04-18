#!/bin/bash

# Install curl
apt-get update && apt-get install -y curl

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install pip in the virtual environment
curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py
python get-pip.py
rm get-pip.py

# Install requirements
pip install -r requirements.txt

# Start Flask application
python main_flask.py