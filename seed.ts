import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { DataInitService } from './src/data-init/data-init.service';

async function seedData() {
  console.log('🌱 Bắt đầu seed dữ liệu...');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataInitService = app.get(DataInitService);
  
  try {
    await dataInitService.seedData();
    console.log('✅ Seed dữ liệu thành công!');
  } catch (error) {
    console.error('❌ Lỗi khi seed dữ liệu:', error);
  } finally {
    await app.close();
  }
}

seedData();
