/**
 * Test script for Avatar Upload API
 * 
 * Prerequisites:
 * 1. Server running on http://localhost:3000
 * 2. Valid JWT token with manage_users permission
 * 3. Test image file at specified path
 */

const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

// ============ CONFIGURATION ============
const API_BASE_URL = 'http://localhost:3000';
const JWT_TOKEN = 'YOUR_JWT_TOKEN_HERE'; // Replace with actual token
const TEST_IMAGE_PATH = './test-avatar.jpg'; // Replace with actual image path

// ============ TEST FUNCTIONS ============

async function testCreateUserWithAvatar() {
  console.log('\n📝 Test 1: Create User with Avatar');
  console.log('='.repeat(50));

  try {
    const formData = new FormData();
    formData.append('email', `test_${Date.now()}@example.com`);
    formData.append('full_name', 'Test User Avatar');
    formData.append('password', 'password123');
    formData.append('phone', '0912345678');
    formData.append('is_active', 'true');
    
    // Check if test image exists
    if (fs.existsSync(TEST_IMAGE_PATH)) {
      formData.append('avatar', fs.createReadStream(TEST_IMAGE_PATH));
      console.log('✅ Avatar file attached');
    } else {
      console.log('⚠️  Test image not found, creating user without avatar');
    }

    const response = await axios.post(
      `${API_BASE_URL}/admin/users`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${JWT_TOKEN}`,
        },
      }
    );

    console.log('✅ Success!');
    console.log('User ID:', response.data.id);
    console.log('Email:', response.data.email);
    console.log('Avatar URL:', response.data.avatar_url);
    console.log('Full Response:', JSON.stringify(response.data, null, 2));

    return response.data.id; // Return user ID for next test
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    throw error;
  }
}

async function testUpdateAvatar(userId) {
  console.log('\n📝 Test 2: Update Avatar');
  console.log('='.repeat(50));

  if (!userId) {
    console.log('⚠️  Skipping test - No user ID provided');
    return;
  }

  if (!fs.existsSync(TEST_IMAGE_PATH)) {
    console.log('⚠️  Skipping test - Test image not found');
    return;
  }

  try {
    const formData = new FormData();
    formData.append('avatar', fs.createReadStream(TEST_IMAGE_PATH));

    const response = await axios.patch(
      `${API_BASE_URL}/admin/users/${userId}/avatar`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${JWT_TOKEN}`,
        },
      }
    );

    console.log('✅ Success!');
    console.log('Message:', response.data.message);
    console.log('New Avatar URL:', response.data.data.avatar_url);
    console.log('Full Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    throw error;
  }
}

async function testCreateUserWithoutAvatar() {
  console.log('\n📝 Test 3: Create User WITHOUT Avatar');
  console.log('='.repeat(50));

  try {
    const formData = new FormData();
    formData.append('email', `test_noavatar_${Date.now()}@example.com`);
    formData.append('full_name', 'Test User No Avatar');
    formData.append('password', 'password123');

    const response = await axios.post(
      `${API_BASE_URL}/admin/users`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${JWT_TOKEN}`,
        },
      }
    );

    console.log('✅ Success!');
    console.log('User ID:', response.data.id);
    console.log('Email:', response.data.email);
    console.log('Avatar URL:', response.data.avatar_url || 'null (as expected)');
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    throw error;
  }
}

async function testUpdateAvatarWithoutFile(userId) {
  console.log('\n📝 Test 4: Update Avatar WITHOUT File (Should Fail)');
  console.log('='.repeat(50));

  if (!userId) {
    console.log('⚠️  Skipping test - No user ID provided');
    return;
  }

  try {
    const formData = new FormData();
    // Intentionally not adding avatar file

    const response = await axios.patch(
      `${API_BASE_URL}/admin/users/${userId}/avatar`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${JWT_TOKEN}`,
        },
      }
    );

    console.log('❌ Test Failed - Should have returned error');
    console.log('Response:', response.data);
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Correctly rejected - Status 400');
      console.log('Error message:', error.response.data.message);
    } else {
      console.error('❌ Unexpected error:', error.response?.data || error.message);
    }
  }
}

// ============ RUN ALL TESTS ============

async function runAllTests() {
  console.log('\n🚀 Starting Avatar Upload API Tests');
  console.log('='.repeat(50));
  console.log('API URL:', API_BASE_URL);
  console.log('Test Image:', TEST_IMAGE_PATH);
  console.log('Token:', JWT_TOKEN.substring(0, 20) + '...');

  if (JWT_TOKEN === 'YOUR_JWT_TOKEN_HERE') {
    console.error('\n❌ ERROR: Please set JWT_TOKEN in the script');
    process.exit(1);
  }

  let createdUserId;

  try {
    // Test 1: Create user with avatar
    createdUserId = await testCreateUserWithAvatar();

    // Test 2: Update avatar
    await testUpdateAvatar(createdUserId);

    // Test 3: Create user without avatar
    await testCreateUserWithoutAvatar();

    // Test 4: Update avatar without file (should fail)
    await testUpdateAvatarWithoutFile(createdUserId);

    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.log('\n❌ Tests failed with error');
    process.exit(1);
  }
}

// Run tests
runAllTests();
