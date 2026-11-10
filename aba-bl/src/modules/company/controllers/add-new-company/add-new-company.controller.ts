import { Body, Controller, Post, UsePipes } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiResponse as ApiResponseDecorator,
  ApiTags,
} from '@nestjs/swagger';
import { ZodValidationPipe } from '@/shared/nest/pipes/validation.pipe';
import {
  RegisterCompanySchema,
  TRegisterCompany,
} from '@/modules/company/dtos/addNewCompanyDto';
import { ApiResponse } from '@/shared/types/apiResponse';
import { createResponse } from '@/shared/utils/createResponse';
import { AddCompanyUseCase } from '@/modules/company/usecases/add-company-use-case';
import { Err } from 'neverthrow';
import { apiResponseSchema } from '@/shared/swagger/apiResponseSchema';

@ApiTags('Company')
@Controller('company')
export class CompanyController {
  constructor(private readonly addCompanyUseCase: AddCompanyUseCase) {}

  @ApiOperation({
    summary: 'Register a new company',
    description:
      'Creates a new company together with its first (admin) user account.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['username', 'email', 'website', 'password'],
      properties: {
        username: { type: 'string', minLength: 3, maxLength: 20 },
        email: { type: 'string', format: 'email' },
        website: { type: 'string', format: 'uri' },
        password: { type: 'string', minLength: 8 },
        phone: { type: 'string', nullable: true },
        address: { type: 'string', nullable: true },
        city: { type: 'string', nullable: true },
        state: { type: 'string', nullable: true },
        country: { type: 'string', nullable: true },
        postalCode: { type: 'string', nullable: true },
        firstName: { type: 'string', nullable: true },
        lastName: { type: 'string', nullable: true },
      },
    },
  })
  @ApiResponseDecorator({
    status: 201,
    description: 'Company registered successfully.',
    schema: apiResponseSchema({ type: 'boolean' }),
  })
  @ApiResponseDecorator({
    status: 200,
    description: 'Registration failed (validation/business error).',
    schema: apiResponseSchema({ type: 'boolean' }),
  })
  @Post('/new')
  @UsePipes(new ZodValidationPipe(RegisterCompanySchema))
  async getCompanyInfo(
    @Body() request: TRegisterCompany,
  ): Promise<ApiResponse<boolean>> {
    try {
      const result = await this.addCompanyUseCase.execute(request);

      if (result instanceof Error) {
        return createResponse(false, result.message, false);
      }
      return createResponse(true, null, !!result);
    } catch (error: unknown) {
      return createResponse(
        false,
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred while adding the company.',
      );
    }
  }
}
