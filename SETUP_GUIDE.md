# 🚀 Complete Setup Guide

This guide will walk you through setting up and running the NotebookLM RAG application.

## Prerequisites

Before you begin, ensure you have:

1. **Node.js** (v18 or higher)
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify: `node --version`

2. **Docker Desktop** (for Qdrant)
   - Download from [docker.com](https://www.docker.com/products/docker-desktop/)
   - Verify: `docker --version`

3. **OpenAI API Key**
   - Sign up at [platform.openai.com](https://platform.openai.com/)
   - Create an API key from the dashboard

## Step-by-Step Setup

### 1. Configure Environment Variables

Open the `.env` file and replace the placeholder with your actual OpenAI API key:

```env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
QDRANT_URL=http://localhost:6333
PORT=3000
```

**Important**: Never commit the `.env` file to Git!

### 2. Start Qdrant Vector Database

Open a terminal and run:

```bash
docker-compose up -d
```

This will:
- Pull the Qdrant Docker image (first time only)
- Start Qdrant on ports 6333 and 6334
- Create a `qdrant_storage` directory for persistent data

Verify Qdrant is running:
```bash
docker ps
```

You should see the `qdrant/qdrant` container running.

**Qdrant Web UI**: Open [http://localhost:6333/dashboard](http://localhost:6333/dashboard) to view the Qdrant dashboard.

### 3. Start the Application

In a new terminal, run:

```bash
npm start
```

You should see:
```
🚀 NotebookLM RAG Server running on http://localhost:3000
📊 Make sure Qdrant is running on http://localhost:6333

📄 Upload a document and start chatting!
```

### 4. Open the Application

Open your browser and navigate to:
```
http://localhost:3000
```

## Testing the Application

### Test Document Examples

You can test with any PDF document. Here are some suggestions:

1. **Research Papers**: Upload a scientific paper and ask about methodology
2. **User Manuals**: Upload a product manual and ask how-to questions
3. **Reports**: Upload a business report and ask for summaries
4. **Books**: Upload a chapter and ask comprehension questions

### Sample Questions to Try

After uploading a document, try these types of questions:

- **Factual**: "What is the main topic of this document?"
- **Specific**: "What are the key findings mentioned on page 3?"
- **Analytical**: "What methodology was used in this study?"
- **Summary**: "Can you summarize the conclusion section?"
- **Details**: "What examples are provided to support the argument?"

### Testing Answer Grounding

Try asking questions that are NOT in the document:
- "What is the capital of France?" (if not in your document)
- The system should respond: "I cannot find that information in the provided document"

## Troubleshooting

### Issue: "Cannot connect to Qdrant"

**Solution**:
1. Check if Docker is running: `docker ps`
2. If Qdrant isn't running, start it: `docker-compose up -d`
3. Check logs: `docker-compose logs qdrant`

### Issue: "OpenAI API error"

**Solutions**:
1. Verify your API key in `.env` is correct
2. Check you have credits on your OpenAI account
3. Ensure no spaces before/after the API key

### Issue: "Port already in use"

**Solution**:
Change the PORT in `.env` to a different number (e.g., 3001):
```env
PORT=3001
```

### Issue: "File upload fails"

**Solutions**:
1. Ensure you're uploading a PDF file
2. Check file size (very large files may take time)
3. Check console for error messages

### Issue: Dependencies installation failed

**Solution**:
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

## Development Mode

For development with auto-restart on file changes:

```bash
npm run dev
```

## Production Deployment

### Using Vercel

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Set up Qdrant Cloud:
   - Sign up at [cloud.qdrant.io](https://cloud.qdrant.io)
   - Create a cluster
   - Get your cluster URL

3. Deploy:
   ```bash
   vercel
   ```

4. Add environment variables in Vercel dashboard:
   - `OPENAI_API_KEY`: Your OpenAI key
   - `QDRANT_URL`: Your Qdrant Cloud URL
   - `PORT`: 3000

### Using Other Platforms

The application can be deployed to:
- **Heroku**: Use the Node.js buildpack
- **Railway**: Connect your GitHub repo
- **DigitalOcean App Platform**: Deploy from Git
- **Render**: Use the Node.js environment

**Important**: Always use a hosted Qdrant instance (Qdrant Cloud) for production, not Docker.

## Stopping the Application

### Stop the Node.js server
Press `Ctrl+C` in the terminal where `npm start` is running

### Stop Qdrant
```bash
docker-compose down
```

To stop and remove all data:
```bash
docker-compose down -v
```

## Monitoring

### Check Qdrant Collections

Visit the Qdrant dashboard:
```
http://localhost:6333/dashboard
```

You'll see:
- All collections (one per document)
- Number of vectors
- Collection metadata

### Application Logs

The server logs show:
- Document upload progress
- Chunking information
- Query processing
- Retrieval results
- Any errors

## Performance Tips

1. **Chunk Size**: Adjust in `server.js` if needed
   ```javascript
   chunkSize: 1000,      // Increase for more context per chunk
   chunkOverlap: 200,    // Increase for better continuity
   ```

2. **Retrieval Count**: Adjust k value for more/fewer chunks
   ```javascript
   const retriever = vectorStore.asRetriever({
     k: 5  // Increase to retrieve more context
   });
   ```

3. **Model Selection**: Change in `server.js`
   ```javascript
   model: "gpt-4o-mini"  // Or "gpt-4o" for better quality
   ```

## Security Best Practices

1. **Never commit `.env` file** - Already in `.gitignore`
2. **Keep dependencies updated**: `npm update`
3. **Use environment variables** for all secrets
4. **Validate file uploads** - Already implemented
5. **Rate limiting** - Consider adding for production

## Next Steps

1. ✅ Set up the application (you're here!)
2. 📤 Upload your first document
3. 💬 Ask questions and test the responses
4. 🚀 Deploy to production
5. 📊 Monitor usage and optimize

## Support

If you encounter issues:
1. Check this guide's troubleshooting section
2. Review the main README.md
3. Check the console for error messages
4. Verify all prerequisites are installed

---

**Happy Building! 🎉**
