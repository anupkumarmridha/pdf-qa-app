# PDF QA Application

This project is a web application that allows users to upload PDF and CSV documents, ask questions based on the content of these documents, and receive answers along with the relevant facts used to generate those answers. The application also generates summaries of the uploaded documents.

## Project Structure

The project is divided into two main parts: the frontend and the backend.

### Frontend

The frontend is built using React, Vite, and Tailwind CSS. It consists of the following components:

- **DocumentUpload.jsx**: Handles the document upload functionality.
- **FileList.jsx**: Displays a list of uploaded files and their statuses.
- **QAInterface.jsx**: Provides the interface for asking questions about the documents.
- **Summary.jsx**: Shows the summary of the uploaded document.

The frontend also includes custom hooks and services for managing document state and making API calls to the backend.

### Backend

The backend is built using FastAPI and Langchain. It includes:

- **API Routes**: 
  - `documents.py`: Handles document uploads and processing.
  - `qa.py`: Manages question-answering requests.
  - `summaries.py`: Generates and retrieves summaries of documents.

- **Services**: 
  - `azure_search.py`: Interacts with Azure AI Search for indexing and querying.
  - `document_processor.py`: Processes uploaded documents.
  - `qa_chain.py`: Implements logic for answering questions.
  - `summary_generator.py`: Generates document summaries.

- **Models**: Defines data schemas for request and response validation.

## Setup Instructions

### Prerequisites

- Node.js and npm for the frontend
- Python 3.7+ for the backend
- Azure account for Azure AI Search

### Frontend Setup

1. Navigate to the `frontend` directory.
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm run dev
   ```

### Backend Setup

1. Navigate to the `backend` directory.
2. Create a virtual environment and activate it:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```
3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```
4. Run the FastAPI application:
   ```
   uvicorn app.main:app --reload
   ```

## Usage

1. Open the frontend application in your browser.
2. Upload a PDF or CSV document using the upload interface.
3. Ask questions related to the uploaded document using the QA interface.
4. View the summary of the document and the relevant facts used to generate answers.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.