import { FileInterceptor } from '@nestjs/platform-express';
import { ProductService } from './product.service';
import { Controller,Body,Post , Get, UploadedFile ,Query, UseInterceptors, BadRequestException, Param, ParseIntPipe, Put,Delete} from '@nestjs/common';
// Import S3 config instead of local file config
import { s3BrandConfig } from './config/s3-product.config';
@Controller('product')
export class ProductController {
    constructor(private readonly productservice : ProductService ) {}

    @Get('all-brands')
    async getallbrands()
    {
        console.log('Controller - getallbrands called');
        return this.productservice.getallbrand();
    }

    @Get('all-categories')
    async getallcategories()
    {
        console.log('Controller - getallcategories called');
        return this.productservice.getallcategories();
    }

    @Post('add-brand')
    @UseInterceptors(FileInterceptor('file', s3BrandConfig))
    async addbrand(
        @Body() body : {userid:string,name: string,slug : string},
        @UploadedFile() file: any,
    )
    {
        if(!file) {
            throw new BadRequestException('Thiếu file ảnh');
        }
        // S3 trả về full URL trong file.location
        const brandUrl = file.location;
        return this.productservice.addbrand(Number(body.userid),body.name,body.slug,brandUrl);
    }
    
    @Post('edit-brand-name')
    async editbrandname(@Body() body : {userid:string,id : string, name : string}){
        if(!body.id || !body.name){
            return {success : false , message : 'Thiếu trường'};
        }
        return this.productservice.editbrandname(Number(body.userid),Number(body.id),body.name);
    }

    @Post('edit-brand-slug')
    async editbrandslug(@Body() body: {userid:string,id : string, slug: string}){
        if(!body.id || !body.slug){
            return {success : false , message : 'Thiếu trường'};
        }
        return this.productservice.editbrandslug(Number(body.userid),Number(body.id),body.slug);
    }

    @Post('edit-brand-logo')
    @UseInterceptors(FileInterceptor('file', s3BrandConfig))
    async editbrandlogo(
        @Body() body : {userid:string,id : string},
        @UploadedFile() file: any, 
    )
    {
        if(!body.id || !file) {
            return {success : false , message : 'Thiếu trường hoặc file ảnh'};
        }
        // S3 trả về full URL trong file.location
        const brandUrl = file.location;
        return this.productservice.editbrandslogo(Number(body.userid),Number(body.id),brandUrl);
    }

    @Post('add-category')
    async addcategory(@Body() body : {userid:string,parent_id?: string,name: string,slug : string}){
        if(!body.name || !body.slug)
            return {success: false, message : 'Thiếu trường'};
        return this.productservice.addcategory(Number(body.userid),body.name,body.slug,Number(body.parent_id));
    }

    @Post('edit-category-name')
    async editcategoryname(@Body() body: {userid:string,id : string, name : string}){
        if(!body.id || !body.name)
            return {success : false , message : 'Thiếu trường'};
        return this.productservice.editnamecategory(Number(body.userid),Number(body.id),body.name);
    }

    @Post('edit-category-slug')
    async editcategoryslug(@Body() body : {userid:string,id : string, slug : string}){
        if(!body.id || !body.slug)
            return {success : false , message : 'Thiếu trường'};
        return this.productservice.editslugcategory(Number(body.userid),Number(body.id),body.slug);
    }

    @Post('add-product')
    async addProduct(@Body() body: {
        user_id: string;
        shop_id: string;
        name: string;
        slug: string;
        skin_type_compat: string;
        is_published: boolean;
        how_to_use?: string;
        description?: string;
        brand_id?: string;
        category_ids?: number[];
    }) {
        if (!body.user_id || !body.shop_id || !body.name || !body.slug || !body.skin_type_compat) {
            return { success: false, message: 'Thiếu trường bắt buộc' };
        }

        return this.productservice.addproducts(
            Number(body.user_id),
            Number(body.shop_id),
            body.name,
            body.slug,
            body.skin_type_compat as any,
            body.is_published ?? false,
            body.how_to_use,
            body.description,
            body.brand_id ? Number(body.brand_id) : undefined,
            body.category_ids
        );
    }

    @Post('add-product-variant')
    async addProductVariant(@Body() body: {
        product_id: string;
        sku: string;
        name: string;
        price: string;
        stock?: string;
        shade_hex?: string;
        size_label?: string;
        compare_at_price?: string;
    }) {
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
            body.compare_at_price ? Number(body.compare_at_price) : undefined
        );
    }

    @Post('add-product-media')
    async addProductMedia(@Body() body: {
        product_id: string;
        url: string;
        type?: string;
        sort_order?: string;
    }) {
        if (!body.product_id || !body.url) {
            return { success: false, message: 'Thiếu trường bắt buộc' };
        }

        return this.productservice.addProductMedia(
            Number(body.product_id),
            body.url,
            body.type || 'image',
            body.sort_order ? Number(body.sort_order) : 0
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
        if (is_published !== undefined) filters.is_published = is_published === 'true';
        if (skin_type) filters.skin_type = skin_type;
        if (min_price) filters.min_price = parseFloat(min_price);
        if (max_price) filters.max_price = parseFloat(max_price);

        // Build sort
        let sort: any = undefined;
        if (sort_field) {
            const validFields = ['created_at', 'updated_at', 'name', 'avg_rating', 'review_count'];
            if (validFields.includes(sort_field)) {
                sort = {
                    field: sort_field as any,
                    order: (sort_order === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc'
                };
            }
        }

        return this.productservice.getShopProducts(
            shopId,
            pageNum,
            limitNum,
            Object.keys(filters).length > 0 ? filters : undefined,
            sort
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
    async addToWishlist(@Body() body: { productId: number, userId?: number }) {
        const userId = body.userId || 1; // Mock user ID
        return this.productservice.addToWishlist(body.productId, userId);
    }

    @Delete('wishlist/remove/:productId')
    async removeFromWishlist(@Param('productId') productId: string, @Body() body: { userId?: number }) {
        const userId = body.userId || 1; // Mock user ID
        return this.productservice.removeFromWishlist(Number(productId), userId);
    }

    @Get('wishlist')
    async getWishlist(@Query('userId') userId?: string) {
        const userIdNum = userId ? Number(userId) : 1; // Mock user ID
        return this.productservice.getWishlist(userIdNum);
    }

    // Cart APIs
    @Post('cart/add')
    async addToCart(@Body() body: { productId: number, variantId?: number, quantity: number, userId?: number }) {
        return this.productservice.addToCart(body.productId, body.variantId, body.quantity, body.userId);
    }

    @Get('cart')
    async getCart(@Query('userId') userId?: string) {
        return this.productservice.getCart(userId ? Number(userId) : undefined);
    }

    @Put('cart/items/:itemId')
    async updateCartItem(@Param('itemId') itemId: string, @Body() body: { quantity: number }) {
        return this.productservice.updateCartItem(Number(itemId), body.quantity);
    }

    @Delete('cart/items/:itemId')
    async removeFromCart(@Param('itemId') itemId: string) {
        return this.productservice.removeFromCart(Number(itemId));
    }
}
