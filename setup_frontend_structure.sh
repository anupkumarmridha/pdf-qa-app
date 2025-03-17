#!/bin/bash

# Navigate to the frontend directory
cd frontend || { echo "Frontend directory doesn't exist!"; exit 1; }

# Create the directory structure
mkdir -p src/components
mkdir -p src/pages
mkdir -p src/services
mkdir -p src/utils



# Create component files
touch src/components/FileUpload.tsx
touch src/components/DocumentList.tsx
touch src/components/DocumentSummary.tsx
touch src/components/QuestionForm.tsx
touch src/components/AnswerDisplay.tsx
touch src/components/SourcesList.tsx
touch src/components/Layout.tsx
touch src/components/Navbar.tsx

# Create page files
touch src/pages/HomePage.tsx
touch src/pages/DocumentPage.tsx
touch src/pages/QAPage.tsx
touch src/pages/NotFoundPage.tsx

# Create service files
touch src/services/api.ts
touch src/services/documentService.ts
touch src/services/qaService.ts

# Create utils file
touch src/utils/helpers.ts


# Create config files
touch .env.example

echo "Frontend directory structure created successfully!"