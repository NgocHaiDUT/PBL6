import { FileInterceptor } from '@nestjs/platform-express';
import { ProductService } from './product.service';
import { Controller,Body,Post , Get, UploadedFile ,Query, UseInterceptors, BadRequestException, Param} from '@nestjs/common';
// Import S3 config instead of local file config
import { s3BrandConfig, STORAGE_TYPE, generateBrandImageUrl, USE_S3 } from './config/product.config';
@Controller('product')
export class ProductController {
    constructor(private readonly productservice : ProductService ) {}

    @Get('all-brands')
    async getallbrands()
    {
        return this.productservice.getallbrand();
    }

    @Get('all-categories')
    async getallcategories()
    {
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
        return this.productservice.getallproducts({
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
        return this.productservice.getproductbyid(Number(id));
    }

    @Post('add-brand')
    @UseInterceptors(FileInterceptor('file', s3BrandConfig))
    async addbrand(
        @Body() body : {name: string,slug : string},
        @UploadedFile() file: any,
    )
    {
        if(!file) {
            throw new BadRequestException('Thiếu file ảnh');
        }
        // Tạo URL theo storage type (S3 hoặc local)
        const brandUrl = USE_S3 ? file.location : generateBrandImageUrl(file.filename);
        console.log(`📁 [${STORAGE_TYPE}] Brand image uploaded:`, brandUrl);
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
    @UseInterceptors(FileInterceptor('file', s3BrandConfig))
    async editbrandlogo(
        @Body() body : {id : string},
        @UploadedFile() file: any, 
    )
    {
        if(!body.id || !file) {
            return {success : false , message : 'Thiếu trường hoặc file ảnh'};
        }
        // Tạo URL theo storage type (S3 hoặc local)
        const brandUrl = USE_S3 ? file.location : generateBrandImageUrl(file.filename);
        console.log(`📁 [${STORAGE_TYPE}] Brand logo updated:`, brandUrl);
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
}
