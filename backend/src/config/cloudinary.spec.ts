import { v2 as cloudinary } from 'cloudinary';

import { CloudinaryConfig } from './cloudinary';

describe('CloudinaryConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
    process.env.CLOUDINARY_API_KEY = 'test-api-key';
    process.env.CLOUDINARY_API_SECRET = 'test-api-secret';

    jest
      .spyOn(cloudinary, 'config')
      .mockReturnValue(cloudinary.config());
  });

  afterEach(() => {
    jest.restoreAllMocks();

    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;
  });

  it('should provide the Cloudinary provider', () => {
    expect(CloudinaryConfig.provide).toBe('Cloudinary');
    expect(CloudinaryConfig.useFactory).toEqual(
      expect.any(Function),
    );
  });

  it('should configure Cloudinary with environment variables', () => {
    CloudinaryConfig.useFactory();

    expect(cloudinary.config).toHaveBeenCalledWith({
      cloud_name: 'test-cloud',
      api_key: 'test-api-key',
      api_secret: 'test-api-secret',
    });
  });

  it('should return the Cloudinary instance', () => {
    const result = CloudinaryConfig.useFactory();

    expect(result).toBe(cloudinary);
  });
});
