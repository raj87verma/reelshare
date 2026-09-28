import { ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { exec } from 'child_process';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffmpegStaticPath: string = require('ffmpeg-static');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffprobeStaticPath: string = require('ffprobe-static').path;

const execAsync = promisify(exec);

// electron-builder unpacks native binaries from asar into an
// app.asar.unpacked sibling directory; resolve to that path when packaged.
function resolveUnpackedBinaryPath(binaryPath: string): string {
  if (binaryPath.includes('app.asar')) {
    return binaryPath.replace('app.asar', 'app.asar.unpacked');
  }
  return binaryPath;
}

const FFMPEG_PATH = resolveUnpackedBinaryPath(ffmpegStaticPath);
const FFPROBE_PATH = resolveUnpackedBinaryPath(ffprobeStaticPath);

function shellQuote(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`;
}

export interface VideoMetadata {
  duration: number; // in seconds
  width: number;
  height: number;
  bitrate: number;
  codec: string;
  format: string;
  size: number; // in bytes
  frameRate: number;
  hasAudio: boolean;
}

export interface ProcessingOptions {
  trimStart?: number; // seconds
  trimEnd?: number; // seconds
  targetFormat?: 'mp4' | 'webm' | 'mov';
  targetResolution?: '1080p' | '720p' | '480p';
  quality?: number; // 1-100
  addWatermark?: boolean;
  addCaption?: string;
}

export interface ProcessedVideo {
  outputPath: string;
  thumbnailPath: string;
  metadata: VideoMetadata;
  processingTime: number;
}

class VideoProcessor {
  private initialized = false;
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(require('os').tmpdir(), 'reelshare');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      if (!fs.existsSync(FFMPEG_PATH)) {
        throw new Error(`Bundled ffmpeg binary not found at ${FFMPEG_PATH}`);
      }
      if (!fs.existsSync(FFPROBE_PATH)) {
        throw new Error(`Bundled ffprobe binary not found at ${FFPROBE_PATH}`);
      }

      this.initialized = true;
      console.log('FFmpeg initialized successfully (using bundled native binary)');
    } catch (error) {
      console.error('Failed to initialize FFmpeg:', error);
      throw error;
    }
  }

  private async runFfmpeg(args: string[]): Promise<void> {
    const quotedArgs = args.map(shellQuote).join(' ');
    const cmd = `${shellQuote(FFMPEG_PATH)} -y ${quotedArgs}`;
    await execAsync(cmd, { maxBuffer: 1024 * 1024 * 50 });
  }

  async getVideoMetadata(filePath: string): Promise<VideoMetadata> {
    try {
      const cmd = `${shellQuote(FFPROBE_PATH)} -v error -show_entries stream=width,height,codec_name,r_frame_rate -show_entries format=duration,bit_rate,size -of json ${shellQuote(filePath)}`;

      const { stdout } = await execAsync(cmd);
      const metadata = JSON.parse(stdout);

      const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
      const audioStream = metadata.streams.find((s: any) => s.codec_type === 'audio');

      return {
        duration: parseFloat(metadata.format.duration || 0),
        width: parseInt(videoStream?.width || 0),
        height: parseInt(videoStream?.height || 0),
        bitrate: parseInt(metadata.format.bit_rate || 0),
        codec: videoStream?.codec_name || 'unknown',
        format: path.extname(filePath).toLowerCase().replace('.', ''),
        size: parseInt(metadata.format.size || 0),
        frameRate: this.parseFrameRate(videoStream?.r_frame_rate || '0/0'),
        hasAudio: !!audioStream
      };
    } catch (error) {
      console.error('Error getting video metadata:', error);
      throw new Error(`Failed to get video metadata: ${error}`);
    }
  }

  async generateThumbnail(videoPath: string, timestamp: number = 5): Promise<string> {
    try {
      if (!this.initialized) await this.initialize();

      const thumbnailName = `thumbnail_${Date.now()}.jpg`;
      const thumbnailPath = path.join(this.tempDir, thumbnailName);

      await this.runFfmpeg([
        '-i', videoPath,
        '-ss', timestamp.toString(),
        '-vframes', '1',
        '-vf', 'scale=320:-1',
        thumbnailPath
      ]);

      return thumbnailPath;
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      throw new Error(`Failed to generate thumbnail: ${error}`);
    }
  }

  async processVideo(filePath: string, options: ProcessingOptions = {}): Promise<ProcessedVideo> {
    const startTime = Date.now();

    try {
      if (!this.initialized) await this.initialize();

      const originalMetadata = await this.getVideoMetadata(filePath);
      const outputName = `processed_${Date.now()}.${options.targetFormat || 'mp4'}`;
      const outputPath = path.join(this.tempDir, outputName);

      const args = ['-i', filePath];

      // Apply trimming if specified
      if (options.trimStart !== undefined) {
        args.push('-ss', options.trimStart.toString());
      }
      if (options.trimEnd !== undefined && originalMetadata.duration > options.trimEnd) {
        args.push('-to', options.trimEnd.toString());
      }

      // Apply resolution scaling
      if (options.targetResolution) {
        const resolution = this.getResolution(options.targetResolution);
        args.push('-vf', `scale=${resolution.width}:${resolution.height}`);
      }

      // Apply quality settings
      if (options.quality !== undefined) {
        args.push('-crf', Math.max(0, Math.min(51, 51 - options.quality)).toString());
      }

      // Add caption if specified
      if (options.addCaption) {
        args.push('-vf', `drawtext=text='${options.addCaption}':fontcolor=white:fontsize=24:box=1:boxcolor=black@0.5:boxborderw=5:x=(w-text_w)/2:y=h-th-40`);
      }

      args.push(outputPath);

      await this.runFfmpeg(args);

      const thumbnailPath = await this.generateThumbnail(outputPath);

      const processingTime = Date.now() - startTime;
      const processedMetadata = await this.getVideoMetadata(outputPath);

      return {
        outputPath,
        thumbnailPath,
        metadata: processedMetadata,
        processingTime
      };
    } catch (error) {
      console.error('Error processing video:', error);
      throw new Error(`Failed to process video: ${error}`);
    }
  }

  async compressVideo(inputPath: string, outputPath: string, quality: number = 75): Promise<string> {
    try {
      if (!this.initialized) await this.initialize();

      const crf = Math.max(0, Math.min(51, 51 - quality));

      await this.runFfmpeg([
        '-i', inputPath,
        '-c:v', 'libx264',
        '-crf', crf.toString(),
        '-preset', 'medium',
        '-c:a', 'aac',
        '-b:a', '128k',
        outputPath
      ]);

      return outputPath;
    } catch (error) {
      console.error('Error compressing video:', error);
      throw new Error(`Failed to compress video: ${error}`);
    }
  }

  async extractAudio(videoPath: string): Promise<string> {
    try {
      if (!this.initialized) await this.initialize();

      const audioName = `audio_${Date.now()}.mp3`;
      const audioPath = path.join(this.tempDir, audioName);

      await this.runFfmpeg([
        '-i', videoPath,
        '-q:a', '0',
        '-map', 'a',
        audioPath
      ]);

      return audioPath;
    } catch (error) {
      console.error('Error extracting audio:', error);
      throw new Error(`Failed to extract audio: ${error}`);
    }
  }

  private parseFrameRate(frameRate: string): number {
    if (!frameRate) return 0;
    
    if (frameRate.includes('/')) {
      const [num, den] = frameRate.split('/').map(Number);
      return den !== 0 ? num / den : 0;
    }
    
    return parseFloat(frameRate) || 0;
  }

  private getResolution(resolution: string): { width: number; height: number } {
    switch (resolution) {
      case '1080p':
        return { width: 1920, height: 1080 };
      case '720p':
        return { width: 1280, height: 720 };
      case '480p':
        return { width: 854, height: 480 };
      default:
        return { width: 1920, height: 1080 };
    }
  }

  async cleanupTempFiles(): Promise<void> {
    try {
      const files = fs.readdirSync(this.tempDir);
      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        // Delete files older than 1 hour
        const stats = fs.statSync(filePath);
        const age = Date.now() - stats.mtimeMs;
        if (age > 3600000) { // 1 hour in milliseconds
          fs.unlinkSync(filePath);
        }
      }
    } catch (error) {
      console.error('Error cleaning up temp files:', error);
    }
  }
}

export const videoProcessor = new VideoProcessor();

export function initVideoProcessor(): void {
  videoProcessor.initialize().catch(console.error);
  
  // Set up cleanup interval (every 30 minutes)
  setInterval(() => {
    videoProcessor.cleanupTempFiles().catch(console.error);
  }, 30 * 60 * 1000);
  
  // IPC handlers for video processing
  ipcMain.handle('video:getMetadata', async (_, filePath: string) => {
    return await videoProcessor.getVideoMetadata(filePath);
  });
  
  ipcMain.handle('video:generateThumbnail', async (_, filePath: string, timestamp?: number) => {
    return await videoProcessor.generateThumbnail(filePath, timestamp);
  });
  
  ipcMain.handle('video:process', async (_, filePath: string, options: ProcessingOptions) => {
    return await videoProcessor.processVideo(filePath, options);
  });
  
  ipcMain.handle('video:compress', async (_, inputPath: string, outputPath: string, quality: number) => {
    return await videoProcessor.compressVideo(inputPath, outputPath, quality);
  });
  
  ipcMain.handle('video:extractAudio', async (_, videoPath: string) => {
    return await videoProcessor.extractAudio(videoPath);
  });
  
  ipcMain.handle('video:cleanupTempFiles', async () => {
    await videoProcessor.cleanupTempFiles();
    return true;
  });
}