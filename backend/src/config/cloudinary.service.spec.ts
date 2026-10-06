import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { v2 as cloudinary } from 'cloudinary';
import { Writable } from 'stream';

import { CloudinaryService } from './cloudinary.service';

jest.mock('cloudinary', () => ({
  v2: {
    uploader: {
      upload_stream: jest.fn(),
      upload: jest.fn(),
    },
  },
}));

describe('CloudinaryService', () => {
  let service: CloudinaryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CloudinaryService],
    }).compile();

    service = module.get<CloudinaryService>(CloudinaryService);

    jest.clearAllMocks();
  });

  describe('uploadImage', () => {
    it('should upload an image successfully', async () => {
      const file = {
        buffer: Buffer.from('fake-image'),
      } as Express.Multer.File;

      const result = {
        public_id: 'test-image',
        secure_url: 'https://cloudinary.com/test-image.jpg',
      };

      const uploadStream = new Writable({
        write(_chunk, _encoding, callback) {
          callback();
        },
      });

      (
        cloudinary.uploader.upload_stream as jest.Mock
      ).mockImplementation((options, callback) => {
        process.nextTick(() => {
          callback(null, result);
        });

        return uploadStream;
      });

      const response = await service.uploadImage(
        file,
        'categories',
      );

      expect(response).toEqual(result);

      expect(
        cloudinary.uploader.upload_stream,
      ).toHaveBeenCalledWith(
        {
          folder: 'categories',
          resource_type: 'auto',
        },
        expect.any(Function),
      );
    });

    it('should throw BadRequestException when file is invalid', async () => {
      await expect(
        service.uploadImage(null as any, 'categories'),
      ).rejects.toThrow(
        new BadRequestException(
          'El archivo de imagen no es válido',
        ),
      );

      expect(
        cloudinary.uploader.upload_stream,
      ).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when file has no buffer', async () => {
      const file = {
        buffer: undefined,
      } as Express.Multer.File;

      await expect(
        service.uploadImage(file, 'categories'),
      ).rejects.toThrow(
        new BadRequestException(
          'El archivo de imagen no es válido',
        ),
      );

      expect(
        cloudinary.uploader.upload_stream,
      ).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when Cloudinary returns an error', async () => {
      const file = {
        buffer: Buffer.from('fake-image'),
      } as Express.Multer.File;

      const uploadStream = new Writable({
        write(_chunk, _encoding, callback) {
          callback();
        },
      });

      (
        cloudinary.uploader.upload_stream as jest.Mock
      ).mockImplementation((options, callback) => {
        process.nextTick(() => {
          callback(
            {
              message: 'Cloudinary upload failed',
            },
            null,
          );
        });

        return uploadStream;
      });

      await expect(
        service.uploadImage(file, 'categories'),
      ).rejects.toThrow(
        'Error al subir la imagen a Cloudinary: Cloudinary upload failed',
      );

      expect(
        cloudinary.uploader.upload_stream,
      ).toHaveBeenCalled();
    });

    it('should throw BadRequestException when Cloudinary returns no result', async () => {
      const file = {
        buffer: Buffer.from('fake-image'),
      } as Express.Multer.File;

      const uploadStream = new Writable({
        write(_chunk, _encoding, callback) {
          callback();
        },
      });

      (
        cloudinary.uploader.upload_stream as jest.Mock
      ).mockImplementation((options, callback) => {
        process.nextTick(() => {
          callback(null, undefined);
        });

        return uploadStream;
      });

      await expect(
        service.uploadImage(file, 'categories'),
      ).rejects.toThrow(
        'No se obtuvo respuesta al procesar la imagen en Cloudinary',
      );

      expect(
        cloudinary.uploader.upload_stream,
      ).toHaveBeenCalled();
    });
  });

  describe('uploadUrl', () => {
    it('should upload an image from URL successfully', async () => {
      const url = 'https://example.com/image.jpg';

      const result = {
        public_id: 'remote-image',
        secure_url: 'https://cloudinary.com/remote-image.jpg',
      };

      (
        cloudinary.uploader.upload as jest.Mock
      ).mockResolvedValue(result);

      const response = await service.uploadUrl(
        url,
        'categories',
      );

      expect(response).toEqual(result);

      expect(
        cloudinary.uploader.upload,
      ).toHaveBeenCalledWith(url, {
        folder: 'categories',
        resource_type: 'auto',
      });
    });

    it('should throw BadRequestException when URL is empty', async () => {
      await expect(
        service.uploadUrl('', 'categories'),
      ).rejects.toThrow(
        new BadRequestException(
          'La URL de la imagen no es válida',
        ),
      );

      expect(
        cloudinary.uploader.upload,
      ).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when URL is not a string', async () => {
      await expect(
        service.uploadUrl(null as any, 'categories'),
      ).rejects.toThrow(
        new BadRequestException(
          'La URL de la imagen no es válida',
        ),
      );

      expect(
        cloudinary.uploader.upload,
      ).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when Cloudinary upload fails', async () => {
      (
        cloudinary.uploader.upload as jest.Mock
      ).mockRejectedValue(
        new Error('Remote image could not be processed'),
      );

      await expect(
        service.uploadUrl(
          'https://example.com/image.jpg',
          'categories',
        ),
      ).rejects.toThrow(
        'Error al procesar la imagen remota en Cloudinary: Remote image could not be processed',
      );
    });
  });
});
