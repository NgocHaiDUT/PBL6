const fs = require('fs');
const path = require('path');

// Generate likes.json
const likes = [];
const posts = JSON.parse(fs.readFileSync(path.join(__dirname, 'posts.json'), 'utf8'));

// Customer IDs: 2, 3, 4 (customer1-3)
const customerIds = [2, 3, 4];

// Each post gets 3-5 likes from customers
posts.forEach((post, postIndex) => {
    const numLikes = 3 + (postIndex % 3);
    for (let i = 0; i < numLikes; i++) {
        const userId = customerIds[i % customerIds.length];
        const createdDate = new Date(post.created_at);
        createdDate.setHours(createdDate.getHours() + i + 1);

        likes.push({
            user_id: userId,
            post_id: postIndex + 1, // Post IDs will be 1-indexed in DB
            created_at: createdDate.toISOString()
        });
    }
});

fs.writeFileSync(path.join(__dirname, 'likes.json'), JSON.stringify(likes, null, 2), 'utf8');
console.log(`✅ Generated ${likes.length} likes`);

// Generate comments.json
const comments = [];
const commentTexts = [
    'Sản phẩm này rất tốt, mình đã dùng và thấy hiệu quả!',
    'Cảm ơn bạn đã chia sẻ, rất hữu ích!',
    'Mình cũng đang dùng sản phẩm này, rất ưng!',
    'Review chi tiết quá, thanks bạn nhé!',
    'Giá bao nhiêu vậy bạn?',
    'Shop có ship toàn quốc không ạ?',
    'Sản phẩm này phù hợp với da dầu không bạn?',
    'Mình sẽ thử sản phẩm này, cảm ơn bạn!',
    'Đã order rồi, chờ ship về test thử!',
    'Bài viết rất chi tiết và dễ hiểu!'
];

// Each post gets 2-4 comments
posts.forEach((post, postIndex) => {
    const numComments = 2 + (postIndex % 3);
    for (let i = 0; i < numComments; i++) {
        const userId = customerIds[i % customerIds.length];
        const createdDate = new Date(post.created_at);
        createdDate.setHours(createdDate.getHours() + i + 2);

        comments.push({
            user_id: userId,
            post_id: postIndex + 1,
            content: commentTexts[(postIndex + i) % commentTexts.length],
            created_at: createdDate.toISOString(),
            updated_at: createdDate.toISOString()
        });
    }
});

fs.writeFileSync(path.join(__dirname, 'comments.json'), JSON.stringify(comments, null, 2), 'utf8');
console.log(`✅ Generated ${comments.length} comments`);

// Generate saved_posts.json
const savedPosts = [];

// Each customer saves 2-3 posts
customerIds.forEach((userId, userIndex) => {
    const numSaved = 2 + (userIndex % 2);
    for (let i = 0; i < numSaved; i++) {
        const postIndex = (userIndex * 2 + i) % posts.length;
        const createdDate = new Date(posts[postIndex].created_at);
        createdDate.setDate(createdDate.getDate() + 1);

        savedPosts.push({
            user_id: userId,
            post_id: postIndex + 1,
            created_at: createdDate.toISOString()
        });
    }
});

fs.writeFileSync(path.join(__dirname, 'saved_posts.json'), JSON.stringify(savedPosts, null, 2), 'utf8');
console.log(`✅ Generated ${savedPosts.length} saved posts`);

console.log('\n=== Summary ===');
console.log(`Posts: ${posts.length}`);
console.log(`Likes: ${likes.length}`);
console.log(`Comments: ${comments.length}`);
console.log(`Saved Posts: ${savedPosts.length}`);
console.log('\n✅ All post-related data generated successfully!');
