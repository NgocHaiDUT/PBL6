import { FileInterceptor } from '@nestjs/platform-express';
import { ProductService } from './product.service';
// Import S3 config instead of local file config
import { s3BrandConfig, STORAGE_TYPE, generateBrandImageUrl, USE_S3 } from './config/product.config';
import { Controller, Body, Post, Get, UploadedFile, Query, UseInterceptors, BadRequestException, Param, ParseIntPipe, Put, Delete, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
// Import local file config for local testing
// import { s3BrandConfig } from './config/s3-product.config';
import { brandMulterConfig, productMediaMulterConfig } from './config/product-multer.config';

@Controller('product')
export class ProductController {
  constructor(private readonly productservice: ProductService) {}

  @Get('all-brands')
  async getallbrands() {
    console.log('Controller - getallbrands called');
    return this.productservice.getallbrand();
  }

    @Get('all-categories')
    async getallcategories()
    {
        console.log('Controller - getallcategories called');
        return this.productservice.getallcategories();
    }

    @Get('all-products')
    async getallproducts(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('category') category?: string,
        @Query('brand') brand?: string,
        @Query('minPrice') minPrice?: string,
        @Query('maxPrice') maxPrice?: string,
        @Query('minRating') minRating?: string,
        @Query('search') search?: string,
    )
    {
        return this.productservice.getAllProducts({
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20,
            category,
            brand,
            minPrice: minPrice ? parseFloat(minPrice) : undefined,
            maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
            minRating: minRating ? parseFloat(minRating) : undefined,
            search,
        });
    }

    @Get('product/:id')
    async getproductbyid(@Param('id') id: string)
    {
        if (!id) {
            throw new BadRequestException('Thiếu ID sản phẩm');
        }
        return this.productservice.getProductById(Number(id));
    }

  @Post('add-brand')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('manage_brands')
  @UseInterceptors(FileInterceptor('file', brandMulterConfig))
  async addbrand(
    @Body() body: { name: string; slug: string },
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('Thiếu file ảnh');
    }
    const userId = req.user.userId;
    const brandUrl = `/uploads/brands/${file.filename}`;
    return this.productservice.addbrand(userId, body.name, body.slug, brandUrl);
  }

  @Post('edit-brand-name')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('manage_brands')
  async editbrandname(
    @Body() body: { id: string; name: string },
    @Req() req: any,
  ) {
    if (!body.id || !body.name) {
      return { success: false, message: 'Thiếu trường' };
    }
    const userId = req.user.userId;
    return this.productservice.editbrandname(
      userId,
      Number(body.id),
      body.name,
    );
  }

  @Post('edit-brand-slug')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('manage_brands')
  async editbrandslug(
    @Body() body: { id: string; slug: string },
    @Req() req: any,
  ) {
    if (!body.id || !body.slug) {
      return { success: false, message: 'Thiếu trường' };
    }
    const userId = req.user.userId;
    return this.productservice.editbrandslug(
      userId,
      Number(body.id),
      body.slug,
    );
  }

  @Post('edit-brand-logo')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('manage_brands')
  @UseInterceptors(FileInterceptor('file', brandMulterConfig))
  async editbrandlogo(
    @Body() body: { id: string },
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!body.id || !file) {
      return { success: false, message: 'Thiếu trường hoặc file ảnh' };
    }
    const userId = req.user.userId;
    const brandUrl = `/uploads/brands/${file.filename}`;
    return this.productservice.editbrandslogo(
      userId,
      Number(body.id),
      brandUrl,
    );
  }

  @Post('add-category')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('manage_categorys')
  async addcategory(
    @Body() body: { parent_id?: string; name: string; slug: string },
    @Req() req: any,
  ) {
    if (!body.name || !body.slug)
      return { success: false, message: 'Thiếu trường' };
    const userId = req.user.userId;
    return this.productservice.addcategory(
      userId,
      body.name,
      body.slug,
      Number(body.parent_id),
    );
  }

  @Post('edit-category-name')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('manage_categorys')
  async editcategoryname(
    @Body() body: { id: string; name: string },
    @Req() req: any,
  ) {
    if (!body.id || !body.name)
      return { success: false, message: 'Thiếu trường' };
    const userId = req.user.userId;
    return this.productservice.editnamecategory(
      userId,
      Number(body.id),
      body.name,
    );
  }

  @Post('edit-category-slug')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('manage_categorys')
  async editcategoryslug(
    @Body() body: { id: string; slug: string },
    @Req() req: any,
  ) {
    if (!body.id || !body.slug)
      return { success: false, message: 'Thiếu trường' };
    const userId = req.user.userId;
    return this.productservice.editslugcategory(
      userId,
      Number(body.id),
      body.slug,
    );
  }

  @Post('add-product')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('create_product')
  async addProduct(
    @Body()
    body: {
      shop_id: string;
      name: string;
      slug?: string;
      skin_type_compat: string;
      is_published: boolean;
      how_to_use?: string;
      description?: string;
      brand_id?: string;
      category_ids?: any[];
    },
    @Req() req: any,
  ) {
    if (!body.shop_id || !body.name || !body.skin_type_compat) {
      return {
        success: false,
        message: 'Thiếu trường bắt buộc (shop_id, name, skin_type_compat)',
      };
    }

    const validSkinTypes = [
      'unknown',
      'normal',
      'oily',
      'dry',
      'combination',
      'sensitive',
    ];
    if (!validSkinTypes.includes(body.skin_type_compat)) {
      return {
        success: false,
        message: `skin_type_compat không hợp lệ. Chỉ chấp nhận: ${validSkinTypes.join(', ')}`,
        received: body.skin_type_compat,
      };
    }

        const categoryIds = body.category_ids
            ? body.category_ids.map(id => Number(id))
            : undefined;
        const userId = req.user.userId;
        return this.productservice.addproducts(
            userId,
            Number(body.shop_id),
            body.name,
            body.slug || '',
            body.skin_type_compat as any,
            body.is_published ?? false,
            body.how_to_use,
            body.description,
            body.brand_id ? Number(body.brand_id) : undefined,
            categoryIds
        );
    }

  @Put('edit-product/:id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('edit_product')
  async editProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      name?: string;
      slug?: string;
      description?: string;
      how_to_use?: string;
      skin_type_compat?: string;
      is_published?: boolean;
      brand_id?: string;
      category_ids?: any[];
    },
    @Req() req: any,
  ) {
    if (body.skin_type_compat) {
      const validSkinTypes = [
        'unknown',
        'normal',
        'oily',
        'dry',
        'combination',
        'sensitive',
      ];
      if (!validSkinTypes.includes(body.skin_type_compat)) {
        return {
          success: false,
          message: `skin_type_compat không hợp lệ. Chỉ chấp nhận: ${validSkinTypes.join(', ')}`,
          received: body.skin_type_compat,
        };
      }
    }

    const categoryIds = body.category_ids
      ? body.category_ids.map((id) => Number(id))
      : undefined;

    const userId = req.user.userId;
    return this.productservice.editProduct(
      id,
      userId,
      body.name,
      body.slug,
      body.description,
      body.how_to_use,
      body.skin_type_compat as any,
      body.is_published,
      body.brand_id ? Number(body.brand_id) : undefined,
      categoryIds,
    );
  }

  @Delete('delete-product/:id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('delete_product')
  async deleteProduct(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.user.userId;
    return this.productservice.deleteProduct(id, userId);
  }

  @Post('add-product-variant')
  async addProductVariant(
    @Body()
    body: {
      product_id: string;
      sku: string;
      name: string;
      price: string;
      stock?: string;
      shade_hex?: string;
      size_label?: string;
      compare_at_price?: string;
    },
  ) {
    if (!body.product_id || !body.sku || !body.name || !body.price) {
      return { success: false, message: 'Thiếu trường bắt buộc' };
    }

    return this.productservice.addProductVariant(
      Number(body.product_id),
      body.sku,
      body.name,
      Number(body.price),
      body.stock ? Number(body.stock) : 0,
      body.shade_hex,
      body.size_label,
      body.compare_at_price ? Number(body.compare_at_price) : undefined,
    );
  }

  @Put('edit-product-variant/:id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('edit_product')
  async editProductVariant(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      sku?: string;
      name?: string;
      price?: string;
      stock?: string;
      shade_hex?: string;
      size_label?: string;
      compare_at_price?: string;
      is_active?: boolean;
    },
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.productservice.editProductVariant(
      id,
      userId,
      body.sku,
      body.name,
      body.price ? Number(body.price) : undefined,
      body.stock ? Number(body.stock) : undefined,
      body.shade_hex,
      body.size_label,
      body.compare_at_price ? Number(body.compare_at_price) : undefined,
      body.is_active,
    );
  }

  @Delete('delete-product-variant/:id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('delete_product')
  async deleteProductVariant(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.productservice.deleteProductVariant(id, userId);
  }

  @Post('add-product-media')
  @UseInterceptors(FileInterceptor('file', productMediaMulterConfig))
  async addProductMedia(
    @Query('product_id') product_id: string,
    @Query('type') type?: string,
    @Query('sort_order') sort_order?: string,
    @UploadedFile() file?: any,
  ) {
    if (!product_id) {
      return { success: false, message: 'product_id là bắt buộc' };
    }

    if (!file) {
      return { success: false, message: 'Thiếu file ảnh' };
    }

    const mediaUrl = `/uploads/products/${file.filename}`;

    return this.productservice.addProductMedia(
      Number(product_id),
      mediaUrl,
      type || 'image',
      sort_order ? Number(sort_order) : 0,
    );
  }

  @Get('shop/:shopId/products')
  async getShopProducts(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('category_id') category_id?: string,
    @Query('brand_id') brand_id?: string,
    @Query('is_published') is_published?: string,
    @Query('skin_type') skin_type?: string,
    @Query('min_price') min_price?: string,
    @Query('max_price') max_price?: string,
    @Query('sort_field') sort_field?: string,
    @Query('sort_order') sort_order?: string,
  ) {
    // Parse pagination
    const pageNum = page ? parseInt(page) : 1;
    const limitNum = limit ? parseInt(limit) : 20;

    // Build filters
    const filters: any = {};
    if (search) filters.search = search;
    if (category_id) filters.category_id = parseInt(category_id);
    if (brand_id) filters.brand_id = parseInt(brand_id);
    if (is_published !== undefined)
      filters.is_published = is_published === 'true';
    if (skin_type) filters.skin_type = skin_type;
    if (min_price) filters.min_price = parseFloat(min_price);
    if (max_price) filters.max_price = parseFloat(max_price);

    // Build sort
    let sort: any = undefined;
    if (sort_field) {
      const validFields = [
        'created_at',
        'updated_at',
        'name',
        'avg_rating',
        'review_count',
      ];
      if (validFields.includes(sort_field)) {
        sort = {
          field: sort_field as any,
          order: sort_order === 'asc' ? 'asc' : 'desc',
        };
      }
    }

    return this.productservice.getShopProducts(
      shopId,
      pageNum,
      limitNum,
      Object.keys(filters).length > 0 ? filters : undefined,
      sort,
    );
  }

  // Customer Product APIs
  @Get('products')
  async getAllProducts(@Query() query: any) {
    return this.productservice.getAllProducts(query);
  }

  @Get('products/search')
  async searchProducts(@Query() query: any) {
    return this.productservice.searchProducts(query);
  }

  @Get('products/filter')
  async filterProducts(@Query() query: any) {
    return this.productservice.filterProducts(query);
  }

  @Get('products/:id')
  async getProductById(@Param('id') id: string) {
    return this.productservice.getProductById(Number(id));
  }

  // Wishlist APIs
  @Post('wishlist/add')
  @UseGuards(AuthGuard('jwt'))
  async addToWishlist(@Body() body: { productId: number }, @Req() req: any) {
    const userId = req.user.userId;
    return this.productservice.addToWishlist(body.productId, userId);
  }

  @Delete('wishlist/remove/:productId')
  @UseGuards(AuthGuard('jwt'))
  async removeFromWishlist(
    @Param('productId') productId: string,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.productservice.removeFromWishlist(Number(productId), userId);
  }

  @Get('wishlist')
  @UseGuards(AuthGuard('jwt'))
  async getWishlist(@Req() req: any) {
    const userId = req.user.userId;
    return this.productservice.getWishlist(userId);
  }

  // Cart APIs
  @Post('cart/add')
  @UseGuards(AuthGuard('jwt'))
  async addToCart(
    @Body() body: { productId: number; variantId?: number; quantity: number },
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.productservice.addToCart(
      body.productId,
      body.variantId,
      body.quantity,
      userId,
    );
  }

  @Get('cart')
  @UseGuards(AuthGuard('jwt'))
  async getCart(@Req() req: any) {
    const userId = req.user.userId;
    return this.productservice.getCart(userId);
  }

  @Put('cart/items/:itemId')
  async updateCartItem(
    @Param('itemId') itemId: string,
    @Body() body: { quantity: number },
  ) {
    return this.productservice.updateCartItem(Number(itemId), body.quantity);
  }

    @Delete('cart/items/:itemId')
    async removeFromCart(@Param('itemId') itemId: string) {
        return this.productservice.removeFromCart(Number(itemId));
    }
    */
}
