/**
 * Test script for the new staff permissions API
 * This demonstrates the difference between:
 * 1. Old API: Returns only permissions staff HAS
 * 2. New API: Returns ALL permissions with isGranted status
 */

const shopId = 3;
const staffEmail = 'nguyenhai842003@gmail.com';

// You need to replace this with a valid JWT token from your frontend
const authToken = 'YOUR_JWT_TOKEN_HERE';

async function testOldAPI() {
  console.log('🧪 Testing OLD API: GET /shop/:shopid/staff/:staffemail/permissions');
  console.log(`   URL: http://localhost:3000/shop/${shopId}/staff/${staffEmail}/permissions\n`);
  
  try {
    const response = await fetch(
      `http://localhost:3000/shop/${shopId}/staff/${staffEmail}/permissions`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    const data = await response.json();
    console.log('   Response:', JSON.stringify(data, null, 2));
    console.log('   ✅ This returns only permission names the staff HAS\n');
  } catch (error) {
    console.error('   ❌ Error:', error);
  }
}

async function testNewAPI() {
  console.log('🧪 Testing NEW API: GET /shop/:shopid/staff/:staffemail/permissions/all');
  console.log(`   URL: http://localhost:3000/shop/${shopId}/staff/${staffEmail}/permissions/all\n`);
  
  try {
    const response = await fetch(
      `http://localhost:3000/shop/${shopId}/staff/${staffEmail}/permissions/all`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    const data = await response.json();
    console.log('   Response:', JSON.stringify(data, null, 2));
    console.log('\n   ✅ This returns ALL permissions with isGranted status');
    console.log('   ✅ Perfect for UI checkboxes!\n');
    
    // Count granted vs not granted
    const granted = data.filter((p: any) => p.isGranted).length;
    const notGranted = data.filter((p: any) => !p.isGranted).length;
    console.log(`   📊 Summary: ${granted} granted, ${notGranted} not granted\n`);
  } catch (error) {
    console.error('   ❌ Error:', error);
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Staff Permissions API Test');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  if (authToken === 'YOUR_JWT_TOKEN_HERE') {
    console.log('⚠️  Please update the authToken variable with a valid JWT token!');
    console.log('   You can get it from your frontend localStorage or login API response.\n');
    return;
  }
  
  await testOldAPI();
  await testNewAPI();
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Frontend Integration Guide');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('Use the NEW API endpoint in your frontend:\n');
  console.log('  GET /shop/:shopid/staff/:staffemail/permissions/all\n');
  console.log('Example response:');
  console.log('  [');
  console.log('    { id: 1, name: "manage_product", isGranted: true },');
  console.log('    { id: 2, name: "manage_order", isGranted: false },');
  console.log('    { id: 3, name: "chat_with_customer", isGranted: true },');
  console.log('    ...');
  console.log('  ]\n');
  console.log('Then render checkboxes:');
  console.log('  permissions.map(p => (');
  console.log('    <Checkbox');
  console.log('      key={p.id}');
  console.log('      checked={p.isGranted}');
  console.log('      label={p.name}');
  console.log('    />');
  console.log('  ))\n');
}

main();
