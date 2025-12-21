const fs = require('fs');
const path = require('path');

// Generate likes.json WITHOUT DUPLICATES
const likes = [];
const posts = JSON.parse(fs.readFileSync(path.join(__dirname, 'posts.json'), 'utf8'));

// Customer IDs: 2, 3, 4
const customerIds = [2, 3, 4];

// Track what we've already created to avoid duplicates
const seen = new Set();

// Each post gets 3-5 likes from customers
posts.forEach((post, postIndex) => {
    const numLikes = 3 + (postIndex % 3);

    for (let i = 0; i < numLikes; i++) {
        const userId = customerIds[i % customerIds.length];
        const postId = postIndex + 1; // Post IDs will be 1-indexed in DB

        // Create unique key to check for duplicates
        const key = `${userId}-post-${postId}`;

        // Skip if already exists
        if (seen.has(key)) {
            console.log(`Skipping duplicate: user ${userId} already liked post ${postId}`);
            continue;
        }

        seen.add(key);

        const createdDate = new Date(post.created_at);
        createdDate.setHours(createdDate.getHours() + i + 1);

        likes.push({
            user_id: userId,
            post_id: postId,
            created_at: createdDate.toISOString()
        });
    }
});

fs.writeFileSync(path.join(__dirname, 'likes.json'), JSON.stringify(likes, null, 2), 'utf8');
console.log(`✅ Generated ${likes.length} UNIQUE likes (no duplicates)`);
