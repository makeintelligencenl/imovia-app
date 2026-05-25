import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // Necessário para Railway/proxies: lê IP real do X-Forwarded-For
  app.getHttpAdapter().getInstance().set('trust proxy', 1)

  app.setGlobalPrefix('api/v1')

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  )

  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',')
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.some(o => origin.startsWith(o.trim()))) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,
  })

  const config = new DocumentBuilder()
    .setTitle('Corretor Inteligente API')
    .setDescription('API para matching de imóveis e clientes')
    .setVersion('1.1')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', in: 'header', name: 'x-bot-api-key' }, 'x-bot-api-key')
    .build()

  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('docs', app, document)

  const port = process.env.PORT || 3001
  await app.listen(port)
  console.log(`API rodando em http://localhost:${port}`)
  console.log(`Swagger em http://localhost:${port}/docs`)
}

bootstrap()
