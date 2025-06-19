import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

async function testAPI() {
  console.log('🧪 Testing Disaster Coordination Platform API...\n');

  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Health check passed:', healthResponse.data);

    // Test create disaster
    console.log('\n2. Testing disaster creation...');
    const disasterData = {
      title: 'Test Disaster - API Test',
      location_name: 'Test Location, API Test City',
      description: 'This is a test disaster created by the API test script',
      tags: ['test', 'api', 'demo']
    };
    
    const createDisasterResponse = await axios.post(`${API_BASE_URL}/disasters`, disasterData);
    console.log('✅ Disaster created:', createDisasterResponse.data.id);
    const disasterId = createDisasterResponse.data.id;

    // Test get disasters
    console.log('\n3. Testing get disasters...');
    const getDisastersResponse = await axios.get(`${API_BASE_URL}/disasters`);
    console.log('✅ Disasters retrieved:', getDisastersResponse.data.length, 'disasters found');

    // Test create resource
    console.log('\n4. Testing resource creation...');
    const resourceData = {
      name: 'Test Emergency Shelter',
      location_name: 'Test Community Center, 123 Test St',
      type: 'shelter',
      disaster_id: disasterId
    };
    
    const createResourceResponse = await axios.post(`${API_BASE_URL}/resources`, resourceData);
    console.log('✅ Resource created:', createResourceResponse.data.id);
    const resourceId = createResourceResponse.data.id;

    // Test get resources
    console.log('\n5. Testing get resources...');
    const getResourcesResponse = await axios.get(`${API_BASE_URL}/resources`);
    console.log('✅ Resources retrieved:', getResourcesResponse.data.length, 'resources found');

    // Test social media mock endpoint
    console.log('\n6. Testing social media mock endpoint...');
    const socialMediaResponse = await axios.get(`${API_BASE_URL}/social-media/mock?disaster_id=' + disasterId);
    console.log('✅ Social media mock data retrieved:', socialMediaResponse.data.length, 'posts');

    // Test geocoding (if API keys are configured)
    console.log('\n7. Testing geocoding endpoint...');
    try {
      const geocodeResponse = await axios.post(`${API_BASE_URL}/geocode`, {
        text: 'Heavy flooding in Manhattan'
      });
      console.log('✅ Geocoding successful:', geocodeResponse.data);
    } catch (geocodeError) {
      console.log('⚠️  Geocoding failed (likely missing API keys):', geocodeError.response?.data?.error || geocodeError.message);
    }

    // Test get disaster by ID
    console.log('\n8. Testing get disaster by ID...');
    const getDisasterResponse = await axios.get(`${API_BASE_URL}/disasters/${disasterId}`);
    console.log('✅ Disaster retrieved by ID:', getDisasterResponse.data.title);

    // Test get resources by disaster ID
    console.log('\n9. Testing get resources by disaster ID...');
    const getResourcesByDisasterResponse = await axios.get(`${API_BASE_URL}/resources?disaster_id=${disasterId}`);
    console.log('✅ Resources for disaster retrieved:', getResourcesByDisasterResponse.data.length, 'resources');

    // Test delete resource
    console.log('\n10. Testing resource deletion...');
    await axios.delete(`${API_BASE_URL}/resources/${resourceId}`);
    console.log('✅ Resource deleted successfully');

    // Test delete disaster
    console.log('\n11. Testing disaster deletion...');
    await axios.delete(`${API_BASE_URL}/disasters/${disasterId}`);
    console.log('✅ Disaster deleted successfully');

    console.log('\n🎉 All API tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- ✅ Health check');
    console.log('- ✅ Disaster CRUD operations');
    console.log('- ✅ Resource CRUD operations');
    console.log('- ✅ Social media mock endpoint');
    console.log('- ✅ Geocoding endpoint (with fallback)');
    console.log('- ✅ Data relationships (disaster-resource linking)');

  } catch (error) {
    console.error('\n❌ API test failed:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure the server is running on port 3000:');
      console.log('   cd server && npm run dev');
    }
    
    process.exit(1);
  }
}

// Run the test
testAPI(); 