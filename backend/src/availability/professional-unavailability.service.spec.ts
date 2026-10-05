import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { ProfessionalUnavailabilityService } from './professional-unavailability.service';
import { ProfessionalUnavailabilityRepository } from './professional-unavailability.repository';

describe('ProfessionalUnavailabilityService', () => {
  let service: ProfessionalUnavailabilityService;

  let repository: {
    getByProfessionalId: jest.Mock;
    getOverlapping: jest.Mock;
    create: jest.Mock;
    getById: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(() => {
    repository = {
      getByProfessionalId: jest.fn(),
      getOverlapping: jest.fn(),
      create: jest.fn(),
      getById: jest.fn(),
      delete: jest.fn(),
    };

    service = new ProfessionalUnavailabilityService(
      repository as unknown as ProfessionalUnavailabilityRepository,
    );

    jest.clearAllMocks();
  });

  // ===========================================================================
  // Helpers
  // ===========================================================================

  const createUnavailability = (overrides = {}) => ({
    id: 'unavailability-1',
    startDate: '2030-10-02',
    endDate: '2030-10-05',
    reason: 'Vacaciones',
    professional: {
      id: 'professional-1',
    },
    ...overrides,
  });

  const createDto = (overrides = {}) =>
    ({
      startDate: '2030-10-02',
      endDate: '2030-10-05',
      reason: 'Vacaciones',
      ...overrides,
    }) as any;

  // ===========================================================================
  // getByProfessionalId
  // ===========================================================================

  describe('getByProfessionalId', () => {
    it('debería devolver los bloqueos del profesional', async () => {
      const unavailabilities = [
        createUnavailability({
          id: 'unavailability-1',
        }),
        createUnavailability({
          id: 'unavailability-2',
          startDate: '2030-11-01',
          endDate: '2030-11-05',
        }),
      ];

      repository.getByProfessionalId.mockResolvedValue(unavailabilities);

      const result = await service.getByProfessionalId('professional-1');

      expect(result).toBe(unavailabilities);

      expect(repository.getByProfessionalId).toHaveBeenCalledWith(
        'professional-1',
      );

      expect(repository.getByProfessionalId).toHaveBeenCalledTimes(1);
    });

    it('debería devolver un array vacío si el profesional no tiene bloqueos', async () => {
      repository.getByProfessionalId.mockResolvedValue([]);

      const result = await service.getByProfessionalId('professional-1');

      expect(result).toEqual([]);

      expect(repository.getByProfessionalId).toHaveBeenCalledWith(
        'professional-1',
      );
    });

    it('debería propagar el error del repositorio', async () => {
      const error = new Error('Error al consultar los bloqueos');

      repository.getByProfessionalId.mockRejectedValue(error);

      await expect(
        service.getByProfessionalId('professional-1'),
      ).rejects.toThrow(error);
    });
  });

  // ===========================================================================
  // create
  // ===========================================================================

  describe('create', () => {
    it('debería crear correctamente un bloqueo', async () => {
      const dto = createDto();

      const created = createUnavailability();

      repository.getOverlapping.mockResolvedValue(null);

      repository.create.mockResolvedValue(created);

      const result = await service.create('professional-1', dto);

      expect(result).toBe(created);

      expect(repository.getOverlapping).toHaveBeenCalledWith(
        'professional-1',
        dto.startDate,
        dto.endDate,
      );

      expect(repository.create).toHaveBeenCalledWith('professional-1', dto);

      expect(repository.create).toHaveBeenCalledTimes(1);
    });

    it('debería permitir un bloqueo donde startDate sea igual a endDate', async () => {
      const dto = createDto({
        startDate: '2030-10-05',
        endDate: '2030-10-05',
      });

      const created = createUnavailability({
        startDate: '2030-10-05',
        endDate: '2030-10-05',
      });

      repository.getOverlapping.mockResolvedValue(null);

      repository.create.mockResolvedValue(created);

      const result = await service.create('professional-1', dto);

      expect(result).toBe(created);

      expect(repository.getOverlapping).toHaveBeenCalledWith(
        'professional-1',
        '2030-10-05',
        '2030-10-05',
      );

      expect(repository.create).toHaveBeenCalledWith('professional-1', dto);
    });

    it('debería lanzar BadRequestException si la fecha de inicio es posterior a la fecha de finalización', async () => {
      const dto = createDto({
        startDate: '2030-10-10',
        endDate: '2030-10-05',
      });

      await expect(service.create('professional-1', dto)).rejects.toThrow(
        new BadRequestException(
          'La fecha de inicio debe ser anterior o igual a la fecha de finalización',
        ),
      );

      expect(repository.getOverlapping).not.toHaveBeenCalled();

      expect(repository.create).not.toHaveBeenCalled();
    });

    it('debería lanzar ConflictException si existe un bloqueo superpuesto', async () => {
      const dto = createDto();

      const overlapping = createUnavailability({
        id: 'existing-block',
      });

      repository.getOverlapping.mockResolvedValue(overlapping);

      await expect(service.create('professional-1', dto)).rejects.toThrow(
        new ConflictException(
          'El profesional ya posee un bloqueo dentro del rango de fechas seleccionado',
        ),
      );

      expect(repository.getOverlapping).toHaveBeenCalledWith(
        'professional-1',
        dto.startDate,
        dto.endDate,
      );

      expect(repository.create).not.toHaveBeenCalled();
    });

    it('debería validar el solapamiento antes de crear el bloqueo', async () => {
      const dto = createDto();

      repository.getOverlapping.mockResolvedValue(null);

      repository.create.mockResolvedValue(createUnavailability());

      await service.create('professional-1', dto);

      const getOverlappingOrder =
        repository.getOverlapping.mock.invocationCallOrder[0];

      const createOrder = repository.create.mock.invocationCallOrder[0];

      expect(getOverlappingOrder).toBeLessThan(createOrder);
    });

    it('debería propagar el error del repositorio al consultar solapamientos', async () => {
      const dto = createDto();

      const error = new Error('Error al consultar solapamientos');

      repository.getOverlapping.mockRejectedValue(error);

      await expect(service.create('professional-1', dto)).rejects.toThrow(
        error,
      );

      expect(repository.create).not.toHaveBeenCalled();
    });

    it('debería propagar el error del repositorio al crear', async () => {
      const dto = createDto();

      const error = new Error('Error al crear bloqueo');

      repository.getOverlapping.mockResolvedValue(null);

      repository.create.mockRejectedValue(error);

      await expect(service.create('professional-1', dto)).rejects.toThrow(
        error,
      );
    });
  });

  // ===========================================================================
  // delete
  // ===========================================================================

  describe('delete', () => {
    it('debería eliminar correctamente un bloqueo existente', async () => {
      const unavailability = createUnavailability();

      repository.getById.mockResolvedValue(unavailability);

      repository.delete.mockResolvedValue(undefined);

      const result = await service.delete('unavailability-1');

      expect(result).toBeUndefined();

      expect(repository.getById).toHaveBeenCalledWith('unavailability-1');

      expect(repository.delete).toHaveBeenCalledWith('unavailability-1');

      expect(repository.delete).toHaveBeenCalledTimes(1);
    });

    it('debería lanzar NotFoundException si el bloqueo no existe', async () => {
      repository.getById.mockResolvedValue(null);

      await expect(service.delete('unavailability-1')).rejects.toThrow(
        new NotFoundException(
          'No se encontró el bloqueo con id unavailability-1',
        ),
      );

      expect(repository.getById).toHaveBeenCalledWith('unavailability-1');

      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('debería consultar la existencia del bloqueo antes de eliminarlo', async () => {
      repository.getById.mockResolvedValue(createUnavailability());

      repository.delete.mockResolvedValue(undefined);

      await service.delete('unavailability-1');

      const getByIdOrder = repository.getById.mock.invocationCallOrder[0];

      const deleteOrder = repository.delete.mock.invocationCallOrder[0];

      expect(getByIdOrder).toBeLessThan(deleteOrder);
    });

    it('debería propagar el error del repositorio al buscar el bloqueo', async () => {
      const error = new Error('Error al buscar bloqueo');

      repository.getById.mockRejectedValue(error);

      await expect(service.delete('unavailability-1')).rejects.toThrow(error);

      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('debería propagar el error del repositorio al eliminar', async () => {
      repository.getById.mockResolvedValue(createUnavailability());

      const error = new Error('Error al eliminar bloqueo');

      repository.delete.mockRejectedValue(error);

      await expect(service.delete('unavailability-1')).rejects.toThrow(error);
    });
  });
});
