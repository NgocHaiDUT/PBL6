import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPostOwnership() {
  try {
    const postId = 2;
    
    // Tìm post
    const post = await prisma.posts.findUnique({
      where: { id: postId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            full_name: true,
            role: {
              select: {
                name: true
              }
            },
            shops: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    if (!post) {
      console.log(`❌ Không tìm thấy post ${postId}`);
      return;
    }

    console.log(`\n📝 POST #${postId}:`);
    console.log(`   Title: ${post.title || 'N/A'}`);
    console.log(`   Created: ${post.created_at}`);
    console.log(`   Shop ID: ${post.shop_id || 'N/A'}`);
    
    console.log(`\n👤 Người tạo post:`);
    console.log(`   User ID: ${post.user.id}`);
    console.log(`   Email: ${post.user.email}`);
    console.log(`   Tên: ${post.user.full_name}`);
    console.log(`   Role: ${post.user.role?.name}`);
    console.log(`   Shop: ${post.user.shops?.[0]?.name || 'N/A'} (ID: ${post.user.shops?.[0]?.id || 'N/A'})`);

    // Tìm chủ shop hiện tại đang đăng nhập
    console.log(`\n🔍 Tìm tất cả sellers:`);
    const sellers = await prisma.users.findMany({
      where: {
        role: { name: 'seller' }
      },
      select: {
        id: true,
        email: true,
        full_name: true,
        shops: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    sellers.forEach(seller => {
      const isOwner = seller.id === post.user_id;
      const hasMatchingShop = post.shop_id && seller.shops.some(s => s.id === post.shop_id);
      console.log(`   ${isOwner ? '✅' : '❌'} ${seller.full_name} (${seller.email})`);
      console.log(`      User ID: ${seller.id} ${isOwner ? '← Post owner' : ''}`);
      console.log(`      Shop: ${seller.shops?.[0]?.name || 'N/A'} (ID: ${seller.shops?.[0]?.id || 'N/A'}) ${hasMatchingShop ? '← Post shop match' : ''}`);
    });

    console.log(`\n💡 Phân tích:`);
    if (post.shop_id) {
      console.log(`   - Post thuộc về shop_id: ${post.shop_id}`);
      console.log(`   - Post được tạo bởi user_id: ${post.user_id}`);
      console.log(`   - Nếu bạn là chủ shop_id ${post.shop_id} thì bạn PHẢI có quyền sửa post này`);
    } else {
      console.log(`   - Post không liên kết với shop nào (shop_id = null)`);
      console.log(`   - Chỉ user_id ${post.user_id} mới có quyền sửa`);
    }

  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPostOwnership();
