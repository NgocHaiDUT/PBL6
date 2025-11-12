import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { skin_type, moderation_status, Prisma } from '@prisma/client';
@Injectable()
export class ProductService {
    constructor(private prisma: PrismaService) {}

    async getallbrand(){
        var brands = await this.prisma.brands.findMany();
        return { success: true,brands: brands };
    }

    async getallcategories(){
        const categories = await this.prisma.categories.findMany({
            orderBy: { name: 'asc' }
        });
        return { success: true, categories: categories };
    }

    async addbrand(userid : number,name: string, slug : string,logo_url: string){
        var brandpermission = await this.prisma.permission.findFirst({
            where : {name : "manage_brands"},
            select : {id : true}
        })
        if(!brandpermission){
            return {message : "Lỗi hệ thống , permission manage_brands không tồn tại"}
        }

        var hasbrandpermission = await this.prisma.userpermission.findFirst({
            where : {user_id: userid, permission_id : brandpermission.id},
            select : {user_id : true}
        })
        if(!hasbrandpermission) {
            return {message : "Bạn không có quyền brand"}
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

    // Customer Product APIs
    async getAllProducts(query: any) {
        try {
            const { page = 1, limit = 12, category, brand, min_price, max_price, sort = 'newest' } = query;
            const skip = (Number(page) - 1) * Number(limit);

            const where: any = {
                is_published: true,
                moderation_status: 'approved'
            };

            if (category) {
                where.product_categories = {
                    some: {
                        category_id: Number(category)
                    }
                };
            }

            if (brand) {
                console.log('getAllProducts - Filtering by brand_id:', Number(brand));
                where.brand_id = Number(brand);
            }

            // Price filter through variants
            if (min_price || max_price) {
                where.product_variants = {
                    some: {
                        price: {
                            ...(min_price && { gte: Number(min_price) }),
                            ...(max_price && { lte: Number(max_price) })
                        }
                    }
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
                                category: true
                            }
                        },
                        shop: true,
                        product_media: true,
                        product_variants: true
                    }
                }),
                this.prisma.products.count({ where })
            ]);

            console.log('getAllProducts - Found products:', products.length);
            console.log('getAllProducts - Where clause:', JSON.stringify(where, null, 2));
            console.log('getAllProducts - Products:', products.map(p => ({ id: p.id, name: p.name, brand_id: p.brand_id })));

            return {
                success: true,
                products,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages: Math.ceil(total / Number(limit))
                }
            };
        } catch (error) {
            console.error('Error fetching products:', error);
            return { success: false, message: 'Lỗi khi tải sản phẩm' };
        }
    }

    async getProductById(id: number) {
        try {
            console.log('getProductById - ID received:', id, 'Type:', typeof id);
            const productId = Number(id);
            console.log('getProductById - Converted ID:', productId);
            
            const product = await this.prisma.products.findUnique({
                where: { id: productId, is_published: true, moderation_status: 'approved' },
                include: {
                    brand: true,
                    product_categories: {
                        include: {
                            category: true
                        }
                    },
                    shop: true,
                    product_media: true,
                    product_variants: true,
                    reviews: {
                        include: {
                            user: true
                        },
                        orderBy: { created_at: 'desc' }
                    }
                }
            });

            if (!product) {
                return { success: false, message: 'Sản phẩm không tồn tại' };
            }

            return { success: true, product };
        } catch (error) {
            console.error('Error fetching product:', error);
            return { success: false, message: 'Lỗi khi tải sản phẩm' };
        }
    }

    async searchProducts(query: any) {
        try {
            const { q, page = 1, limit = 12, category, brand, minPrice, maxPrice, sort = 'newest' } = query;
            const skip = (Number(page) - 1) * Number(limit);

            const where: Prisma.productsWhereInput = {
                is_published: true,
                moderation_status: 'approved'
            };

            // Text search
            if (q) {
                where.OR = [
                    { name: { contains: q, mode: Prisma.QueryMode.insensitive } },
                    { description: { contains: q, mode: Prisma.QueryMode.insensitive } },
                    { brand: { name: { contains: q, mode: Prisma.QueryMode.insensitive } } }
                ];
            }

            // Category filter
            if (category) {
                where.product_categories = {
                    some: {
                        category_id: Number(category)
                    }
                };
            }

            // Brand filter
            if (brand) {
                console.log('getAllProducts - Filtering by brand_id:', Number(brand));
                where.brand_id = Number(brand);
            }

            // Price filter through variants
            if (minPrice || maxPrice) {
                where.product_variants = {
                    some: {
                        price: {
                            ...(minPrice && { gte: Number(minPrice) }),
                            ...(maxPrice && { lte: Number(maxPrice) })
                        }
                    }
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
                                category: true
                            }
                        },
                        shop: true,
                        product_media: true,
                        product_variants: true
                    }
                }),
                this.prisma.products.count({ where })
            ]);

            return {
                success: true,
                products,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages: Math.ceil(total / Number(limit))
                }
            };
        } catch (error) {
            console.error('Error searching products:', error);
            return { success: false, message: 'Lỗi khi tìm kiếm sản phẩm' };
        }
    }

    async filterProducts(query: any) {
        console.log('filterProducts - Query received:', query);
        console.log('filterProducts - Brand parameter:', query.brand);
        // Similar to getAllProducts but with more filter options
        return this.getAllProducts(query);
    }

    // Wishlist APIs
    async addToWishlist(productId: number, userId: number = 1) {
        try {
            // Check if product exists
            const product = await this.prisma.products.findUnique({
                where: { id: productId, is_published: true, moderation_status: 'approved' }
            });

            if (!product) {
                return { success: false, message: 'Sản phẩm không tồn tại hoặc không được phép' };
            }

            // Check if already in wishlist
            const existingWishlist = await this.prisma.wishlists.findUnique({
                where: {
                    user_id_product_id: {
                        user_id: userId,
                        product_id: productId
                    }
                }
            });

            if (existingWishlist) {
                return { success: false, message: 'Sản phẩm đã có trong danh sách yêu thích' };
            }

            // Add to wishlist
            await this.prisma.wishlists.create({
                data: {
                    user_id: userId,
                    product_id: productId
                }
            });

            return { success: true, message: 'Đã thêm vào danh sách yêu thích' };
        } catch (error) {
            console.error('Error adding to wishlist:', error);
            return { success: false, message: 'Lỗi khi thêm vào danh sách yêu thích' };
        }
    }

    async removeFromWishlist(productId: number, userId: number = 1) {
        try {
            // Check if item exists in wishlist
            const wishlistItem = await this.prisma.wishlists.findUnique({
                where: {
                    user_id_product_id: {
                        user_id: userId,
                        product_id: productId
                    }
                }
            });

            if (!wishlistItem) {
                return { success: false, message: 'Sản phẩm không có trong danh sách yêu thích' };
            }

            // Remove from wishlist
            await this.prisma.wishlists.delete({
                where: {
                    user_id_product_id: {
                        user_id: userId,
                        product_id: productId
                    }
                }
            });

            return { success: true, message: 'Đã xóa khỏi danh sách yêu thích' };
        } catch (error) {
            console.error('Error removing from wishlist:', error);
            return { success: false, message: 'Lỗi khi xóa khỏi danh sách yêu thích' };
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
                                    category: true
                                }
                            },
                            shop: true,
                            product_media: true,
                            product_variants: true,
                            reviews: {
                                include: {
                                    user: true
                                }
                            }
                        }
                    }
                },
                orderBy: { created_at: 'desc' }
            });

            // Transform data to match frontend expectations
            const wishlistItems = wishlist.map(item => ({
                id: item.product.id,
                name: item.product.name,
                slug: item.product.slug,
                description: item.product.description,
                avg_rating: Number(item.product.avg_rating) || 0,
                review_count: item.product.review_count,
                brand: item.product.brand,
                shop: item.product.shop,
                categories: item.product.product_categories.map(pc => pc.category),
                media: item.product.product_media,
                variants: item.product.product_variants,
                reviews: item.product.reviews,
                added_at: item.created_at
            }));

            return { success: true, wishlist: wishlistItems };
        } catch (error) {
            console.error('Error fetching wishlist:', error);
            return { success: false, message: 'Lỗi khi tải danh sách yêu thích' };
        }
    }

    // Cart APIs - Requires authentication
    async addToCart(productId: number, variantId?: number, quantity: number = 1, userId?: number) {
        try {
            if (!userId) {
                return { success: false, message: 'Vui lòng đăng nhập để thêm vào giỏ hàng' };
            }

            // Get product details
            const product = await this.prisma.products.findUnique({
                where: { id: productId },
                include: {
                    product_variants: true,
                    product_media: true
                }
            });

            if (!product) {
                return { success: false, message: 'Sản phẩm không tồn tại' };
            }

            // Get variant details
            const variant = variantId ? 
                product.product_variants.find(v => v.id === variantId) :
                product.product_variants[0];

            if (!variant) {
                return { success: false, message: 'Biến thể sản phẩm không tồn tại' };
            }

            // Find or create cart for user
            let cart = await this.prisma.carts.findUnique({
                where: { user_id: userId }
            });

            if (!cart) {
                cart = await this.prisma.carts.create({
                    data: { user_id: userId }
                });
            }

            // Check if item already exists in cart
            const existingItem = await this.prisma.cart_items.findFirst({
                where: {
                    cart_id: cart.id,
                    product_id: productId,
                    variant_id: variant.id
                }
            });

            if (existingItem) {
                // Update quantity
                await this.prisma.cart_items.update({
                    where: { id: existingItem.id },
                    data: { quantity: existingItem.quantity + quantity }
                });
            } else {
                // Create new cart item
                await this.prisma.cart_items.create({
                    data: {
                        cart_id: cart.id,
                        product_id: productId,
                        variant_id: variant.id,
                        quantity: quantity,
                        price_snapshot: variant.price
                    }
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
                return { success: false, message: 'Vui lòng đăng nhập để xem giỏ hàng' };
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
                                    brand: true
                                }
                            },
                            variant: true
                        }
                    }
                }
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

            const shopMap = new Map<number, { shop_id: number; shop_name: string; items: any[] }>();

            cart.cart_items.forEach(item => {
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
                        image_url: item.product.product_media[0]?.url || '/placeholder-product.jpg',
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
                    where: { id: itemId }
                });
                return { success: true, message: 'Đã xóa khỏi giỏ hàng' };
            } else {
                // Update quantity
                await this.prisma.cart_items.update({
                    where: { id: itemId },
                    data: { quantity: quantity }
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
                where: { id: itemId }
            });
            return { success: true, message: 'Đã xóa khỏi giỏ hàng' };
        } catch (error) {
            console.error('Error removing from cart:', error);
            return { success: false, message: 'Lỗi khi xóa khỏi giỏ hàng' };
        }
    }
    
}
