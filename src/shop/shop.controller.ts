import { Controller, Post, Delete, Get, Put, Body, Param, ParseIntPipe,Query } from '@nestjs/common';
import { ShopService } from './shop.service';

@Controller('shop')
export class ShopController {
    constructor(private readonly shopService: ShopService) {}

    // Thêm nhân viên vào shop
    @Post('staff')
    async addStaff(
        @Body() body: { 
            userid: number; 
            staffemail: string; 
            shopid: number; 
            is_manager?: boolean 
        }
    ) {
        return this.shopService.addstaff(
            body.userid, 
            body.staffemail, 
            body.shopid, 
            body.is_manager ?? false
        );
    }

    // Xóa nhân viên khỏi shop
    @Delete('staff')
    async removeStaff(
        @Body() body: { 
            userid: number; 
            staffemail: string; 
            shopid: number; 
        }
    ) {
        return this.shopService.removestaff(
            body.userid, 
            body.staffemail, 
            body.shopid
        );
    }

    // Lấy danh sách nhân viên của shop
    @Get(':shopid/staffs')
    async getStaffs(@Param('shopid', ParseIntPipe) shopid: number) {
        return this.shopService.getstaffs(shopid);
    }

    @Post('staff/permissions')
    async updateStaffPermissions(
        @Body() body: { 
            userid: number; 
            staffemail: string; 
            shopid: number; 
            permissions: string[]  
        }
    ) {
        return this.shopService.updatestaffpermission(
            body.userid, 
            body.staffemail, 
            body.shopid, 
            body.permissions
        );
    }

    @Get(':shopid/staff/:staffemail/permissions')
    async getpermissionstaff(
        @Param('shopid', ParseIntPipe) shopid: number,
        @Param('staffemail') staffemail: string
    ) {
        return this.shopService.getpermissionstaff(shopid, staffemail);
    }

    @Delete('staff/permissions')
    async deleteStaffPermissions(
        @Body() body: { 
            userid: number; 
            staffemail: string; 
            shopid: number; 
            permissions: string[]  
        }
    ) {
        return this.shopService.deletestaffpermission(
            body.userid, 
            body.staffemail, 
            body.shopid, 
            body.permissions
        );
    }
}
