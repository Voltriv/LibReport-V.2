import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box
} from '@mui/material';

const GENRE_DEFAULTS = [
  'Fiction', 'Non-fiction', 'Science', 'Technology', 'History', 'Arts', 'Education', 'Reference', 'Research'
];

const BookFormModal = ({ open, mode = 'create', book = null, onCancel, onSubmit }) => {
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    bookCode: '',
    genre: '',
    totalCopies: 1,
    availableCopies: 1
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && book) {
        setFormData({
          title: book.title || '',
          author: book.author || '',
          isbn: book.isbn || '',
          bookCode: book.bookCode || '',
          genre: book.genre || '',
          totalCopies: book.totalCopies || 1,
          availableCopies: book.availableCopies || 1
        });
      } else {
        setFormData({
          title: '',
          author: '',
          isbn: '',
          bookCode: '',
          genre: '',
          totalCopies: 1,
          availableCopies: 1
        });
      }
      setErrors({});
    }
  }, [open, mode, book]);

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.author.trim()) {
      newErrors.author = 'Author is required';
    }
    
    if (formData.totalCopies < 1) {
      newErrors.totalCopies = 'Total copies must be at least 1';
    }
    
    if (formData.availableCopies < 0 || formData.availableCopies > formData.totalCopies) {
      newErrors.availableCopies = 'Available copies must be between 0 and total copies';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await onSubmit(formData);
      onCancel();
    } catch (error) {
      console.error('Error submitting book:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      title: '',
      author: '',
      isbn: '',
      bookCode: '',
      genre: '',
      totalCopies: 1,
      availableCopies: 1
    });
    setErrors({});
    onCancel();
  };

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth>
      <DialogTitle>
        {mode === 'create' ? 'Add New Book' : 'Edit Book'}
      </DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Title"
              value={formData.title}
              onChange={handleChange('title')}
              error={!!errors.title}
              helperText={errors.title}
              required
              fullWidth
            />
            
            <TextField
              label="Author"
              value={formData.author}
              onChange={handleChange('author')}
              error={!!errors.author}
              helperText={errors.author}
              required
              fullWidth
            />
            
            <TextField
              label="ISBN"
              value={formData.isbn}
              onChange={handleChange('isbn')}
              fullWidth
            />
            
            <TextField
              label="Book Code"
              value={formData.bookCode}
              onChange={handleChange('bookCode')}
              fullWidth
            />
            
            <FormControl fullWidth>
              <InputLabel>Genre</InputLabel>
              <Select
                value={formData.genre}
                onChange={handleChange('genre')}
                label="Genre"
              >
                <MenuItem value="">
                  <em>Select a genre</em>
                </MenuItem>
                {GENRE_DEFAULTS.map((genre) => (
                  <MenuItem key={genre} value={genre}>
                    {genre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Total Copies"
                type="number"
                value={formData.totalCopies}
                onChange={handleChange('totalCopies')}
                error={!!errors.totalCopies}
                helperText={errors.totalCopies}
                inputProps={{ min: 1 }}
                sx={{ flex: 1 }}
              />
              
              <TextField
                label="Available Copies"
                type="number"
                value={formData.availableCopies}
                onChange={handleChange('availableCopies')}
                error={!!errors.availableCopies}
                helperText={errors.availableCopies}
                inputProps={{ min: 0, max: formData.totalCopies }}
                sx={{ flex: 1 }}
              />
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : (mode === 'create' ? 'Add Book' : 'Update Book')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default BookFormModal;
