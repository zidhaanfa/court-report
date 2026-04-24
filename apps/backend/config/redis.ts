import env from '#start/env'
import { defineConfig } from '@adonisjs/redis'
import { InferConnections } from '@adonisjs/redis/types'

const redisConfig = defineConfig({
  connection: 'main',

  connections: {
    /*
    |--------------------------------------------------------------------------
    | The default connection
    |--------------------------------------------------------------------------
    |
    | The main connection you want to use to execute redis commands. The same
    | connection will be used by the session provider, if you rely on the
    | redis driver.
    |
    */
    main: {
      host: env.get('REDIS_HOST'),
      port: env.get('REDIS_PORT'),
      username: env.get('REDIS_USERNAME'),
      password: env.get('REDIS_PASSWORD', ''),
      db: Number(env.get('REDIS_DB') ?? 0),
      keyPrefix: env.get('REDIS_PREFIX'),
      healthCheck: true, // 👈 health check
      retryStrategy(times) {
        return times > 10 ? null : times * 50
      },
      enableOfflineQueue: true, // 👈 offline queue
      cluster: false, // 👈 single node
    },
  },
})

export default redisConfig

declare module '@adonisjs/redis/types' {
  export interface RedisConnections extends InferConnections<typeof redisConfig> {}
}