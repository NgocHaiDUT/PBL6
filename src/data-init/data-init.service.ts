import { Injectable ,Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { S3UploadService } from './s3-upload.service';
import * as fs from 'fs';
import * as path from 'path';
@Injectable()
export class DataInitService {
    private readonly logger = new Logger(DataInitService.name);
    constructor(
        private prisma: PrismaService,
        private s3UploadService: S3UploadService
    ) {}


    async seedData()
    {
        try {
            await this.seedBrands();
            await this.seedCategorys();
            await this.seedRoles();
            await this.seedPermissions();
            await this.seedRolePermissions();
            await this.seedShops();
            await this.seedProducts();
            
            // Upload brand logos to S3 (optional - chỉ chạy khi cần)
            // await this.uploadBrandLogosIfNeeded();
            
            this.logger.log('Dữ liệu khởi tạo thành công')
        }
        catch(error)
        {
            this.logger.error('Lỗi khi tạo dữ liệu : ', error);
        }
    }

    // Method để upload brand logos nếu cần
    async uploadBrandLogosIfNeeded() {
        try {
            // Chỉ upload nếu có ảnh local và chưa upload
            const localBrandPath = path.join(process.cwd(), 'uploads', 'brands');
            if (fs.existsSync(localBrandPath)) {
                this.logger.log('Bắt đầu upload brand logos lên S3...');
                await this.s3UploadService.uploadBrandLogosToS3();
            } else {
                this.logger.log('Không tìm thấy thư mục brand logos local, bỏ qua upload S3');
            }
        } catch (error) {
            this.logger.error('Lỗi khi upload brand logos:', error);
        }
    }

    private async seedBrands()
    {
        const existingBrands = await this.prisma.brands.count();
        if(existingBrands > 0){
            this.logger.log('Brands đã tồn tại, không khởi tạo mới');
            return ;
        }

        const brandsFilePath = path.join(process.cwd(), 'src', 'data-init', 'brands.json');
        const brandsDataRaw = fs.readFileSync(brandsFilePath, 'utf8');
        const brandsData = JSON.parse(brandsDataRaw);

        if (!Array.isArray(brandsData)) {
            this.logger.error('Dữ liệu brands không phải là array');
            return;
        }
            
        for (const brand of brandsData)
        {
            await this.prisma.brands.create({
                data : {
                    name : brand.name,
                    slug : brand.slug,
                    logo_url : brand.logo_url,
                    created_at : new Date(),
                },
            });
        }

        this.logger.log(`Đã tạo ${brandsData.length} thương hiệu thành công`);
    }

    private async seedCategorys()
    {
        const existcategory = await this.prisma.categories.count();
        if(existcategory > 0 )
        {
            this.logger.log('Dữ liệu danh mục sản phẩm đã tồn tại');
            return;
        }

        const categoryFilePath = path.join(process.cwd(),'src','data-init','categorys.json');
        const categoryRaw = fs.readFileSync(categoryFilePath,'utf8');
        const categoryData = JSON.parse(categoryRaw);

        if(!Array.isArray(categoryData)){
            this.logger.error('Dữ liệu categories không phải array');
            return;
        }

        for (const parentCategory of categoryData) {
            const createdParent = await this.prisma.categories.create({
                data: {
                    name: parentCategory.name,
                    slug: parentCategory.slug,
                    parent_id: null, 
                    created_at: new Date(),
                },
            });

            if (parentCategory.children && Array.isArray(parentCategory.children)) {
                for (const childCategory of parentCategory.children) {
                    await this.prisma.categories.create({
                        data: {
                            name: childCategory.name,
                            slug: childCategory.slug,
                            parent_id: createdParent.id,
                            created_at: new Date(),
                        },
                    });
                }
            }
        }

        this.logger.log(`Đã tạo ${categoryData.length} danh mục cha và các danh mục con thành công`);
    }

    private async seedRoles()
    {
        const existingRoles = await this.prisma.role.count();
        if(existingRoles > 0) {
            this.logger.log('Role đã tồn tại không tạo mới');
            return;
        }

        const rolesFilePath = path.join(process.cwd(),'src','data-init','roles.json');
        const rolesDataRaw = fs.readFileSync(rolesFilePath,'utf8');
        const rolesData = JSON.parse(rolesDataRaw);

        if(!Array.isArray(rolesData)) {
            this.logger.log('Dữ liệu role không phải array');
            return;
        }

        for(const role of rolesData)
        {
            await this.prisma.role.create({
                data : {
                    name : role.name
                }
            })
        }

        this.logger.log(`Đã tạo ${rolesData.length} role`);
    }

    private async seedPermissions()
    {
        const existPermissions = await this.prisma.permission.count();
        if(existPermissions > 0 ) {
            this.logger.log('Dữ liệu permission đã tồn tại, không khởi tạo');
            return
        }

        const permissionsFilePath = path.join(process.cwd(),'src','data-init','permissions.json');
        const permissionsDataRaw = fs.readFileSync(permissionsFilePath,'utf8');
        const permissionsData = JSON.parse(permissionsDataRaw);

        if(!Array.isArray(permissionsData)) {
            this.logger.log('Dữ liệu permission không phải array');
            return;
        }

        for(const permission of permissionsData)
        {
            await this.prisma.permission.create({
                data : {name : permission.name}
            })
        }

        this.logger.log(`Đã tạo ${permissionsData.length} permission`);    
    }

    private async seedRolePermissions() {

    const existingRolePermissions = await this.prisma.rolepermission.count();
    if (existingRolePermissions > 0) {
        this.logger.log('Role permissions đã tồn tại, không khởi tạo mới');
        return;
    }

    const rolePermissionsFilePath = path.join(process.cwd(), 'src', 'data-init', 'role_permissions.json');
    const rolePermissionsDataRaw = fs.readFileSync(rolePermissionsFilePath, 'utf8');
    const rolePermissionsData = JSON.parse(rolePermissionsDataRaw);

    if (!Array.isArray(rolePermissionsData)) {
        this.logger.error('Dữ liệu role permissions không phải array');
        return;
    }

    for (const rolePermission of rolePermissionsData) {
        try {
            const permission = await this.prisma.permission.findUnique({
                where: { name: rolePermission.permission_name }
            });

            if (!permission) {
                this.logger.warn(`Permission "${rolePermission.permission_name}" không tìm thấy, bỏ qua`);
                continue;
            }

            const role = await this.prisma.role.findUnique({
                where: { id: rolePermission.role_id }
            });

            if (!role) {
                this.logger.warn(`Role với ID ${rolePermission.role_id} không tìm thấy, bỏ qua`);
                continue;
            }

            await this.prisma.rolepermission.create({
                data: {
                    role_id: rolePermission.role_id,
                    permission_id: permission.id
                }
            });
        } catch (error) {
            this.logger.error(`Lỗi khi tạo role permission cho role_id ${rolePermission.role_id}, permission ${rolePermission.permission_name}:`, error);
        }
    }

    this.logger.log(`Đã tạo ${rolePermissionsData.length} liên kết role-permission thành công`);
    }

    private async seedShops() {
        const existingShops = await this.prisma.shops.count();
        if (existingShops > 0) {
            this.logger.log('Shop đã tồn tại, không khởi tạo mới');
            return;
        }

        // Tạo user mẫu làm owner của shop
        const owner = await this.prisma.users.create({
            data: {
                email: 'owner@shop.com',
                password_hash: '$2b$10$example', // Mật khẩu mẫu
                full_name: 'Shop Owner',
                phone: '0123456789',
                avatar_url: '/uploads/avatars/default.jpg',
                is_active: true,
                created_at: new Date(),
            },
        });

        // Tạo shop mẫu
        const shop = await this.prisma.shops.create({
            data: {
                owner_id: owner.id,
                name: 'Beauty Store',
                slug: 'beauty-store',
                logo_url: '/uploads/shops/beauty-store-logo.jpg',
                phone: '0123456789',
                email: 'info@beautystore.com',
                cover_url: '/uploads/shops/beauty-store-cover.jpg',
                description: 'Cửa hàng mỹ phẩm cao cấp với đa dạng sản phẩm chăm sóc da',
                is_verified: true,
                created_at: new Date(),
            },
        });

        this.logger.log(`Đã tạo shop: ${shop.name} với owner: ${owner.full_name} (${owner.email})`);
    }

    private async seedProducts() {
        const existingProducts = await this.prisma.products.count();
        if (existingProducts > 0) {
            this.logger.log('Sản phẩm đã tồn tại, không khởi tạo mới');
            return;
        }

        const productsFilePath = path.join(process.cwd(), 'src', 'data-init', 'products.json');
        const productsDataRaw = fs.readFileSync(productsFilePath, 'utf8');
        const productsData = JSON.parse(productsDataRaw);

        if (!Array.isArray(productsData)) {
            this.logger.error('Dữ liệu products không phải là array');
            return;
        }

        for (const productData of productsData) {
            try {
                // Tạo sản phẩm chính
                const product = await this.prisma.products.create({
                    data: {
                        name: productData.name,
                        slug: productData.slug,
                        description: productData.description,
                        is_published: productData.is_published,
                        moderation_status: productData.moderation_status as any,
                        avg_rating: productData.avg_rating,
                        review_count: productData.total_reviews,
                        brand_id: productData.brand_id,
                        shop_id: productData.shop_id,
                        created_at: new Date(),
                    },
                });

                // Tạo danh mục sản phẩm
                if (productData.category_id) {
                    await this.prisma.product_categories.create({
                        data: {
                            product_id: product.id,
                            category_id: productData.category_id,
                        },
                    });
                }

                // Tạo variants
                if (productData.variants && Array.isArray(productData.variants)) {
                    for (const variantData of productData.variants) {
                        await this.prisma.product_variants.create({
                            data: {
                                product_id: product.id,
                                name: variantData.name,
                                price: variantData.price,
                                compare_at_price: variantData.compare_price,
                                sku: variantData.sku,
                                stock: variantData.stock_quantity,
                                is_active: true,
                                created_at: new Date(),
                            },
                        });
                    }
                }

                // Tạo media
                if (productData.media && Array.isArray(productData.media)) {
                    for (const mediaData of productData.media) {
                        await this.prisma.product_media.create({
                            data: {
                                product_id: product.id,
                                url: mediaData.url,
                                type: mediaData.type,
                                sort_order: mediaData.is_primary ? 0 : 1,
                                created_at: new Date(),
                            },
                        });
                    }
                }

                this.logger.log(`Đã tạo sản phẩm: ${product.name}`);
            } catch (error) {
                this.logger.error(`Lỗi khi tạo sản phẩm ${productData.name}:`, error);
            }
        }

        this.logger.log(`Đã tạo ${productsData.length} sản phẩm thành công`);
    }
}
