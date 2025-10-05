import { Injectable ,Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
@Injectable()
export class DataInitService implements OnModuleInit {
    private readonly logger = new Logger(DataInitService.name);
    constructor(private prisma: PrismaService) {}
    async onModuleInit()
    {
        await this.seedData();
    }

    async seedData()
    {
        try {
            await this.seedBrands();
            await this.seedCategorys();
            await this.seedRoles();
            await this.seedPermissions();
            await this.seedRolePermissions();
            this.logger.log('Dữ liệu khởi tạo thành công')
        }
        catch(error)
        {
            this.logger.error('Lỗi khi tạo dữ liệu : ', error);
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
}
