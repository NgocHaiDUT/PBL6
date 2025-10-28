import { FileInterceptor } from '@nestjs/platform-express';
import { ProductService } from './product.service';
import { Controller,Body,Post , Get, UploadedFile ,Query, UseInterceptors, BadRequestException, Param, Put, Delete} from '@nestjs/common';
import { brandMulterConfig } from './config/product-multer.config';
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
    @UseInterceptors(FileInterceptor('file',brandMulterConfig))
    async addbrand(
        @Body() body : {name: string,slug : string},
        @UploadedFile() file: any,
    )
    {
        if(!file) {
            throw new BadRequestException('Thiếu file ảnh');
        }
        const brandUrl = `/uploads/brands/${file.filename}`;
        return this.productservice.addbrand(body.name,body.slug,brandUrl);
    }

    @Post('edit-brand-name')
    async editbrandname(@Body() body : {id : string, name : string}){
        if(!body.id || !body.name){
            return {success : false , message : 'Thiếu trường'};
        }
        return this.productservice.editbrandname(Number(body.id),body.name);
    }

    @Post('edit-brand-slug')
    async editbrandslug(@Body() body: {id : string, slug: string}){
        if(!body.id || !body.slug){
            return {success : false , message : 'Thiếu trường'};
        }
        return this.productservice.editbrandslug(Number(body.id),body.slug);
    }

    @Post('edit-brand-logo')
    @UseInterceptors(FileInterceptor('file',brandMulterConfig))
    async editbrandlogo(
        @Body() body : {id : string},
        @UploadedFile() file: any, 
    )
    {
        if(!body.id)
            return {success : false , message : 'Thiếu trường'};
        const brandUrl = `/uploads/brands/${file.filename}`;
        return this.productservice.editbrandslogo(Number(body.id),brandUrl);
    }

    @Post('add-category')
    async addcategory(@Body() body : {parent_id?: string,name: string,slug : string}){
        if(!body.name || !body.slug)
            return {success: false, message : 'Thiếu trường'};
        return this.productservice.addcategory(body.name,body.slug,Number(body.parent_id));
    }

    @Post('edit-category-name')
    async editcategoryname(@Body() body: {id : string, name : string}){
        if(!body.id || !body.name)
            return {success : false , message : 'Thiếu trường'};
        return this.productservice.editnamecategory(Number(body.id),body.name);
    }

    @Post('edit-category-slug')
    async editcategoryslug(@Body() body : {id : string, slug : string}){
        if(!body.id || !body.slug)
            return {success : false , message : 'Thiếu trường'};
        return this.productservice.editslugcategory(Number(body.id),body.slug);
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
