// Mock authentication middleware
// In a real application, this would verify JWT tokens or session data
export function authMiddleware(req, res, next) {
  // Mock users as specified in requirements
  const mockUsers = [
    { id: "u1", role: "admin" },
    { id: "u2", role: "contributor" }
  ];

  // For demo purposes, randomly assign a user or use the first one
  // In production, this would come from actual authentication
  const user = mockUsers[Math.floor(Math.random() * mockUsers.length)];
  
  req.user = user;
  next();
}

// Optional: Middleware to require specific roles
export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (req.user.role !== role && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
} 