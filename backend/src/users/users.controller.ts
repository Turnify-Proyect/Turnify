import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  Req,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';

import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Roles } from '../decorators/roles.decorators';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/userRoles.enum';
import { CreateUserByAdminDto } from './dto/create-user-by-admin.dto'
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';
import {
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
  ApiParam,
  ApiOperation,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { UserOwnerOrAdminGuard } from '../auth/guards/user-owner-or-admin.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiQuery({
    name: 'page',
    required: false,
    type: String,
    description: 'Numero de pagina',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: String,
    description: 'Usuarios por pagina',
  })
  @ApiQuery({
  name: 'search',
  required: false,
  type: String,
  description: 'Buscar usuario por nombre o email',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: UserRole,
    description: 'Filtrar usuarios por rol',
  })

  @ApiQuery({
  name: 'isActive',
  required: false,
  type: Boolean,
  description: 'Filtrar usuarios por estado activo o inactivo',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios',
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos para acceder',
  })
  getAllUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') role?: UserRole,
    @Query('isActive') isActive?: string,
  ): any {
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const validPage = !isNaN(pageNum) && pageNum > 0 ? pageNum : 1;
    const validLimit = !isNaN(limitNum) && limitNum > 0 ? limitNum : 5;
    const validIsActive =
      isActive === 'true'
        ? true
        : isActive === 'false'
          ? false
          : undefined;

    return this.usersService.getAllUsers(validPage, validLimit, search, role, validIsActive,);
  }

  // Endpoint para que el usuario pueda ver su propio perfil, sin necesidad de ser admin, solo con estar autenticado
  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener el perfil del usuario autenticado',
    description:
      'Devuelve los datos del usuario correspondiente al token JWT enviado en la cabecera Authorization. No requiere enviar el ID del usuario por parámetro.',
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil del usuario autenticado obtenido correctamente',
  })
  @ApiResponse({
    status: 401,
    description: 'Token no enviado, inválido o expirado',
  })
  getMyProfile(@Req() req: any) {
    return this.usersService.getUserById(req.user.id);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'ID del usuario',
  })
  @ApiResponse({
    status: 200,
    description: 'Usuario encontrado',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado',
  })
  getUserById(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.getUserById(id);
  }
  //agregué mas roles al endpoint para que sea de acceso al usuario y al profesional
  //coemntado por:Lautaro-dev
  @Put(':id')
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  //tambien agregué un nuevo guard para verificar que el cliente pueda modificar su propia inf.
  //y que si es admin pueda modificar el de cualquiera
  @UseGuards(AuthGuard, RolesGuard, UserOwnerOrAdminGuard)
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'ID del usuario a actualizar',
  })
  @ApiResponse({
    status: 200,
    description: 'Usuario actualizado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado',
  })
  @ApiResponse({
    status: 409,
    description: 'El email o el teléfono ya están registrados',
  })
  updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(id, updateUserDto);
  }

  // Endpoint solo para el cambio de contraseña de usuario.
  // Utiliza UserOwnerOrAdminGuard para permitir que un cliente actualice su propia clave

  @Patch(':id/password')
  @Roles(UserRole.CLIENT, UserRole.ADMIN, UserRole.PROFESSIONAL)
  @UseGuards(AuthGuard, RolesGuard, UserOwnerOrAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cambiar contraseña de usuario',
    description:
      'Permite a un usuario autenticado o a un administrador actualizar la contraseña de la cuenta.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'ID del usuario a cambiar contraseña',
  })
  @ApiResponse({
    status: 200,
    description: 'Contraseña actualizada correctamente',
  })
  @ApiResponse({
    status: 400,
    description: 'La contraseña no cumple con los requisitos de fortaleza',
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos para modificar esta cuenta',
  })
  changePassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(id, changePasswordDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'ID del usuario a eliminar',
  })
  @ApiResponse({
    status: 200,
    description: 'Usuario eliminado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado',
  })
  removeUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.removeUser(id);
  }

  @Put(':id/activate')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'ID del usuario a activar',
  })
  @ApiResponse({
    status: 200,
    description: 'Usuario activado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado',
  })
  @ApiResponse({
    status: 409,
    description: 'El usuario ya se encuentra activo',
  })
  activateUser(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.activateUser(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  createUserByAdmin(
    @Body() createUserDto: CreateUserByAdminDto,
  ) {
    return this.usersService.createUserByAdmin(
      createUserDto,
    );
  }

  @Patch(':id/roles')
@Roles(UserRole.ADMIN)
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiOperation({
  summary: 'Modificar roles de un usuario',
})
@ApiParam({
  name: 'id',
  required: true,
  type: String,
  description: 'ID del usuario',
})
@ApiResponse({
  status: 200,
  description: 'Roles actualizados correctamente',
})
updateUserRoles(
  @Param('id', ParseUUIDPipe) id: string,
  @Body() updateUserRolesDto: UpdateUserRolesDto,
) {
  return this.usersService.updateUserRoles(
    id,
    updateUserRolesDto,
  );
}

  @Patch(':id/upload-avatar')
  @Roles(UserRole.CLIENT, UserRole.ADMIN, UserRole.PROFESSIONAL)
  @UseGuards(AuthGuard, RolesGuard, UserOwnerOrAdminGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Subir o actualizar foto de perfil (avatar) de usuario a Cloudinary',
  })
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'ID del usuario',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Avatar actualizado correctamente en Cloudinary',
  })
  @ApiResponse({
    status: 400,
    description: 'El archivo enviado excede los 5MB o no tiene formato de imagen permitido (jpg, jpeg, png, webp)',
  })
  uploadAvatar(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.usersService.updateProfilePicture(id, file);
  }
}
