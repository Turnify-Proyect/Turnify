import { BadRequestException, Injectable } from '@nestjs/common';
import { UploadApiResponse, v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  async uploadImage(
    file: Express.Multer.File,
    folder: string,
  ): Promise<UploadApiResponse> {
    if (!file || !file.buffer) {
      throw new BadRequestException('El archivo de imagen no es válido');
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) {
            return reject(
              new BadRequestException(
                `Error al subir la imagen a Cloudinary: ${error.message}`,
              ),
            );
          }
          if (!result) {
            return reject(
              new BadRequestException(
                'No se obtuvo respuesta al procesar la imagen en Cloudinary',
              ),
            );
          }
          resolve(result);
        },
      );

      Readable.from(file.buffer).pipe(uploadStream);
    });
  }

  async uploadUrl(url: string, folder: string): Promise<UploadApiResponse> {
    if (!url || typeof url !== 'string') {
      throw new BadRequestException('La URL de la imagen no es válida');
    }

    try {
      return await cloudinary.uploader.upload(url, {
        folder,
        resource_type: 'auto',
      });
    } catch (error: any) {
      throw new BadRequestException(
        `Error al procesar la imagen remota en Cloudinary: ${error?.message || error}`,
      );
    }
  }
}
