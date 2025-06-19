import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import './App.css';

// Types
interface Disaster {
  id: string;
  title: string;
  location_name: string;
  description?: string;
  tags?: string[];
  created_at: string;
  owner_id: string;
}

interface Resource {
  id: string;
  name: string;
  location_name: string;
  type: string;
  disaster_id: string;
  created_at: string;
}

interface SocialMediaPost {
  id: string;
  platform: string;
  content: string;
  author: string;
  author_verified: boolean;
  timestamp: string;
  engagement: {
    likes: number;
    retweets: number;
    replies: number;
  };
  location: string;
  verified: boolean;
}

// API configuration
const API_BASE_URL = 'http://localhost:3000';
const SOCKET_URL = 'http://localhost:3000';

function App() {
  const [disasters, setDisasters] = useState<Disaster[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [socialMedia, setSocialMedia] = useState<SocialMediaPost[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [newDisaster, setNewDisaster] = useState({
    title: '',
    location_name: '',
    description: '',
    tags: [] as string[]
  });
  
  const [newResource, setNewResource] = useState({
    name: '',
    location_name: '',
    type: '',
    disaster_id: ''
  });

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server');
    });

    newSocket.on('disaster_updated', (data) => {
      console.log('Disaster updated:', data);
      fetchDisasters(); // Refresh disasters list
    });

    newSocket.on('resources_updated', (data) => {
      console.log('Resources updated:', data);
      fetchResources(); // Refresh resources list
    });

    newSocket.on('social_media_updated', (data) => {
      console.log('Social media updated:', data);
      // Update social media feed if needed
    });

    return () => {
      newSocket.close();
    };
  }, []);

  // Fetch initial data
  useEffect(() => {
    fetchDisasters();
    fetchResources();
  }, []);

  const fetchDisasters = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/disasters`);
      setDisasters(response.data);
    } catch (err) {
      setError('Failed to fetch disasters');
      console.error('Error fetching disasters:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchResources = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/resources`);
      setResources(response.data);
    } catch (err) {
      console.error('Error fetching resources:', err);
    }
  };

  const fetchSocialMedia = async (disasterId: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/disasters/${disasterId}/social-media`);
      setSocialMedia(response.data);
    } catch (err) {
      console.error('Error fetching social media:', err);
    }
  };

  const createDisaster = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_BASE_URL}/disasters`, newDisaster);
      setDisasters([response.data, ...disasters]);
      setNewDisaster({ title: '', location_name: '', description: '', tags: [] });
    } catch (err) {
      setError('Failed to create disaster');
      console.error('Error creating disaster:', err);
    }
  };

  const createResource = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_BASE_URL}/resources`, newResource);
      setResources([response.data, ...resources]);
      setNewResource({ name: '', location_name: '', type: '', disaster_id: '' });
    } catch (err) {
      setError('Failed to create resource');
      console.error('Error creating resource:', err);
    }
  };

  const deleteDisaster = async (id: string) => {
    try {
      await axios.delete(`${API_BASE_URL}/disasters/${id}`);
      setDisasters(disasters.filter(d => d.id !== id));
    } catch (err) {
      setError('Failed to delete disaster');
      console.error('Error deleting disaster:', err);
    }
  };

  const deleteResource = async (id: string) => {
    try {
      await axios.delete(`${API_BASE_URL}/resources/${id}`);
      setResources(resources.filter(r => r.id !== id));
    } catch (err) {
      setError('Failed to delete resource');
      console.error('Error deleting resource:', err);
    }
  };

  if (loading) {
    return <div className="loading">Loading Disaster Coordination Platform...</div>;
  }

  return (
    <div className="app">
      <header className="header">
        <h1>🚨 Disaster Response Coordination Platform</h1>
        <p>Real-time disaster management and resource coordination</p>
      </header>

      {error && (
        <div className="error">
          {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      <div className="main-content">
        {/* Create Disaster Form */}
        <section className="section">
          <h2>Create New Disaster</h2>
          <form onSubmit={createDisaster} className="form">
            <div className="form-group">
              <label>Title:</label>
              <input
                type="text"
                value={newDisaster.title}
                onChange={(e) => setNewDisaster({...newDisaster, title: e.target.value})}
                required
                placeholder="e.g., Heavy Flooding in Downtown"
              />
            </div>
            <div className="form-group">
              <label>Location:</label>
              <input
                type="text"
                value={newDisaster.location_name}
                onChange={(e) => setNewDisaster({...newDisaster, location_name: e.target.value})}
                required
                placeholder="e.g., Downtown Manhattan, NYC"
              />
            </div>
            <div className="form-group">
              <label>Description:</label>
              <textarea
                value={newDisaster.description}
                onChange={(e) => setNewDisaster({...newDisaster, description: e.target.value})}
                placeholder="Describe the disaster situation..."
              />
            </div>
            <div className="form-group">
              <label>Tags:</label>
              <input
                type="text"
                value={newDisaster.tags.join(', ')}
                onChange={(e) => setNewDisaster({...newDisaster, tags: e.target.value.split(',').map(t => t.trim())})}
                placeholder="flood, emergency, evacuation (comma-separated)"
              />
            </div>
            <button type="submit" className="btn-primary">Create Disaster</button>
          </form>
        </section>

        {/* Disasters List */}
        <section className="section">
          <h2>Active Disasters ({disasters.length})</h2>
          <div className="disasters-grid">
            {disasters.map(disaster => (
              <div key={disaster.id} className="disaster-card">
                <h3>{disaster.title}</h3>
                <p><strong>Location:</strong> {disaster.location_name}</p>
                {disaster.description && <p>{disaster.description}</p>}
                {disaster.tags && disaster.tags.length > 0 && (
                  <div className="tags">
                    {disaster.tags.map(tag => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>
                )}
                <p><small>Created: {new Date(disaster.created_at).toLocaleString()}</small></p>
                <div className="card-actions">
                  <button 
                    onClick={() => fetchSocialMedia(disaster.id)}
                    className="btn-secondary"
                  >
                    View Social Media
                  </button>
                  <button 
                    onClick={() => deleteDisaster(disaster.id)}
                    className="btn-danger"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Create Resource Form */}
        <section className="section">
          <h2>Add Resource</h2>
          <form onSubmit={createResource} className="form">
            <div className="form-group">
              <label>Name:</label>
              <input
                type="text"
                value={newResource.name}
                onChange={(e) => setNewResource({...newResource, name: e.target.value})}
                required
                placeholder="e.g., Emergency Shelter"
              />
            </div>
            <div className="form-group">
              <label>Location:</label>
              <input
                type="text"
                value={newResource.location_name}
                onChange={(e) => setNewResource({...newResource, location_name: e.target.value})}
                required
                placeholder="e.g., Community Center, 123 Main St"
              />
            </div>
            <div className="form-group">
              <label>Type:</label>
              <input
                type="text"
                value={newResource.type}
                onChange={(e) => setNewResource({...newResource, type: e.target.value})}
                required
                placeholder="e.g., shelter, medical, food, transportation"
              />
            </div>
            <div className="form-group">
              <label>Disaster ID:</label>
              <select
                value={newResource.disaster_id}
                onChange={(e) => setNewResource({...newResource, disaster_id: e.target.value})}
                required
              >
                <option value="">Select a disaster</option>
                {disasters.map(disaster => (
                  <option key={disaster.id} value={disaster.id}>
                    {disaster.title}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-primary">Add Resource</button>
          </form>
        </section>

        {/* Resources List */}
        <section className="section">
          <h2>Available Resources ({resources.length})</h2>
          <div className="resources-grid">
            {resources.map(resource => (
              <div key={resource.id} className="resource-card">
                <h3>{resource.name}</h3>
                <p><strong>Type:</strong> {resource.type}</p>
                <p><strong>Location:</strong> {resource.location_name}</p>
                <p><small>Added: {new Date(resource.created_at).toLocaleString()}</small></p>
                <button 
                  onClick={() => deleteResource(resource.id)}
                  className="btn-danger"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Social Media Feed */}
        {socialMedia.length > 0 && (
          <section className="section">
            <h2>Social Media Feed</h2>
            <div className="social-media-feed">
              {socialMedia.map(post => (
                <div key={post.id} className="social-media-post">
                  <div className="post-header">
                    <span className="author">{post.author}</span>
                    <span className="platform">@{post.platform}</span>
                    <span className="timestamp">{new Date(post.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="post-content">{post.content}</p>
                  <div className="post-engagement">
                    <span>❤️ {post.engagement.likes}</span>
                    <span>🔄 {post.engagement.retweets}</span>
                    <span>💬 {post.engagement.replies}</span>
                  </div>
                  {post.verified && <span className="verified-badge">✓ Verified</span>}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <footer className="footer">
        <p>Disaster Response Coordination Platform - Real-time monitoring and resource management</p>
      </footer>
    </div>
  );
}

export default App;
