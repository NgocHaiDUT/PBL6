
import { Injectable ,Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3UploadService } from './s3-upload.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DataInitService implements OnModuleInit {
    private readonly logger = new Logger(DataInitService.name);
    constructor(
        private prisma: PrismaService,
        private s3UploadService: S3UploadService,
    ) {}

    async onModuleInit() {
        this.logger.log('DataInitService module initialized');
        await this.seedData(); 
    }
    async seedData() {
        try {
            await this.seedBrands();
            await this.seedCategorys();
            await this.seedRoles();
            await this.seedPermissions();
            await this.seedRolePermissions();
            await this.seedShops();
            await this.seedProducts(); // Enabled product seeding

            // await this.uploadBrandLogosIfNeeded();

            this.logger.log('Dữ liệu khởi tạo thành công');
        } catch (error) {
            this.logger.error('Lỗi khi tạo dữ liệu : ', error);
        }
    }
    
    async uploadBrandLogosIfNeeded() {
        try {
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
            this.logger.error('Dữ liệu categories không phải là array');
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
            this.logger.log('Dữ liệu permission không phải là array');
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
        this.logger.error('Dữ liệu role permissions không phải là array');
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

        // --- Shop 1: BeautyShop ---
        const owner1 = await this.prisma.users.create({
            data: {
                email: 'owner1@shop.com',
                password_hash: '$2b$10$example',
                full_name: 'BeautyShop Owner',
                phone: '0345671392',
                is_active: true,
            },
        });

        const shop1 = await this.prisma.shops.create({
            data: {
                owner_id: owner1.id,
                name: 'BeautyShop',
                slug: 'beautyshop',
                description: 'Cửa hàng BeautyShop',
                is_verified: true,
                ghn_shop_id: 198073,
            },
        });

        await this.prisma.shop_addresses.create({
            data: {
                shop_id: shop1.id,
                name: 'BeautyShop',
                phone: '0345671392',
                province: 'Đà Nẵng',
                district: 'Liên Chiểu',
                ward: 'Hoà Hiệp Nam',
                street: '541 Nguyễn Lương Bằng',
                is_default: true,
                // Placeholder GHN IDs
                ghn_province_id: 203,
                ghn_district_id: 1530,
                ghn_ward_code: '40502',
            },
        });
        this.logger.log(`Đã tạo shop: ${shop1.name} với owner: ${owner1.full_name}`);

        // --- Shop 2: SkincareShop ---
        const owner2 = await this.prisma.users.create({
            data: {
                email: 'owner2@shop.com',
                password_hash: '$2b$10$example',
                full_name: 'SkincareShop Owner',
                phone: '0345671392',
                is_active: true,
            },
        });

        const shop2 = await this.prisma.shops.create({
            data: {
                owner_id: owner2.id,
                name: 'SkincareShop',
                slug: 'skincareshop',
                description: 'Cửa hàng SkincareShop',
                is_verified: true,
                ghn_shop_id: 198074,
            },
        });

        await this.prisma.shop_addresses.create({
            data: {
                shop_id: shop2.id,
                name: 'SkincareShop',
                phone: '0345671392',
                province: 'Đà Nẵng',
                district: 'Hải Châu',
                ward: 'Hải Châu 1',
                street: '95 Hùng Vương',
                is_default: true,
                // Placeholder GHN IDs
                ghn_province_id: 203,
                ghn_district_id: 1526,
                ghn_ward_code: '40103',
            },
        });
        this.logger.log(`Đã tạo shop: ${shop2.name} với owner: ${owner2.full_name}`);
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

                if (productData.category_id) {
                    await this.prisma.product_categories.create({
                        data: {
                            product_id: product.id,
                            category_id: productData.category_id,
                        },
                    });
                }

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
                                weight: variantData.weight,
                                length: variantData.length,
                                width: variantData.width,
                                height: variantData.height,
                            },
                        });
                    }
                }

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

    async seedAddresses() {
        try {
            const existingAddresses = await this.prisma.addresses.count();
            if (existingAddresses > 0) {
                this.logger.log('Addresses đã tồn tại, không khởi tạo mới');
                return { success: false, message: 'Addresses đã tồn tại' };
            }

            const addressesFilePath = path.join(process.cwd(), 'src', 'data-init', 'addresses.json');
            const addressesDataRaw = fs.readFileSync(addressesFilePath, 'utf8');
            const addressesData = JSON.parse(addressesDataRaw);

            if (!Array.isArray(addressesData)) {
                this.logger.error('Dữ liệu addresses không phải là array');
                return { success: false, message: 'Dữ liệu addresses không hợp lệ' };
            }

            for (const address of addressesData) {
                await this.prisma.addresses.create({
                    data: {
                        user_id: address.user_id,
                        label: address.label,
                        recipient: address.recipient,
                        phone: address.phone,
                        province: address.province,
                        district: address.district,
                        ward: address.ward,
                        street: address.street,
                        is_default: address.is_default,
                        created_at: new Date(),
                    },
                });
            }

            this.logger.log(`Đã tạo ${addressesData.length} địa chỉ thành công`);
            return { success: true, message: `Đã tạo ${addressesData.length} địa chỉ thành công` };
        } catch (error) {
            this.logger.error('Lỗi khi tạo addresses:', error);
            return { success: false, message: 'Lỗi khi tạo addresses', error: error.message };
        }
    }

    async seedShopAddresses() {
        try {
            const existingShopAddresses = await this.prisma.shop_addresses.count();
            if (existingShopAddresses > 0) {
                this.logger.log('Shop addresses đã tồn tại, không khởi tạo mới');
                return { success: false, message: 'Shop addresses đã tồn tại' };
            }

            const shopAddressesFilePath = path.join(process.cwd(), 'src', 'data-init', 'shop_addresses.json');
            const shopAddressesDataRaw = fs.readFileSync(shopAddressesFilePath, 'utf8');
            const shopAddressesData = JSON.parse(shopAddressesDataRaw);

            if (!Array.isArray(shopAddressesData)) {
                this.logger.error('Dữ liệu shop_addresses không phải là array');
                return { success: false, message: 'Dữ liệu shop_addresses không hợp lệ' };
            }

            for (const shopAddress of shopAddressesData) {
                await this.prisma.shop_addresses.create({
                    data: {
                        shop_id: shopAddress.shop_id,
                        name: shopAddress.name,
                        phone: shopAddress.phone,
                        email: shopAddress.email,
                        province: shopAddress.province,
                        district: shopAddress.district,
                        ward: shopAddress.ward,
                        street: shopAddress.street,
                        is_default: shopAddress.is_default,
                    },
                });
            }

            this.logger.log(`Đã tạo ${shopAddressesData.length} địa chỉ shop thành công`);
            return { success: true, message: `Đã tạo ${shopAddressesData.length} địa chỉ shop thành công` };
        } catch (error) {
            this.logger.error('Lỗi khi tạo shop addresses:', error);
            return { success: false, message: 'Lỗi khi tạo shop addresses', error: error.message };
        }
    }

    async seedOrders() {
        try {
            const existingOrders = await this.prisma.orders.count();
            if (existingOrders > 0) {
                this.logger.log('Orders đã tồn tại, không khởi tạo mới');
                return { success: false, message: 'Orders đã tồn tại' };
            }

            // Lấy danh sách products từ DB để map ID
            const productsInDB = await this.prisma.products.findMany({
                where: { shop_id: 2 },
                orderBy: { id: 'asc' },
                select: { id: true, name: true }
            });

            if (productsInDB.length === 0) {
                this.logger.error('Không tìm thấy products trong DB. Vui lòng chạy seed products trước!');
                return { success: false, message: 'Không tìm thấy products. Chạy POST /data-init/products trước!' };
            }

            // Tạo map: product_id trong JSON (1,2,3...) -> product_id thực tế trong DB
            const productIdMap = new Map<number, number>();
            productsInDB.forEach((product, index) => {
                productIdMap.set(index + 1, product.id); // JSON dùng 1,2,3... map sang ID thực
            });

            this.logger.log(`Product ID mapping: ${JSON.stringify([...productIdMap.entries()])}`);

            const ordersFilePath = path.join(process.cwd(), 'src', 'data-init', 'orders.json');
            const ordersDataRaw = fs.readFileSync(ordersFilePath, 'utf8');
            const ordersData = JSON.parse(ordersDataRaw);

            if (!Array.isArray(ordersData)) {
                this.logger.error('Dữ liệu orders không phải là array');
                return { success: false, message: 'Dữ liệu orders không hợp lệ' };
            }

            for (const orderData of ordersData) {
                try {
                    // Tạo order
                    const order = await this.prisma.orders.create({
                        data: {
                            user_id: orderData.user_id,
                            shop_id: orderData.shop_id,
                            status: orderData.status as any,
                            payment_status: orderData.payment_status as any,
                            subtotal_amount: orderData.subtotal_amount,
                            discount_amount: orderData.discount_amount,
                            shipping_fee: orderData.shipping_fee,
                            total_amount: orderData.total_amount,
                            shipping_address_id: orderData.shipping_address_id,
                            pickup_address_id: orderData.pickup_address_id,
                            note: orderData.note,
                            created_at: new Date(orderData.created_at),
                            updated_at: new Date(orderData.updated_at),
                        },
                    });

                    // Tạo order items với product_id đã được map
                    if (orderData.order_items && Array.isArray(orderData.order_items)) {
                        for (const item of orderData.order_items) {
                            const realProductId = productIdMap.get(item.product_id);
                            if (!realProductId) {
                                this.logger.warn(`Không tìm thấy product_id mapping cho ${item.product_id}, skip item này`);
                                continue;
                            }

                            // Lấy variant_id thực tế từ product
                            const variants = await this.prisma.product_variants.findMany({
                                where: { product_id: realProductId },
                                orderBy: { id: 'asc' }
                            });

                            const realVariantId = variants[item.variant_id - 1]?.id || variants[0]?.id;
                            if (!realVariantId) {
                                this.logger.warn(`Không tìm thấy variant cho product ${realProductId}`);
                                continue;
                            }

                            await this.prisma.order_items.create({
                                data: {
                                    order_id: order.id,
                                    product_id: realProductId,
                                    variant_id: realVariantId,
                                    name_snapshot: item.name_snapshot,
                                    variant_snapshot: item.variant_snapshot,
                                    unit_price: item.unit_price,
                                    quantity: item.quantity,
                                    line_total: item.line_total,
                                },
                            });
                        }
                    }

                    // Tạo payment
                    if (orderData.payment) {
                        await this.prisma.payments.create({
                            data: {
                                order_id: order.id,
                                provider: orderData.payment.provider,
                                amount: orderData.payment.amount,
                                status: orderData.payment.status as any,
                                transaction_id: orderData.payment.transaction_id,
                                created_at: new Date(orderData.payment.created_at),
                            },
                        });
                    }

                    // Tạo shipment
                    if (orderData.shipment) {
                        await this.prisma.shipments.create({
                            data: {
                                order_id: order.id,
                                status: orderData.shipment.status as any,
                                carrier: orderData.shipment.carrier,
                                tracking_number: orderData.shipment.tracking_number,
                                shipped_at: orderData.shipment.shipped_at ? new Date(orderData.shipment.shipped_at) : null,
                                delivered_at: orderData.shipment.delivered_at ? new Date(orderData.shipment.delivered_at) : null,
                                address_snapshot: orderData.shipment.address_snapshot,
                                created_at: new Date(),
                            },
                        });
                    }

                    this.logger.log(`Đã tạo order #${order.id}`);
                } catch (error) {
                    this.logger.error(`Lỗi khi tạo order:`, error);
                }
            }

            this.logger.log(`Đã tạo ${ordersData.length} đơn hàng thành công`);
            return { success: true, message: `Đã tạo ${ordersData.length} đơn hàng thành công` };
        } catch (error) {
            this.logger.error('Lỗi khi tạo orders:', error);
            return { success: false, message: 'Lỗi khi tạo orders', error: error.message };
        }
    }
}

