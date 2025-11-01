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

    async addbrand(userid:number,name: string, slug : string,logo_url: string){
        var brandpermission = await this.prisma.permission.findFirst({
            where : {name : "manage_brands"},
            select : {id : true}
        })
        if(!brandpermission)
        {
            return  {message : "Lỗi hệ thống, không tìm thấy quyền manage_brands"}
        }
        var hasbrandpermission = await this.prisma.userpermission.findFirst({
            where : {user_id:userid , permission_id : brandpermission.id},
            select : {user_id : true}
        })
        if(!hasbrandpermission){
            return {message : "Bạn không có quyền về thương hiệu"}
        }

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

    async editbrandname(userid:number,id: number,name: string){
        var brandpermission = await this.prisma.permission.findFirst({
            where : {name : "manage_brands"},
            select : {id : true}
        })
        if(!brandpermission)
        {
            return  {message : "Lỗi hệ thống, không tìm thấy quyền manage_brands"}
        }
        var hasbrandpermission = await this.prisma.userpermission.findFirst({
            where : {user_id:userid , permission_id : brandpermission.id},
            select : {user_id : true}
        })
        if(!hasbrandpermission){
            return {message : "Bạn không có quyền về thương hiệu"}
        }

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

    async editbrandslug(userid:number,id: number, slug:string){
        var brandpermission = await this.prisma.permission.findFirst({
            where : {name : "manage_brands"},
            select : {id : true}
        })
        if(!brandpermission)
        {
            return  {message : "Lỗi hệ thống, không tìm thấy quyền manage_brands"}
        }
        var hasbrandpermission = await this.prisma.userpermission.findFirst({
            where : {user_id:userid , permission_id : brandpermission.id},
            select : {user_id : true}
        })
        if(!hasbrandpermission){
            return {message : "Bạn không có quyền về thương hiệu"}
        }

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

    async editbrandslogo(userid:number,id:number, logo_url:string){
        var brandpermission = await this.prisma.permission.findFirst({
            where : {name : "manage_brands"},
            select : {id : true}
        })
        if(!brandpermission)
        {
            return  {message : "Lỗi hệ thống, không tìm thấy quyền manage_brands"}
        }
        var hasbrandpermission = await this.prisma.userpermission.findFirst({
            where : {user_id:userid , permission_id : brandpermission.id},
            select : {user_id : true}
        })
        if(!hasbrandpermission){
            return {message : "Bạn không có quyền về thương hiệu"}
        }

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

    async addcategory(userid:number,name: string, slug : string,parent_id?: number){
        var categorypermission = await this.prisma.permission.findFirst({
            where : {name : "manage_categorys"},
            select : {id : true}
        })
        if(!categorypermission)
        {
            return  {message : "Lỗi hệ thống, không tìm thấy quyền manage_categorys"}
        }
        var hascategorypermission = await this.prisma.userpermission.findFirst({
            where : {user_id:userid , permission_id : categorypermission.id},
            select : {user_id : true}
        })
        if(!hascategorypermission){
            return {message : "Bạn không có quyền về danh mục"}
        }

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
     
    async editnamecategory(userid:number,id : number, name:string)
    {
        var categorypermission = await this.prisma.permission.findFirst({
            where : {name : "manage_categorys"},
            select : {id : true}
        })
        if(!categorypermission)
        {
            return  {message : "Lỗi hệ thống, không tìm thấy quyền manage_categorys"}
        }
        var hascategorypermission = await this.prisma.userpermission.findFirst({
            where : {user_id:userid , permission_id : categorypermission.id},
            select : {user_id : true}
        })
        if(!hascategorypermission){
            return {message : "Bạn không có quyền về danh mục"}
        }

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

    async editslugcategory(userid:number,id : number , slug : string){
        var categorypermission = await this.prisma.permission.findFirst({
            where : {name : "manage_categorys"},
            select : {id : true}
        })
        if(!categorypermission)
        {
            return  {message : "Lỗi hệ thống, không tìm thấy quyền manage_categorys"}
        }
        var hascategorypermission = await this.prisma.userpermission.findFirst({
            where : {user_id:userid , permission_id : categorypermission.id},
            select : {user_id : true}
        })
        if(!hascategorypermission){
            return {message : "Bạn không có quyền về danh mục"}
        }
        
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
        user_id: number,
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
            // Kiểm tra permission create_product
            const permission = await this.prisma.userpermission.findFirst({
                where: {
                    user_id: user_id,
                    permission: {
                        name: 'create_product'
                    }
                },
                include: {
                    permission: true
                }
            });

            if (!permission) {
                return { success: false, message: 'Bạn không có quyền tạo sản phẩm' };
            }

            const shop = await this.prisma.shops.findUnique({
                where: { id: shop_id }
            });
            if (!shop) {
                return { success: false, message: 'Shop không tồn tại' };
            }

            // Kiểm tra user có quyền tạo sản phẩm cho shop này không
            const isOwner = shop.owner_id === user_id;
            const isStaff = await this.prisma.shop_staffs.findFirst({
                where: {
                    shop_id: shop_id,
                    user_id: user_id
                }
            });

            if (!isOwner && !isStaff) {
                return { success: false, message: 'Bạn không có quyền tạo sản phẩm cho shop này' };
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

    async getShopProducts(
        shop_id: number,
        page: number = 1,
        limit: number = 20,
        filters?: {
            search?: string;
            category_id?: number;
            brand_id?: number;
            is_published?: boolean;
            skin_type?: skin_type;
            min_price?: number;
            max_price?: number;
        },
        sort?: {
            field: 'created_at' | 'updated_at' | 'name' | 'avg_rating' | 'review_count';
            order: 'asc' | 'desc';
        }
    ) {
        try {
            // Validate shop exists
            const shop = await this.prisma.shops.findUnique({
                where: { id: shop_id }
            });
            if (!shop) {
                return { success: false, message: 'Shop không tồn tại' };
            }

            // Build where clause
            const whereClause: any = {
                shop_id: shop_id,
            };

            // Apply filters
            if (filters) {
                if (filters.search) {
                    whereClause.OR = [
                        { name: { contains: filters.search, mode: 'insensitive' } },
                        { description: { contains: filters.search, mode: 'insensitive' } }
                    ];
                }

                if (filters.brand_id) {
                    whereClause.brand_id = filters.brand_id;
                }

                if (filters.is_published !== undefined) {
                    whereClause.is_published = filters.is_published;
                }

                if (filters.skin_type) {
                    whereClause.skin_type_compat = filters.skin_type;
                }

                if (filters.category_id) {
                    whereClause.product_categories = {
                        some: {
                            category_id: filters.category_id
                        }
                    };
                }
            }

            // Build orderBy
            const orderBy: any = sort 
                ? { [sort.field]: sort.order }
                : { created_at: 'desc' }; // Default sort

            // Calculate pagination
            const skip = (page - 1) * limit;

            // Get total count for pagination metadata
            const totalProducts = await this.prisma.products.count({
                where: whereClause
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
                            logo_url: true
                        }
                    },
                    product_categories: {
                        include: {
                            category: {
                                select: {
                                    id: true,
                                    name: true,
                                    slug: true
                                }
                            }
                        }
                    },
                    product_media: {
                        orderBy: {
                            sort_order: 'asc'
                        },
                        take: 5 // Limit media per product
                    },
                    product_variants: {
                        where: {
                            is_active: true
                        },
                        orderBy: {
                            price: 'asc'
                        },
                        select: {
                            id: true,
                            sku: true,
                            name: true,
                            price: true,
                            compare_at_price: true,
                            stock: true,
                            shade_hex: true,
                            size_label: true
                        }
                    }
                },
                orderBy: orderBy,
                skip: skip,
                take: limit
            });

            // Apply price filter if needed (filter on variants)
            let filteredProducts = products;
            if (filters?.min_price !== undefined || filters?.max_price !== undefined) {
                filteredProducts = products.filter(product => {
                    const variants = product.product_variants;
                    if (variants.length === 0) return false;
                    
                    const prices = variants.map(v => Number(v.price));
                    const minProductPrice = Math.min(...prices);
                    const maxProductPrice = Math.max(...prices);

                    if (filters.min_price !== undefined && maxProductPrice < filters.min_price) {
                        return false;
                    }
                    if (filters.max_price !== undefined && minProductPrice > filters.max_price) {
                        return false;
                    }
                    return true;
                });
            }

            // Calculate pagination metadata
            const totalPages = Math.ceil(totalProducts / limit);
            const hasNextPage = page < totalPages;
            const hasPrevPage = page > 1;

            return {
                success: true,
                data: {
                    products: filteredProducts,
                    pagination: {
                        total: totalProducts,
                        page: page,
                        limit: limit,
                        totalPages: totalPages,
                        hasNextPage: hasNextPage,
                        hasPrevPage: hasPrevPage
                    }
                }
            };

        } catch (error) {
            console.error('Error fetching shop products:', error);
            return {
                success: false,
                message: 'Lỗi khi lấy danh sách sản phẩm',
                error: error.message
            };
        }
    }
    
}
