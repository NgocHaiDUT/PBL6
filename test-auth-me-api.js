// Test script to directly call the /auth/me endpoint
const JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjgsImVtYWlsIjoibmd1eWVuaGFpNzQyMDA3QGdtYWlsLmNvbSIsImlhdCI6MTc2NjA2NTQwNywiZXhwIjoxNzY2MDY1NzA3fQ.P9g-H6I9OdB6VP66dFFr2A28jnLQb9h4tqAXhHlvHMw';

async function testAuthMe() {
  try {
    const response = await fetch('http://localhost:3000/auth/me', {
      headers: {
        'Authorization': `Bearer ${JWT}`,
      },
    });

    const data = await response.json();
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(data, null, 2));
    
    if (data.user?.permissions) {
      console.log('\n✅ Permissions count:', data.user.permissions.length);
      console.log('Permissions:', data.user.permissions);
    } else {
      console.log('\n❌ No permissions in response!');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAuthMe();
