import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, Divider, Grid, Card, CardContent,
  CardActions, Chip, Alert, TextField, CircularProgress, FormControl,
  InputLabel, Select, MenuItem, Dialog, DialogTitle, DialogContent,
  DialogActions
} from '@mui/material';

import AddIcon from '@mui/icons-material/Add';
import DownloadIcon from '@mui/icons-material/Download';
import ShareIcon from '@mui/icons-material/Share';
import InstallDesktopIcon from '@mui/icons-material/InstallDesktop';
import FeedbackIcon from '@mui/icons-material/Feedback';

import { useSettings } from '../../contexts/SettingsContext';
import { apiService } from '../../services/api';

/**
 * Agora Component - Model marketplace and community hub
 */
export default function Agora() {
  const { settings } = useSettings();
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [installDialogOpen, setInstallDialogOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(null);
  const [targetProviderId, setTargetProviderId] = useState('');
  const [installingModel, setInstallingModel] = useState(false);

  // Mock categories
  const categories = [
    { id: 'all', name: 'All Models' },
    { id: 'featured', name: 'Featured' },
    { id: 'small', name: 'Small (<4GB)' },
    { id: 'medium', name: 'Medium (4-10GB)' },
    { id: 'large', name: 'Large (10+GB)' },
    { id: 'vision', name: 'Vision' },
    { id: 'embedding', name: 'Embeddings' }
  ];

  // Get available LLM providers that use Ollama
  const getOllamaProviders = () => {
    if (!settings?.llmProviders) return [];
    return settings.llmProviders.filter(p => p.type === 'ollama' && p.enabled);
  };

  // Load models from Agora
  useEffect(() => {
    const fetchModels = async () => {
      setLoading(true);
      try {
        // In a real app, you would fetch this from an API
        // For now, using mock data
        const mockModels = [
          {
            id: 'llama3-8b',
            name: 'Llama 3 8B',
            description: 'Meta\'s Llama 3 8B model, optimized for general purpose use',
            publisher: 'Meta',
            category: ['featured', 'medium'],
            tags: ['general', 'popular'],
            size: '4.8GB',
            downloads: 125684,
            rating: 4.8,
            lastUpdated: '2023-04-15',
            compatibleProviders: ['ollama', 'lmstudio'],
            installCommand: 'ollama pull llama3:8b',
            imageUrl: 'https://ollama.com/public/images/llama.png'
          },
          {
            id: 'llama3-70b',
            name: 'Llama 3 70B',
            description: 'Meta\'s largest Llama 3 model with state-of-the-art performance',
            publisher: 'Meta',
            category: ['large'],
            tags: ['powerful', 'featured'],
            size: '39.2GB',
            downloads: 87331,
            rating: 4.9,
            lastUpdated: '2023-04-15',
            compatibleProviders: ['ollama'],
            installCommand: 'ollama pull llama3:70b',
            imageUrl: 'https://ollama.com/public/images/llama.png'
          },
          {
            id: 'mixtral-8x7b',
            name: 'Mixtral 8x7B',
            description: 'Mixtral\'s powerful mixture of experts model',
            publisher: 'Mistral AI',
            category: ['featured', 'large'],
            tags: ['moe', 'powerful'],
            size: '26GB',
            downloads: 95421,
            rating: 4.7,
            lastUpdated: '2023-03-20',
            compatibleProviders: ['ollama', 'lmstudio'],
            installCommand: 'ollama pull mixtral:8x7b',
            imageUrl: 'https://ollama.com/public/images/mixtral.png'
          },
          {
            id: 'phi3-mini',
            name: 'Phi-3 Mini',
            description: 'Microsoft\'s compact but powerful Phi-3 model',
            publisher: 'Microsoft',
            category: ['small'],
            tags: ['efficient', 'fast'],
            size: '3.8GB',
            downloads: 68432,
            rating: 4.5,
            lastUpdated: '2023-04-10',
            compatibleProviders: ['ollama', 'lmstudio'],
            installCommand: 'ollama pull phi3:mini',
            imageUrl: 'https://ollama.com/public/images/phi.png'
          },
          {
            id: 'clip-vision',
            name: 'CLIP Vision',
            description: 'OpenAI\'s CLIP vision model for image understanding',
            publisher: 'OpenAI',
            category: ['vision', 'small'],
            tags: ['vision', 'multimodal'],
            size: '2.5GB',
            downloads: 54231,
            rating: 4.6,
            lastUpdated: '2023-02-28',
            compatibleProviders: ['ollama'],
            installCommand: 'ollama pull clip:vision',
            imageUrl: 'https://ollama.com/public/images/clip.png'
          },
          {
            id: 'all-minilm',
            name: 'All-MiniLM Embeddings',
            description: 'Efficient embedding model for text retrieval',
            publisher: 'Microsoft',
            category: ['embedding', 'small'],
            tags: ['embeddings', 'retrieval'],
            size: '120MB',
            downloads: 42156,
            rating: 4.4,
            lastUpdated: '2023-01-15',
            compatibleProviders: ['ollama', 'lmstudio'],
            installCommand: 'ollama pull all-minilm',
            imageUrl: 'https://ollama.com/public/images/minilm.png'
          }
        ];
        
        setModels(mockModels);
      } catch (error) {
        console.error('Failed to fetch models:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, []);

  // Filter models based on selected category and search query
  const filteredModels = models.filter(model => {
    // Filter by category
    const categoryMatch = selectedCategory === 'all' || 
      model.category.includes(selectedCategory);
    
    // Filter by search query
    const searchMatch = searchQuery === '' ||
      model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return categoryMatch && searchMatch;
  });

  // Open install dialog
  const handleInstall = (model) => {
    setSelectedModel(model);
    setInstallDialogOpen(true);
  };

  // Handle model installation
  const handleConfirmInstall = async () => {
    if (!selectedModel || !targetProviderId) return;
    
    setInstallingModel(true);
    
    try {
      // In a real app, you would call an API to install the model
      // For now, simulate installation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Success message
      console.log(`Installed ${selectedModel.name} for provider ${targetProviderId}`);
      
      // Close dialog and reset state
      setInstallDialogOpen(false);
      setSelectedModel(null);
      setTargetProviderId('');
    } catch (error) {
      console.error('Failed to install model:', error);
    } finally {
      setInstallingModel(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Agora Model Hub</Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        Welcome to Agora, the community model hub for Nexa Agents. Browse, download, and install 
        models directly to your local LLM providers.
      </Alert>
      
      {/* Search and Filter */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              variant="outlined"
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                label="Category"
              >
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Models Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredModels.length === 0 ? (
        <Alert severity="warning">
          No models found matching your criteria. Try adjusting your filters.
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {filteredModels.map((model) => (
            <Grid item key={model.id} xs={12} sm={6} md={4}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ 
                  height: 140, 
                  backgroundImage: `url(${model.imageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  bgcolor: 'action.hover'
                }} />
                
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" component="div" gutterBottom>
                      {model.name}
                    </Typography>
                    <Chip 
                      label={model.size} 
                      size="small" 
                      color={
                        parseFloat(model.size) < 5 ? 'success' : 
                        parseFloat(model.size) < 15 ? 'primary' : 
                        'warning'
                      } 
                      variant="outlined" 
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {model.description}
                  </Typography>
                  
                  <Typography variant="caption" display="block">
                    Publisher: <strong>{model.publisher}</strong>
                  </Typography>
                  
                  <Typography variant="caption" display="block" gutterBottom>
                    Downloads: {model.downloads.toLocaleString()}
                  </Typography>
                  
                  <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {model.tags.map((tag) => (
                      <Chip key={tag} label={tag} size="small" />
                    ))}
                  </Box>
                </CardContent>
                
                <Divider />
                
                <CardActions sx={{ justifyContent: 'space-between' }}>
                  <Button 
                    startIcon={<InstallDesktopIcon />}
                    variant="contained" 
                    size="small"
                    onClick={() => handleInstall(model)}
                  >
                    Install
                  </Button>
                  <Button 
                    startIcon={<ShareIcon />}
                    size="small"
                  >
                    Share
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      
      {/* Installation Dialog */}
      <Dialog 
        open={installDialogOpen} 
        onClose={() => setInstallDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Install {selectedModel?.name}</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 1 }}>
            <Typography variant="body2" paragraph>
              Select a provider to install this model to:
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Target Provider</InputLabel>
              <Select
                value={targetProviderId}
                onChange={(e) => setTargetProviderId(e.target.value)}
                label="Target Provider"
              >
                {getOllamaProviders().map((provider) => (
                  <MenuItem key={provider.id} value={provider.id}>
                    {provider.name} ({provider.baseUrl})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {selectedModel && (
              <Box sx={{ mt: 2, bgcolor: 'action.hover', p: 2, borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Installation Command:
                </Typography>
                <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                  {selectedModel.installCommand}
                </Typography>
              </Box>
            )}
            
            {getOllamaProviders().length === 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                No compatible providers found. Add and configure an Ollama provider in Settings first.
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInstallDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleConfirmInstall}
            variant="contained"
            disabled={!targetProviderId || installingModel || getOllamaProviders().length === 0}
            startIcon={installingModel && <CircularProgress size={16} />}
          >
            {installingModel ? 'Installing...' : 'Install'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
