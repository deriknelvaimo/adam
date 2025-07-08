# Adam - Local Genetic Analysis Platform

A privacy-focused genetic analysis platform that runs entirely on your local machine using local AI models.

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Setup Database**
   ```bash
   npm run db:push
   ```

3. **Start Local AI Model** (Required for analysis)
   ```bash
   # Install Ollama if you haven't already
   # https://ollama.ai/
   
   # Pull a biomedical model
   ollama pull llama3.1:8b
   
   # Start the local server
   ollama serve
   ```

4. **Start the Application**
   ```bash
   npm run dev
   ```

5. **Upload Genetic Data**
   - Open http://localhost:5000
   - Upload your CSV, JSON, or VCF genetic data file
   - The system will analyze your genetic markers locally

## Timeout Troubleshooting

If you encounter 524 timeout errors during analysis:

### **Immediate Solutions:**
1. **Reduce File Size**: The system limits analysis to 50 markers by default to prevent timeouts
2. **Check Local Model**: Ensure Ollama is running (`ollama serve`)
3. **Use Smaller Model**: Try `ollama pull llama3.1:1b` for faster processing

### **Configuration:**
- **Server Timeout**: 5 minutes per analysis
- **Client Timeout**: 5 minutes per request
- **Local LLM Timeout**: 2 minutes per marker
- **Batch Size**: 5 markers processed simultaneously

### **Performance Tips:**
- Start with small files (10-20 markers) to test
- Ensure your local model has sufficient RAM (8GB+ recommended)
- Close other applications to free up system resources
- Use a smaller model for faster processing

## File Format Support

- **CSV**: Standard genetic marker format
- **JSON**: Structured genetic data
- **VCF**: Variant Call Format
- **TXT**: Plain text genetic data

## Privacy & Security

- All analysis runs locally on your machine
- No data is sent to external servers
- Genetic data never leaves your system
- Local AI models provide clinical-grade analysis

## System Requirements

- **RAM**: 8GB+ (16GB recommended)
- **Storage**: 10GB+ free space
- **OS**: macOS, Linux, Windows
- **Node.js**: 18+ 
- **Ollama**: Latest version

## Troubleshooting

### Analysis Timeouts
- Check if Ollama is running: `curl http://localhost:11434/api/tags`
- Restart Ollama: `ollama serve`
- Try a smaller model: `ollama pull llama3.1:1b`

### Database Issues
- Reset database: `npm run db:push`
- Check DATABASE_URL environment variable

### Performance Issues
- Reduce batch size in `server/routes.ts`
- Use smaller AI model
- Increase system RAM

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## License

MIT License - See LICENSE file for details. 