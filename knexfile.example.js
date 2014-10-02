// Update with your config settings.

module.exports = {
  development: {
    client: 'postgresql',
    connection: {
      database: 'sugar',
      user:     'sugar',
      password: 'password'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'migrations'
    }
  },
  
  staging: {
    client: 'postgresql',
    connection: {
      database: 'sugar',
      user:     'sugar',
      password: 'password'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'migrations'
    }
  },
  
  production: {
    client: 'postgresql',
    connection: {
      database: 'sugar',
      user:     'sugar',
      password: 'password'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'migrations'
    }
  }
};
