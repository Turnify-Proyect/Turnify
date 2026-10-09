import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  ParseUUIDPipe,
  Put,
  Req,
} from '@nestjs/common';
import { ProfessionalsService } from './professionals.service';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';
import { Roles } from '../decorators/roles.decorators';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/userRoles.enum';
import {
  ApiBearerAuth,
  ApiParam,
  ApiResponse,
  ApiOperation,
} from '@nestjs/swagger';

@Controller('professionals')
export class ProfessionalsController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Registrar un nuevo profesional',
    description:
      'Permite a un administrador asignar un rol profesional y especialidad a un usuario existente en el sistema. Verifica que el usuario exista y que no esté duplicado en la tabla de profesionales.',
  })
  @ApiResponse({ status: 201, description: 'Profesional creado exitosamente.' })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: Los datos provistos en el CreateProfessionalDto no cumplen con las reglas de validación.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado: Token no enviado, inválido o expirado.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Prohibido: El usuario autenticado no posee el rol de ADMINISTRADOR.',
  })
  @ApiResponse({
    status: 404,
    description:
      'No encontrado: No existe ningún usuario registrado con el userId proporcionado.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Conflicto: El usuario especificado ya se encuentra registrado como profesional.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor al procesar la solicitud o guardar en la base de datos.',
  })
  async createProfessional(
    @Body() createProfessionalDto: CreateProfessionalDto,
  ) {
    return this.professionalsService.createProfessional(createProfessionalDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener la lista de profesionales activos',
    description:
      'Devuelve un listado público de todos los profesionales activos en el sistema. Incluye sus datos de usuario, los servicios que realizan y sus agendas de disponibilidad. No requiere autenticación.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de profesionales activos devuelta con éxito.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor al consultar la base de datos o mapear las relaciones.',
  })
  async getActiveProfessionals() {
    return this.professionalsService.getActiveProfessionals();
  }

  @Get('admin/all')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Obtener todos los profesionales del sistema (Solo Administradores)',
    description:
      'Devuelve una lista completa de todos los profesionales registrados (activos e inactivos) junto con sus datos de usuario, servicios asociados y agendas de disponibilidad.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista completa de profesionales devuelta con éxito.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado: Token no enviado, inválido o expirado.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Prohibido: El usuario autenticado no posee el rol de ADMINISTRADOR.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor al consultar la base de datos o mapear las relaciones complejas.',
  })
  async getAllProfessionals() {
    return this.professionalsService.getAllProfessionals();
  }

  @Get('me')
  @Roles(UserRole.PROFESSIONAL)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener el perfil del profesional autenticado',
    description:
      'Devuelve los datos laborales, servicios asociados y agenda de disponibilidad del profesional correspondiente al token enviado en la cabecera.',
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil profesional obtenido correctamente.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado: Token no enviado, inválido o expirado.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Prohibido: El usuario autenticado no posee el rol de PROFESSIONAL (ej. un CLIENT).',
  })
  @ApiResponse({
    status: 404,
    description:
      'No encontrado: El usuario está autenticado pero no posee un registro asociado en la tabla de profesionales.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor al consultar la base de datos o mapear las relaciones.',
  })
  async getMyProfessionalProfile(@Req() request: any) {
    return this.professionalsService.getProfessionalByUserId(request.user.id);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description:
      'ID en formato UUID (puede ser el ID del profesional o del usuario asociado según tu repositorio)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOperation({
    summary:
      'Obtener un profesional específico por su ID (Solo Administradores)',
    description:
      'Devuelve la información detallada de un profesional incluyendo sus datos de usuario, servicios capacitados y su agenda de disponibilidad.',
  })
  @ApiResponse({
    status: 200,
    description: 'Profesional encontrado con éxito.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: El ID enviado en la ruta no cumple con el formato UUID válido.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado: Token no enviado, inválido o expirado.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Prohibido: El usuario autenticado no posee el rol de ADMINISTRADOR.',
  })
  @ApiResponse({
    status: 404,
    description:
      'No encontrado: No existe ningún profesional asociado al ID proporcionado.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor al consultar la base de datos o mapear las relaciones.',
  })
  async getProfessionalById(@Param('id', ParseUUIDPipe) id: string) {
    return this.professionalsService.getProfessionalById(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'ID del profesional a actualizar en formato UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOperation({
    summary: 'Actualizar la información de un profesional',
    description:
      'Permite a un administrador modificar los atributos laborales de un profesional existente (ej. su especialidad). Operación exclusiva para Administradores.',
  })
  @ApiResponse({
    status: 200,
    description: 'Profesional actualizado exitosamente.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: El ID enviado no tiene un formato UUID válido o los datos provistos en el UpdateProfessionalDto fallaron la validación.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado: Token no enviado, inválido o expirado.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Prohibido: El usuario autenticado no posee el rol de ADMINISTRADOR.',
  })
  @ApiResponse({
    status: 404,
    description:
      'No encontrado: No existe ningún profesional registrado con el ID proporcionado.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor al procesar la actualización en la base de datos.',
  })
  async updateProfessional(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProfessionalDto: UpdateProfessionalDto,
  ) {
    return this.professionalsService.updateProfessional(
      id,
      updateProfessionalDto,
    );
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'ID del profesional a desactivar en formato UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOperation({
    summary: 'Desactivar un profesional (Soft Delete)',
    description:
      'Cambia el estado del profesional a inactivo (isActive: false) en el sistema. Operación exclusiva para Administradores.',
  })
  @ApiResponse({
    status: 200,
    description: 'Profesional desactivado exitosamente.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: El ID enviado en la ruta no cumple con el formato UUID válido.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado: Token no enviado, inválido o expirado.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Prohibido: El usuario autenticado no posee el rol de ADMINISTRADOR.',
  })
  @ApiResponse({
    status: 404,
    description:
      'No encontrado: No existe ningún profesional registrado con el ID proporcionado.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor al procesar la actualización en la base de datos.',
  })
  async softDeleteProfessional(@Param('id', ParseUUIDPipe) id: string) {
    return this.professionalsService.softDeleteProfessional(id);
  }

  @Put(':id/activate')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'ID del profesional a activar en formato UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOperation({
    summary: 'Reactivar un profesional inactivo',
    description:
      'Cambia el estado del profesional a activo (isActive: true). Valida que el profesional exista y que no esté activo previamente. Operación exclusiva para Administradores.',
  })
  @ApiResponse({
    status: 200,
    description: 'Profesional activado exitosamente.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: El ID enviado en la ruta no cumple con el formato UUID válido.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado: Token no enviado, inválido o expirado.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Prohibido: El usuario autenticado no posee el rol de ADMINISTRADOR.',
  })
  @ApiResponse({
    status: 404,
    description:
      'No encontrado: No existe ningún profesional registrado con el ID proporcionado.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Conflicto: El profesional ya se encuentra activo en el sistema.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor al procesar la actualización en la base de datos.',
  })
  async activateProfessional(@Param('id', ParseUUIDPipe) id: string) {
    return this.professionalsService.activateProfessional(id);
  }

  @Post(':professionalId/services/:serviceId')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiParam({
    name: 'professionalId',
    required: true,
    type: String,
    description: 'ID del profesional en formato UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'serviceId',
    required: true,
    type: String,
    description: 'ID del servicio en formato UUID',
    example: 'a6b8c9d0-1234-5678-abcd-ef1234567890',
  })
  @ApiOperation({
    summary: 'Asociar un servicio a un profesional',
    description:
      'Crea un registro en la tabla intermedia para habilitar a un profesional a realizar un servicio específico. Valida que ambos registros existan, estén activos y no estén asociados previamente.',
  })
  @ApiResponse({
    status: 201,
    description: 'Servicio asociado al profesional exitosamente.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: El professionalId o el serviceId enviados no cumplen con el formato UUID válido.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado: Token no enviado, inválido o expirado.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Prohibido: El usuario autenticado no posee el rol de ADMINISTRADOR.',
  })
  @ApiResponse({
    status: 404,
    description:
      'No encontrado: No existe el profesional o el servicio con el ID proporcionado.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Conflicto: El profesional o el servicio están inactivos, o la asociación ya existe en el sistema.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor al intentar guardar la relación en la base de datos.',
  })
  async associateService(
    @Param('professionalId', ParseUUIDPipe) professionalId: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
  ) {
    return this.professionalsService.associateService(
      professionalId,
      serviceId,
    );
  }

  @Get(':professionalId/services')
  @ApiParam({
    name: 'professionalId',
    required: true,
    type: String,
    description:
      'ID del profesional en formato UUID para obtener sus servicios asociados',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOperation({
    summary: 'Obtener servicios asociados a un profesional',
    description:
      'Devuelve una lista pública de todos los servicios que realiza el profesional especificado por ID, incluyendo la información básica de cada servicio. No requiere autenticación.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de servicios del profesional obtenida exitosamente.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: El professionalId enviado no cumple con el formato UUID válido.',
  })
  @ApiResponse({
    status: 404,
    description:
      'No encontrado: No existe ningún profesional registrado con el ID proporcionado.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor al realizar las consultas en la base de datos.',
  })
  async getServicesByProfessional(
    @Param('professionalId', ParseUUIDPipe) professionalId: string,
  ) {
    return this.professionalsService.getServicesByProfessional(professionalId);
  }

  @Delete(':professionalId/services/:serviceId')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiParam({
    name: 'professionalId',
    required: true,
    type: String,
    description: 'ID del profesional en formato UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'serviceId',
    required: true,
    type: String,
    description: 'ID del servicio en formato UUID',
    example: 'a6b8c9d0-1234-5678-abcd-ef1234567890',
  })
  @ApiOperation({
    summary: 'Desvincular un servicio de un profesional',
    description:
      'Elimina el registro de la tabla intermedia que asocia a un profesional con un servicio específico. Valida la existencia de ambos recursos y de la relación misma antes de proceder.',
  })
  @ApiResponse({
    status: 200,
    description: 'Servicio desvinculado del profesional exitosamente.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: El professionalId o el serviceId enviados no cumplen con el formato UUID válido.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado: Token no enviado, inválido o expirado.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Prohibido: El usuario autenticado no posee el rol de ADMINISTRADOR.',
  })
  @ApiResponse({
    status: 404,
    description:
      'No encontrado: No existe el profesional, el servicio, o la asociación entre ambos en el sistema.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor al intentar remover el registro de la base de datos.',
  })
  async removeServiceFromProfessional(
    @Param('professionalId', ParseUUIDPipe) professionalId: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
  ) {
    return this.professionalsService.removeServiceFromProfessional(
      professionalId,
      serviceId,
    );
  }
}
