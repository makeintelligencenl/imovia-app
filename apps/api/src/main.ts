import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import helmet from 'helmet'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser')
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // Security headers — API pura (sem HTML), CSP desabilitado, CORP cross-origin para o web app
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }))

  // S1 FIX: habilita leitura de cookies — necessário para JWT em HttpOnly cookie
  app.use(cookieParser())

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
      // Sem origin = requests server-side ou ferramentas (curl, Postman) → permitir
      if (!origin) return callback(null, true)
      const allowed = allowedOrigins.some((o) => {
        const base = o.trim()
        return origin === base || origin.startsWith(base + '/')
      })
      allowed ? callback(null, true) : callback(new Error('Not allowed by CORS'))
    },
    credentials: true,
  })

  // Swagger disponível apenas fora de produção
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Corretor Inteligente API')
      .setDescription('API para matching de imóveis e clientes')
      .setVersion('1.1')
      .addBearerAuth()
      .addApiKey({ type: 'apiKey', in: 'header', name: 'x-bot-api-key' }, 'x-bot-api-key')
      .build()

    const document = SwaggerModule.createDocument(app, config)
    SwaggerModule.setup('docs', app, document)
  }

  const port = process.env.PORT || 3001
  await app.listen(port)
  console.log(`API rodando em http://localhost:${port}`)
  console.log(`Swagger em http://localhost:${port}/docs`)
}

bootstrap()
