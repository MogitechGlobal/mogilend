import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // CORS configuration
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'https://mogifintech.mogitechglobal.com',
      'https://mogilend.mogitechglobal.com', // Added your new live domain
      'https://lendos.mogitechglobal.com',   // Added the secondary domain just in case
      'https://mogilend.pages.dev',          // Added the base Cloudflare pages URL
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  await app.listen(3000);
}
bootstrap();