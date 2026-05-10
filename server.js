import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { CSVLoader } from "langchain/document_loaders/fs/csv";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/hf_transformers";
import { QdrantVectorStore } from "@langchain/qdrant";
import Groq from "groq-sdk";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { QdrantClient } from "@qdrant/js-client-rest";

// Initialize a custom Qdrant client with Connection: close to prevent keep-alive socket errors
const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL || "http://127.0.0.1:6333",
  fetch: (input, init) => {
    return fetch(input, {
      ...init,
      headers: { ...init?.headers, Connection: "close" },
    });
  },
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Configure multer for file uploads
const upload = multer({ dest: "uploads/" });

// Store document metadata
const documentStore = new Map();

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

// Upload and index document endpoint
app.post("/api/upload", upload.single("document"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = req.file.path;
    const originalName = req.file.originalname;
    const documentId = uuidv4();
    const fileExtension = path.extname(originalName).toLowerCase();

    console.log(`Processing document: ${originalName}`);

    // Load document based on file type
    let loader;
    let rawDocs;

    if (fileExtension === ".pdf") {
      loader = new PDFLoader(filePath);
      rawDocs = await loader.load();
    } else if (fileExtension === ".txt") {
      loader = new TextLoader(filePath);
      rawDocs = await loader.load();
    } else if (fileExtension === ".csv") {
      loader = new CSVLoader(filePath);
      rawDocs = await loader.load();
    } else {
      fs.unlinkSync(filePath);
      return res.status(400).json({ 
        error: "Unsupported file type. Please upload PDF, TXT, or CSV files." 
      });
    }

    // Chunking Strategy: Recursive Character Text Splitter
    // This splits text into chunks while trying to keep paragraphs, sentences, and words together
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const docs = await textSplitter.splitDocuments(rawDocs);
    console.log(`Document split into ${docs.length} chunks`);

    // Add document ID to metadata
    docs.forEach((doc) => {
      doc.metadata.documentId = documentId;
      doc.metadata.originalName = originalName;
    });

    // Create embeddings using free HuggingFace model
    const embeddings = new HuggingFaceTransformersEmbeddings({
      model: "Xenova/all-MiniLM-L6-v2",
    });

    // Store in Qdrant vector database
    const collectionName = `doc_${documentId}`;
    await QdrantVectorStore.fromDocuments(docs, embeddings, {
      client: qdrantClient,
      collectionName: collectionName,
    });

    // Store document metadata
    documentStore.set(documentId, {
      id: documentId,
      name: originalName,
      collectionName: collectionName,
      uploadedAt: new Date().toISOString(),
      chunksCount: docs.length,
    });

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    console.log(`Document indexed successfully: ${documentId}`);

    res.json({
      success: true,
      documentId: documentId,
      documentName: originalName,
      chunksCount: docs.length,
      message: "Document uploaded and indexed successfully",
    });
  } catch (error) {
    console.error("Error processing document:", error);
    res.status(500).json({
      error: "Failed to process document",
      details: error.message,
    });
  }
});

// Query endpoint
app.post("/api/query", async (req, res) => {
  try {
    const { documentId, question } = req.body;

    if (!documentId || !question) {
      return res.status(400).json({
        error: "Missing required fields: documentId and question",
      });
    }

    const docMetadata = documentStore.get(documentId);
    if (!docMetadata) {
      return res.status(404).json({
        error: "Document not found. Please upload a document first.",
      });
    }

    console.log(`Processing query for document: ${docMetadata.name}`);
    console.log(`Question: ${question}`);

    // Create embeddings using free HuggingFace model (same as upload)
    const embeddings = new HuggingFaceTransformersEmbeddings({
      model: "Xenova/all-MiniLM-L6-v2",
    });

    // Connect to existing collection
    const vectorStore = await QdrantVectorStore.fromExistingCollection(
      embeddings,
      {
        client: qdrantClient,
        collectionName: docMetadata.collectionName,
      }
    );

    // Retrieve relevant chunks
    const retriever = vectorStore.asRetriever({
      k: 5, // Retrieve top 5 most relevant chunks
    });

    const relevantChunks = await retriever.invoke(question);
    console.log(`Retrieved ${relevantChunks.length} relevant chunks`);

    // Generate answer using Groq
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    const contextText = relevantChunks
      .map((chunk) => chunk.pageContent)
      .join("\n\n---\n\n");

    const systemPrompt = `You are an expert AI assistant that answers questions based strictly on the provided document context.

IMPORTANT RULES:
- Only answer based on the information in the context provided below.
- If the answer cannot be found in the context, clearly state "I cannot find that information in the provided document".
- Provide the answer in a natural, conversational, and highly readable format.
- DO NOT use phrases like "According to the provided document" or "As stated in Chunk X". Just give the direct answer seamlessly.
- Synthesize the information elegantly. Format your output with markdown, using bullet points or bold text if it improves readability.
- Be accurate and do not make up information or use your general knowledge.

CONTEXT FROM DOCUMENT:
${contextText}`;

    const response = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: question,
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent, factual responses
      max_tokens: 1024,
    });

    const answer = response.choices[0].message.content;
    console.log("Answer generated successfully");

    res.json({
      success: true,
      answer: answer,
      retrievedChunks: relevantChunks.length,
      sources: relevantChunks.map((chunk) => ({
        page: chunk.metadata.loc?.pageNumber || "N/A",
        preview: chunk.pageContent.substring(0, 150) + "...",
      })),
    });
  } catch (error) {
    console.error("Error processing query:", error);
    res.status(500).json({
      error: "Failed to process query",
      details: error.message,
    });
  }
});

// Get all documents endpoint
app.get("/api/documents", (req, res) => {
  const documents = Array.from(documentStore.values());
  res.json({ documents });
});

// Delete document endpoint
app.delete("/api/documents/:documentId", async (req, res) => {
  try {
    const { documentId } = req.params;
    const docMetadata = documentStore.get(documentId);

    if (!docMetadata) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Note: In a production environment, you would also delete the collection from Qdrant
    documentStore.delete(documentId);

    res.json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting document:", error);
    res.status(500).json({
      error: "Failed to delete document",
      details: error.message,
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 NotebookLM RAG Server running on http://localhost:${PORT}`);
  console.log(`📊 Make sure Qdrant is running on ${process.env.QDRANT_URL || "http://127.0.0.1:6333"}`);
  console.log(`\n📄 Upload a document and start chatting!\n`);
});
