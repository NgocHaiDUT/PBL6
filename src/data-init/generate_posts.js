const fs = require('fs');
const path = require('path');

// Read products to get image names
const productsPath = path.join(__dirname, 'products.json');
const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));

console.log('=== Generating Posts for BOTH Shop Owners AND Customers ===\n');

// Shop owners: user IDs 5, 6, 7, 8
const shopOwners = [
    { userId: 5, shopId: 1, name: 'BeautyShop Owner' },
    { userId: 6, shopId: 2, name: 'SkincareShop Owner' },
    { userId: 7, shopId: 3, name: 'MakeupShop Owner' },
    { userId: 8, shopId: 4, name: 'CosmeticShop Owner' }
];

// Customers: user IDs 2, 3, 4 (NO shop_id)
const customers = [
    { userId: 2, shopId: null, name: 'Nguyễn Văn A' },
    { userId: 3, shopId: null, name: 'Trần Thị B' },
    { userId: 4, shopId: null, name: 'Lê Văn C' }
];

const shopPostTitles = [
    'Hướng dẫn trang điểm tự nhiên cho ngày hè',
    'Review chi tiết sản phẩm mới nhất',
    'Bí quyết chăm sóc da mùa hanh khô',
    'Makeup tutorial: Trang điểm dự tiệc',
    'Top 5 sản phẩm yêu thích tháng này',
    'Skincare routine buổi sáng của tôi',
    'Cách chọn kem nền phù hợp với làn da',
    'Unboxing sản phẩm mới về shop',
    '10 tips chăm sóc da cho người bận rộn',
    'Makeup look cho công sở',
    'Skincare routine ban đêm hiệu quả',
    'Cách dưỡng môi mềm mại',
    'Review son môi hot nhất hiện nay',
    'Bí quyết có làn da sáng khỏe',
    'Makeup cho da dầu mụn',
    'Cách chọn sản phẩm phù hợp với da',
    'Routine chăm sóc da tuổi 30+',
    'Makeup tự nhiên đi học đi làm',
    'Cách sử dụng serum hiệu quả',
    'Tips trang điểm lâu trôi'
];

const customerPostTitles = [
    'Chia sẻ routine chăm sóc da của mình',
    'Makeup look yêu thích hôm nay',
    'Review sản phẩm mình vừa mua',
    'Skincare journey của mình',
    'Những sản phẩm tôi đang dùng',
    'Get ready with me - Makeup tutorial',
    'Sản phẩm yêu thích tháng này',
    'Makeup cho buổi hẹn hò',
    'Routine buổi tối của tôi',
    'Unboxing đồ mới mua'
];

const posts = [];
let postId = 0;

// Generate 5 posts per shop owner (20 posts)
shopOwners.forEach((owner, ownerIndex) => {
    const shopProducts = products.filter(p => p.shop_id === owner.shopId);

    for (let i = 0; i < 5; i++) {
        postId++;

        const numProducts = 2 + (postId % 2);
        const selectedProducts = [];
        for (let j = 0; j < numProducts && j < shopProducts.length; j++) {
            const productIndex = (i + j) % shopProducts.length;
            selectedProducts.push(shopProducts[productIndex]);
        }

        const productIds = selectedProducts.map(p => products.indexOf(p) + 1);

        const mediaImages = selectedProducts.slice(0, 2).map((product, idx) => {
            const productMedia = product.media && product.media.length > 0 ? product.media[0] : null;
            if (productMedia) {
                return {
                    media_url: productMedia.url,
                    media_type: 'image',
                    sort_order: idx
                };
            }
            return null;
        }).filter(m => m !== null);

        const titleIndex = (ownerIndex * 5 + i) % shopPostTitles.length;
        const title = shopPostTitles[titleIndex];

        const content = `# ${title}

Xin chào các bạn! Hôm nay mình muốn chia sẻ về những sản phẩm tuyệt vời này:

${selectedProducts.map((p, idx) => `${idx + 1}. **${p.name}**: ${p.description.substring(0, 100)}...`).join('\n\n')}

## Đánh giá

Mình đã sử dụng những sản phẩm này và thực sự hài lòng với chất lượng. Đặc biệt phù hợp cho ${selectedProducts[0].skin_type_compat === 'normal' ? 'mọi loại da' : 'da ' + selectedProducts[0].skin_type_compat}.

**Ưu điểm:**
- Chất lượng cao
- Giá cả hợp lý
- Hiệu quả rõ rệt

Các bạn có thể tham khảo thêm tại shop nhé! 💄✨`;

        const daysAgo = 60 - (postId * 2);
        const createdDate = new Date();
        createdDate.setDate(createdDate.getDate() - daysAgo);

        posts.push({
            user_id: owner.userId,
            shop_id: owner.shopId,
            post_type: 'tutorial',
            title: title,
            content_md: content,
            moderation_status: 'approved',
            visibility: 'public',
            view_count: 100 + (postId * 50),
            like_count: 10 + (postId * 5),
            is_story: false,
            created_at: createdDate.toISOString(),
            updated_at: createdDate.toISOString(),
            media: mediaImages,
            products: productIds
        });
    }
});

// Generate 3 posts per customer (9 posts) - NO shop_id!
customers.forEach((customer, customerIndex) => {
    for (let i = 0; i < 3; i++) {
        postId++;

        // Customers can post about products from ANY shop
        const randomProducts = [];
        for (let j = 0; j < 2; j++) {
            const randomIndex = (customerIndex * 7 + i * 3 + j) % products.length;
            randomProducts.push(products[randomIndex]);
        }

        const productIds = randomProducts.map(p => products.indexOf(p) + 1);

        const mediaImages = randomProducts.map((product, idx) => {
            const productMedia = product.media && product.media.length > 0 ? product.media[0] : null;
            if (productMedia) {
                return {
                    media_url: productMedia.url,
                    media_type: 'image',
                    sort_order: idx
                };
            }
            return null;
        }).filter(m => m !== null);

        const titleIndex = (customerIndex * 3 + i) % customerPostTitles.length;
        const title = customerPostTitles[titleIndex];

        const content = `# ${title}

Hôm nay mình muốn chia sẻ với các bạn về những sản phẩm mình đang dùng:

${randomProducts.map((p, idx) => `**${p.name}**\n\n${p.description.substring(0, 120)}...`).join('\n\n')}

Mình rất thích những sản phẩm này và muốn giới thiệu đến mọi người! 💕

#beauty #skincare #makeup #review`;

        const daysAgo = 50 - (postId * 2);
        const createdDate = new Date();
        createdDate.setDate(createdDate.getDate() - daysAgo);

        posts.push({
            user_id: customer.userId,
            shop_id: null, // Customers don't have shop_id
            post_type: 'post',
            title: title,
            content_md: content,
            moderation_status: 'approved',
            visibility: 'public',
            view_count: 50 + (postId * 30),
            like_count: 5 + (postId * 3),
            is_story: false,
            created_at: createdDate.toISOString(),
            updated_at: createdDate.toISOString(),
            media: mediaImages,
            products: productIds
        });
    }
});

// Write posts.json
const postsPath = path.join(__dirname, 'posts.json');
fs.writeFileSync(postsPath, JSON.stringify(posts, null, 2), 'utf8');

console.log(`✅ Generated ${posts.length} posts total`);
console.log('\nShop Owner Posts:');
for (let shopId = 1; shopId <= 4; shopId++) {
    const count = posts.filter(p => p.shop_id === shopId).length;
    const owner = shopOwners.find(o => o.shopId === shopId);
    console.log(`  Shop ${shopId} (User ${owner.userId}): ${count} posts`);
}
console.log('\nCustomer Posts (no shop_id):');
customers.forEach(customer => {
    const count = posts.filter(p => p.user_id === customer.userId && p.shop_id === null).length;
    console.log(`  User ${customer.userId} (${customer.name}): ${count} posts`);
});

console.log('\n✅ Posts generated successfully!');
