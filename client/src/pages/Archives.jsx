import { useState, useEffect } from 'react';
import { Typography, Box, Paper, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import { Description, Upload, Download, Delete } from '@mui/icons-material';
import api from '../services/api';

const Archives = () => {
  const [archives, setArchives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    file_path: ''
  });

  useEffect(() => {
    fetchArchives();
  }, []);

  const fetchArchives = async () => {
    try {
      const response = await api.get('archives');
      setArchives(response.data.archives);
    } catch (error) {
      console.error('Failed to fetch archives:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setFormData({ title: '', description: '', category: '', file_path: '' });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSubmit = async () => {
    try {
      await api.post('archives', formData);
      handleClose();
      fetchArchives();
    } catch (error) {
      console.error('Failed to create archive:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this archive?')) {
      try {
        await api.delete(`archives/${id}`);
        fetchArchives();
      } catch (error) {
        console.error('Failed to delete archive:', error);
      }
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600} color="#1e293b">
          Archives
        </Typography>
        <Button
          variant="contained"
          startIcon={<Upload />}
          onClick={handleOpen}
          sx={{ bgcolor: '#1e293b', '&:hover': { bgcolor: '#334155' } }}
        >
          Upload Document
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#f8fafc' }}>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Date Uploaded</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {archives.map((file) => (
              <TableRow key={file.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Description color="action" />
                    {file.title}
                  </Box>
                </TableCell>
                <TableCell>{file.category}</TableCell>
                <TableCell>{file.description || '-'}</TableCell>
                <TableCell>{new Date(file.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <a href={file.file_path} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                    <Button size="small" startIcon={<Download />}>Download</Button>
                  </a>
                  <IconButton size="small" onClick={() => handleDelete(file.id)} color="error">
                    <Delete fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Upload Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Upload New Document</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Title"
              fullWidth
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
            <TextField
              label="Description"
              fullWidth
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={2}
            />
            <TextField
              label="Category"
              fullWidth
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            />
            <TextField
              label="File Path/URL"
              fullWidth
              value={formData.file_path}
              onChange={(e) => setFormData({ ...formData, file_path: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" sx={{ bgcolor: '#1e293b' }}>
            Upload
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Archives;