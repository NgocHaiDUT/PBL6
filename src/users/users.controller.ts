import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { SetUserRoleDto } from './dto/set-user-role.dto';
import { SetUserPermissionDto } from './dto/set-user-permission.dto';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { SetRolePermissionDto } from './dto/set-role-permission.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('page-info')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('view_users')
  getPageInfo() {
    return this.usersService.getPageInfo();
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('create_user')
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('view_users')
  findAll(@Query() queryDto: QueryUsersDto) {
    return this.usersService.findAll(queryDto);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('view_users')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('update_user')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('delete_user')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }

  // ================== ROLE & PERMISSION MANAGEMENT ==================

  /**
   * Set role for a user
   * PUT /users/:id/role
   */
  @Patch(':id/role')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('manage_roles')
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
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('manage_permissions')
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
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('view_users')
  getUserPermissions(@Param('id', ParseIntPipe) userId: number) {
    return this.usersService.getUserPermissions(userId);
  }

  /**
   * Create a new permission
   * POST /users/permissions
   */
  @Post('permissions')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('manage_permissions')
  createPermission(@Body() createPermissionDto: CreatePermissionDto) {
    return this.usersService.createPermission(createPermissionDto.name);
  }

  /**
   * Get all permissions
   * GET /users/permissions/all
   */
  @Get('permissions/all')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('view_users')
  getAllPermissions() {
    return this.usersService.getAllPermissions();
  }

  /**
   * Set permissions for a role
   * PUT /users/roles/:roleId/permissions
   */
  @Patch('roles/:roleId/permissions')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('manage_roles')
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
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('view_users')
  getAllRoles() {
    return this.usersService.getAllRoles();
  }
}
