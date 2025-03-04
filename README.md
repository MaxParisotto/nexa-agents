# Nexa Agents

A modern application for AI-powered agents with tool-use capabilities.

## Project Structure

The project has been restructured to keep all files at the root level:

```
nexa-agents/
├── public/          # Static assets
├── src/             # Source code
│   ├── components/  # React components
│   ├── contexts/    # React contexts
│   ├── routes/      # Route components
│   ├── services/    # API services
│   ├── utils/       # Utility functions
│   ├── App.jsx      # Main App component
│   └── main.jsx     # Entry point
├── package.json     # Dependencies and scripts
└── vite.config.js   # Vite configuration
```

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Open your browser and navigate to: `http://localhost:3000`

## Features

- Project management with AI assistance
- LLM benchmarking tools
- Real-time agent collaboration
- Tool-use capabilities for AI agents

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Lint code

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
