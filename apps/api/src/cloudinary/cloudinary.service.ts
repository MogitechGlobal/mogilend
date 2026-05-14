import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryResponse } from './cloudinary-response';
import * as streamifier from 'streamifier'; // <--- Modern ESM-style import

@Injectable()
export class CloudinaryService {
  async uploadFile(file: Express.Multer.File, folder: string = 'kyc-documents'): Promise<CloudinaryResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: `mogifintech/${folder}` },
        (error, result) => {
          if (error) return reject(error);
          resolve(result as CloudinaryResponse);
        },
      );

      // Using the typed streamifier library
      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }
}