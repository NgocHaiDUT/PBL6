import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaService } from './prisma/prisma.service';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { PostsModule } from './posts/posts.module';
import { ProfileModule } from './profile/profile.module';
import { MessagesModule } from './messages/messages.module';
import { MakeupModule } from './makeup/makeup.module';
import { CommentsModule } from './comments/comments.module';
import { LikesModule } from './likes/likes.module';
import { FollowsModule } from './follows/follows.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ChatModule } from './chat/chat.module';
import { HttpModule } from '@nestjs/axios';
import { ProductModule } from './product/product.module';
import { CartModule } from './cart/cart.module';
import { DataInitModule } from './data-init/data-init.module';
import { join } from 'path';
import { ShopModule } from './shop/shop.module';
import { OrderModule } from './order/order.module';
import { AddressModule } from './address/address.module';
import { ShopAddressModule } from './shop-address/shop-address.module';
import { RangeRequestMiddleware } from './middleware/range-request.middleware';
import { SearchModule } from './search/search.module';
import { ReviewsModule } from './reviews/reviews.module'; // ✅ Add ReviewsModule

@Module({
  imports: [
    AuthModule,
    MailerModule.forRootAsync({
      imports: [ConfigModule.forRoot({
      isGlobal: true,        
      envFilePath: '.env',  
      }),],
      useFactory: async (ConfigService: ConfigService) => ({
        transport: {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: ConfigService.get<string>('EMAIL_USER'),
          pass: ConfigService.get<string>('EMAIL_PASS'),
        },
      },
      defaults: {
        from: '"No Reply" <no-reply@localhost>',
      },
      preview: true,
      template: {
        dir: process.cwd() + '/template/',
        adapter: new HandlebarsAdapter(), 
        options: {
          strict: true,
        },
      },
      }),
      inject: [ConfigService],
      
    }),
    PrismaModule,
    PostsModule,
    ProfileModule,
    MessagesModule,
    MakeupModule,
    CommentsModule, // ✅ Add CommentsModule
    LikesModule, // ✅ Add LikesModule
    FollowsModule, // ✅ Add FollowsModule
    NotificationsModule, // ✅ Add NotificationsModule
    ChatModule, // ✅ Add ChatModule
    ProductModule, // ✅ Add ProductModule
    CartModule, // ✅ Add CartModule
    DataInitModule, // ✅ Add DataInitModule
    OrderModule,
    DataInitModule,
    AddressModule,
    ShopAddressModule,
    SearchModule, // ✅ Add SearchModule
    ReviewsModule, // ✅ Add ReviewsModule

    HttpModule.register({
      timeout: 30000,
      maxContentLength: 50 * 1024 * 1024, // 50MB
    }),
    MakeupModule,
    ProductModule,
    DataInitModule,
    ShopModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply RangeRequestMiddleware to all /uploads/* routes
    consumer
      .apply(RangeRequestMiddleware)
      .forRoutes('uploads/*');
  }
}
