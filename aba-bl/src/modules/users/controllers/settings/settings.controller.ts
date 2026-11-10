import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { ZodValidationPipe } from '@/shared/nest/pipes/validation.pipe';
import { Roles } from '@/shared/nest/roles/roles.decorator';
import { RolesGuard } from '@/shared/nest/roles/roles.guard';
import { Role } from '@/shared/types/user.roles';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
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
import { GetUserSettingsUseCase } from '@/modules/users/usecases/settings/getUserSettings.usecase';
import { createResponse } from '@/shared/utils/createResponse';
import { UserIdSchema } from '@/modules/users/dtos/userID';
import { SetUserSettingsUseCase } from '@/modules/users/usecases/settings/setUserSettings.usecase';
import {
  SetUserSettingsSchema,
  SetUserSettingsType,
} from '@/modules/users/dtos/setUserSettings';
import { Request } from 'express';
import { ApplicationMessages } from '@/shared/constants/messages';
import { apiResponseSchema } from '@/shared/swagger/apiResponseSchema';

const userSettingsSchema = {
  type: 'object',
  properties: {
    model: { type: 'string' },
    credit: { type: 'string' },
    length: { type: 'string' },
    requests_count: { type: 'string' },
    history: { type: 'array', items: { type: 'object' } },
  },
};

/**
 * This controller get and set the user settings.
 */
@ApiTags('Settings')
@ApiBearerAuth()
@Controller('users/settings')
export class SettingsController {
  constructor(
    private readonly getUserSettingsUseCase: GetUserSettingsUseCase,
    private readonly setUserSettingsUseCase: SetUserSettingsUseCase,
  ) {}

  @ApiOperation({
    summary: "Get a user's AI assistant settings",
    description:
      'Returns the AI assistant settings (model, credit, length, etc.) for the given user.',
  })
  @ApiParam({
    name: 'id',
    description: 'User id. Must match the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'User settings.',
    schema: apiResponseSchema(userSettingsSchema),
  })
  @ApiResponse({
    status: 401,
    description:
      'Missing or invalid bearer token, or id does not match the authenticated user.',
  })
  @Get(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.User)
  @UsePipes(new ZodValidationPipe(UserIdSchema))
  async getSettings(@Param() params: { id: string }, @Req() req: Request) {
    const userId = (req as any).user?.sub;
    if (userId !== Number(params.id))
      return createResponse(
        false,
        null,
        ApplicationMessages.UserAnAuthorizedError,
      );
    const userSettings = await this.getUserSettingsUseCase.execute({
      id: userId,
    });

    return createResponse(true, null, userSettings);
  }

  @ApiOperation({
    summary: "Create or update the authenticated user's AI assistant settings",
    description:
      'Upserts the AI assistant settings (model, credit, length, etc.) for the authenticated user.',
  })
  @ApiBody({
    schema: {
      ...userSettingsSchema,
      required: ['model', 'credit', 'length', 'requests_count'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Settings saved.',
    schema: apiResponseSchema(userSettingsSchema),
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.User)
  @UsePipes(new ZodValidationPipe(SetUserSettingsSchema))
  async setUserSettings(
    @Body() data: SetUserSettingsType,
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.sub;
    const userSettings = await this.setUserSettingsUseCase.execute({
      ...data,
      userId: userId,
    });

    return createResponse(true, null, userSettings);
  }
}
