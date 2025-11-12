import * as fs from 'fs';
import * as path from 'path';
import puppeteer from 'puppeteer';

export interface ScreenshotData {
  testCaseId: string;
  status: 'PASS' | 'FAIL';
  description: string;
  input: string;
  expected: string;
  actual: string;
  executionTime: string;
}

export class ScreenshotHelper {
  private static screenshotsFolder: string = '';

  static setScreenshotsFolder(folder: string): void {
    this.screenshotsFolder = folder;
  }

  private static createTestCaseHTML(data: ScreenshotData): string {
    const statusColor = data.status === 'PASS' ? '#4CAF50' : '#f44336';
    const statusIcon = data.status === 'PASS' ? '✅' : '❌';
    
    const expected = JSON.parse(data.expected);
    const actual = JSON.parse(data.actual);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 20px;
      background: #f5f5f5;
      margin: 0;
    }
    .container {
      background: white;
      border-radius: 8px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      max-width: 800px;
    }
    .header {
      border-bottom: 3px solid ${statusColor};
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .test-id {
      font-size: 24px;
      font-weight: bold;
      color: #333;
      margin-bottom: 8px;
    }
    .status {
      display: inline-block;
      padding: 8px 16px;
      background: ${statusColor};
      color: white;
      border-radius: 4px;
      font-weight: bold;
      font-size: 18px;
    }
    .description {
      margin-top: 12px;
      color: #666;
      font-size: 16px;
      line-height: 1.5;
    }
    .section {
      margin: 20px 0;
      padding: 16px;
      background: #f9f9f9;
      border-left: 4px solid #2196F3;
      border-radius: 4px;
    }
    .section-title {
      font-weight: bold;
      color: #2196F3;
      margin-bottom: 8px;
      font-size: 14px;
      text-transform: uppercase;
    }
    .section-content {
      color: #333;
      font-size: 15px;
      line-height: 1.6;
      white-space: pre-wrap;
      font-family: 'Courier New', monospace;
    }
    .result-box {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin: 20px 0;
    }
    .result-item {
      padding: 16px;
      border-radius: 4px;
      background: #fff;
      border: 2px solid #e0e0e0;
    }
    .result-item.expected {
      border-color: #4CAF50;
    }
    .result-item.actual {
      border-color: ${data.status === 'PASS' ? '#4CAF50' : '#f44336'};
    }
    .result-label {
      font-weight: bold;
      font-size: 12px;
      text-transform: uppercase;
      margin-bottom: 8px;
      color: #666;
    }
    .result-message {
      font-size: 16px;
      color: #333;
      font-weight: 500;
    }
    .footer {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
      color: #999;
      font-size: 13px;
      display: flex;
      justify-content: space-between;
    }
    .success-badge {
      color: #4CAF50;
      font-weight: bold;
    }
    .error-badge {
      color: #f44336;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="test-id">${statusIcon} ${data.testCaseId}</div>
      <span class="status">${data.status}</span>
      <div class="description">${data.description}</div>
    </div>

    <div class="section">
      <div class="section-title">📥 Input</div>
      <div class="section-content">${data.input}</div>
    </div>

    <div class="result-box">
      <div class="result-item expected">
        <div class="result-label">Expected Result</div>
        <div class="result-message ${expected.success ? 'success-badge' : 'error-badge'}">
          ${expected.message || JSON.stringify(expected, null, 2)}
        </div>
      </div>
      <div class="result-item actual">
        <div class="result-label">Actual Result</div>
        <div class="result-message ${actual.success ? 'success-badge' : 'error-badge'}">
          ${actual.message || JSON.stringify(actual, null, 2)}
        </div>
      </div>
    </div>

    <div class="footer">
      <span>⏱️ Execution Time: ${data.executionTime}</span>
      <span>🕐 ${new Date().toLocaleString()}</span>
    </div>
  </div>
</body>
</html>
    `;
  }

  static async captureScreenshot(data: ScreenshotData): Promise<string> {
    const screenshotsDir = this.screenshotsFolder 
      ? path.join(this.screenshotsFolder, 'screenshots')
      : path.join(__dirname, 'screenshots');
    
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    const htmlContent = this.createTestCaseHTML(data);
    const screenshotPath = path.join(screenshotsDir, `${data.testCaseId}.png`);

    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setViewport({ width: 850, height: 600 });
      await page.setContent(htmlContent);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await page.screenshot({
        path: screenshotPath as `${string}.png`,
        fullPage: true
      });

      await browser.close();

      return screenshotPath;
    } catch (error) {
      console.error(`Error capturing screenshot for ${data.testCaseId}:`, error);
      return '';
    }
  }

  static async captureAllScreenshots(testResults: any[]): Promise<Map<string, string>> {
    const screenshots = new Map<string, string>();

    console.log('\n📸 Capturing screenshots...');

    for (const result of testResults) {
      const screenshotData: ScreenshotData = {
        testCaseId: result.testCaseId,
        status: result.status,
        description: result.description,
        input: result.input,
        expected: result.expected,
        actual: result.actual,
        executionTime: result.executionTime
      };

      const screenshotPath = await this.captureScreenshot(screenshotData);
      if (screenshotPath) {
        screenshots.set(result.testCaseId, screenshotPath);
        console.log(`   ✅ ${result.testCaseId}`);
      } else {
        console.log(`   ❌ ${result.testCaseId} - Failed`);
      }
    }

    console.log('📸 Screenshots completed!\n');

    return screenshots;
  }
}
