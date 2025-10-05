import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { skin_type, moderation_status } from '@prisma/client';
@Injectable()
export class ProductService {
    constructor(private prisma: PrismaService) {}

    async getallbrand(){
        var brands = await this.prisma.brands.findMany();
        return { success: true,brands: brands };
    }

    async addbrand(name: string, slug : string,logo_url: string){
        var ishasbrandname = await this.prisma.brands.findUnique({
            where : { name : name }
        })
        if(ishasbrandname){
            return { success: false,message: 'Tên thương hiệu đã tồn tại' };
        }
        var ishasbrandslug = await this.prisma.brands.findUnique({
            where : { slug : slug }
        })
        if(ishasbrandslug){
            return { success: false,message: 'Slug thương hiệu đã tồn tại' };
        }
        await this.prisma.brands.create({
            data : {
                name : name,
                slug : slug,
                logo_url : logo_url
            }
        })
        return { success: true,message: 'Thêm thương hiệu thành công' };
    }

    async editbrandname(id: number,name: string){
        var ishasbrand = await this.prisma.brands.findUnique({
            where : { id : id }
        })
        if(!ishasbrand){
            return { success: false,message: 'Thương hiệu không tồn tại' };
        }
        var ishasbrandname = await this.prisma.brands.findFirst({
            where : { name : name, id: { not: id } }
        })
        if(ishasbrandname){
            return { success: false,message: 'Tên thương hiệu đã tồn tại' };
        }
        await this.prisma.brands.update({
            where : { id : id },
            data : {
                name : name,
            }
        })
        return { success: true,message: 'Cập nhật thương hiệu thành công' };
    }

    async editbrandslug(id: number, slug:string){
        var ishasbrand = await this.prisma.brands.findUnique({
            where : {id : id}
        })
        if(!ishasbrand)
            return {success: false, message: 'Thương hiệu không tồn tại'};
        var ishasbrandslug = await this.prisma.brands.findUnique({
            where : {slug : slug}     
        })
        if(ishasbrandslug)
            return {success: false, message: 'Slug thương hiệu đã tồn tại'};
        await this.prisma.brands.update({
            where : {id : id},
            data : {slug : slug}
        })
        return {success: true, message: 'Cập nhật Slug thương hiệu thành công'};
    }

    async editbrandslogo(id:number, logo_url:string){
        var ishasbrand = await this.prisma.brands.findUnique({
            where : {id : id}
        })
        if(!ishasbrand)
            return {success: false, message: 'Thương hiệu không tồn tại'};
        await this.prisma.brands.update({
            where : {id : id},
            data : {logo_url : logo_url}
        })
        return {success:true,message : 'Cập nhật logo thương hiệu thành công'};
    }

    async addcategory(name: string, slug : string,parent_id?: number){
        var ishascategoryname = await this.prisma.categories.findFirst({
            where : { name : name }
        })
        if(ishascategoryname){
            return { success: false,message: 'Tên danh mục đã tồn tại' };
        }
        var ishascategoryslug = await this.prisma.categories.findUnique({
            where : { slug : slug }
        })
        if(ishascategoryslug){
            return { success: false,message: 'Slug danh mục đã tồn tại' };
        }
        await this.prisma.categories.create({
            data : {
                parent_id : parent_id,
                name : name,
                slug : slug,
            }
        })
        return { success: true,message: 'Thêm danh mục thành công' };
    }
     
    async editnamecategory(id : number, name:string)
    {
        var ishascategory = await this.prisma.categories.findFirst({
            where : {id : id}
        })
        if(!ishascategory)
            return {success: false , message : 'Danh mục không tồn tại'};

        var ishascategoryname = await this.prisma.categories.findFirst({
            where : {name : name}
        })
        if (ishascategoryname)
            return {success : false , message : 'Tên danh mục đã tồn tại'};

        await this.prisma.categories.update({
            where : { id : id},
            data : {name : name}
        })
        return {success: true , message : 'Cập nhật tên danh mục thành công'};

    }

    async editslugcategory(id : number , slug : string){
        var ishascategory = await this.prisma.categories.findFirst({
            where : {id : id}
        })
        if(!ishascategory)
            return {success: false , message : 'Danh mục không tồn tại'};
        var ishascategoryslug = await this.prisma.categories.findUnique({
            where : { slug : slug}
        })

        if(ishascategoryslug)
            return {sucess : false, message : 'Slug danh mục đã tồn tại'};

        await this.prisma.categories.update({
            where : { id : id},
            data : { slug : slug }
        })
        return {success : true , message : 'Cập nhật slug danh mục thành công'};
    }

    async addproducts(
        shop_id: number, 
        name: string, 
        slug: string, 
        skin_type_compat: skin_type,
        is_published: boolean,
        how_to_use?: string, 
        description?: string,
        brand_id?: number,
        category_ids?: number[]
    ) {
        try {
            const shop = await this.prisma.shops.findUnique({
                where: { id: shop_id }
            });
            if (!shop) {
                return { success: false, message: 'Shop không tồn tại' };
            }

            const existingProduct = await this.prisma.products.findUnique({
                where: { slug: slug }
            });
            if (existingProduct) {
                return { success: false, message: 'Slug sản phẩm đã tồn tại' };
            }

            if (brand_id) {
                const brand = await this.prisma.brands.findUnique({
                    where: { id: brand_id }
                });
                if (!brand) {
                    return { success: false, message: 'Thương hiệu không tồn tại' };
                }
            }

            if (category_ids && category_ids.length > 0) {
                const categories = await this.prisma.categories.findMany({
                    where: { id: { in: category_ids } }
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
                        slug: slug,
                        description: description,   
                        how_to_use: how_to_use,
                        skin_type_compat: skin_type_compat,
                        is_published: is_published,
                        moderation_status: moderation_status.pending,
                        created_at: new Date(),
                        updated_at: new Date(),
                    },
                });

                if (category_ids && category_ids.length > 0) {
                    const productCategories = category_ids.map(category_id => ({
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
                product: result
            };

        } catch (error) {
            console.error('Error adding product:', error);
            return { 
                success: false, 
                message: 'Lỗi khi thêm sản phẩm',
                error: error.message 
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
        compare_at_price?: number
    ) {
        try {
            const product = await this.prisma.products.findUnique({
                where: { id: product_id }
            });
            if (!product) {
                return { success: false, message: 'Sản phẩm không tồn tại' };
            }

            const existingSku = await this.prisma.product_variants.findUnique({
                where: { sku: sku }
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
                    created_at: new Date(),
                    updated_at: new Date(),
                },
            });

            return { 
                success: true, 
                message: 'Thêm variant thành công',
                variant: variant
            };

        } catch (error) {
            console.error('Error adding variant:', error);
            return { 
                success: false, 
                message: 'Lỗi khi thêm variant',
                error: error.message 
            };
        }
    }

    async addProductMedia(
        product_id: number,
        url: string,
        type: string = 'image',
        sort_order: number = 0
    ) {
        try {
            const product = await this.prisma.products.findUnique({
                where: { id: product_id }
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
                media: media
            };

        } catch (error) {
            console.error('Error adding media:', error);
            return { 
                success: false, 
                message: 'Lỗi khi thêm media',
                error: error.message 
            };
        }
    }
    
}
