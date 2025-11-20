import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { TestDataReader, TestCase } from './__test-data__/test-data-reader';
import { TestReportWriter, TestResult } from './__test-reports__/test-report-writer';
import { ScreenshotHelper } from './__test-reports__/screenshot-helper';
import { PostsService } from './posts.service';

function autoSetupMocksFromMetadata(testCase: TestCase, mockPrisma: any) {
  jest.clearAllMocks();

  if (!testCase.mockSetup) {
    console.warn(`⚠️  Test case ${testCase.testCaseId} không có mockSetup metadata`);
    return;
  }

  for (const [mockPath, mockValue] of Object.entries(testCase.mockSetup)) {
    const parts = mockPath.split('.');
    
    let target = mockPrisma;
    for (let i = 0; i < parts.length - 1; i++) {
      target = target[parts[i]];
      if (!target) {
        console.error(`❌ Mock path không hợp lệ: ${mockPath}`);
        return;
      }
    }

    const methodName = parts[parts.length - 1];
    const mockMethod = target[methodName];

    if (!mockMethod || typeof mockMethod.mockResolvedValue !== 'function') {
      console.error(`❌ Method không phải jest.fn(): ${mockPath}`);
      continue;
    }

    if (Array.isArray(mockValue)) {
      mockValue.forEach((value) => {
        mockMethod.mockResolvedValueOnce(value);
      });
    } else {
      mockMethod.mockResolvedValue(mockValue);
    }
  }

}
describe('POSTS - Data-Driven Testing', () => {
  let service: PostsService;
  let prismaService: PrismaService;
  const testResults: TestResult[] = [];

  const mockPrismaService = {
    users : {
      findUnique : jest.fn()
    },
    posts : {
      create : jest.fn(),
      findMany : jest.fn(),
      findUnique : jest.fn(),
      update : jest.fn(),
      delete : jest.fn()
    },
    tags : {
      findUnique : jest.fn(),
      create : jest.fn()
    },
    post_tags : {
      create : jest.fn(),
      deleteMany : jest.fn()
    },
    post_media : {
      createMany : jest.fn(),
      deleteMany : jest.fn()
    },
    post_products : {
      createMany : jest.fn(),
      deleteMany : jest.fn()
    },
    likes : {
      deleteMany : jest.fn(),
      count : jest.fn()
    },
    comments : {
      deleteMany : jest.fn(),
      count : jest.fn()
    }
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PostsService>(PostsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('deletePost', () => {
    const testData = TestDataReader.getTestCasesForFunction('test-case.json', 'deletePost');

    beforeAll(() => {
      TestDataReader.printTestCasesSummary(testData);
    });

    testData.forEach((testCase: TestCase) => {
      it(`${testCase.testCaseId}: ${testCase.testCaseDescription}`, async () => {
        const startTime = Date.now();
        let actualResult: any;
        let errorMessage: string | undefined;
        let testStatus: 'PASS' | 'FAIL' = 'PASS';
        let shouldThrow = false;
        let caughtError: any;

        try {
          autoSetupMocksFromMetadata(testCase, mockPrismaService);

          actualResult = await service.deletePost(
              testCase.input.id,
              testCase.input.userId
          );

          const isMatch = 
            actualResult?.success === testCase.expectedResult.success &&
            actualResult?.message === testCase.expectedResult.message;

          if (!isMatch) {
            testStatus = 'FAIL';
            errorMessage = `Expected: ${testCase.expectedResult.message}, Got: ${actualResult?.message}`;
          }

          expect(actualResult).toEqual(testCase.expectedResult);

        } catch (error) {
          testStatus = 'FAIL';
          
          if (!actualResult) {
            actualResult = { success: false, message: error.message };
          }
          
          if (!errorMessage) {
            errorMessage = error.message;
          }
          
          shouldThrow = true;
          caughtError = error;
        } finally {
          const executionTime = Date.now() - startTime;

          const testResult: TestResult = {
            testCaseId: testCase.testCaseId,
            description: testCase.testCaseDescription,
            functionName: 'deletePost',
            input: JSON.stringify(testCase.input, null, 2),
            expected: JSON.stringify(testCase.expectedResult, null, 2),
            actual: JSON.stringify(actualResult, null, 2),
            status: testStatus,
            executionTime: `${executionTime}ms`,
            timestamp: new Date().toISOString(),
            errorMessage,
          };

          testResults.push(testResult);

          if (testResult.status === 'FAIL') {
            console.log(`❌ ${testCase.testCaseId}: FAIL`);
            console.log(`   Expected: ${testCase.expectedResult.message}`);
            console.log(`   Actual: ${actualResult?.message}`);
          }

          if (shouldThrow) {
            throw caughtError;
          }
        }
      });
    });
  });

  afterAll(async () => {
    if (testResults.length > 0) {
      const testRunFolder = TestReportWriter.getTestRunFolder();
      
      ScreenshotHelper.setScreenshotsFolder(testRunFolder);
      
      const screenshots = await ScreenshotHelper.captureAllScreenshots(testResults);
      
      testResults.forEach(result => {
        result.screenshot = screenshots.get(result.testCaseId) || '';
      });
      
      await TestReportWriter.writeAllFormats(testResults);
      
      console.log(`\n📁 Test results saved to: ${testRunFolder}\n`);
    }
  }, 60000); 
});
