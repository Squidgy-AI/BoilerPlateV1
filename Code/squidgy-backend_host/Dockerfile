# Choose our version of Python
FROM python:3.12

# Set up a working directory
WORKDIR /code

# Copy just the requirements into the working directory so it gets cached by itself
COPY ./requirements.txt /code/requirements.txt

# Install the dependencies from the requirements file
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Copy the vector_store.py file to the root code directory
COPY ./app/vector_store.py /code/vector_store.py
COPY ./app/roles_config.py /code/roles_config.py

# Copy the entire app directory with all files
COPY ./app /code/app

# Copy GHL directory 
COPY ./GHL /code/GHL

# Copy conversation_templates.xlsx to the code directory
COPY ./app/conversation_templates.xlsx /code/conversation_templates.xlsx

COPY ./.env /code/.env

# Tell uvicorn to start spin up our code, which will be running inside the container now
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "80"]