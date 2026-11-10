import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { ZodValidationPipe } from '@/shared/nest/pipes/validation.pipe';
import { Roles } from '@/shared/nest/roles/roles.decorator';
import { RolesGuard } from '@/shared/nest/roles/roles.guard';
import { Role } from '@/shared/types/user.roles';
import { createResponse } from '@/shared/utils/createResponse';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { apiResponseSchema } from '@/shared/swagger/apiResponseSchema';

import { AddPackagesUseCase } from '../../usecases/addPackages.usecase';
import { GetAllPackagesUseCase } from '../../usecases/getAllPackages.usecase';
import { PackagesSchema, PackagesType } from '../../dtos/packages';
import { GetPackageByIdUseCase } from '../../usecases/getPackageById.usecase';
import { DeletePackageByIdUseCase } from '../../usecases/deletePackageById.usecase';
import { UpdatePackagesUseCase } from '../../usecases/updatePackages.usecase';

const pricingPackageSchema = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    type: { type: 'string' },
    requestTokensLength: { type: 'string' },
    requestTokensPrice: { type: 'string' },
    responseTokensLength: { type: 'string' },
    responseTokensPrice: { type: 'string' },
  },
};

const pricingPackageBody = {
  type: 'object',
  required: [
    'type',
    'requestTokensLength',
    'requestTokensPrice',
    'responseTokensLength',
    'responseTokensPrice',
  ],
  properties: {
    type: { type: 'string' },
    requestTokensLength: { type: 'string' },
    requestTokensPrice: { type: 'string' },
    responseTokensLength: { type: 'string' },
    responseTokensPrice: { type: 'string' },
  },
};

@ApiTags('Packages')
@Controller('packages')
export class PackagesController {
  constructor(
    private readonly addPackagesUseCase: AddPackagesUseCase,
    private readonly getAllPackagesUseCase: GetAllPackagesUseCase,
    private readonly getPackageByIdUseCase: GetPackageByIdUseCase,
    private readonly deletePackageByIdUseCase: DeletePackageByIdUseCase,
    private readonly updatePackagesUseCase: UpdatePackagesUseCase,
  ) {}

  @ApiOperation({
    summary: 'List all pricing packages',
    description:
      'Returns all AI token pricing tiers (request/response token length & price).',
  })
  @ApiResponse({
    status: 200,
    description: 'List of pricing packages.',
    schema: apiResponseSchema({ type: 'array', items: pricingPackageSchema }),
  })
  @Get('')
  async getPackages() {
    const allPackages = await this.getAllPackagesUseCase.execute();

    return createResponse(true, null, allPackages || []);
  }

  @ApiOperation({
    summary: 'Get a pricing package by id',
    description: 'Returns a single AI token pricing tier.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Pricing package id.' })
  @ApiResponse({
    status: 200,
    description: 'Pricing package.',
    schema: apiResponseSchema(pricingPackageSchema),
  })
  @Get(':id')
  async getPackage(@Param('id', ParseIntPipe) id: number) {
    const getPackageById = await this.getPackageByIdUseCase.execute(id);

    return createResponse(true, null, getPackageById || []);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a pricing package',
    description:
      'Creates a new AI token pricing tier. Restricted to platform admins.',
  })
  @ApiBody({ schema: pricingPackageBody })
  @ApiResponse({
    status: 201,
    description: 'Pricing package created.',
    schema: apiResponseSchema({ type: 'boolean' }),
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponse({
    status: 403,
    description: 'User does not have the Admin role.',
  })
  @ApiResponse({
    status: 409,
    description: 'A pricing package with this type already exists.',
  })
  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @UsePipes(new ZodValidationPipe(PackagesSchema))
  async setPackages(@Body() data: PackagesType) {
    const userSettings = await this.addPackagesUseCase.execute(data);

    return createResponse(true, null, userSettings);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a pricing package',
    description:
      'Deletes an AI token pricing tier by id. Restricted to platform admins.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Pricing package id.' })
  @ApiResponse({
    status: 200,
    description: 'Pricing package deleted.',
    schema: apiResponseSchema({ type: 'boolean' }),
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponse({
    status: 403,
    description: 'User does not have the Admin role.',
  })
  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async deletePackages(@Param('id', ParseIntPipe) id: number) {
    const userSettings = await this.deletePackageByIdUseCase.execute(id);

    return createResponse(true, null, userSettings);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a pricing package',
    description:
      'Updates an AI token pricing tier by id. Restricted to platform admins.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Pricing package id.' })
  @ApiBody({ schema: pricingPackageBody })
  @ApiResponse({
    status: 200,
    description: 'Pricing package updated.',
    schema: apiResponseSchema(pricingPackageSchema),
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponse({
    status: 403,
    description: 'User does not have the Admin role.',
  })
  @ApiResponse({ status: 404, description: 'Pricing package not found.' })
  @Put(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  // @UsePipes(new ZodValidationPipe(PackagesSchema))
  async updatePackages(
    @Param('id', ParseIntPipe) packageId: number, // Extracted explicitly
    @Body(new ZodValidationPipe(PackagesSchema))
    updatePackageData: PackagesType,
  ) {
    const userSettings = await this.updatePackagesUseCase.execute({
      packageId,
      updatePackageData,
    });

    return createResponse(true, null, userSettings);
  }
}
