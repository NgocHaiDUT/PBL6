const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProduct() {
  try {
    const product = await prisma.products.findUnique({
      where: { id: 128 },
      include: {
        product_categories: {
          include: {
            category: true
          }
        }
      }
    });

    console.log('\n=== PRODUCT 128 ===');
    if (!product) {
      console.log('Product not found!');
      return;
    }

    console.log('ID:', product.id);
    console.log('Name:', product.name);
    console.log('is_published:', product.is_published);
    console.log('moderation_status:', product.moderation_status);
    console.log('\nCategories:');
    product.product_categories.forEach(pc => {
      console.log('  -', pc.category.name);
    });

    // Check if categories match makeup categories
    const categoryMap = {
      lips: ['Son thỏi', 'Son kem', 'Son tint', 'Son dưỡng có màu', 'Soi môi', 'Trang điểm môi'],
      eyeshadow: ['Phấn mắt', 'Trang điểm mắt'],
      blush: ['Phấn má hồng', 'Trang điểm má'],
      eyeliner: ['Kẻ mắt', 'Trang điểm mắt'],
      eyebrows: ['Chì kẻ mày', 'Trang điểm mày'],
      foundation: ['Kem nền', 'Trang điểm nền'],
      mascara: ['Mascara', 'Trang điểm mi'],
    };

    const allMakeupCategories = Object.values(categoryMap).flat();
    const productCategoryNames = product.product_categories.map(pc => pc.category.name);
    const matchingCategories = productCategoryNames.filter(name => allMakeupCategories.includes(name));

    console.log('\nMatching Makeup Categories:', matchingCategories.length > 0 ? matchingCategories : 'NONE');

    console.log('\n=== CHECK RESULTS ===');
    console.log('✓ Published:', product.is_published);
    console.log('✓ Approved:', product.moderation_status === 'approved');
    console.log('✓ Has Makeup Category:', matchingCategories.length > 0);
    console.log('✓ Should appear in API:', 
      product.is_published && 
      product.moderation_status === 'approved' && 
      matchingCategories.length > 0 ? 'YES' : 'NO'
    );

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProduct();
