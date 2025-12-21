const fs = require('fs');
const path = require('path');

console.log('=== Generating Follows (Shop Follows) ===\n');

// Customer IDs: 2, 3, 4
const customerIds = [2, 3, 4];
// Shop IDs: 1, 2, 3, 4
const shopIds = [1, 2, 3, 4];

const follows = [];

// Each customer follows 2-3 shops
customerIds.forEach((userId, userIndex) => {
    const numFollows = 2 + (userIndex % 2);

    for (let i = 0; i < numFollows; i++) {
        const shopIndex = (userIndex + i) % shopIds.length;
        const shopId = shopIds[shopIndex];

        const daysAgo = 60 - (userIndex * 10 + i * 5);
        const createdDate = new Date();
        createdDate.setDate(createdDate.getDate() - daysAgo);

        follows.push({
            user_id: userId,
            shop_id: shopId,
            created_at: createdDate.toISOString()
        });
    }
});

fs.writeFileSync(path.join(__dirname, 'follows.json'), JSON.stringify(follows, null, 2), 'utf8');

console.log(`✅ Generated ${follows.length} shop follows`);
console.log('\nDistribution:');
customerIds.forEach(userId => {
    const userFollows = follows.filter(f => f.user_id === userId);
    const shopList = userFollows.map(f => f.shop_id).join(', ');
    console.log(`  User ${userId}: follows ${userFollows.length} shops (${shopList})`);
});

console.log('\n✅ Follows generated successfully!');
