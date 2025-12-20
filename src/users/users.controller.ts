import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/constants/Permission.enum';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateUserWithAvatarDto } from './dto/create-user-with-avatar.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { SetUserRoleDto } from './dto/set-user-role.dto';
import { SetUserPermissionDto } from './dto/set-user-permission.dto';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { SetRolePermissionDto } from './dto/set-role-permission.dto';
import { GetAllPermissionsResponseDto } from './dto/get-all-permissions-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { avatarConfig, generateAvatarUrl } from './config/avatar.config';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('admin/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Get all permissions grouped by category
   * GET /users/permissions/all
   */
  @Get('permissions/all')
  @ApiOperation({
    summary: 'Get all permissions grouped by category',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns permissions grouped by category with metadata',
    type: GetAllPermissionsResponseDto,
    schema: {
      example: {
        success: true,
        data: [
          {
            group: 'USER',
            groupName: 'User Management',
            groupDescription: 'Quản lý người dùng',
            permissions: [
              { id: 1, name: 'view_users' },
              { id: 2, name: 'create_user' },
              { id: 3, name: 'update_user' },
              { id: 4, name: 'delete_user' },
            ],
          },
          {
            group: 'PRODUCT',
            groupName: 'Product Management',
            groupDescription: 'Quản lý sản phẩm',
            permissions: [
              { id: 5, name: 'create_product' },
              { id: 6, name: 'edit_product' },
            ],
          },
        ],
        metadata: {
          total: 17,
          groups: 5,
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires manage_users permission',
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_USERS)
  getAllPermissions() {
    return this.usersService.getAllPermissions();
  }

  /**
   * Get all roles with their permissions
   * GET /users/roles/all
   */
  @Get('roles/all')
  @ApiOperation({ summary: 'Get all roles with their permissions' })
  @ApiResponse({
    status: 200,
    description: 'Returns list of all roles with permissions',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires manage_users permission',
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_USERS)
  getAllRoles() {
    return this.usersService.getAllRoles();
  }

  @Get('page-info')
  @ApiOperation({ summary: 'Get page information for users management' })
  @ApiResponse({
    status: 200,
    description: 'Returns page info including total users, roles, permissions',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires manage_users permission',
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_USERS)
  getPageInfo() {
    return this.usersService.getPageInfo();
  }

  @Post()
  @ApiOperation({ 
    summary: 'Create a new user',
    description: 'Create a new user with optional avatar upload. Avatar file should be sent as multipart/form-data with field name "avatar"'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateUserWithAvatarDto })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires manage_users permission',
  })
  @ApiResponse({ status: 409, description: 'Conflict - Email already exists' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_USERS)
  @UseInterceptors(FileInterceptor('avatar', avatarConfig))
  create(
    @Body() createUserDto: CreateUserWithAvatarDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    // Nếu có file upload, tạo URL cho avatar
    const createData: CreateUserDto = {
      email: createUserDto.email,
      password: createUserDto.password,
      full_name: createUserDto.full_name,
      phone: createUserDto.phone,
      is_active: createUserDto.is_active,
      firstlogin: createUserDto.firstlogin,
      role_id: createUserDto.role_id,
    };
    
    if (file) {
      const avatarUrl = generateAvatarUrl(file);
      createData.avatar_url = avatarUrl;
    }
    
    return this.usersService.create(createData);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Returns paginated list of users' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires manage_users permission',
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_USERS)
  findAll(@Query() queryDto: QueryUsersDto) {
    return this.usersService.findAll(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID', type: Number })
  @ApiResponse({ status: 200, description: 'Returns user details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires manage_users permission',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_USERS)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ 
    summary: 'Update user by ID',
    description: 'Update user information including optional avatar upload to S3. Send avatar as multipart/form-data with field name "avatar"'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
        full_name: { type: 'string' },
        phone: { type: 'string' },
        is_active: { type: 'boolean' },
        firstlogin: { type: 'boolean' },
        role_id: { type: 'number' },
        password: { type: 'string' },
        story: { type: 'string' },
        avatar: {
          type: 'string',
          format: 'binary',
          description: 'Avatar image file (JPG, PNG, GIF, HEIC, HEIF, WebP, max 5MB)',
        },
      },
    },
  })
  @ApiParam({ name: 'id', description: 'User ID', type: Number })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires manage_users permission',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_USERS)
  @UseInterceptors(FileInterceptor('avatar', avatarConfig))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    // If avatar file is uploaded, generate URL and add to updateUserDto
    if (file) {
      const avatarUrl = generateAvatarUrl(file);
      updateUserDto.avatar_url = avatarUrl;
    }
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/avatar')
  @ApiOperation({ 
    summary: 'Update user avatar',
    description: 'Update user avatar by uploading a new image file. Supports both S3 and local storage based on configuration.'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
          description: 'Avatar image file (JPG, PNG, GIF, HEIC, HEIF, WebP, max 5MB)',
        },
      },
    },
  })
  @ApiParam({ name: 'id', description: 'User ID', type: Number })
  @ApiResponse({ status: 200, description: 'Avatar updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - No file provided or invalid file type' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires manage_users permission',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_USERS)
  @UseInterceptors(FileInterceptor('avatar', avatarConfig))
  updateAvatar(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No avatar file provided');
    }
    const avatarUrl = generateAvatarUrl(file);
    return this.usersService.updateAvatar(id, avatarUrl);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user by ID' })
  @ApiParam({ name: 'id', description: 'User ID', type: Number })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires manage_users permission',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_USERS)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }

  // ================== ROLE & PERMISSION MANAGEMENT ==================

  /**
   * Set role for a user
   * PUT /users/:id/role
   */
  @Patch(':id/role')
  @ApiOperation({ summary: 'Set role for a user' })
  @ApiParam({ name: 'id', description: 'User ID', type: Number })
  @ApiResponse({ status: 200, description: 'User role updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires manage_users permission',
  })
  @ApiResponse({ status: 404, description: 'User or role not found' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_USERS)
  setUserRole(
    @Param('id', ParseIntPipe) userId: number,
    @Body() setUserRoleDto: SetUserRoleDto,
  ) {
    return this.usersService.setUserRole(userId, setUserRoleDto.role_id);
  }

  /**
   * Set permissions for a specific user
   * PUT /users/:id/permissions
   */
  @Patch(':id/permissions')
  @ApiOperation({ summary: 'Set permissions for a specific user' })
  @ApiParam({ name: 'id', description: 'User ID', type: Number })
  @ApiResponse({
    status: 200,
    description: 'User permissions updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires manage_users permission',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_USERS)
  setUserPermissions(
    @Param('id', ParseIntPipe) userId: number,
    @Body() setUserPermissionDto: SetUserPermissionDto,
  ) {
    return this.usersService.setUserPermissions(
      userId,
      setUserPermissionDto.permission_ids,
    );
  }

  /**
   * Get user's permissions
   * GET /users/:id/permissions
   */
  @Get(':id/permissions')
  @ApiOperation({ summary: "Get user's permissions" })
  @ApiParam({ name: 'id', description: 'User ID', type: Number })
  @ApiResponse({
    status: 200,
    description:
      "Returns user's permissions including role permissions and direct permissions",
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires manage_users permission',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_USERS)
  getUserPermissions(@Param('id', ParseIntPipe) userId: number) {
    return this.usersService.getUserPermissions(userId);
  }

  /**
   * Create a new permission
   * POST /users/permissions
   */
  @Post('permissions')
  @ApiOperation({ summary: 'Create a new permission' })
  @ApiResponse({ status: 201, description: 'Permission created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires manage_users permission',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Permission already exists',
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_USERS)
  createPermission(@Body() createPermissionDto: CreatePermissionDto) {
    return this.usersService.createPermission(createPermissionDto.name);
  }

  /**
   * Set permissions for a role
   * PUT /users/roles/:roleId/permissions
   */
  @Patch('roles/:roleId/permissions')
  @ApiOperation({ summary: 'Set permissions for a role' })
  @ApiParam({ name: 'roleId', description: 'Role ID', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Role permissions updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires manage_users permission',
  })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_USERS)
  setRolePermissions(
    @Param('roleId', ParseIntPipe) roleId: number,
    @Body() setRolePermissionDto: SetRolePermissionDto,
  ) {
    return this.usersService.setRolePermissions(
      roleId,
      setRolePermissionDto.permission_ids,
    );
  }
}
