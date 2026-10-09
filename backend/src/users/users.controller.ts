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
import { ApiResponse } from '@nestjs/swagger';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Roles } from '../decorators/roles.decorators';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/userRoles.enum';
import { CreateUserByAdminDto } from './dto/create-user-by-admin.dto';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';
import {
  ApiBearerAuth,
  ApiQuery,
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
  @ApiOperation({
    summary: 'Obtener lista paginada de usuarios con filtros',
    description:
      'Devuelve una lista de usuarios omitiendo sus contraseñas. Permite paginar, buscar por término y filtrar por rol o estado. Solo accesible para Administradores y Profesionales.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número de página (Por defecto: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Usuarios por página (Por defecto: 5)',
    example: 5,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Buscar usuario por coincidencia parcial en nombre o email',
    example: 'juan',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: UserRole,
    description: 'Filtrar usuarios por un rol específico',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filtrar usuarios por estado activo (true) o inactivo (false)',
  })
  @ApiResponse({
    status: 200,
    description:
      'Lista de usuarios devuelta exitosamente junto con la metadata de paginación.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: El rol provisto no pertenece a los valores permitidos del sistema.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado: Token no enviado, inválido o expirado.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Prohibido: El usuario autenticado no posee el rol de ADMIN o PROFESSIONAL (ej. un CLIENT).',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor al procesar la consulta en la base de datos.',
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
      isActive === 'true' ? true : isActive === 'false' ? false : undefined;

    return this.usersService.getAllUsers(
      validPage,
      validLimit,
      search,
      role,
      validIsActive,
    );
  }

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
  @ApiResponse({
    status: 404,
    description: 'El usuario del token ya no existe en el sistema.',
  })
  @ApiResponse({ status: 500, description: 'Error interno del servidor.' })
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
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOperation({
    summary: 'Obtener un usuario específico por su ID (Solo Administradores)',
  })
  @ApiResponse({ status: 200, description: 'Usuario encontrado con éxito.' })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: El ID enviado no tiene un formato UUID válido.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado: Token no enviado, inválido o expirado.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Prohibido: El usuario autenticado no tiene el rol de ADMINISTRADOR.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Usuario no encontrado: El ID especificado no existe en la base de datos.',
  })
  @ApiResponse({ status: 500, description: 'Error interno del servidor.' })
  getUserById(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.getUserById(id);
  }

  @Put(':id')
  @Roles(
    UserRole.CLIENT,
    UserRole.ADMIN,
    UserRole.PROFESSIONAL,
  )
  @UseGuards(AuthGuard, RolesGuard, UserOwnerOrAdminGuard)
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'ID del usuario a actualizar',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOperation({
    summary: 'Actualizar datos de un usuario',
    description:
      'Permite a un administrador modificar cualquier usuario, o a un cliente o profesional modificar únicamente su propio perfil.',
  })
  @ApiResponse({
    status: 200,
    description: 'Usuario actualizado exitosamente.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: El ID enviado no es un UUID válido o los datos del DTO fallaron en la validación.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado: Token no enviado, inválido o expirado.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Prohibido: El usuario no tiene el rol requerido o está intentando modificar el perfil de otra persona sin ser Administrador.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Usuario no encontrado: El ID especificado no existe en la base de datos.',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflicto: El email o el teléfono ya están registrados.',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor.',
  })
  updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(id, updateUserDto);
  }

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
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Contraseña actualizada correctamente.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: El ID enviado no es un UUID válido o los datos del DTO (ChangePasswordDto) no cumplen con las validaciones de fortaleza.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado: Token no enviado, inválido o expirado.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Prohibido: El usuario no es dueño de la cuenta ni tiene el rol de Administrador.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Usuario no encontrado: El ID especificado no existe en la base de datos.',
  })
  @ApiResponse({ status: 500, description: 'Error interno del servidor.' })
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
    description: 'ID del usuario a desactivar/eliminar',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOperation({
    summary: 'Desactivar un usuario (Soft Delete)',
    description:
      'Cambia el estado del usuario a inactivo. Solo accesible por Administradores.',
  })
  @ApiResponse({
    status: 200,
    description: 'Usuario desactivado correctamente.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: El ID enviado no tiene un formato UUID válido.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado: Token no enviado, inválido o expirado.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Prohibido: El usuario autenticado no tiene el rol de ADMINISTRADOR.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Usuario no encontrado: El ID especificado no existe en la base de datos.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Conflicto: El usuario ya se encuentra inactivo en el sistema.',
  })
  @ApiResponse({ status: 500, description: 'Error interno del servidor.' })
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
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOperation({
    summary: 'Activar un usuario inactivo',
    description:
      'Cambia el estado del usuario a activo. Operación exclusiva para Administradores.',
  })
  @ApiResponse({ status: 200, description: 'Usuario activado exitosamente.' })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: El ID enviado no tiene un formato UUID válido.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado: Token no enviado, inválido o expirado.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Prohibido: El usuario autenticado no tiene el rol de ADMINISTRADOR.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Usuario no encontrado: El ID especificado no existe en la base de datos.',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflicto: El usuario ya se encuentra activo en el sistema.',
  })
  @ApiResponse({ status: 500, description: 'Error interno del servidor.' })
  activateUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.activateUser(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear un nuevo usuario por un administrador' })
  @ApiResponse({ status: 201, description: 'Usuario creado exitosamente.' })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos.' })
  @ApiResponse({
    status: 401,
    description:
      'No autorizado: No se ha enviado un token válido o ha expirado.',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflicto: El email o el teléfono ya están registrados.',
  })
  @ApiResponse({ status: 500, description: 'Error interno del servidor.' })
  createUserByAdmin(@Body() createUserDto: CreateUserByAdminDto) {
    return this.usersService.createUserByAdmin(createUserDto);
  }

  @Patch(':id/roles')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Modificar roles de un usuario',
    description:
      'Permite a un administrador actualizar el listado de roles asignados a un usuario específico.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'ID del usuario',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Roles actualizados correctamente.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: El ID enviado no es un UUID válido o el cuerpo del DTO tiene un formato incorrecto.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado: Token no enviado, inválido o expirado.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Prohibido: El usuario autenticado no tiene el rol de ADMINISTRADOR.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Usuario no encontrado: El ID especificado no existe en la base de datos.',
  })
  @ApiResponse({ status: 500, description: 'Error interno del servidor.' })
  updateUserRoles(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserRolesDto: UpdateUserRolesDto,
  ) {
    return this.usersService.updateUserRoles(id, updateUserRolesDto);
  }

  @Patch(':id/upload-avatar')
  @Roles(UserRole.CLIENT, UserRole.ADMIN, UserRole.PROFESSIONAL)
  @UseGuards(AuthGuard, RolesGuard, UserOwnerOrAdminGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Subir o actualizar foto de perfil (avatar) de usuario a Cloudinary',
  })
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'ID del usuario',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Archivo de imagen (JPEG, PNG, WEBP) de máximo 5MB',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Avatar actualizado correctamente en Cloudinary.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: El ID no es un UUID válido, el archivo excede los 5MB o no es una imagen permitida (jpg, jpeg, png, webp).',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado: Token no enviado, inválido o expirado.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Prohibido: El usuario no es dueño del perfil ni cuenta con privilegios de Administrador.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Usuario no encontrado: El ID especificado no existe en el sistema.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno: Error de conexión con el servicio de almacenamiento en la nube (Cloudinary).',
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
