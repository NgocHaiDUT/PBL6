import * as fs from 'fs';
import * as path from 'path';

export interface TestCase {
  testCaseId: string;
  testCaseDescription: string;
  input: any;
  expectedResult: any;
  mockSetup?: Record<string, any>; 
}

export interface TestDataCollection {
  addstaff?: TestCase[];
  removestaff?: TestCase[];
  updatestaffpermission?: TestCase[];
  deletestaffpermission?: TestCase[];
  [key: string]: TestCase[] | undefined;
}

export class TestDataReader {
 
  static readFromJSON(fileName: string): TestDataCollection {
    try {
      const filePath = path.join(__dirname, fileName);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(fileContent);
    } catch (error) {
      console.error(`Error reading JSON file ${fileName}:`, error);
      throw error;
    }
  }

  static getTestCasesForFunction(fileName: string, functionName: string): TestCase[] {
    const allTestData = this.readFromJSON(fileName);
    return allTestData[functionName] || [];
  }

  static printTestCasesSummary(testCases: TestCase[]): void {
    console.log(`\n📋 Running ${testCases.length} test cases...\n`);
  }
}
