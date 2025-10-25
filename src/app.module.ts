import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
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
@Module({
  imports: [
    AuthModule,
    MailerModule.forRootAsync({
      imports: [ConfigModule],
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
    CommentsModule,
    LikesModule,
    FollowsModule,
    NotificationsModule,
    ChatModule,
    HttpModule.register({
      timeout: 30000,
      maxContentLength: 50 * 1024 * 1024, // 50MB
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
