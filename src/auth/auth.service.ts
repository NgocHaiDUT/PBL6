import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
@Injectable()
export class AuthService {
    constructor(private readonly PrismaService: PrismaService) {}
    async register(email: string, full_name: string,phone: string,password : string) {
        
        const existingUser = await this.PrismaService.users.findUnique({ where: { email } });
        if (existingUser) {
            return {success:false, message: 'Email đã được sử dụng' };
        }
        const roleuserid = await this.PrismaService.role.findUnique ({
            where : {name : "user"}
        });

        if (!roleuserid) {
        return { success: false, message: 'Lỗi hệ thống: Không tìm thấy role user' };
        }
        
        const newUser = await this.PrismaService.users.create({
            data: { 
                email : email, 
                full_name : full_name,
                phone  : phone,
                password_hash : password,
                avatar_url : "",
                role_id : roleuserid.id
                },
        });
        return {success:true, message: 'Đăng ký thành công,mật khẩu được gửi về email của bạn' };
    }

    async login(email: string, password: string) {
        const user = await this.PrismaService.users.findUnique({ where: { email } });
        if (!user) {
            return { success: false, message: 'Email không tồn tại' };
        }
        else if (!user.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
            return { success: false, message: 'Mật khẩu không đúng' };
        }
        else {
            return { success: true, message: 'Đăng nhập thành công', user  };
        }
    }

    async existuser(email: string) {
        const user = await this.PrismaService.users.findUnique({ where: { email } });
        if (!user) {
            return false;
        }
        else {
            return true;
        }
    }

    async changepassword_forgotpassword(email: string, newPassword: string) {
        await this.PrismaService.users.update({
            where: { email },
            data: { password_hash: newPassword },
        });
        return true;
    }

    async changepassword(userid: number, currentPassword: string, newPassword: string) {
        const user = await this.PrismaService.users.findUnique({ where: { id: userid } });
        if (!user) {
            return { success: false, message: 'Người dùng không tồn tại' };
        }
        if (!user.password_hash || !(await bcrypt.compare(currentPassword, user.password_hash))) {
            return { success: false, message: 'Mật khẩu hiện tại không đúng' };
        }
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        await this.PrismaService.users.update({
            where: { id: userid },
            data: { password_hash: hashedNewPassword },
        });
        return { success: true, message: 'Đổi mật khẩu thành công' };
    }

    



}
