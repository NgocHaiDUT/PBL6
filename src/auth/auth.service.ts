import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class AuthService {
    constructor(private readonly PrismaService: PrismaService) {}
    async register(email: string, full_name: string,phone: string,password : string) {
        
        const existingUser = await this.PrismaService.users.findUnique({ where: { email } });
        if (existingUser) {
            return {success:false, message: 'Email đã được sử dụng' };
        }
        const newUser = await this.PrismaService.users.create({
            data: { 
                email : email, 
                full_name : full_name,
                phone  : phone,
                password_hash : password,
                avatar_url : "",
                },
        });
        return {success:true, message: 'Đăng ký thành công' };
    }
    
}
