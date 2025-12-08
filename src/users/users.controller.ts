import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/constants/Permission.enum';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { SetUserRoleDto } from './dto/set-user-role.dto';
import { SetUserPermissionDto } from './dto/set-user-permission.dto';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { SetRolePermissionDto } from './dto/set-role-permission.dto';
import { GetAllPermissionsResponseDto } from './dto/get-all-permissions-response.dto';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('page-info')
  @ApiOperation({ summary: 'Get page information for users management' })
  @ApiResponse({ status: 200, description: 'Returns page info including total users, roles, permissions' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires view_users permission' })
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.VIEW_USERS)
  getPageInfo() {
    return this.usersService.getPageInfo();
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires create_user permission' })
  @ApiResponse({ status: 409, description: 'Conflict - Email already exists' })
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.CREATE_USER)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Returns paginated list of users' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires view_users permission' })
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.VIEW_USERS)
  findAll(@Query() queryDto: QueryUsersDto) {
    return this.usersService.findAll(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID', type: Number })
  @ApiResponse({ status: 200, description: 'Returns user details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires view_users permission' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.VIEW_USERS)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user by ID' })
  @ApiParam({ name: 'id', description: 'User ID', type: Number })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires update_user permission' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.UPDATE_USER)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user by ID' })
  @ApiParam({ name: 'id', description: 'User ID', type: Number })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires delete_user permission' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.DELETE_USER)
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
  @ApiResponse({ status: 403, description: 'Forbidden - Requires manage_roles permission' })
  @ApiResponse({ status: 404, description: 'User or role not found' })
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_ROLES)
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
  @ApiResponse({ status: 200, description: 'User permissions updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires manage_permissions permission' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_PERMISSIONS)
  setUserPermissions(
    @Param('id', ParseIntPipe) userId: number,
    @Body() setUserPermissionDto: SetUserPermissionDto,
  ) {
    return this.usersService.setUserPermissions(userId, setUserPermissionDto.permission_ids);
  }

  /**
   * Get user's permissions
   * GET /users/:id/permissions
   */
  @Get(':id/permissions')
  @ApiOperation({ summary: "Get user's permissions" })
  @ApiParam({ name: 'id', description: 'User ID', type: Number })
  @ApiResponse({ status: 200, description: "Returns user's permissions including role permissions and direct permissions" })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires view_users permission' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.VIEW_USERS)
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
  @ApiResponse({ status: 403, description: 'Forbidden - Requires manage_permissions permission' })
  @ApiResponse({ status: 409, description: 'Conflict - Permission already exists' })
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_PERMISSIONS)
  createPermission(@Body() createPermissionDto: CreatePermissionDto) {
    return this.usersService.createPermission(createPermissionDto.name);
  }

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
              { id: 4, name: 'delete_user' }
            ]
          },
          {
            group: 'PRODUCT',
            groupName: 'Product Management',
            groupDescription: 'Quản lý sản phẩm',
            permissions: [
              { id: 5, name: 'create_product' },
              { id: 6, name: 'edit_product' }
            ]
          }
        ],
        metadata: {
          total: 17,
          groups: 5
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires view_users permission' })
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.VIEW_USERS)
  getAllPermissions() {
    return this.usersService.getAllPermissions();
  }

  /**
   * Set permissions for a role
   * PUT /users/roles/:roleId/permissions
   */
  @Patch('roles/:roleId/permissions')
  @ApiOperation({ summary: 'Set permissions for a role' })
  @ApiParam({ name: 'roleId', description: 'Role ID', type: Number })
  @ApiResponse({ status: 200, description: 'Role permissions updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires manage_roles permission' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_ROLES)
  setRolePermissions(
    @Param('roleId', ParseIntPipe) roleId: number,
    @Body() setRolePermissionDto: SetRolePermissionDto,
  ) {
    return this.usersService.setRolePermissions(roleId, setRolePermissionDto.permission_ids);
  }

  /**
   * Get all roles with their permissions
   * GET /users/roles/all
   */
  @Get('roles/all')
  @ApiOperation({ summary: 'Get all roles with their permissions' })
  @ApiResponse({ status: 200, description: 'Returns list of all roles with permissions' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires view_users permission' })
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.VIEW_USERS)
  getAllRoles() {
    return this.usersService.getAllRoles();
  }
}
