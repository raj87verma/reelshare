import { CronJob } from 'cron';
import { ipcMain } from 'electron';
import { dbService } from './database';

interface ScheduledTask {
  id: string;
  cronExpression: string;
  job: CronJob;
  description: string;
}

class SchedulerService {
  private tasks: Map<string, ScheduledTask> = new Map();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load scheduled posts from database
      await this.loadScheduledPosts();
      
      // Start monitoring for new posts
      this.startMonitoring();
      
      this.initialized = true;
      console.log('Scheduler initialized');
    } catch (error) {
      console.error('Failed to initialize scheduler:', error);
      throw error;
    }
  }

  private async loadScheduledPosts(): Promise<void> {
    try {
      // Get pending scheduled posts
      const posts = await dbService.getScheduledPosts('user_1', 'pending', 1000);
      
      for (const post of posts) {
        await this.schedulePost(post);
      }
    } catch (error) {
      console.error('Error loading scheduled posts:', error);
    }
  }

  private startMonitoring(): void {
    // Check for new scheduled posts every minute
    setInterval(async () => {
      try {
        const newPosts = await dbService.getScheduledPosts('user_1', 'pending', 100);
        
        for (const post of newPosts) {
          if (!this.tasks.has(post.id)) {
            await this.schedulePost(post);
          }
        }
      } catch (error) {
        console.error('Error monitoring scheduled posts:', error);
      }
    }, 60000); // 1 minute
  }

  private async schedulePost(post: any): Promise<void> {
    try {
      const scheduledTime = new Date(post.scheduled_time);
      const now = new Date();
      
      // If the post is already in the past, mark it as failed
      if (scheduledTime < now) {
        await dbService.updateScheduledPost(post.id, {
          status: 'failed',
          error_message: 'Scheduled time is in the past'
        });
        return;
      }

      // Create cron expression for the scheduled time
      const cronExpression = this.dateToCron(scheduledTime);
      
      const job = new CronJob(
        cronExpression,
        async () => {
          await this.executePost(post.id);
        },
        null, // onComplete
        true, // start
        'UTC' // timezone
      );
      
      this.tasks.set(post.id, {
        id: post.id,
        cronExpression,
        job,
        description: `Post ${post.id} - ${post.video_title} to ${post.platform}`
      });
      
      console.log(`Scheduled post ${post.id} for ${scheduledTime.toISOString()}`);
      
    } catch (error) {
      console.error(`Error scheduling post ${post.id}:`, error);
      await dbService.updateScheduledPost(post.id, {
        status: 'failed',
        error_message: `Scheduling error: ${error}`
      });
    }
  }

  private async executePost(postId: string): Promise<void> {
    try {
      console.log(`Executing post ${postId}`);
      
      // Mark as processing
      await dbService.updateScheduledPost(postId, {
        status: 'processing'
      });
      
      // Get post details
      const post = await dbService.getScheduledPost(postId);
      if (!post) {
        throw new Error('Post not found');
      }
      
      // Get video details
      const video = await dbService.getVideo(post.video_id);
      if (!video) {
        throw new Error('Video not found');
      }
      
      // Get social account
      const account = await dbService.getSocialAccount(post.account_id);
      if (!account) {
        throw new Error('Social account not found');
      }
      
      // TODO: Implement actual platform publishing
      // This would call the respective social media API
      const platformPostId = await this.publishToPlatform(account, video);
      
      // Mark as published
      await dbService.updateScheduledPost(postId, {
        status: 'published',
        published_time: new Date().toISOString(),
        platform_post_id: platformPostId
      });
      
      // Remove task from scheduler
      this.tasks.delete(postId);
      
      console.log(`Successfully published post ${postId}`);
      
      // TODO: Send notification
      
    } catch (error) {
      console.error(`Error executing post ${postId}:`, error);
      
      await dbService.updateScheduledPost(postId, {
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // TODO: Send failure notification
    }
  }

  private async publishToPlatform(account: any, video: any): Promise<string> {
    // Simulate platform publishing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // In a real implementation, this would:
    // 1. Check if access token is valid (refresh if needed)
    // 2. Upload video to platform
    // 3. Set caption/metadata
    // 4. Return platform post ID
    
    return `platform_post_${Date.now()}`;
  }

  private dateToCron(date: Date): string {
    const minutes = date.getUTCMinutes();
    const hours = date.getUTCHours();
    const dayOfMonth = date.getUTCDate();
    const month = date.getUTCMonth() + 1; // Cron months are 1-12
    const dayOfWeek = date.getUTCDay(); // 0-6, 0 = Sunday
    
    return `${minutes} ${hours} ${dayOfMonth} ${month} ${dayOfWeek}`;
  }

  async scheduleNewPost(postData: any): Promise<string> {
    try {
      const postId = await dbService.createScheduledPost(postData);
      
      // Schedule the post
      const post = {
        id: postId,
        ...postData,
        video_title: 'New Video', // Would be fetched from DB
        platform: 'instagram' // Would be fetched from DB
      };
      
      await this.schedulePost(post);
      
      return postId;
    } catch (error) {
      console.error('Error scheduling new post:', error);
      throw error;
    }
  }

  async cancelPost(postId: string): Promise<void> {
    try {
      const task = this.tasks.get(postId);
      if (task) {
        task.job.stop();
        this.tasks.delete(postId);
      }
      
      await dbService.updateScheduledPost(postId, {
        status: 'failed',
        error_message: 'Cancelled by user'
      });
      
      console.log(`Cancelled post ${postId}`);
    } catch (error) {
      console.error(`Error cancelling post ${postId}:`, error);
      throw error;
    }
  }

  async reschedulePost(postId: string, newTime: Date): Promise<void> {
    try {
      // Cancel existing schedule
      await this.cancelPost(postId);
      
      // Update scheduled time in database
      await dbService.updateScheduledPost(postId, {
        scheduled_time: newTime.toISOString(),
        status: 'pending',
        error_message: null
      });
      
      // Get updated post and reschedule
      const post = await dbService.getScheduledPost(postId);
      if (post) {
        await this.schedulePost({
          ...post,
          video_title: post.video_title || '',
          platform: post.platform || ''
        });
      }
      
      console.log(`Rescheduled post ${postId} to ${newTime.toISOString()}`);
    } catch (error) {
      console.error(`Error rescheduling post ${postId}:`, error);
      throw error;
    }
  }

  getScheduledTasks(): Array<{
    id: string;
    cronExpression: string;
    description: string;
    nextExecution: Date;
  }> {
    return Array.from(this.tasks.values()).map(task => ({
      id: task.id,
      cronExpression: task.cronExpression,
      description: task.description,
      nextExecution: task.job.nextDate().toJSDate()
    }));
  }

  async cleanup(): Promise<void> {
    // Stop all cron jobs
    for (const task of this.tasks.values()) {
      task.job.stop();
    }
    this.tasks.clear();
  }
}

export const schedulerService = new SchedulerService();

export function initScheduler(): void {
  schedulerService.initialize().catch(console.error);
  
  // IPC handlers for scheduling
  ipcMain.handle('scheduler:schedulePost', async (_, postData) => {
    return await schedulerService.scheduleNewPost(postData);
  });
  
  ipcMain.handle('scheduler:cancelPost', async (_, postId) => {
    return await schedulerService.cancelPost(postId);
  });
  
  ipcMain.handle('scheduler:reschedulePost', async (_, postId, newTime) => {
    return await schedulerService.reschedulePost(postId, new Date(newTime));
  });
  
  ipcMain.handle('scheduler:getTasks', async () => {
    return schedulerService.getScheduledTasks();
  });
  
  ipcMain.handle('scheduler:getPendingPosts', async (_, userId, limit) => {
    return await dbService.getScheduledPosts(userId, 'pending', limit);
  });
  
  // Cleanup on app exit
  process.on('exit', () => {
    schedulerService.cleanup().catch(console.error);
  });
}