import { FileInterceptor } from '@nestjs/platform-express';
import { ProductService } from './product.service';
import { Controller,Body,Post , Get, UploadedFile ,Query, UseInterceptors, BadRequestException} from '@nestjs/common';
// Import S3 config instead of local file config
import { s3BrandConfig } from './config/s3-product.config';
@Controller('product')
export class ProductController {
    constructor(private readonly productservice : ProductService ) {}

    @Get('all-brands')
    async getallbrands()
    {
        return this.productservice.getallbrand();
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
        // S3 trả về full URL trong file.location
        const brandUrl = file.location;
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
        // S3 trả về full URL trong file.location
        const brandUrl = file.location;
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
