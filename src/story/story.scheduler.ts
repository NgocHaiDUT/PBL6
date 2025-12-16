import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StoryService } from './story.service';

@Injectable()
export class StoryScheduler {
  private readonly logger = new Logger(StoryScheduler.name);

  constructor(private readonly storyService: StoryService) {}

  /**
   * Chạy mỗi giờ để cleanup expired stories
   * Cron expression: 0 * * * * (at minute 0 of every hour)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredStoriesCleanup() {
    this.logger.log('🗑️  Running expired stories cleanup job...');
    
    try {
      const deletedCount = await this.storyService.cleanupExpiredStories();
      
      if (deletedCount > 0) {
        this.logger.log(`✅ Cleaned up ${deletedCount} expired stories`);
      } else {
        this.logger.debug('No expired stories to clean up');
      }
    } catch (error) {
      this.logger.error('❌ Error cleaning up expired stories:', error);
    }
  }

  /**
   * Alternative: Chạy vào nửa đêm mỗi ngày
   * Uncomment để sử dụng thay vì chạy mỗi giờ
   */
  // @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  // async handleDailyCleanup() {
  //   this.logger.log('🗑️  Running daily expired stories cleanup...');
  //   
  //   try {
  //     const deletedCount = await this.storyService.cleanupExpiredStories();
  //     this.logger.log(`✅ Daily cleanup completed. Deleted ${deletedCount} stories`);
  //   } catch (error) {
  //     this.logger.error('❌ Error in daily cleanup:', error);
  //   }
  // }
}
