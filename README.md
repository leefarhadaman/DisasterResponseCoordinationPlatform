# Disaster Response Coordination Platform

A real-time MERN stack application for disaster management and resource coordination. This platform aggregates data from multiple sources to aid emergency response teams in managing disasters effectively.

## 🚀 Features

- **Real-time Disaster Management**: Create, update, and monitor disasters with live updates via WebSocket
- **Resource Coordination**: Track and manage emergency resources with geospatial queries
- **Social Media Integration**: Monitor social media feeds for disaster-related posts
- **AI-Powered Location Extraction**: Use Google Gemini API to extract locations from text
- **Geospatial Queries**: Find nearby resources using PostGIS
- **Caching System**: Efficient caching with Supabase for external API calls
- **Official Updates Scraping**: Web scraping for government and NGO updates
- **Image Verification**: AI-powered image verification for social media posts

## 🛠 Tech Stack

### Backend
- **Node.js** + **Express** - Server framework
- **Socket.IO** - Real-time communication
- **Supabase** - PostgreSQL database with PostGIS
- **Pino** - Structured logging
- **Zod** - Schema validation
- **Cheerio** - Web scraping

### Frontend
- **React** + **TypeScript** - UI framework
- **Vite** - Build tool
- **Socket.IO Client** - Real-time updates
- **Axios** - HTTP client

### External APIs
- **Google Gemini** - AI for location extraction and image verification
- **Mapbox** - Geocoding and mapping
- **Twitter API** - Social media monitoring (optional)

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Google Gemini API key
- Mapbox API token

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone <repository-url>
cd DisasterCoordinationPlatform
```

### 2. Set up environment variables

Create `.env` file in the server directory:
```bash
cd server
cp env.example .env
```

Fill in your environment variables:
```env
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
GEMINI_API_KEY=your_gemini_api_key_here
MAPBOX_TOKEN=your_mapbox_token_here
TWITTER_BEARER=your_twitter_bearer_token_here
PORT=3000
NODE_ENV=development
```

### 3. Set up the database

Run the following SQL in your Supabase SQL editor:

```sql
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- 3.1 disasters
CREATE TABLE disasters (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text    NOT NULL,
  location_name text    NOT NULL,
  location      geography(Point, 4326),
  description   text,
  tags          text[],
  owner_id      uuid,
  created_at    timestamptz DEFAULT now(),
  audit_trail   jsonb      DEFAULT '[]'::jsonb
);
CREATE INDEX disasters_location_idx ON disasters USING GIST (location);
CREATE INDEX disasters_tags_idx     ON disasters USING GIN  (tags);

-- 3.2 reports
CREATE TABLE reports (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disaster_id         uuid REFERENCES disasters(id) ON DELETE CASCADE,
  user_id             uuid,
  content             text,
  image_url           text,
  verification_status text DEFAULT 'pending',
  created_at          timestamptz DEFAULT now()
);

-- 3.3 resources
CREATE TABLE resources (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disaster_id   uuid REFERENCES disasters(id) ON DELETE CASCADE,
  name          text,
  location_name text,
  location      geography(Point, 4326),
  type          text,
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX resources_location_idx ON resources USING GIST (location);

-- 3.4 cache
CREATE TABLE cache (
  key         text PRIMARY KEY,
  value       jsonb,
  expires_at  timestamptz
);
```

### 4. Install dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 5. Start the development servers

```bash
# Start the backend server (from server directory)
cd server
npm run dev

# Start the frontend (from client directory, in a new terminal)
cd client
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## 📚 API Documentation

### Disasters

#### Create Disaster
```http
POST /disasters
Content-Type: application/json

{
  "title": "Heavy Flooding in Downtown",
  "location_name": "Downtown Manhattan, NYC",
  "description": "Severe flooding affecting multiple blocks",
  "tags": ["flood", "emergency", "evacuation"],
  "lat": 40.7589,
  "lon": -73.9851
}
```

#### Get Disasters
```http
GET /disasters?tag=flood&limit=20&offset=0
```

#### Update Disaster
```http
PUT /disasters/:id
Content-Type: application/json

{
  "title": "Updated Title",
  "location_name": "Updated Location",
  "description": "Updated description"
}
```

#### Delete Disaster
```http
DELETE /disasters/:id
```

### Resources

#### Create Resource
```http
POST /resources
Content-Type: application/json

{
  "name": "Emergency Shelter",
  "location_name": "Community Center, 123 Main St",
  "type": "shelter",
  "disaster_id": "uuid-here",
  "lat": 40.7589,
  "lon": -73.9851
}
```

#### Get Resources
```http
GET /resources?disaster_id=uuid&type=shelter&lat=40.7589&lon=-73.9851&radius=10
```

#### Find Nearby Resources
```http
GET /resources/nearby?lat=40.7589&lon=-73.9851&radius=10&type=shelter
```

### Geocoding

#### Extract Location from Text
```http
POST /geocode
Content-Type: application/json

{
  "text": "Heavy flooding reported in Manhattan"
}
```

#### Reverse Geocoding
```http
GET /geocode/reverse?lat=40.7589&lon=-73.9851
```

### Social Media

#### Get Mock Social Media Feed
```http
GET /social-media/mock?disaster_id=uuid&platform=twitter
```

#### Get Official Updates
```http
GET /social-media/official-updates?disaster_id=uuid&source=fema
```

### WebSocket Events

Connect to `ws://localhost:3000` to receive real-time updates:

```javascript
const socket = io('http://localhost:3000');

// Listen for disaster updates
socket.on('disaster_updated', (data) => {
  console.log('Disaster updated:', data);
});

// Listen for resource updates
socket.on('resources_updated', (data) => {
  console.log('Resources updated:', data);
});

// Listen for social media updates
socket.on('social_media_updated', (data) => {
  console.log('Social media updated:', data);
});

// Join a disaster room for specific updates
socket.emit('join-disaster', 'disaster-id');
```

## 🧪 Testing

### Manual Testing with curl

#### Create a disaster
```bash
curl -X POST http://localhost:3000/disasters \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Disaster",
    "location_name": "Test Location",
    "description": "Test description",
    "tags": ["test", "demo"]
  }'
```

#### Get all disasters
```bash
curl http://localhost:3000/disasters
```

#### Create a resource
```bash
curl -X POST http://localhost:3000/resources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Resource",
    "location_name": "Test Resource Location",
    "type": "test",
    "disaster_id": "your-disaster-id"
  }'
```

#### Test geocoding
```bash
curl -X POST http://localhost:3000/geocode \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Heavy flooding in Manhattan"
  }'
```

## 🏗 Project Structure

```
DisasterCoordinationPlatform/
├── server/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── disasters.js      # Disaster CRUD operations
│   │   │   ├── resources.js      # Resource management
│   │   │   ├── geocode.js        # Location extraction & geocoding
│   │   │   └── socialMedia.js    # Social media integration
│   │   ├── middleware/
│   │   │   ├── auth.js           # Authentication middleware
│   │   │   └── errorHandler.js   # Error handling
│   │   ├── services/
│   │   │   └── supabase.js       # Database & caching utilities
│   │   ├── utils/
│   │   │   └── validation.js     # Zod validation schemas
│   │   └── index.js              # Main server file
│   ├── package.json
│   └── env.example
├── client/
│   ├── src/
│   │   ├── App.tsx               # Main React component
│   │   ├── App.css               # Styles
│   │   └── main.tsx              # React entry point
│   └── package.json
└── README.md
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Your Supabase project URL | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes |
| `GEMINI_API_KEY` | Google Gemini API key | Yes |
| `MAPBOX_TOKEN` | Mapbox API token | Yes |
| `TWITTER_BEARER` | Twitter API bearer token | No |
| `PORT` | Server port (default: 3000) | No |
| `NODE_ENV` | Environment (development/production) | No |

### API Rate Limits

- Express rate limiting: 100 requests per 15 minutes per IP
- External API calls are cached for 1 hour
- Socket.IO connections are unlimited

## 🚀 Deployment

### Backend (Render)
1. Connect your GitHub repository to Render
2. Set environment variables in Render dashboard
3. Deploy as a Node.js service

### Frontend (Vercel)
1. Connect your GitHub repository to Vercel
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Deploy

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the API documentation above
- Review the console logs for debugging information

## 🔮 Future Enhancements

- [ ] Real-time mapping integration
- [ ] Advanced AI image analysis
- [ ] Multi-language support
- [ ] Mobile app development
- [ ] Advanced analytics dashboard
- [ ] Integration with more emergency services APIs
- [ ] Automated disaster detection
- [ ] Resource optimization algorithms 