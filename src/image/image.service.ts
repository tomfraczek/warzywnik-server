import { Injectable } from '@nestjs/common';

@Injectable()
export class ImageService {
  handleUpload(file: Express.Multer.File) {
    return {
      originalName: file.originalname,
      fileName: file.filename,
      url: `http://localhost:3000/uploads/${file.filename}`,
    };
  }
}
