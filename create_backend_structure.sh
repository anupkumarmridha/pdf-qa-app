#!/bin/bash

# Create the main backend directory
mkdir -p backend

# Create the app directory and its structure
mkdir -p backend/app
mkdir -p backend/app/core
mkdir -p backend/app/api/routes
mkdir -p backend/app/api/models
mkdir -p backend/app/utils

# Create the uploads directory
mkdir -p backend/uploads

# Create empty __init__.py files
touch backend/app/__init__.py
touch backend/app/core/__init__.py
touch backend/app/api/__init__.py
touch backend/app/api/routes/__init__.py
touch backend/app/api/models/__init__.py
touch backend/app/utils/__init__.py

# Create empty placeholder files
touch backend/app/dependencies.py
touch backend/app/api/models/document.py
touch backend/app/api/models/qa.py

# Create main Python files (these will be empty but should be filled with code later)
touch backend/app/main.py
touch backend/app/config.py
touch backend/app/core/document_processor.py
touch backend/app/core/azure_search.py
touch backend/app/core/qa_chain.py
touch backend/app/core/summarizer.py
touch backend/app/api/routes/documents.py
touch backend/app/api/routes/qa.py
touch backend/app/utils/helpers.py

# Create other files
touch backend/.env.template
touch backend/requirements.txt
touch backend/README.md

echo "Backend directory structure created successfully!"


