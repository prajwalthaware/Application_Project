import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  FormControl, 
  Select, 
  MenuItem, 
  Typography,
  Chip,
  Alert
} from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const DevUserSwitcher = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [position, setPosition] = useState({ x: window.innerWidth - 290, y: 70 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0 });

  useEffect(() => {
    // Only fetch users in development mode
    if (process.env.NODE_ENV === 'development') {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/dev/users', { withCredentials: true });
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch dev users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSwitch = async (email) => {
    try {
      await axios.post('http://localhost:3000/api/dev/switch-user', 
        { email }, 
        { withCredentials: true }
      );
      // Reload page to refresh user context
      window.location.reload();
    } catch (err) {
      console.error('Failed to switch user:', err);
      alert('Failed to switch user. Check console.');
    }
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX - position.x,
      startY: e.clientY - position.y
    };
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragRef.current.startX,
        y: e.clientY - dragRef.current.startY
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, position]);

  // Only render in development mode - return early AFTER all hooks
  if (process.env.NODE_ENV !== 'development') return null;
  if (loading || !user) return null;

  return (
    <Box sx={{ 
      position: 'fixed', 
      left: position.x,
      top: position.y,
      zIndex: 9999,
      bgcolor: 'background.paper',
      p: 2,
      borderRadius: 2,
      boxShadow: 3,
      minWidth: 250,
      cursor: isDragging ? 'grabbing' : 'default',
      userSelect: 'none'
    }}>
      <Box
        onMouseDown={handleMouseDown}
        sx={{
          cursor: 'grab',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 1,
          '&:active': {
            cursor: 'grabbing'
          }
        }}
      >
        <DragIndicatorIcon fontSize="small" sx={{ color: 'text.secondary' }} />
      </Box>
      
      <Alert severity="warning" sx={{ mb: 1, py: 0 }}>
        <Typography variant="caption" fontWeight="bold">
          DEV MODE
        </Typography>
      </Alert>
      
      <Typography variant="caption" display="block" sx={{ mb: 1, color: 'text.secondary' }}>
        Switch User (Testing)
      </Typography>
      
      <FormControl fullWidth size="small">
        <Select
          value={user.email}
          onChange={(e) => handleUserSwitch(e.target.value)}
          displayEmpty
        >
          {users.map((u) => (
            <MenuItem key={u.email} value={u.email}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ flex: 1 }}>
                  {u.name}
                </Typography>
                <Chip 
                  label={u.role === 'super_user' ? 'SUPER' : 'USER'} 
                  size="small"
                  color={u.role === 'super_user' ? 'primary' : 'default'}
                  sx={{ fontSize: '0.65rem', height: 18 }}
                />
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      
      <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
        Current: {user.email}
      </Typography>
    </Box>
  );
};

export default DevUserSwitcher;
