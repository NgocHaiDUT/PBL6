import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

function createTestRunFolder(): string {
  const timestamp = new Date()
    .toISOString()
    .replace(/T/, '_')
    .replace(/\..+/, '')
    .replace(/:/g, '-');
  
  const folderName = `test-run-${timestamp}`;
  const folderPath = path.join(__dirname, folderName);
  
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
  
  return folderPath;
}

export interface TestResult {
  testCaseId: string;
  description: string;
  functionName: string;
  input: string;
  expected: string;
  actual: string;
  status: 'PASS' | 'FAIL';
  executionTime: string;
  timestamp: string;
  errorMessage?: string;
  screenshot?: string; 
}

export class TestReportWriter {
  private static testRunFolder: string = '';

  static getTestRunFolder(): string {
    if (!this.testRunFolder) {
      this.testRunFolder = createTestRunFolder();
    }
    return this.testRunFolder;
  }

  static writeToJSON(testResults: TestResult[], fileName: string = 'test-results.json'): void {
    try {
      const filePath = path.join(__dirname, fileName);
      const reportData = {
        testRunDate: new Date().toISOString(),
        totalTests: testResults.length,
        passed: testResults.filter(r => r.status === 'PASS').length,
        failed: testResults.filter(r => r.status === 'FAIL').length,
        passRate: `${((testResults.filter(r => r.status === 'PASS').length / testResults.length) * 100).toFixed(2)}%`,
        results: testResults
      };

      fs.writeFileSync(filePath, JSON.stringify(reportData, null, 2), 'utf-8');
      console.log(`\n✅ Đã xuất kết quả ra file JSON: ${fileName}`);
    } catch (error) {
      console.error('Error writing JSON report:', error);
    }
  }

  static printToConsole(testResults: TestResult[]): void {
    const totalTests = testResults.length;
    const passed = testResults.filter(r => r.status === 'PASS').length;
    const failed = totalTests - passed;
    const passRate = ((passed / totalTests) * 100).toFixed(2);

    console.log('\n' + '='.repeat(80));
    console.log(`📊 TEST SUMMARY: ${passed}/${totalTests} passed (${passRate}%)`);
    console.log('='.repeat(80));
    
    const failedTests = testResults.filter(r => r.status === 'FAIL');
    
    if (failedTests.length > 0) {
      console.log('\n❌ FAILED TESTS:\n');
      failedTests.forEach((result) => {
        console.log(`  ${result.testCaseId}: ${result.description}`);
        const expected = JSON.parse(result.expected);
        const actual = JSON.parse(result.actual);
        console.log(`    Expected: ${expected.message}`);
        console.log(`    Actual:   ${actual.message}`);
        if (result.errorMessage) {
          console.log(`    Error: ${result.errorMessage}`);
        }
        console.log('');
      });
    }
    
    console.log('='.repeat(80) + '\n');
  }

  static async writeToExcel(testResults: TestResult[], fileName: string = 'test-results.xlsx'): Promise<void> {
    try {
      const testRunFolder = this.getTestRunFolder();
      const filePath = path.join(testRunFolder, fileName);
      
      const excelData = testResults.map((result, index) => {
        const expected = JSON.parse(result.expected);
        const actual = JSON.parse(result.actual);
        
        return {
          'No': index + 1,
          'Test Case ID': result.testCaseId,
          'Description': result.description,
          'Function': result.functionName,
          'Status': result.status,
          'Input': JSON.stringify(JSON.parse(result.input), null, 2),
          'Expected Message': expected.message || JSON.stringify(expected),
          'Actual Message': actual.message || JSON.stringify(actual),
          'Match': result.status === 'PASS' ? 'YES' : 'NO',
          'Execution Time': result.executionTime,
          'Timestamp': result.timestamp,
          'Error': result.errorMessage || '',
          'Screenshot': result.screenshot || 'N/A'
        };
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      const colWidths = [
        { wch: 5 },   // No
        { wch: 12 },  // Test Case ID
        { wch: 50 },  // Description
        { wch: 15 },  // Function
        { wch: 8 },   // Status
        { wch: 40 },  // Input
        { wch: 40 },  // Expected Message
        { wch: 40 },  // Actual Message
        { wch: 8 },   // Match
        { wch: 15 },  // Execution Time
        { wch: 20 },  // Timestamp
        { wch: 30 },  // Error
        { wch: 30 },  // Screenshot
      ];
      ws['!cols'] = colWidths;

      // Thêm summary sheet
      const summary = [
        { Metric: 'Total Tests', Value: testResults.length },
        { Metric: 'Passed', Value: testResults.filter(r => r.status === 'PASS').length },
        { Metric: 'Failed', Value: testResults.filter(r => r.status === 'FAIL').length },
        { Metric: 'Pass Rate', Value: `${((testResults.filter(r => r.status === 'PASS').length / testResults.length) * 100).toFixed(2)}%` },
        { Metric: 'Test Run Date', Value: new Date().toISOString() }
      ];
      const wsSummary = XLSX.utils.json_to_sheet(summary);
      wsSummary['!cols'] = [{ wch: 20 }, { wch: 30 }];

      // Add sheets to workbook
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
      XLSX.utils.book_append_sheet(wb, ws, 'Test Results');

      // Write file
      XLSX.writeFile(wb, filePath);
      console.log(`✅ Đã xuất kết quả ra file EXCEL: ${path.basename(testRunFolder)}/${fileName}`);
    } catch (error) {
      console.error('Error writing Excel report:', error);
    }
  }

  static writeToTextFile(testResults: TestResult[], fileName: string = 'test-results.txt'): void {
    try {
      const filePath = path.join(__dirname, fileName);
      let content = '';

      content += '='.repeat(120) + '\n';
      content += 'TEST EXECUTION RESULTS\n';
      content += '='.repeat(120) + '\n\n';

      const totalTests = testResults.length;
      const passed = testResults.filter(r => r.status === 'PASS').length;
      const failed = totalTests - passed;
      const passRate = ((passed / totalTests) * 100).toFixed(2);

      content += 'SUMMARY:\n';
      content += `Total Tests: ${totalTests}\n`;
      content += `Passed: ${passed}\n`;
      content += `Failed: ${failed}\n`;
      content += `Pass Rate: ${passRate}%\n\n`;

      content += 'DETAILED RESULTS:\n\n';
      
      testResults.forEach((result, index) => {
        content += `${index + 1}. [${result.status}] ${result.testCaseId}: ${result.description}\n`;
        content += `   Function: ${result.functionName}\n`;
        content += `   Input: ${result.input}\n`;
        content += `   Expected: ${result.expected}\n`;
        content += `   Actual: ${result.actual}\n`;
        content += `   Execution Time: ${result.executionTime}\n`;
        content += `   Timestamp: ${result.timestamp}\n`;
        
        if (result.errorMessage) {
          content += `   Error: ${result.errorMessage}\n`;
        }
        content += '\n';
      });

      content += '='.repeat(120) + '\n';

      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`✅ Đã xuất kết quả ra file TEXT: ${fileName}`);
    } catch (error) {
      console.error('Error writing text report:', error);
    }
  }

  static async writeAllFormats(testResults: TestResult[]): Promise<void> {
    this.printToConsole(testResults);
    // Chỉ xuất Excel, bỏ JSON và Text
    await this.writeToExcel(testResults);
  }
}
