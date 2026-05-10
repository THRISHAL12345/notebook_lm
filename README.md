# 📚 NotebookLM RAG - Chat with Your Documents

A full-stack RAG (Retrieval-Augmented Generation) application inspired by Google NotebookLM. Upload any PDF document and have natural conversations with it, getting accurate answers grounded in the document's content.

## 🌟 Features

- **Multi-Format Support**: Upload PDF, TXT, or CSV files through a beautiful web interface
- **Intelligent Chunking**: Uses Recursive Character Text Splitter for optimal document segmentation
- **Vector Storage**: Leverages Qdrant vector database for efficient similarity search
- **Semantic Search**: Powered by local HuggingFace embeddings (`Xenova/all-MiniLM-L6-v2`), requiring no external paid API for embeddings
- **Fast LLM Inference**: Groq API with Llama 3.3 70B Versatile for blazing-fast answer generation
- **Context-Aware Answers**: Generates answers strictly from document content
- **Source Citations**: Every answer includes source references and content snippets
- **Real-time Chat**: Interactive chat interface with instant responses
- **Robust Networking**: Custom connection handling to perfectly manage keep-alive states with the vector database

## 🛠️ Tech Stack

### Backend
- **Node.js & Express**: RESTful API server
- **LangChain**: Document processing and RAG pipeline orchestration
- **HuggingFace Transformers**: Free, high-quality local embeddings (`Xenova/all-MiniLM-L6-v2`)
- **Groq API**: Fast LLM inference with Llama 3.3 70B Versatile
- **Qdrant**: Vector database for embeddings storage and retrieval
- **Multer**: File upload handling
- **Multiple Loaders**: PDFLoader, TextLoader, CSVLoader for different file types

### Frontend
- **Vanilla JavaScript**: Lightweight and responsive
- **HTML5 & CSS3**: Modern UI with gradient designs
- **Fetch API**: Async communication with backend

## 📋 RAG Pipeline Architecture

```
1. INGESTION
   ↓
   User uploads PDF/TXT/CSV → Appropriate Loader extracts text
   • PDFLoader for PDF files
   • TextLoader for TXT files
   • CSVLoader for CSV files

2. CHUNKING
   ↓
   RecursiveCharacterTextSplitter
   • Chunk size: 1000 characters
   • Chunk overlap: 200 characters
   • Strategy: Preserves paragraphs, sentences, and words

3. EMBEDDING
   ↓
   HuggingFace Xenova/all-MiniLM-L6-v2
   • Generates free local embeddings
   • Converts chunks to 384-dimensional vectors

4. STORAGE
   ↓
   Qdrant Vector Database
   • Each document gets its own collection
   • Metadata includes source info and document details

5. RETRIEVAL
   ↓
   Similarity Search (k=5)
   • User query → embedded → search top 5 chunks

6. GENERATION
   ↓
   Groq API with Llama 3.3 70B Versatile
   • Blazing-fast inference (up to 100+ tokens/sec)
   • Strict system prompt: answers naturally without explicitly referencing internal chunks
   • Temperature: 0.3 (factual responses)
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Docker & Docker Compose (for Qdrant)
- Groq API Key (for LLM inference) - Get it free at [console.groq.com](https://console.groq.com)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd NotebookLM-RAG
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your API keys:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   GROQ_MODEL=llama-3.3-70b-versatile
   QDRANT_URL=http://127.0.0.1:6333
   PORT=3000
   ```

4. **Start Qdrant vector database**
   ```bash
   docker-compose up -d
   ```
   
   This will start Qdrant on:
   - HTTP: `http://localhost:6333`
   - GRPC: `http://localhost:6334`

5. **Start the application**
   ```bash
   npm start
   ```

6. **Open your browser**
   ```
   http://localhost:3000
   ```

## 📖 Usage

1. **Upload a Document**
   - Click "Choose File" and select a PDF document
   - Click "Upload & Index" to process the document
   - Wait for the chunking and embedding process to complete

2. **Ask Questions**
   - Type your question in the chat input
   - Receive answers with source citations
   - Page numbers and relevant snippets are shown for each answer

3. **Upload New Document**
   - Click "Upload New Document" to start fresh
   - Previous document's context is isolated

## 🔧 API Endpoints

### Health Check
```http
GET /api/health
```
Returns server status.

### Upload Document
```http
POST /api/upload
Content-Type: multipart/form-data

Body: document (PDF file)
```
Response:
```json
{
  "success": true,
  "documentId": "uuid",
  "documentName": "filename.pdf",
  "chunksCount": 42,
  "message": "Document uploaded and indexed successfully"
}
```

### Query Document
```http
POST /api/query
Content-Type: application/json

Body:
{
  "documentId": "uuid",
  "question": "What is the main topic?"
}
```
Response:
```json
{
  "success": true,
  "answer": "The main topic is...",
  "retrievedChunks": 5,
  "sources": [
    {
      "page": 1,
      "preview": "First 150 characters of chunk..."
    }
  ]
}
```

### Get All Documents
```http
GET /api/documents
```

### Delete Document
```http
DELETE /api/documents/:documentId
```

## 📝 Chunking Strategy

This project implements **Recursive Character Text Splitter** with the following configuration:

- **Chunk Size**: 1000 characters
- **Chunk Overlap**: 200 characters
- **Separators**: Prioritizes splitting on:
  1. Paragraphs (`\n\n`)
  2. Newlines (`\n`)
  3. Sentences (`. `)
  4. Words (` `)
  5. Characters

### Why This Strategy?

1. **Context Preservation**: 200-character overlap ensures context isn't lost between chunks
2. **Semantic Integrity**: Keeps related content together by respecting natural text boundaries
3. **Optimal Retrieval**: 1000-character chunks are large enough for context but small enough for precise retrieval
4. **Better Embeddings**: Clean chunk boundaries produce more meaningful vector representations

## 🎯 Answer Quality & Grounding

The system ensures answers are grounded in the document through:

1. **Strict System Prompt**: Instructs the LLM to only use provided context
2. **Low Temperature** (0.3): Reduces hallucination and creative responses
3. **Source Attribution**: Shows exact page numbers and text snippets
4. **Explicit Refusal**: Model states "I cannot find that information" when answer isn't in context
5. **Retrieved Context**: Top 5 most relevant chunks are passed to the LLM

## 📦 Project Structure

```
NotebookLM-RAG/
├── server.js              # Express server & RAG pipeline
├── package.json           # Dependencies and scripts
├── docker-compose.yml     # Qdrant database setup
├── .env.example          # Environment variables template
├── .gitignore            # Git ignore rules
├── README.md             # Documentation
├── public/               # Frontend files
│   ├── index.html        # Main HTML
│   ├── styles.css        # Styling
│   └── app.js            # Frontend JavaScript
└── uploads/              # Temporary file storage (auto-created)
```

## 🔑 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GROQ_API_KEY` | Your Groq API key (for LLM) | Required |
| `GROQ_MODEL` | Groq model to use | `llama-3.3-70b-versatile` |
| `QDRANT_URL` | Qdrant server URL | `http://127.0.0.1:6333` |
| `PORT` | Server port | `3000` |

## 🚢 Deployment

### Deploy to Vercel/Netlify (Frontend + Backend)

1. Set up Qdrant Cloud or hosted instance
2. Add environment variables in deployment settings
3. Deploy the entire project as a Node.js application

### Deploy Qdrant

**Option 1: Qdrant Cloud**
- Sign up at [cloud.qdrant.io](https://cloud.qdrant.io)
- Create a cluster and use the provided URL

**Option 2: Self-hosted**
- Deploy Qdrant using Docker on your server
- Update `QDRANT_URL` to point to your instance

## 🧪 Testing

1. Upload a sample PDF document
2. Ask factual questions about the document
3. Ask questions not in the document (should refuse to answer)
4. Verify source citations match the document
5. Test with different document types and sizes

## 🛡️ Security Considerations

- File uploads are validated (PDF only)
- Temporary files are deleted after processing
- API endpoints validate required parameters
- Document isolation via unique collections
- No permanent file storage

## 📄 License

This project is licensed under the ISC License.

## 🙏 Acknowledgments

- Inspired by [Google NotebookLM](https://notebooklm.google.com/)
- Built with [LangChain](https://www.langchain.com/)
- Powered by [Groq](https://groq.com/) and [HuggingFace](https://huggingface.co/)
- Vector storage by [Qdrant](https://qdrant.tech/)

---

**Built with ❤️ for the RAG Assignment**
