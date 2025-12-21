import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { product_moderation_status, Prisma } from '@prisma/client';
@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) { }

  private normalizeProduct(product: any) {
    if (!product) return null;

    // Check if any variant has shade_hex (indicates AR try-on capability)
    const hasTryOn = product.product_variants?.some(
      (v: any) => v.shade_hex !== null && v.shade_hex !== '',
    );

    // Get first image for convenience
    const firstImage = product.product_media?.[0]?.url || null;

    // Calculate rating/reviews if missing/zero using actual data if available
    // (Prisma already provides avg_rating and review_count in the model, but we ensure field names match frontend)

    return {
      ...product,
      hasTryOn: hasTryOn || false,
      first_image: firstImage,
      rating: Number(product.avg_rating) || 0,
      reviews: product.review_count || 0,
      inStock: product.product_variants?.some((v: any) => v.stock > 0) || false,
    };
  }

  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async generateUniqueSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.prisma.products.findUnique({
        where: { slug: slug },
      });

      if (!existing) {
        return slug;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  async getallbrand() {
    const brands = await this.prisma.brands.findMany();
    return { success: true, brands: brands };
  }

  async getallcategories() {
    const categories = await this.prisma.categories.findMany({
      orderBy: { name: 'asc' },
    });
    return { success: true, categories: categories };
  }

  async addbrand(userid: number, name: string, slug: string, logo_url: string) {
    // Permission check is handled by @RequirePermissions decorator in controller

    const ishasbrandname = await this.prisma.brands.findUnique({
      where: { name: name },
    });
    if (ishasbrandname) {
      return { success: false, message: 'Tên thương hiệu đã tồn tại' };
    }
    const ishasbrandslug = await this.prisma.brands.findUnique({
      where: { slug: slug },
    });
    if (ishasbrandslug) {
      return { success: false, message: 'Slug thương hiệu đã tồn tại' };
    }
    await this.prisma.brands.create({
      data: {
        name: name,
        slug: slug,
        logo_url: logo_url,
      },
    });
    return { success: true, message: 'Thêm thương hiệu thành công' };
  }

  async editbrandname(userid: number, id: number, name: string) {
    // Permission check is handled by @RequirePermissions decorator in controller

    const ishasbrand = await this.prisma.brands.findUnique({
      where: { id: id },
    });
    if (!ishasbrand) {
      return { success: false, message: 'Thương hiệu không tồn tại' };
    }
    const ishasbrandname = await this.prisma.brands.findFirst({
      where: { name: name, id: { not: id } },
    });
    if (ishasbrandname) {
      return { success: false, message: 'Tên thương hiệu đã tồn tại' };
    }
    await this.prisma.brands.update({
      where: { id: id },
      data: {
        name: name,
      },
    });
    return { success: true, message: 'Cập nhật thương hiệu thành công' };
  }

  async editbrandslug(userid: number, id: number, slug: string) {
    // Permission check is handled by @RequirePermissions decorator in controller

    const ishasbrand = await this.prisma.brands.findUnique({
      where: { id: id },
    });
    if (!ishasbrand)
      return { success: false, message: 'Thương hiệu không tồn tại' };
    const ishasbrandslug = await this.prisma.brands.findUnique({
      where: { slug: slug },
    });
    if (ishasbrandslug)
      return { success: false, message: 'Slug thương hiệu đã tồn tại' };
    await this.prisma.brands.update({
      where: { id: id },
      data: { slug: slug },
    });
    return { success: true, message: 'Cập nhật Slug thương hiệu thành công' };
  }

  async editbrandslogo(userid: number, id: number, logo_url: string) {
    // Permission check is handled by @RequirePermissions decorator in controller

    const ishasbrand = await this.prisma.brands.findUnique({
      where: { id: id },
    });
    if (!ishasbrand)
      return { success: false, message: 'Thương hiệu không tồn tại' };
    await this.prisma.brands.update({
      where: { id: id },
      data: { logo_url: logo_url },
    });
    return { success: true, message: 'Cập nhật logo thương hiệu thành công' };
  }

  async deleteBrand(userid: number, id: number) {
    // Permission check is handled by @RequirePermissions decorator in controller

    const brand = await this.prisma.brands.findUnique({
      where: { id: id },
    });
    if (!brand) {
      return { success: false, message: 'Thương hiệu không tồn tại' };
    }

    // Check if brand is being used by any products
    const productsUsingBrand = await this.prisma.products.findFirst({
      where: { brand_id: id },
    });

    if (productsUsingBrand) {
      return {
        success: false,
        message: 'Không thể xóa thương hiệu đang được sử dụng bởi sản phẩm',
      };
    }

    await this.prisma.brands.delete({
      where: { id: id },
    });

    return { success: true, message: 'Xóa thương hiệu thành công' };
  }

  async addcategory(
    userid: number,
    name: string,
    slug: string,
    parent_id?: number,
  ) {
    // Permission check is handled by @RequirePermissions decorator in controller

    const ishascategoryname = await this.prisma.categories.findFirst({
      where: { name: name },
    });
    if (ishascategoryname) {
      return { success: false, message: 'Tên danh mục đã tồn tại' };
    }
    const ishascategoryslug = await this.prisma.categories.findUnique({
      where: { slug: slug },
    });
    if (ishascategoryslug) {
      return { success: false, message: 'Slug danh mục đã tồn tại' };
    }
    await this.prisma.categories.create({
      data: {
        parent_id: parent_id,
        name: name,
        slug: slug,
      },
    });
    return { success: true, message: 'Thêm danh mục thành công' };
  }

  async editnamecategory(userid: number, id: number, name: string) {
    // Permission check is handled by @RequirePermissions decorator in controller

    const ishascategory = await this.prisma.categories.findFirst({
      where: { id: id },
    });
    if (!ishascategory)
      return { success: false, message: 'Danh mục không tồn tại' };

    const ishascategoryname = await this.prisma.categories.findFirst({
      where: { name: name },
    });
    if (ishascategoryname)
      return { success: false, message: 'Tên danh mục đã tồn tại' };

    await this.prisma.categories.update({
      where: { id: id },
      data: { name: name },
    });
    return { success: true, message: 'Cập nhật tên danh mục thành công' };
  }

  async editslugcategory(userid: number, id: number, slug: string) {
    // Permission check is handled by @RequirePermissions decorator in controller

    const ishascategory = await this.prisma.categories.findFirst({
      where: { id: id },
    });
    if (!ishascategory)
      return { success: false, message: 'Danh mục không tồn tại' };
    const ishascategoryslug = await this.prisma.categories.findUnique({
      where: { slug: slug },
    });

    if (ishascategoryslug)
      return { success: false, message: 'Slug danh mục đã tồn tại' };

    await this.prisma.categories.update({
      where: { id: id },
      data: { slug: slug },
    });
    return { success: true, message: 'Cập nhật slug danh mục thành công' };
  }

  async deleteCategory(userid: number, id: number) {
    // Permission check is handled by @RequirePermissions decorator in controller

    const category = await this.prisma.categories.findUnique({
      where: { id: id },
    });
    if (!category) {
      return { success: false, message: 'Danh mục không tồn tại' };
    }

    // Check if category has child categories
    const hasChildren = await this.prisma.categories.findFirst({
      where: { parent_id: id },
    });

    if (hasChildren) {
      return {
        success: false,
        message: 'Không thể xóa danh mục có danh mục con',
      };
    }

    // Check if category is being used by any products
    const productsUsingCategory = await this.prisma.product_categories.findFirst({
      where: { category_id: id },
    });

    if (productsUsingCategory) {
      return {
        success: false,
        message: 'Không thể xóa danh mục đang được sử dụng bởi sản phẩm',
      };
    }

    await this.prisma.categories.delete({
      where: { id: id },
    });

    return { success: true, message: 'Xóa danh mục thành công' };
  }

  async addproducts(
    user_id: number,
    shop_id: number,
    name: string,
    slug: string,
    is_published: boolean,
    how_to_use?: string,
    description?: string,
    brand_id?: number,
    category_ids?: number[],
  ) {
    try {
      // Permission check is handled by @RequirePermissions decorator in controller

      const shop = await this.prisma.shops.findUnique({
        where: { id: shop_id },
      });
      if (!shop) {
        return { success: false, message: 'Shop không tồn tại' };
      }

      // Kiểm tra user có quyền tạo sản phẩm cho shop này không
      const isOwner = shop.owner_id === user_id;
      const isStaff = await this.prisma.shop_staffs.findFirst({
        where: {
          shop_id: shop_id,
          user_id: user_id,
        },
      });

      // Check if staff has manage_product permission
      let hasManageProductPermission = false;
      if (isStaff && !isOwner) {
        const userPermissions = await this.prisma.userpermission.findMany({
          where: { user_id: user_id },
          include: { permission: true },
        });
        hasManageProductPermission = userPermissions.some(
          (up) => up.permission.name === 'manage_product',
        );
      }

      if (!isOwner && (!isStaff || !hasManageProductPermission)) {
        return {
          success: false,
          message: 'Bạn không có quyền tạo sản phẩm cho shop này',
        };
      }

      // Generate unique slug from name if slug is empty or already exists
      let finalSlug = slug;
      if (!slug || slug.trim() === '') {
        // If no slug provided, generate from name
        const baseSlug = this.generateSlug(name);
        finalSlug = await this.generateUniqueSlug(baseSlug);
      } else {
        // If slug provided, check if it exists
        const existingProduct = await this.prisma.products.findUnique({
          where: { slug: slug },
        });
        if (existingProduct) {
          // Generate unique slug based on provided slug
          const baseSlug = this.generateSlug(slug);
          finalSlug = await this.generateUniqueSlug(baseSlug);
        }
      }

      if (brand_id) {
        const brand = await this.prisma.brands.findUnique({
          where: { id: brand_id },
        });
        if (!brand) {
          return { success: false, message: 'Thương hiệu không tồn tại' };
        }
      }

      if (category_ids && category_ids.length > 0) {
        const categories = await this.prisma.categories.findMany({
          where: { id: { in: category_ids } },
        });
        if (categories.length !== category_ids.length) {
          return { success: false, message: 'Một số danh mục không tồn tại' };
        }
      }

      const result = await this.prisma.$transaction(async (tx) => {
        const product = await tx.products.create({
          data: {
            shop_id: shop_id,
            brand_id: brand_id,
            name: name,
            slug: finalSlug,
            description: description,
            how_to_use: how_to_use,
            is_published: is_published,
            moderation_status: product_moderation_status.pending,
            created_at: new Date(),
            updated_at: new Date(),
          },
        });

        if (category_ids && category_ids.length > 0) {
          const productCategories = category_ids.map((category_id) => ({
            product_id: product.id,
            category_id: category_id,
          }));

          await tx.product_categories.createMany({
            data: productCategories,
          });
        }

        return product;
      });

      return {
        success: true,
        message: 'Thêm sản phẩm thành công',
        product: result,
      };
    } catch (error) {
      console.error('Error adding product:', error);
      return {
        success: false,
        message: 'Lỗi khi thêm sản phẩm',
        error: error.message,
      };
    }
  }

  async editProduct(
    product_id: number,
    user_id: number,
    name?: string,
    slug?: string,
    description?: string,
    how_to_use?: string,
    is_published?: boolean,
    brand_id?: number,
    category_ids?: number[],
  ) {
    try {
      // Check if product exists
      const product = await this.prisma.products.findUnique({
        where: { id: product_id },
        include: { shop: true },
      });

      if (!product) {
        return { success: false, message: 'Sản phẩm không tồn tại' };
      }

      // Permission check is handled by @RequirePermissions decorator in controller
      // Check if user has permission to edit this shop's product
      const isOwner = product.shop.owner_id === user_id;
      const isStaff = await this.prisma.shop_staffs.findFirst({
        where: {
          shop_id: product.shop_id,
          user_id: user_id,
        },
      });

      // Check if staff has manage_product permission
      let hasManageProductPermission = false;
      if (isStaff && !isOwner) {
        const userPermissions = await this.prisma.userpermission.findMany({
          where: { user_id: user_id },
          include: { permission: true },
        });
        hasManageProductPermission = userPermissions.some(
          (up) => up.permission.name === 'manage_product',
        );
      }

      if (!isOwner && (!isStaff || !hasManageProductPermission)) {
        return {
          success: false,
          message: 'Bạn không có quyền chỉnh sửa sản phẩm của shop này',
        };
      }

      // Check slug uniqueness if provided
      let finalSlug = slug;
      if (slug && slug !== product.slug) {
        const existingSlug = await this.prisma.products.findUnique({
          where: { slug: slug },
        });
        if (existingSlug) {
          // Generate unique slug
          const baseSlug = this.generateSlug(slug);
          finalSlug = await this.generateUniqueSlug(baseSlug);
        }
      }

      // Validate brand if provided
      if (brand_id) {
        const brand = await this.prisma.brands.findUnique({
          where: { id: brand_id },
        });
        if (!brand) {
          return { success: false, message: 'Thương hiệu không tồn tại' };
        }
      }

      // Validate categories if provided
      if (category_ids && category_ids.length > 0) {
        const categories = await this.prisma.categories.findMany({
          where: { id: { in: category_ids } },
        });
        if (categories.length !== category_ids.length) {
          return { success: false, message: 'Một số danh mục không tồn tại' };
        }
      }

      // Build update data object
      const updateData: any = {
        updated_at: new Date(),
      };

      if (name !== undefined) updateData.name = name;
      if (finalSlug !== undefined) updateData.slug = finalSlug;
      if (description !== undefined) updateData.description = description;
      if (how_to_use !== undefined) updateData.how_to_use = how_to_use;
      if (is_published !== undefined) updateData.is_published = is_published;
      if (brand_id !== undefined) updateData.brand_id = brand_id;

      // Update product and categories in transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // Update product
        const updatedProduct = await tx.products.update({
          where: { id: product_id },
          data: updateData,
        });

        // Update categories if provided
        if (category_ids !== undefined) {
          // Delete existing categories
          await tx.product_categories.deleteMany({
            where: { product_id: product_id },
          });

          // Add new categories
          if (category_ids.length > 0) {
            await tx.product_categories.createMany({
              data: category_ids.map((category_id) => ({
                product_id: product_id,
                category_id: category_id,
              })),
            });
          }
        }

        return updatedProduct;
      });

      return {
        success: true,
        message: 'Cập nhật sản phẩm thành công',
        product: result,
      };
    } catch (error) {
      console.error('Error editing product:', error);
      return {
        success: false,
        message: 'Lỗi khi cập nhật sản phẩm',
        error: error.message,
      };
    }
  }

  async deleteProduct(product_id: number, user_id: number) {
    try {
      // Check if product exists
      const product = await this.prisma.products.findUnique({
        where: { id: product_id },
        include: { shop: true },
      });

      if (!product) {
        return { success: false, message: 'Sản phẩm không tồn tại' };
      }

      // Check if user is admin
      const user = await this.prisma.users.findUnique({
        where: { id: user_id },
        include: {
          role: true,
        },
      });

      if (!user) {
        return { success: false, message: 'Người dùng không tồn tại' };
      }

      // Only admin can delete products
      if (user.role?.name !== 'admin') {
        return {
          success: false,
          message: 'Chỉ admin mới có quyền xóa sản phẩm',
        };
      }

      // Check if product has orders (should not delete if has orders)
      const hasOrders = await this.prisma.order_items.findFirst({
        where: { product_id: product_id },
      });

      if (hasOrders) {
        return {
          success: false,
          message:
            'Không thể xóa sản phẩm đã có đơn hàng. Bạn có thể ẩn sản phẩm thay vì xóa.',
        };
      }

      // Delete product and related data in transaction
      await this.prisma.$transaction(async (tx) => {
        // Delete related data
        await tx.product_categories.deleteMany({
          where: { product_id: product_id },
        });

        await tx.product_media.deleteMany({
          where: { product_id: product_id },
        });

        await tx.product_variants.deleteMany({
          where: { product_id: product_id },
        });

        await tx.cart_items.deleteMany({
          where: { product_id: product_id },
        });

        await tx.wishlists.deleteMany({
          where: { product_id: product_id },
        });

        await tx.reviews.deleteMany({
          where: { product_id: product_id },
        });

        // Delete post_products (posts that tag this product)
        await tx.post_products.deleteMany({
          where: { product_id: product_id },
        });

        // Finally delete the product
        await tx.products.delete({
          where: { id: product_id },
        });
      });

      return {
        success: true,
        message: 'Xóa sản phẩm thành công',
      };
    } catch (error) {
      console.error('Error deleting product:', error);
      return {
        success: false,
        message: 'Lỗi khi xóa sản phẩm',
        error: error.message,
      };
    }
  }

  async addProductVariant(
    product_id: number,
    sku: string,
    name: string,
    price: number,
    stock: number = 0,
    shade_hex?: string,
    size_label?: string,
    compare_at_price?: number,
    opacity?: number,
    weight?: number,
    length?: number,
    width?: number,
    height?: number,
  ) {
    try {
      const product = await this.prisma.products.findUnique({
        where: { id: product_id },
      });
      if (!product) {
        return { success: false, message: 'Sản phẩm không tồn tại' };
      }

      const existingSku = await this.prisma.product_variants.findUnique({
        where: { sku: sku },
      });
      if (existingSku) {
        return { success: false, message: 'SKU đã tồn tại' };
      }

      const variant = await this.prisma.product_variants.create({
        data: {
          product_id: product_id,
          sku: sku,
          name: name,
          shade_hex: shade_hex,
          size_label: size_label,
          price: price,
          compare_at_price: compare_at_price,
          stock: stock,
          opacity: opacity,
          weight: weight,
          length: length,
          width: width,
          height: height,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      return {
        success: true,
        message: 'Thêm variant thành công',
        variant: variant,
      };
    } catch (error) {
      console.error('Error adding variant:', error);
      return {
        success: false,
        message: 'Lỗi khi thêm variant',
        error: error.message,
      };
    }
  }

  async editProductVariant(
    variant_id: number,
    user_id: number,
    sku?: string,
    name?: string,
    price?: number,
    stock?: number,
    shade_hex?: string,
    size_label?: string,
    compare_at_price?: number,
    is_active?: boolean,
    opacity?: number,
    weight?: number,
    length?: number,
    width?: number,
    height?: number,
  ) {
    try {
      // Check if variant exists
      const variant = await this.prisma.product_variants.findUnique({
        where: { id: variant_id },
        include: {
          product: {
            include: { shop: true },
          },
        },
      });

      if (!variant) {
        return { success: false, message: 'Variant không tồn tại' };
      }

      // Permission check is handled by @RequirePermissions decorator in controller
      // Check if user has permission to edit this shop's product variant
      const isOwner = variant.product.shop.owner_id === user_id;
      const isStaff = await this.prisma.shop_staffs.findFirst({
        where: {
          shop_id: variant.product.shop_id,
          user_id: user_id,
        },
      });

      // Check if staff has manage_product permission
      let hasManageProductPermission = false;
      if (isStaff && !isOwner) {
        const userPermissions = await this.prisma.userpermission.findMany({
          where: { user_id: user_id },
          include: { permission: true },
        });
        hasManageProductPermission = userPermissions.some(
          (up) => up.permission.name === 'manage_product',
        );
      }

      if (!isOwner && (!isStaff || !hasManageProductPermission)) {
        return {
          success: false,
          message: 'Bạn không có quyền chỉnh sửa variant của shop này',
        };
      }

      // Check SKU uniqueness if provided
      if (sku && sku !== variant.sku) {
        const existingSku = await this.prisma.product_variants.findUnique({
          where: { sku: sku },
        });
        if (existingSku) {
          return { success: false, message: 'SKU đã tồn tại' };
        }
      }

      // Build update data
      const updateData: any = {
        updated_at: new Date(),
      };

      if (sku !== undefined) updateData.sku = sku;
      if (name !== undefined) updateData.name = name;
      if (price !== undefined) updateData.price = price;
      if (stock !== undefined) updateData.stock = stock;
      if (shade_hex !== undefined) updateData.shade_hex = shade_hex;
      if (size_label !== undefined) updateData.size_label = size_label;
      if (compare_at_price !== undefined)
        updateData.compare_at_price = compare_at_price;
      if (is_active !== undefined) updateData.is_active = is_active;
      if (opacity !== undefined) updateData.opacity = opacity;
      if (weight !== undefined) updateData.weight = weight;
      if (length !== undefined) updateData.length = length;
      if (width !== undefined) updateData.width = width;
      if (height !== undefined) updateData.height = height;

      // Update variant
      const updatedVariant = await this.prisma.product_variants.update({
        where: { id: variant_id },
        data: updateData,
      });

      return {
        success: true,
        message: 'Cập nhật variant thành công',
        variant: updatedVariant,
      };
    } catch (error) {
      console.error('Error editing variant:', error);
      return {
        success: false,
        message: 'Lỗi khi cập nhật variant',
        error: error.message,
      };
    }
  }

  async deleteProductVariant(variant_id: number, user_id: number) {
    try {
      // Check if variant exists
      const variant = await this.prisma.product_variants.findUnique({
        where: { id: variant_id },
        include: {
          product: {
            include: { shop: true },
          },
        },
      });

      if (!variant) {
        return { success: false, message: 'Variant không tồn tại' };
      }

      // Permission check is handled by @RequirePermissions decorator in controller
      // Check if user has permission to delete this shop's product variant
      const isOwner = variant.product.shop.owner_id === user_id;
      const isStaff = await this.prisma.shop_staffs.findFirst({
        where: {
          shop_id: variant.product.shop_id,
          user_id: user_id,
        },
      });

      // Check if staff has manage_product permission
      let hasManageProductPermission = false;
      if (isStaff && !isOwner) {
        const userPermissions = await this.prisma.userpermission.findMany({
          where: { user_id: user_id },
          include: { permission: true },
        });
        hasManageProductPermission = userPermissions.some(
          (up) => up.permission.name === 'manage_product',
        );
      }

      if (!isOwner && (!isStaff || !hasManageProductPermission)) {
        return {
          success: false,
          message: 'Bạn không có quyền xóa variant của shop này',
        };
      }

      // Check if variant has orders
      const hasOrders = await this.prisma.order_items.findFirst({
        where: { variant_id: variant_id },
      });

      if (hasOrders) {
        return {
          success: false,
          message:
            'Không thể xóa variant đã có đơn hàng. Bạn có thể set is_active = false thay vì xóa.',
        };
      }

      // Delete variant and related data
      await this.prisma.$transaction(async (tx) => {
        // Delete cart items
        await tx.cart_items.deleteMany({
          where: { variant_id: variant_id },
        });

        // Delete the variant
        await tx.product_variants.delete({
          where: { id: variant_id },
        });
      });

      return {
        success: true,
        message: 'Xóa variant thành công',
      };
    } catch (error) {
      console.error('Error deleting variant:', error);
      return {
        success: false,
        message: 'Lỗi khi xóa variant',
        error: error.message,
      };
    }
  }

  async addProductMedia(
    product_id: number,
    url: string,
    type: string = 'image',
    sort_order: number = 0,
  ) {
    try {
      const product = await this.prisma.products.findUnique({
        where: { id: product_id },
      });
      if (!product) {
        return { success: false, message: 'Sản phẩm không tồn tại' };
      }

      const media = await this.prisma.product_media.create({
        data: {
          product_id: product_id,
          url: url,
          type: type,
          sort_order: sort_order,
          created_at: new Date(),
        },
      });

      return {
        success: true,
        message: 'Thêm media thành công',
        media: media,
      };
    } catch (error) {
      console.error('Error adding media:', error);
      return {
        success: false,
        message: 'Lỗi khi thêm media',
        error: error.message,
      };
    }
  }

  async editProductMedia(
    media_id: number,
    user_id: number,
    type?: string,
    sort_order?: number,
  ) {
    try {
      // Check if media exists
      const media = await this.prisma.product_media.findUnique({
        where: { id: media_id },
        include: {
          product: {
            include: { shop: true },
          },
        },
      });

      if (!media) {
        return { success: false, message: 'Media không tồn tại' };
      }

      // Permission check is handled by @RequirePermissions decorator in controller
      // Check if user has permission to edit this shop's product media
      const isOwner = media.product.shop.owner_id === user_id;
      const isStaff = await this.prisma.shop_staffs.findFirst({
        where: {
          shop_id: media.product.shop_id,
          user_id: user_id,
        },
      });

      // Check if staff has manage_product permission
      let hasManageProductPermission = false;
      if (isStaff && !isOwner) {
        const userPermissions = await this.prisma.userpermission.findMany({
          where: { user_id: user_id },
          include: { permission: true },
        });
        hasManageProductPermission = userPermissions.some(
          (up) => up.permission.name === 'manage_product',
        );
      }

      if (!isOwner && (!isStaff || !hasManageProductPermission)) {
        return {
          success: false,
          message: 'Bạn không có quyền chỉnh sửa media của shop này',
        };
      }

      // Build update data
      const updateData: any = {};

      if (type !== undefined) updateData.type = type;
      if (sort_order !== undefined) updateData.sort_order = sort_order;

      // Update media
      const updatedMedia = await this.prisma.product_media.update({
        where: { id: media_id },
        data: updateData,
      });

      return {
        success: true,
        message: 'Cập nhật media thành công',
        media: updatedMedia,
      };
    } catch (error) {
      console.error('Error editing media:', error);
      return {
        success: false,
        message: 'Lỗi khi cập nhật media',
        error: error.message,
      };
    }
  }

  async deleteProductMedia(media_id: number, user_id: number) {
    try {
      // Check if media exists
      const media = await this.prisma.product_media.findUnique({
        where: { id: media_id },
        include: {
          product: {
            include: { shop: true },
          },
        },
      });

      if (!media) {
        return { success: false, message: 'Media không tồn tại' };
      }

      // Permission check is handled by @RequirePermissions decorator in controller
      // Check if user has permission to delete this shop's product media
      const isOwner = media.product.shop.owner_id === user_id;
      const isStaff = await this.prisma.shop_staffs.findFirst({
        where: {
          shop_id: media.product.shop_id,
          user_id: user_id,
        },
      });

      // Check if staff has manage_product permission
      let hasManageProductPermission = false;
      if (isStaff && !isOwner) {
        const userPermissions = await this.prisma.userpermission.findMany({
          where: { user_id: user_id },
          include: { permission: true },
        });
        hasManageProductPermission = userPermissions.some(
          (up) => up.permission.name === 'manage_product',
        );
      }

      if (!isOwner && (!isStaff || !hasManageProductPermission)) {
        return {
          success: false,
          message: 'Bạn không có quyền xóa media của shop này',
        };
      }

      // Delete media
      await this.prisma.product_media.delete({
        where: { id: media_id },
      });

      // TODO: Delete physical file from uploads folder if needed
      // const filePath = path.join(process.cwd(), media.url);
      // if (fs.existsSync(filePath)) {
      //     fs.unlinkSync(filePath);
      // }

      return {
        success: true,
        message: 'Xóa media thành công',
      };
    } catch (error) {
      console.error('Error deleting media:', error);
      return {
        success: false,
        message: 'Lỗi khi xóa media',
        error: error.message,
      };
    }
  }

  async getShopProducts(
    shop_id: number,
    page: number = 1,
    limit: number = 20,
    filters?: {
      search?: string;
      category_id?: number;
      brand_id?: number;
      is_published?: boolean;
      min_price?: number;
      max_price?: number;
    },
    sort?: {
      field:
      | 'created_at'
      | 'updated_at'
      | 'name'
      | 'avg_rating'
      | 'review_count';
      order: 'asc' | 'desc';
    },
  ) {
    try {
      // Validate shop exists
      const shop = await this.prisma.shops.findUnique({
        where: { id: shop_id },
      });
      if (!shop) {
        return { success: false, message: 'Shop không tồn tại' };
      }

      // Build where clause
      const whereClause: any = {
        shop_id: shop_id,
        // Only show approved products for public shop view
        moderation_status: 'approved',
      };

      // Apply filters
      if (filters) {
        if (filters.search) {
          whereClause.OR = [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { description: { contains: filters.search, mode: 'insensitive' } },
          ];
        }

        if (filters.brand_id) {
          whereClause.brand_id = filters.brand_id;
        }

        if (filters.is_published !== undefined) {
          whereClause.is_published = filters.is_published;
        } else {
          // Default: only show published products for public view
          whereClause.is_published = true;
        }

        if (filters.category_id) {
          whereClause.product_categories = {
            some: {
              category_id: filters.category_id,
            },
          };
        }
      } else {
        // If no filters provided, default to showing only published products
        whereClause.is_published = true;
      }

      // Build orderBy
      const orderBy: any = sort
        ? { [sort.field]: sort.order }
        : { created_at: 'desc' }; // Default sort

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Get total count for pagination metadata
      const totalProducts = await this.prisma.products.count({
        where: whereClause,
      });

      // Fetch products with relations
      const products = await this.prisma.products.findMany({
        where: whereClause,
        include: {
          brand: {
            select: {
              id: true,
              name: true,
              slug: true,
              logo_url: true,
            },
          },
          product_categories: {
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
          product_media: {
            orderBy: {
              sort_order: 'asc',
            },
            take: 10,
          },
          product_variants: {
            where: {
              is_active: true,
            },
            orderBy: {
              price: 'asc',
            },
            select: {
              id: true,
              sku: true,
              name: true,
              price: true,
              compare_at_price: true,
              stock: true,
              shade_hex: true,
              size_label: true,
              opacity: true,
            },
          },
        },
        orderBy: orderBy,
        skip: skip,
        take: limit,
      });

      // Apply price filter if needed (filter on variants)
      let filteredProducts = products;
      if (
        filters?.min_price !== undefined ||
        filters?.max_price !== undefined
      ) {
        filteredProducts = products.filter((product) => {
          const variants = product.product_variants;
          if (variants.length === 0) return false;

          const prices = variants.map((v) => Number(v.price));
          const minProductPrice = Math.min(...prices);
          const maxProductPrice = Math.max(...prices);

          if (
            filters.min_price !== undefined &&
            maxProductPrice < filters.min_price
          ) {
            return false;
          }
          if (
            filters.max_price !== undefined &&
            minProductPrice > filters.max_price
          ) {
            return false;
          }
          return true;
        });
      }

      // Transform products to include first image
      const productsWithFirstImage = filteredProducts.map((product) => this.normalizeProduct(product));

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalProducts / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return {
        success: true,
        data: {
          products: productsWithFirstImage,
          pagination: {
            total: totalProducts,
            page: page,
            limit: limit,
            totalPages: totalPages,
            hasNextPage: hasNextPage,
            hasPrevPage: hasPrevPage,
          },
        },
      };
    } catch (error) {
      console.error('Error fetching shop products:', error);
      return {
        success: false,
        message: 'Lỗi khi lấy danh sách sản phẩm',
        error: error.message,
      };
    }
  }

  // Customer Product APIs
  async getAllProducts(query: any) {
    try {
      const {
        page = 1,
        limit = 12,
        name,
        category,
        brand,
        is_published,
        moderation_status,
        minPrice,
        maxPrice,
        minRating,
        sort = 'newest',
      } = query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {};

      // Publication status filter
      // If is_published is explicitly provided, use it; otherwise default to true for public API
      if (is_published !== undefined) {
        where.is_published = is_published;
      } else {
        where.is_published = true;
      }

      // Moderation status filter
      // If moderation_status is explicitly provided, use it; otherwise default to 'approved' for public API
      if (moderation_status) {
        where.moderation_status = moderation_status;
      } else {
        where.moderation_status = 'approved';
      }

      // Name search (partial match, case-insensitive)
      if (name) {
        where.name = { contains: name, mode: 'insensitive' };
      }

      // Category filter - support both ID and slug
      if (category) {
        // Check if it's a number (ID) or string (slug)
        const categoryId = parseInt(category);
        if (!isNaN(categoryId)) {
          // Filter by category ID
          where.product_categories = {
            some: {
              category_id: categoryId,
            },
          };
        } else {
          // Filter by category slug
          where.product_categories = {
            some: {
              category: {
                slug: category,
              },
            },
          };
        }
      }

      // Brand filter - support both ID and slug
      if (brand) {
        // Check if it's a number (ID) or string (slug)
        const brandId = parseInt(brand);
        if (!isNaN(brandId)) {
          // Filter by brand ID
          where.brand_id = brandId;
        } else {
          // Filter by brand slug
          where.brand = {
            slug: brand,
          };
        }
      }

      // Price filter through variants
      if (minPrice || maxPrice) {
        where.product_variants = {
          some: {
            price: {
              ...(minPrice && { gte: Number(minPrice) }),
              ...(maxPrice && { lte: Number(maxPrice) }),
            },
          },
        };
      }

      // Rating filter
      if (minRating) {
        where.avg_rating = {
          gte: Number(minRating),
        };
      }

      const orderBy: any = {};
      switch (sort) {
        case 'newest':
          orderBy.created_at = 'desc';
          break;
        case 'oldest':
          orderBy.created_at = 'asc';
          break;
        case 'price_low':
          orderBy.created_at = 'desc'; // Will need to sort by variant price later
          break;
        case 'price_high':
          orderBy.created_at = 'desc'; // Will need to sort by variant price later
          break;
        case 'rating':
          orderBy.avg_rating = 'desc';
          break;
        default:
          orderBy.created_at = 'desc';
      }

      const [products, total] = await Promise.all([
        this.prisma.products.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy,
          include: {
            brand: true,
            product_categories: {
              include: {
                category: true,
              },
            },
            shop: true,
            product_media: true,
            product_variants: true,
          },
        }),
        this.prisma.products.count({ where }),
      ]);

      return {
        success: true,
        products: products.map(p => this.normalizeProduct(p)),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      };
    } catch (error) {
      console.error('Error fetching products:', error);
      return { success: false, message: 'Lỗi khi tải sản phẩm' };
    }
  }

  async getProductById(id: number) {
    try {
      const productId = Number(id);

      // Use findFirst to allow filtering by non-unique fields
      const product = await this.prisma.products.findFirst({
        where: {
          id: productId,
          is_published: true,
          moderation_status: 'approved',
        },
        include: {
          brand: true,
          product_categories: {
            include: {
              category: true,
            },
          },
          shop: true,
          product_media: true,
          product_variants: true,
          reviews: {
            include: {
              user: true,
            },
            orderBy: { created_at: 'desc' },
          },
        },
      });

      if (!product) {
        return { success: false, message: 'Sản phẩm không tồn tại hoặc chưa được duyệt' };
      }

      return { success: true, product: this.normalizeProduct(product) };
    } catch (error) {
      console.error('Error fetching product:', error);
      return { success: false, message: 'Lỗi khi tải sản phẩm' };
    }
  }

  /**
   * Get product by ID for management (shop owner/staff view)
   * Returns product regardless of publication or moderation status
   * Requires permission check in controller
   */
  async getProductByIdForManagement(productId: number, userId: number) {
    try {
      // Get product without status filtering
      const product = await this.prisma.products.findUnique({
        where: { id: productId },
        include: {
          brand: true,
          product_categories: {
            include: {
              category: true,
            },
          },
          shop: {
            select: {
              id: true,
              name: true,
              owner_id: true,
            },
          },
          product_media: true,
          product_variants: true,
        },
      });

      if (!product) {
        return { success: false, message: 'Sản phẩm không tồn tại' };
      }

      // Check if user has permission to view this product
      const isOwner = product.shop.owner_id === userId;
      const isStaff = await this.prisma.shop_staffs.findFirst({
        where: {
          shop_id: product.shop_id,
          user_id: userId,
        },
      });

      // Check if staff has manage_product permission
      let hasManageProductPermission = false;
      if (isStaff && !isOwner) {
        const userPermissions = await this.prisma.userpermission.findMany({
          where: { user_id: userId },
          include: { permission: true },
        });
        hasManageProductPermission = userPermissions.some(
          (up) => up.permission.name === 'manage_product',
        );
      }

      if (!isOwner && (!isStaff || !hasManageProductPermission)) {
        return {
          success: false,
          message: 'Bạn không có quyền xem sản phẩm này',
        };
      }

      return { success: true, product };
    } catch (error) {
      console.error('Error fetching product for management:', error);
      return { success: false, message: 'Lỗi khi tải sản phẩm' };
    }
  }

  async getProductBySlug(slug: string) {
    try {
      // Use findFirst to allow filtering by non-unique fields
      const product = await this.prisma.products.findFirst({
        where: {
          slug: slug,
          is_published: true,
          moderation_status: 'approved',
        },
        include: {
          brand: true,
          product_categories: {
            include: {
              category: true,
            },
          },
          shop: true,
          product_media: true,
          product_variants: true,
          reviews: {
            include: {
              user: true,
            },
            orderBy: { created_at: 'desc' },
          },
        },
      });

      if (!product) {
        return { success: false, message: 'Sản phẩm không tồn tại hoặc chưa được duyệt' };
      }

      return { success: true, product: this.normalizeProduct(product) };
    } catch (error) {
      console.error('Error fetching product by slug:', error);
      return { success: false, message: 'Lỗi khi tải sản phẩm' };
    }
  }

  async searchProducts(query: any) {
    try {
      const {
        q,
        page = 1,
        limit = 12,
        category,
        brand,
        minPrice,
        maxPrice,
        sort = 'newest',
      } = query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: Prisma.productsWhereInput = {
        is_published: true,
        moderation_status: 'approved',
      };

      // Text search
      if (q) {
        where.OR = [
          { name: { contains: q, mode: Prisma.QueryMode.insensitive } },
          { description: { contains: q, mode: Prisma.QueryMode.insensitive } },
          {
            brand: {
              name: { contains: q, mode: Prisma.QueryMode.insensitive },
            },
          },
        ];
      }

      // Category filter
      if (category) {
        where.product_categories = {
          some: {
            category_id: Number(category),
          },
        };
      }

      // Brand filter
      if (brand) {
        where.brand_id = Number(brand);
      }

      // Price filter through variants
      if (minPrice || maxPrice) {
        where.product_variants = {
          some: {
            price: {
              ...(minPrice && { gte: Number(minPrice) }),
              ...(maxPrice && { lte: Number(maxPrice) }),
            },
          },
        };
      }

      const orderBy: any = {};
      switch (sort) {
        case 'newest':
          orderBy.created_at = 'desc';
          break;
        case 'oldest':
          orderBy.created_at = 'asc';
          break;
        case 'price_low':
          orderBy.created_at = 'desc'; // Will need to sort by variant price later
          break;
        case 'price_high':
          orderBy.created_at = 'desc'; // Will need to sort by variant price later
          break;
        case 'rating':
          orderBy.avg_rating = 'desc';
          break;
        default:
          orderBy.created_at = 'desc';
      }

      const [products, total] = await Promise.all([
        this.prisma.products.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy,
          include: {
            brand: true,
            product_categories: {
              include: {
                category: true,
              },
            },
            shop: true,
            product_media: true,
            product_variants: true,
          },
        }),
        this.prisma.products.count({ where }),
      ]);

      return {
        success: true,
        products: products.map(p => this.normalizeProduct(p)),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      };
    } catch (error) {
      console.error('Error searching products:', error);
      return { success: false, message: 'Lỗi khi tìm kiếm sản phẩm' };
    }
  }

  async filterProducts(query: any) {
    // Similar to getAllProducts but with more filter options
    return this.getAllProducts(query);
  }

  // Wishlist APIs
  async addToWishlist(productId: number, userId: number = 1) {
    try {
      // Check if product exists
      const product = await this.prisma.products.findUnique({
        where: {
          id: productId,
          is_published: true,
          moderation_status: 'approved',
        },
      });

      if (!product) {
        return {
          success: false,
          message: 'Sản phẩm không tồn tại hoặc không được phép',
        };
      }

      // Check if already in wishlist
      const existingWishlist = await this.prisma.wishlists.findUnique({
        where: {
          user_id_product_id: {
            user_id: userId,
            product_id: productId,
          },
        },
      });

      if (existingWishlist) {
        return {
          success: false,
          message: 'Sản phẩm đã có trong danh sách yêu thích',
        };
      }

      // Add to wishlist
      await this.prisma.wishlists.create({
        data: {
          user_id: userId,
          product_id: productId,
        },
      });

      return { success: true, message: 'Đã thêm vào danh sách yêu thích' };
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      return {
        success: false,
        message: 'Lỗi khi thêm vào danh sách yêu thích',
      };
    }
  }

  async removeFromWishlist(productId: number, userId: number = 1) {
    try {
      // Check if item exists in wishlist
      const wishlistItem = await this.prisma.wishlists.findUnique({
        where: {
          user_id_product_id: {
            user_id: userId,
            product_id: productId,
          },
        },
      });

      if (!wishlistItem) {
        return {
          success: false,
          message: 'Sản phẩm không có trong danh sách yêu thích',
        };
      }

      // Remove from wishlist
      await this.prisma.wishlists.delete({
        where: {
          user_id_product_id: {
            user_id: userId,
            product_id: productId,
          },
        },
      });

      return { success: true, message: 'Đã xóa khỏi danh sách yêu thích' };
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      return {
        success: false,
        message: 'Lỗi khi xóa khỏi danh sách yêu thích',
      };
    }
  }

  async getWishlist(userId: number = 1) {
    try {
      const wishlist = await this.prisma.wishlists.findMany({
        where: { user_id: userId },
        include: {
          product: {
            include: {
              brand: true,
              product_categories: {
                include: {
                  category: true,
                },
              },
              shop: true,
              product_media: true,
              product_variants: true,
              reviews: {
                include: {
                  user: true,
                },
              },
            },
          },
        },
        orderBy: { created_at: 'desc' },
      });

      // Transform data to match frontend expectations
      const wishlistItems = wishlist.map((item) => ({
        id: item.product.id,
        name: item.product.name,
        slug: item.product.slug,
        description: item.product.description,
        avg_rating: Number(item.product.avg_rating) || 0,
        review_count: item.product.review_count,
        brand: item.product.brand,
        shop: item.product.shop,
        categories: item.product.product_categories.map((pc) => pc.category),
        media: item.product.product_media,
        variants: item.product.product_variants,
        reviews: item.product.reviews,
        added_at: item.created_at,
      }));

      return { success: true, wishlist: wishlistItems };
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      return { success: false, message: 'Lỗi khi tải danh sách yêu thích' };
    }
  }

  // Cart APIs - Requires authentication
  async addToCart(
    productId: number,
    variantId?: number,
    quantity: number = 1,
    userId?: number,
  ) {
    try {
      if (!userId) {
        return {
          success: false,
          message: 'Vui lòng đăng nhập để thêm vào giỏ hàng',
        };
      }

      // Get product details
      const product = await this.prisma.products.findUnique({
        where: { id: productId },
        include: {
          product_variants: true,
          product_media: true,
        },
      });

      if (!product) {
        return { success: false, message: 'Sản phẩm không tồn tại' };
      }

      // Get variant details
      const variant = variantId
        ? product.product_variants.find((v) => v.id === variantId)
        : product.product_variants[0];

      if (!variant) {
        return { success: false, message: 'Biến thể sản phẩm không tồn tại' };
      }

      // Find or create cart for user
      let cart = await this.prisma.carts.findUnique({
        where: { user_id: userId },
      });

      if (!cart) {
        cart = await this.prisma.carts.create({
          data: { user_id: userId },
        });
      }

      // Check if item already exists in cart
      const existingItem = await this.prisma.cart_items.findFirst({
        where: {
          cart_id: cart.id,
          product_id: productId,
          variant_id: variant.id,
        },
      });

      if (existingItem) {
        // Update quantity
        await this.prisma.cart_items.update({
          where: { id: existingItem.id },
          data: { quantity: existingItem.quantity + quantity },
        });
      } else {
        // Create new cart item
        await this.prisma.cart_items.create({
          data: {
            cart_id: cart.id,
            product_id: productId,
            variant_id: variant.id,
            quantity: quantity,
            price_snapshot: variant.price,
          },
        });
      }

      return { success: true, message: 'Đã thêm vào giỏ hàng' };
    } catch (error) {
      console.error('Error adding to cart:', error);
      return { success: false, message: 'Lỗi khi thêm vào giỏ hàng' };
    }
  }

  async getCart(userId?: number) {
    try {
      if (!userId) {
        return {
          success: false,
          message: 'Vui lòng đăng nhập để xem giỏ hàng',
        };
      }

      const cart = await this.prisma.carts.findUnique({
        where: { user_id: userId },
        include: {
          cart_items: {
            orderBy: {
              created_at: 'desc', // Sort items within the cart by most recently added
            },
            include: {
              product: {
                include: {
                  product_media: true,
                  shop: true,
                  brand: true,
                },
              },
              variant: true,
            },
          },
        },
      });

      if (!cart || cart.cart_items.length === 0) {
        return { success: true, cart: [] };
      }

      // Group cart items by shop
      const groupedCart: {
        shop_id: number;
        shop_name: string;
        items: any[];
      }[] = [];

      const shopMap = new Map<
        number,
        { shop_id: number; shop_name: string; items: any[] }
      >();

      cart.cart_items.forEach((item) => {
        const shopId = item.product.shop_id;
        if (!shopMap.has(shopId)) {
          shopMap.set(shopId, {
            shop_id: shopId,
            shop_name: item.product.shop?.name || 'Unknown Shop',
            items: [],
          });
        }
        const shopEntry = shopMap.get(shopId);
        if (shopEntry) {
          shopEntry.items.push({
            id: item.id,
            product_id: item.product_id,
            variant_id: item.variant_id,
            name: item.product.name,
            variant_name: item.variant?.name || '',
            price: Number(item.price_snapshot),
            quantity: item.quantity,
            image_url:
              item.product.product_media[0]?.url || '/placeholder-product.jpg',
            stock: item.variant?.stock || 0,
            brand_name: item.product.brand?.name || 'Unknown Brand',
            created_at: item.created_at,
          });
        }
      });

      // Convert map to array
      groupedCart.push(...Array.from(shopMap.values()));

      return { success: true, cart: groupedCart };
    } catch (error) {
      console.error('Error fetching cart:', error);
      return { success: false, message: 'Lỗi khi tải giỏ hàng' };
    }
  }

  async updateCartItem(itemId: number, quantity: number) {
    try {
      if (quantity <= 0) {
        // Remove item if quantity is 0 or negative
        await this.prisma.cart_items.delete({
          where: { id: itemId },
        });
        return { success: true, message: 'Đã xóa khỏi giỏ hàng' };
      } else {
        // Update quantity
        await this.prisma.cart_items.update({
          where: { id: itemId },
          data: { quantity: quantity },
        });
        return { success: true, message: 'Đã cập nhật giỏ hàng' };
      }
    } catch (error) {
      console.error('Error updating cart item:', error);
      return { success: false, message: 'Lỗi khi cập nhật giỏ hàng' };
    }
  }

  async removeFromCart(itemId: number) {
    try {
      await this.prisma.cart_items.delete({
        where: { id: itemId },
      });
      return { success: true, message: 'Đã xóa khỏi giỏ hàng' };
    } catch (error) {
      console.error('Error removing from cart:', error);
      return { success: false, message: 'Lỗi khi xóa khỏi giỏ hàng' };
    }
  }
}
